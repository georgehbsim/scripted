"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RequireRole } from "@/components/RequireRole";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type PatientRow = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  nhi: string | null;
  created_at: string;
};

type PrescriptionRow = {
  id: string;
  medication_name: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  status: string;
  created_at: string;
  last_dispensed_at?: string | null;

};


export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <RequireRole allowed={["doctor"]}>
      <PatientDetailInner patientId={id} />
    </RequireRole>
  );
}


function PatientDetailInner({ patientId }: { patientId: string }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [busyRxId, setBusyRxId] = useState<string | null>(null);

async function stopPrescription(prescriptionId: string) {
  setBusyRxId(prescriptionId);
  setError(null);

  const { error } = await supabase
    .from("prescriptions")
    .update({ status: "stopped" })
    .eq("id", prescriptionId);

  if (error) {
    setError(error.message);
    setBusyRxId(null);
    return;
  }

  // Reload by calling the same logic again: simplest is to refresh the page
  window.location.reload();
}


  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, date_of_birth, nhi, created_at")
        .eq("id", patientId)
        .single();

     const { data: rxData, error: rxError } = await supabase
  .from("prescriptions")
  .select("id, medication_name, dose, route, frequency, status, created_at")
  .eq("patient_id", patientId)
  .order("created_at", { ascending: false });

// Build a map of latest dispense time per prescription
const rxIds = (rxData as PrescriptionRow[] | null)?.map((r) => r.id) ?? [];
const dispenseMap = new Map<string, string>();

if (rxIds.length > 0) {
  const { data: dData, error: dError } = await supabase
    .from("dispenses")
    .select("prescription_id, dispensed_at")
    .in("prescription_id", rxIds)
    .order("dispensed_at", { ascending: false });

  if (dError) {
    setError(dError.message);
    setLoading(false);
    return;
  }

  for (const d of (dData ?? []) as any[]) {
    if (!dispenseMap.has(d.prescription_id)) {
      dispenseMap.set(d.prescription_id, d.dispensed_at);
    }
  }
}

// Merge into prescriptions state
const merged = ((rxData ?? []) as PrescriptionRow[]).map((rx) => ({
  ...rx,
  last_dispensed_at: dispenseMap.get(rx.id) ?? null,
}));

setPrescriptions(merged);

if (rxError) setError(rxError.message);


      if (error) setError(error.message);
      else setPatient(data as PatientRow);

      setLoading(false);
    }

    load();
  }, [patientId, supabase]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900 }}>
      <p>
        <Link href="/doctor/patients">← Back to Patients</Link>
      </p>

      {loading && <p style={{ marginTop: 16 }}>Loading…</p>}
      {error && <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{error}</pre>}

      {!loading && !error && patient && (
        <>
          <h1 style={{ marginTop: 16 }}>{patient.full_name}</h1>

          <div style={{ marginTop: 12 }}>
            <p><b>DOB:</b> {patient.date_of_birth ?? "—"}</p>
            <p><b>NHI:</b> {patient.nhi ?? "—"}</p>
            <p><b>Patient ID:</b> {patient.id}</p>
          </div>

          <hr style={{ margin: "24px 0" }} />

          <h2>Prescriptions</h2>

<p style={{ marginTop: 8 }}>
  <Link href={`/doctor/patients/${patient.id}/prescribe`}>+ New prescription</Link>
</p>

{prescriptions.length === 0 ? (
  <p style={{ marginTop: 12 }}>No prescriptions yet.</p>
) : (
  <table
    style={{
      width: "100%",
      marginTop: 12,
      borderCollapse: "collapse",
    }}
  >
    <thead>
      <tr>
        <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
          Medication
        </th>
        <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
          Dose
        </th>
        <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
          Frequency
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
      {prescriptions.map((rx) => (
        <tr key={rx.id}>
          <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
            {rx.medication_name}
            {rx.route ? ` (${rx.route})` : ""}
          </td>
          <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
            {rx.dose ?? "—"}
          </td>
          <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
            {rx.frequency ?? "—"}
          </td>
          <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
            {rx.status}
          </td>
          <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
            {rx.last_dispensed_at
            ? new Date(rx.last_dispensed_at).toLocaleString()
            : "—"}
           </td>
           <td style={{ borderBottom: "1px solid #eee", padding: 8, textAlign: "right" }}>
  {rx.status === "active" ? (
    <button
      onClick={() => stopPrescription(rx.id)}
      disabled={busyRxId === rx.id}
      style={{ padding: "6px 10px" }}
    >
      {busyRxId === rx.id ? "Stopping…" : "Stop"}
    </button>
  ) : (
    "—"
  )}
</td>


        </tr>
      ))}
    </tbody>
  </table>
)}

          <h2 style={{ marginTop: 24 }}>Activity</h2>
          <p>(Later: dispenses, administrations, audit trail.)</p>
        </>
      )}
    </main>
  );
}
