"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { RequireRole } from "@/components/RequireRole";
import PatientDetailLayoutPatient from "@/components/patient/PatientDetailLayoutPatient";
import MedicationTablePatient, {
  type PrescriptionRowPatient,
} from "@/components/patient/MedicationTablePatient";

const DEMO_PATIENT = {
  id: "0edcf8e8-6499-4708-82a2-bc8a54109212",
  full_name: "Kay Digo",
  nhi: "AKI7439",
  date_of_birth: null,
  allergies: null,
};

type Patient = {
  id: string;
  full_name: string | null;
  nhi: string | null;
  date_of_birth: string | null;
  allergies: string | null;
};

type MedicationRowFromRpc = {
  prescription_id: string;
  medication_banner_id: string | null;
  banner_name: string | null;
  medication_name: string;
  is_prn?: boolean;
  is_stat?: boolean;
  indication?: string | null;
  start_date?: string | null;
  additional_information?: string | null;
  stop_reason?: string | null;
  stopped_at?: string | null;
  dose?: string | null;
  route?: string | null;
  frequency?: string | null;
  duration?: string | null;
  created_at: string;
  medication_section: "current_regular" | "current_prn" | "stopped";
  available_for_administration?: boolean;
  regimen_lines?: any[];
  nzf_url?: string | null;
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

export default function PatientMedicationsPage() {
  return (
    <RequireRole allowed={["patient"]}>
      <PatientMedicationsInner />
    </RequireRole>
  );
}

function PatientMedicationsInner() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meds, setMeds] = useState<PrescriptionRowPatient[]>([]);

  const patient: Patient = DEMO_PATIENT;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc("medication_table_for_patient", {
        p_patient_id: DEMO_PATIENT.id,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setMeds(((data as MedicationRowFromRpc[]) ?? []) as PrescriptionRowPatient[]);
      setLoading(false);
    }

    load();
  }, [supabase]);

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

  return (
    <main style={{ fontFamily: "system-ui" }}>
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
            onClick={() => router.push("/patient")}
            style={{
  color: "#ffffff",
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontWeight: 600,
}}
          >
            ← Back
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

      <PatientDetailLayoutPatient patient={patient} calcAge={calcAge} />

      <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
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
          <MedicationTablePatient prescriptions={currentRegular} />
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
          <MedicationTablePatient
  prescriptions={currentPrn}
  mode="simple"
  emptyText="No current PRN medications."
  showInstructions={true}
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
          <MedicationTablePatient
  prescriptions={stoppedMeds}
  mode="simple"
  emptyText="No stopped medications."
  showInstructions={false}
/>
        </section>
      </div>
    </main>
  );
}