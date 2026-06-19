import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const FHIR_BASE_URL = process.env.FHIR_BASE_URL || "https://fhir-test.nzf.org.nz";
const NZF_TOKEN_URL = process.env.NZF_TOKEN_URL;
const NZF_SCOPE = process.env.NZF_SCOPE;
const NZF_CLIENT_ID = process.env.NZF_CLIENT_ID;
const NZF_CLIENT_SECRET = process.env.NZF_CLIENT_SECRET;

let cachedToken = null;
let cachedTokenExpiresAtMs = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAtMs - 30_000) return cachedToken; // 30s safety

  if (!NZF_TOKEN_URL || !NZF_SCOPE || !NZF_CLIENT_ID || !NZF_CLIENT_SECRET) {
    throw new Error("Missing NZF_TOKEN_URL / NZF_SCOPE / NZF_CLIENT_ID / NZF_CLIENT_SECRET in .env.local");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: NZF_CLIENT_ID,
    client_secret: NZF_CLIENT_SECRET,
    scope: NZF_SCOPE,
  });

  const res = await fetch(NZF_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(`Token request failed: ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  }

  cachedToken = json.access_token;
  const expiresInSec = Number(json.expires_in || 3600);
  cachedTokenExpiresAtMs = now + expiresInSec * 1000;
  return cachedToken;
}

async function fetchMedicationById(id) {
  const token = await getAccessToken();
  const res = await fetch(`${FHIR_BASE_URL}/Medication/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/fhir+json",
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`FHIR GET Medication/${id} failed: ${res.status} ${txt.slice(0, 200)}`);
  }
  return await res.json();
}

async function fhirGet(url) {
  const token = await getAccessToken();
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/fhir+json",
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`FHIR GET failed: ${res.status} ${txt.slice(0, 200)}`);
  }
  return await res.json();
}


const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) in .env.local");
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function getNzmtType(resource) {
  const exts = resource.extension || [];
  const hit = exts.find((e) => (e.url || "").includes("nzf-nzmt-type"));
  return hit?.valueCodeableConcept?.coding?.[0]?.code ?? null;
}

function resourcesFromJson(doc) {
  if (!doc) return [];
  if (doc.resourceType === "Bundle") {
    return (doc.entry || []).map((e) => e.resource).filter(Boolean);
  }
  if (doc.resourceType === "Medication") {
    return [doc];
  }
  return [];
}

function bundleToRows(bundle) {
  const entries = bundle.entry || [];
  const rows = [];
  for (const ent of entries) {
    const r = ent.resource;
    if (!r || r.resourceType !== "Medication") continue;

    rows.push({
      nzmt_id: r.id,
      nzmt_type: getNzmtType(r), // mp/tp/mpuu/ctpp...
      status: r.status || null,
      last_updated: r?.meta?.lastUpdated || null,
      resource: r,
    });
  }
  return rows;
}

async function upsertRows(rows) {
  if (!rows.length) return;

  const { error } = await supabase
    .from("nzulm_medication_raw")
    .upsert(rows, { onConflict: "nzmt_id" });

  if (error) throw error;
}

async function fetchMpuusForMp(mpNzmtId) {
  const url =
    `${FHIR_BASE_URL}/Medication` +
    `?nzf-related-medication=${encodeURIComponent(mpNzmtId)}` +
    `&nzf-nzmt-type=mpuu&_count=200`;

  const bundle = await fhirGet(url); // MUST be your existing helper that adds Bearer token
  const entries = bundle?.entry ?? [];
  return entries.map(e => e.resource).filter(Boolean);
}

async function upsertRawResources(resources, nzmtType) {
  if (!resources.length) return 0;

  const rows = resources.map(r => ({
    nzmt_id: r.id,
    nzmt_type: nzmtType,
    status: r.status || null,
    last_updated: r?.meta?.lastUpdated || null,
    resource: r,
  }));

  const { error } = await supabase
    .from("nzulm_medication_raw")
    .upsert(rows, { onConflict: "nzmt_id" });

  if (error) {
    console.error("Upsert error:", error);
    throw error;
  }

  return rows.length;
}



async function runRefresh() {
 const { error } = await supabase.rpc("refresh_meds_from_source");
  if (error) throw error;
}

