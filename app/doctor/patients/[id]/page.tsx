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

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, date_of_birth, nhi, created_at")
        .eq("id", patientId)
        .single();

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
          <p>(Next step: list + create prescriptions for this patient.)</p>

          <h2 style={{ marginTop: 24 }}>Activity</h2>
          <p>(Later: dispenses, administrations, audit trail.)</p>
        </>
      )}
    </main>
  );
}
