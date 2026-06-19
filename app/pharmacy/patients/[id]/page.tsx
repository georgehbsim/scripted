"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { RequireRole } from "@/components/RequireRole";
import PatientDetailLayoutPharmacy from "@/components/pharmacy/PatientDetailLayoutPharmacy";
import MedicationTablePharmacy, {
  type PrescriptionRowPharmacy,
} from "@/components/pharmacy/MedicationTablePharmacy";

type Patient = {
  id: string;
  full_name: string | null;
  nhi: string | null;
  date_of_birth: string | null;
  allergies: string | null;
};

type MedicationRowFromRpc = {
  id: string;
  prescription_id: string;
  medication_banner_id: string | null;
  medication_name: string;
  banner_name: string | null;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  duration?: string | null;
  indication?: string | null;
  is_prn?: boolean;
  is_stat?: boolean;
  dispense_cycle: number;
  created_at: string;
  start_date?: string | null;
  medication_section: "current_regular" | "current_prn" | "stopped";
  regimen_lines?: any[];
  last_dispensed_at?: string | null;
  last_dispensed_cycle?: number | null;
  additional_information?: string | null;
  change_reason?: string | null;
};

type CommunityItemWithRemaining = {
  medication_banner_id: string | null;
  remaining_dispenses: number;
};

const ROUTE_LABELS: Record<string, string> = {
  PO: "Oral",
  IV: "Intravenous",
  IM: "Intramuscular",
  SC: "Subcutaneous",
  INH: "Inhaled",
  TOP: "Topical",
  PR: "Rectal",
  SL: "Sublingual",
  NG: "Nasogastric",
  PEG: "PEG",
};

const FREQ_LABELS: Record<string, string> = {
  OD: "Once daily",
  BD: "Twice daily",
  TDS: "Three times daily",
  QID: "Four times daily",
  NOCTE: "At night",
  PRN: "When required",
  STAT: "Once only",
};

export default function PharmacyPatientPage() {
  return (
    <RequireRole allowed={["pharmacist"]}>
      <PharmacyPatientInner />
    </RequireRole>
  );
}

function PharmacyPatientInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientId = params.id;
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [meds, setMeds] = useState<PrescriptionRowPharmacy[]>([]);

  useEffect(() => {
    async function load() {
      if (!patientId) return;

      setLoading(true);
      setError(null);

      const [{ data: patientData, error: patientError }, { data: medData, error: medError }] =
        await Promise.all([
          supabase
            .from("patients")
            .select("id, full_name, nhi, date_of_birth, allergies")
            .eq("id", patientId)
            .maybeSingle(),
          supabase.rpc("medication_table_for_patient", { p_patient_id: patientId }),
        ]);

      if (patientError) {
        setError(patientError.message);
        setLoading(false);
        return;
      }

      if (medError) {
        setError(medError.message);
        setLoading(false);
        return;
      }

            setPatient((patientData as Patient | null) ?? null);

      const medRows = (medData as MedicationRowFromRpc[]) ?? [];

      const { data: communityItemsData, error: communityItemsError } = await supabase
        .from("community_prescription_items")
        .select("id, medication_banner_id, repeats_value, community_prescription_id")
        .in(
          "community_prescription_id",
          (
            await supabase
              .from("community_prescriptions")
              .select("id")
              .eq("patient_id", patientId)
          ).data?.map((row) => row.id) ?? []
        );

      if (communityItemsError) {
        setError(communityItemsError.message);
        setLoading(false);
        return;
      }

      const communityItems = (communityItemsData ?? []) as {
        id: string;
        medication_banner_id: string | null;
        repeats_value: number | null;
        community_prescription_id: string;
      }[];

      let availableBannerIds = new Set<string>();

      if (communityItems.length > 0) {
        const itemIds = communityItems.map((item) => item.id);

        const { data: dispenseRows, error: dispenseError } = await supabase
          .from("community_item_dispenses")
          .select("community_prescription_item_id")
          .in("community_prescription_item_id", itemIds);

        if (dispenseError) {
          setError(dispenseError.message);
          setLoading(false);
          return;
        }

        const dispenseCounts = new Map<string, number>();
        for (const row of dispenseRows ?? []) {
          const itemId = row.community_prescription_item_id as string;
          dispenseCounts.set(itemId, (dispenseCounts.get(itemId) ?? 0) + 1);
        }

        for (const item of communityItems) {
          if (!item.medication_banner_id) continue;

          const totalAllowed = 1 + (item.repeats_value ?? 0);
          const dispensedCount = dispenseCounts.get(item.id) ?? 0;
          const remaining = Math.max(0, totalAllowed - dispensedCount);

          if (remaining > 0) {
            availableBannerIds.add(item.medication_banner_id);
          }
        }
      }

      const mapped = medRows.map((row) => ({
        ...row,
        dispense_available:
          !!row.medication_banner_id && availableBannerIds.has(row.medication_banner_id),
      }));

      setMeds(mapped);
      setLoading(false);
    }

    load();
  }, [patientId, supabase]);

  const currentRegular = meds.filter((m) => m.medication_section === "current_regular");
  const currentPrn = meds.filter((m) => m.medication_section === "current_prn");
  const stoppedMeds = meds.filter((m) => m.medication_section === "stopped");

  function calcAge(dob: string | null) {
    if (!dob) return "—";
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return "—";

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const hasHadBirthday =
      today.getMonth() > birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

    if (!hasHadBirthday) age -= 1;
    return age;
  }

  function displayForRouteCode(code: string) {
    return ROUTE_LABELS[code] ?? code;
  }

  function displayForFrequencyCode(code: string) {
    return FREQ_LABELS[code] ?? code;
  }

  if (loading) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <p>Loading…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
      </main>
    );
  }

  if (!patient) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <p>Patient not found.</p>
      </main>
    );
  }

  return (
  <main style={{ fontFamily: "system-ui", minWidth: 1100, }}>
    <div
      style={{
  position: "sticky",
  top: 0,
  zIndex: 100,
  height: 56,
  background: "#111827",
  color: "#ffffff",
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  padding: "0 16px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ justifySelf: "start" }}>
        <button
          type="button"
          onClick={() => router.push("/pharmacy/patients")}
          style={{
            color: "#ffffff",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ← Back to patients
        </button>
      </div>

      <div
        style={{
          justifySelf: "center",
          fontWeight: 800,
          letterSpacing: 0.2,
          fontSize: 18,
        }}
      >
        Scripted
      </div>

      <div style={{ justifySelf: "end" }} />
    </div>

          <PatientDetailLayoutPharmacy
        patient={patient}
        calcAge={calcAge}
        onViewHistory={() => router.push(`/pharmacy/patients/${patient.id}/recent-dispensing`)}
        onDispenseMedications={() => router.push(`/pharmacy/patients/${patient.id}/dispense`)}
      />

      <div style={{ padding: 24, margin: "0 auto" }}>

        <section style={{ marginBottom: 32 }}>
<div
  style={{
    marginTop: 0,
    marginBottom: 8,
    padding: "10px 14px",
    background: "#e8f2ff",
    border: "1px solid #dbeafe",
    borderRadius: 10,
    textAlign: "center",
  }}
>
  <h3
    style={{
      margin: 0,
      fontSize: 18,
      fontWeight: 700,
      color: "#111827",
    }}
  >
    Current Regular Medications
  </h3>
</div>
          <MedicationTablePharmacy
            prescriptions={currentRegular}
            displayForRouteCode={displayForRouteCode}
            displayForFrequencyCode={displayForFrequencyCode}
            onViewHistory={(medicationBannerId) =>
              router.push(
                `/pharmacy/patients/${patient.id}/history?medication_banner_id=${medicationBannerId}`
              )
            }
          />
        </section>

        <section>
<div
  style={{
    marginTop: 0,
    marginBottom: 8,
    padding: "10px 14px",
    background: "#e8f2ff",
    border: "1px solid #dbeafe",
    borderRadius: 10,
    textAlign: "center",
  }}
>
  <h3
    style={{
      margin: 0,
      fontSize: 18,
      fontWeight: 700,
      color: "#111827",
    }}
  >
    Current PRN Medications
  </h3>
</div>
          <MedicationTablePharmacy
            prescriptions={currentPrn}
            displayForRouteCode={displayForRouteCode}
            displayForFrequencyCode={displayForFrequencyCode}
            onViewHistory={(medicationBannerId) =>
              router.push(
                `/pharmacy/patients/${patient.id}/history?medication_banner_id=${medicationBannerId}`
              )
            }
          />
        </section>

        <section style={{ marginTop: 32 }}>
<div
  style={{
    marginTop: 0,
    marginBottom: 8,
    padding: "10px 14px",
    background: "#eceff3",
    border: "1px solid #dbeafe",
    borderRadius: 10,
    textAlign: "center",
  }}
>
  <h3
    style={{
      margin: 0,
      fontSize: 18,
      fontWeight: 700,
      color: "#111827",
    }}
  >
    Stopped Medications
  </h3>
</div>
  <MedicationTablePharmacy
    prescriptions={stoppedMeds}
    displayForRouteCode={displayForRouteCode}
    displayForFrequencyCode={displayForFrequencyCode}
    onViewHistory={(medicationBannerId) =>
      router.push(
        `/pharmacy/patients/${patient.id}/history?medication_banner_id=${medicationBannerId}`
      )
    }
  />
</section>
      </div>
    </main>
  );
}