async function main() {
if (!fs.existsSync("mp_azathioprine_exact.json") 
  || !fs.existsSync("mpuu_azathioprine.json")
  //|| !fs.existsSync("tp_azathioprine.json")
  ){


    process.exit(1);
  }

const mp = JSON.parse(fs.readFileSync("mp_azathioprine_exact.json", "utf8"));
const mpuu = JSON.parse(fs.readFileSync("mpuu_azathioprine.json", "utf8"));
//const tp = JSON.parse(fs.readFileSync("tp_azathioprine.json", "utf8"));

const rows = [
  ...resourcesFromJson(mp).map((r) => ({
    nzmt_id: r.id,
    nzmt_type: getNzmtType(r),
    status: r.status || null,
    last_updated: r?.meta?.lastUpdated || null,
    resource: r,
  })),
  ...resourcesFromJson(mpuu).map((r) => ({
    nzmt_id: r.id,
    nzmt_type: getNzmtType(r),
    status: r.status || null,
    last_updated: r?.meta?.lastUpdated || null,
    resource: r,
  })),
  // ...resourcesFromJson(tp).map((r) => ({
  //     nzmt_id: r.id,
  //     nzmt_type: getNzmtType(r),
  //     status: r.status || null,
  //     last_updated: r?.meta?.lastUpdated || null,
  //     resource: r,
  //   })),
];

  console.log("Prepared rows:", rows.length);
  const missingType = rows.filter((r) => !r.nzmt_type).length;
  if (missingType) {
    console.log("Warning: rows missing nzmt_type:", missingType);
  }

  // Fetch MPs referenced by the TP rows so synonyms can resolve immediately
  const tpRows = rows.filter(r => r.nzmt_type === "tp");
  const relatedMpIds = new Set();

  for (const t of tpRows) {
    const exts = t.resource.extension || [];
    for (const e of exts) {
      const url = (e.url || "").toLowerCase();
      if (!url.includes("nzf-related-medication")) continue;

      const inner = e.extension || [];
      for (const ie of inner) {
        if (ie.url === "code") {
          const coding = ie?.valueCodeableConcept?.coding || [];
          for (const c of coding) {
            if (c?.code) relatedMpIds.add(String(c.code));
          }
        }
      }
    }
  }

  if (relatedMpIds.size) {
    console.log("TPs reference MP ids:", Array.from(relatedMpIds).join(", "));

    const { data: existing, error: existErr } = await supabase
      .from("nzulm_medication_raw")
      .select("nzmt_id")
      .in("nzmt_id", Array.from(relatedMpIds));

    if (existErr) throw existErr;

    const existingSet = new Set((existing || []).map(x => x.nzmt_id));
    const missing = Array.from(relatedMpIds).filter(id => !existingSet.has(id));

    console.log("Missing referenced MPs to fetch:", missing.length);

    const fetchedRows = [];
    for (const id of missing) {
      const med = await fetchMedicationById(id);
      fetchedRows.push({
        nzmt_id: med.id,
        nzmt_type: getNzmtType(med),
        status: med.status || null,
        last_updated: med?.meta?.lastUpdated || null,
        resource: med,
      });
    }

    if (fetchedRows.length) {
      console.log("Upserting fetched referenced MPs:", fetchedRows.length);
      await upsertRows(fetchedRows);
    }
  }


  console.log("Upserting into source_nzulm.medication_raw ...");
  await upsertRows(rows);

// Get MP ids already stored in DB (raw table via public view)
const { data: mpRows, error: mpErr } = await supabase
  .from("nzulm_medication_raw")
  .select("nzmt_id")
  .eq("nzmt_type", "mp");

if (mpErr) throw mpErr;

const mpIds = (mpRows ?? []).map(r => r.nzmt_id);
console.log("MP ids found in DB:", mpIds.length);
console.log("First 5 MP ids:", mpIds.slice(0, 5));


// If your current "rows" only includes a few MPs (sample),
// that's fine for now. Later you can fetch all MPs from DB.
let totalMpuuImported = 0;

for (const mpId of mpIds) {
  const mpuus = await fetchMpuusForMp(mpId);
  console.log(`MP ${mpId}: fetched MPUUs = ${mpuus.length}`);
  if (mpuus.length) console.log("First MPUU id:", mpuus[0]?.id);

  if (mpuus.length) {
    const n = await upsertRawResources(mpuus, "mpuu");
    totalMpuuImported += n;
    console.log(`Imported ${n} MPUUs for MP ${mpId}`);
  } else {
    console.log(`No MPUUs found for MP ${mpId}`);
  }
}


console.log(`Total MPUUs imported: ${totalMpuuImported}`);
// ---- END NEW ----


  console.log("Running app_meds.refresh_from_source() ...");
  await runRefresh();

  console.log("Done ✅");
  console.log("Next: check app_meds.medication_banner and medication_synonym in Supabase.");
}

main().catch((e) => {
  console.error("Import failed:", e?.message || e);
  process.exit(1);
});

