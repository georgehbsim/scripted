"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireRole } from "@/components/RequireRole";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function PrescribePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: patientId } = use(params);

  return (
    <RequireRole allowed={["doctor"]}>
      <PrescribeInner patientId={patientId} />
    </RequireRole>
  );
}

function PrescribeInner({ patientId }: { patientId: string }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  const [medicationName, setMedicationName] = useState("");
  const [dose, setDose] = useState("");
  const [route, setRoute] = useState("");
  const [frequency, setFrequency] = useState("");
  const [instructions, setInstructions] = useState("");
  const [indication, setIndication] = useState("");
  const [repeats, setRepeats] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const prescriberUserId = userData.user?.id;

    if (userErr || !prescriberUserId) {
      setStatus(userErr?.message ?? "Not logged in.");
      setLoading(false);
      return;
    }

    const repeatsInt =
      repeats.trim() === "" ? null : Number.parseInt(repeats, 10);

    if (repeatsInt !== null && Number.isNaN(repeatsInt)) {
      setStatus("Repeats must be a number (or blank).");
      setLoading(false);
      return;
    }

    const payload = {
      patient_id: patientId,
      prescriber_user_id: prescriberUserId,
      medication_name: medicationName.trim(),
      dose: dose.trim() || null,
      route: route.trim() || null,
      frequency: frequency.trim() || null,
      instructions: instructions.trim() || null,
      indication: indication.trim() || null,
      repeats: repeatsInt,
      status: "active",
    };

    const { error } = await supabase.from("prescriptions").insert(payload);

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    router.push(`/doctor/patients/${patientId}`);
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 700 }}>
      <p>
        <Link href={`/doctor/patients/${patientId}`}>← Back to patient</Link>
      </p>

      <h1 style={{ marginTop: 16 }}>New prescription</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          Medication name *
          <input
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={medicationName}
            onChange={(e) => setMedicationName(e.target.value)}
            required
            placeholder="e.g. Amoxicillin"
          />
        </label>

        <label>
          Dose
          <input
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="e.g. 500 mg"
          />
        </label>

        <label>
          Route
          <input
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="e.g. PO"
          />
        </label>

        <label>
          Frequency
          <input
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="e.g. TDS"
          />
        </label>

        <label>
          Instructions
          <textarea
            style={{ width: "100%", padding: 8, marginTop: 4, minHeight: 80 }}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Take with food"
          />
        </label>

        <label>
          Indication
          <input
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={indication}
            onChange={(e) => setIndication(e.target.value)}
            placeholder="e.g. Otitis media"
          />
        </label>

        <label>
          Repeats (optional)
          <input
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            value={repeats}
            onChange={(e) => setRepeats(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 2"
          />
        </label>

        <button disabled={loading} style={{ padding: 10 }}>
          {loading ? "Saving…" : "Save prescription"}
        </button>

        {status && <pre style={{ whiteSpace: "pre-wrap" }}>{status}</pre>}
      </form>
    </main>
  );
}
