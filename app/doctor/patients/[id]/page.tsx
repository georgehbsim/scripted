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

if (rxError) setError(rxError.message);
else setPrescriptions((rxData as PrescriptionRow[]) ?? []);


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
