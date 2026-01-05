"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RequireRole } from "@/components/RequireRole";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Row = {
  prescription_id: string;
  created_at: string;
  medication_name: string;
  dose: string | null;
  frequency: string | null;
  route: string | null;
  status: string;
  dispense_cycle: number;
  last_dispensed_cycle: number | null;


  patient_id: string;
  patient_name: string;

  last_dispensed_at: string | null;
};

export default function PharmacyPage() {
  return (
    <RequireRole allowed={["pharmacist"]}>
      <PharmacyInner />
    </RequireRole>
  );
}

function PharmacyInner() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    // 1) Get prescriptions + patient names
    const { data: rxData, error: rxError } = await supabase
  .from("prescriptions")
  .select(`
    id,
    patient_id,
    medication_name,
    dose,
    frequency,
    route,
    status,
    dispense_cycle,
    created_at,
    patients:patient_id ( full_name )
  `)
  .order("created_at", { ascending: false })
  .limit(50);

if (rxError) {
  setError(rxError.message);
  setLoading(false);
  return;
}

const rx = (rxData ?? []) as any[];


    // 2) Get latest dispenses for these prescriptions (simple approach)
    const rxIds = rx.map((r) => r.id);
    
    const dispenseMap = new Map<string, { at: string; cycle: number }>();

if (rxIds.length > 0) {
  const { data: dData, error: dError } = await supabase
    .from("dispenses")
    .select("prescription_id, dispensed_at, dispense_cycle")
    .in("prescription_id", rxIds)
    .order("dispensed_at", { ascending: false });

  if (dError) {
    setError(dError.message);
    setLoading(false);
    return;
  }

  for (const d of (dData ?? []) as any[]) {
    if (!dispenseMap.has(d.prescription_id)) {
      dispenseMap.set(d.prescription_id, {
        at: d.dispensed_at,
        cycle: d.dispense_cycle,
      });
    }
  }
}



    const merged: Row[] = rx.map((r) => {
  const last = dispenseMap.get(r.id);
  return {
    prescription_id: r.id,
    created_at: r.created_at,
    medication_name: r.medication_name,
    dose: r.dose ?? null,
    frequency: r.frequency ?? null,
    route: r.route ?? null,
    status: r.status,
    patient_id: r.patient_id,
    patient_name: r.patients?.full_name ?? "—",
    dispense_cycle: r.dispense_cycle,
    last_dispensed_at: last?.at ?? null,
    last_dispensed_cycle: last?.cycle ?? null,
  };
});

setRows(merged);
setLoading(false);

  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markDispensed(prescriptionId: string, dispenseCycle: number) {
    setBusyId(prescriptionId);
    setError(null);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (userErr || !userId) {
      setError(userErr?.message ?? "Not logged in.");
      setBusyId(null);
      return;
    }

    const { error } = await supabase.from("dispenses").insert({
  prescription_id: prescriptionId,
  pharmacist_user_id: userId,
  dispense_cycle: dispenseCycle,
});

    if (error) {
      setError(error.message);
      setBusyId(null);
      return;
    }

    await load();
    setBusyId(null);
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 1100 }}>
      <h1>Pharmacy Dashboard</h1>

      <p style={{ marginTop: 8 }}>
        <Link href="/me">Account</Link>
      </p>

      {loading && <p style={{ marginTop: 16 }}>Loading…</p>}
      {error && (
        <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{error}</pre>
      )}

      {!loading && !error && rows.length === 0 && (
        <p style={{ marginTop: 16 }}>No prescriptions found.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <table
          style={{
            width: "100%",
            marginTop: 16,
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                Patient
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                Medication
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                Directions
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                Status
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                Last dispensed
              </th>
              <th style={{ borderBottom: "1px solid #ddd", padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.prescription_id}>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {r.patient_name}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {r.medication_name} {r.route ? `(${r.route})` : ""}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {[r.dose, r.frequency].filter(Boolean).join(" • ") || "—"}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {r.status}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {r.last_dispensed_at
                    ? new Date(r.last_dispensed_at).toLocaleString()
                    : "—"}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8, textAlign: "right" }}>
                  <button
  onClick={() => markDispensed(r.prescription_id, r.dispense_cycle)}
  disabled={
    busyId === r.prescription_id ||
    r.status !== "active" ||
    r.last_dispensed_cycle === r.dispense_cycle
}

  style={{ padding: "6px 10px" }}
>
  {r.status !== "active"
  ? "Not active"
  : r.last_dispensed_cycle === r.dispense_cycle
    ? "Already dispensed"
    : busyId === r.prescription_id
      ? "Dispensing…"
      : "Mark dispensed"}
</button>


                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
