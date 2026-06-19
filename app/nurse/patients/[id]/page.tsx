"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireRole } from "@/components/RequireRole";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import MedicationTableNurse, {
  type PrescriptionRowNurse,
} from "@/components/nurse/MedicationTableNurse";
import PatientDetailLayoutNurse from "@/components/nurse/PatientDetailLayoutNurse";
import { displayForFrequencyCode } from "@/components/frequencyOptions";
import { displayForRouteCode } from "@/components/routeOptions";
import AdministerMedicationDialog from "@/components/nurse/AdministerMedicationDialog";
import AdministrationHistoryDialog from "@/components/nurse/AdministrationHistoryDialog";

type PatientRow = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  nhi: string | null;
  created_at: string;
  allergies?: string | null;
};

type AdministrationHistoryRow = {
  id: string;
  banner_name: string | null;
  medication_name: string | null;
  administration_status: string;
  actual_time: string;
  route_used: string | null;
  reason_not_given: string | null;
  note: string | null;
  dose_value: string | null;
  dose_unit: string | null;
  prescribed_dose_value: string | null;
  prescribed_dose_unit: string | null;
  prescribed_dose_text: string | null;
};

function calcAge(dobIso: string | null): string {
  if (!dobIso) return "—";
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return "—";

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? String(age) : "—";
}

export default function NursePatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <RequireRole allowed={["nurse"]}>
      <NursePatientDetailInner patientId={id} />
    </RequireRole>
  );
}

function NursePatientDetailInner({ patientId }: { patientId: string }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRowNurse[]>([]);
  const [adminTarget, setAdminTarget] = useState<PrescriptionRowNurse | null>(null);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [isSavingAdministration, setIsSavingAdministration] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyRows, setHistoryRows] = useState<AdministrationHistoryRow[]>([]);

  const currentRegular = prescriptions.filter(
    (rx) => rx.medication_section === "current_regular"
  );

  const currentPrn = prescriptions.filter(
    (rx) => rx.medication_section === "current_prn"
  );

  const stopped = prescriptions.filter(
    (rx) => rx.medication_section === "stopped"
  );

      async function handleSaveAdministration(payload: {
    administration_status: "given" | "not_given" | "withheld" | "refused" | "partially_given";
    actual_time: string;
    route_used: string | null;
    reason_not_given: string | null;
    note: string | null;
    dose_value: string | null;
    dose_unit: string | null;
    prescribed_dose_value: string | null;
    prescribed_dose_unit: string | null;
    prescribed_dose_text: string | null;
  }) {
    if (!adminTarget || !patient) return;

    setIsSavingAdministration(true);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const administeredByUserId = userData.user?.id;

      if (userErr || !administeredByUserId) {
        throw new Error(userErr?.message ?? "Not logged in.");
      }

      const actualTimeIso = new Date(payload.actual_time).toISOString();

            const { error: insertError } = await supabase
        .from("administration_events")
        .insert({
          patient_id: patient.id,
          prescription_id: adminTarget.prescription_id,
          prescription_line_id: adminTarget.regimen_lines?.[0]?.id ?? null,
          medication_banner_id: adminTarget.medication_banner_id,
          administered_by_user_id: administeredByUserId,
          administration_status: payload.administration_status,
          actual_time: actualTimeIso,
          route_used: payload.route_used,
          reason_not_given: payload.reason_not_given,
          note: payload.note,
          dose_value: payload.dose_value,
          dose_unit: payload.dose_unit,
          prescribed_dose_value: payload.prescribed_dose_value,
          prescribed_dose_unit: payload.prescribed_dose_unit,
          prescribed_dose_text: payload.prescribed_dose_text,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setIsAdminDialogOpen(false);
      setAdminTarget(null);
      await load();
      alert("Administration recorded.");
    } catch (err: any) {
      alert(err.message ?? "Failed to save administration.");
    } finally {
      setIsSavingAdministration(false);
    }
  }

  async function loadAdministrationHistory(params?: { medicationBannerId?: string }) {
  setIsLoadingHistory(true);
  setIsHistoryOpen(true);

  let query = supabase
    .from("administration_events")
    .select(`
      id,
      administration_status,
      actual_time,
      route_used,
      reason_not_given,
      note,
      dose_value,
      dose_unit,
      prescribed_dose_value,
      prescribed_dose_unit,
      prescribed_dose_text,
      medication_banner_id,
      prescriptions!inner (
        patient_id,
        medication_name
      )
    `)    .eq("prescriptions.patient_id", patientId)
    .order("actual_time", { ascending: false })
    .limit(10);

  if (params?.medicationBannerId) {
    query = query.eq("medication_banner_id", params.medicationBannerId);
  }

  const { data, error } = await query;

  if (error) {
    alert(error.message);
    setHistoryRows([]);
    setIsLoadingHistory(false);
    return;
  }

  const rows = (data ?? []) as any[];

  const bannerIds = Array.from(
    new Set(
      rows
        .map((row) => row.medication_banner_id)
        .filter(Boolean)
    )
  );

  let bannerNameMap = new Map<string, string>();

  if (bannerIds.length > 0) {
    const { data: bannerData, error: bannerError } = await supabase
      .schema("app_meds")
      .from("medication_banner")
      .select("id, display_name")
      .in("id", bannerIds);

    if (bannerError) {
      alert(bannerError.message);
      setHistoryRows([]);
      setIsLoadingHistory(false);
      return;
    }

    bannerNameMap = new Map(
      ((bannerData ?? []) as { id: string; display_name: string }[]).map((b) => [
        b.id,
        b.display_name,
      ])
    );
  }

    const normalized = ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    banner_name: row.medication_banner_id
      ? bannerNameMap.get(row.medication_banner_id) ?? null
      : null,
    medication_name: row.prescriptions?.medication_name ?? null,
    administration_status: row.administration_status,
    actual_time: row.actual_time,
    route_used: row.route_used,
    reason_not_given: row.reason_not_given,
    note: row.note,
    dose_value: row.dose_value ?? null,
    dose_unit: row.dose_unit ?? null,
    prescribed_dose_value: row.prescribed_dose_value ?? null,
    prescribed_dose_unit: row.prescribed_dose_unit ?? null,
    prescribed_dose_text: row.prescribed_dose_text ?? null,
  }));

  setHistoryRows(normalized);
  setIsLoadingHistory(false);
}

    async function viewMedicationHistory(medicationBannerId: string) {
  await loadAdministrationHistory({ medicationBannerId });
}


    function handleAdminister(rx: PrescriptionRowNurse) {
    setAdminTarget(rx);
    setIsAdminDialogOpen(true);
  }

    function handleHeaderAdminister() {
    const firstAvailable = prescriptions.find(
      (rx) =>
        rx.medication_section !== "stopped" && rx.available_for_administration
    );

    if (!firstAvailable) {
      alert("No medications are currently available for administration.");
      return;
    }

    setAdminTarget(firstAvailable);
    setIsAdminDialogOpen(true);
  }

    async function handleHeaderViewHistory() {
  await loadAdministrationHistory();
}

  async function load() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("patients")
      .select("id, full_name, date_of_birth, nhi, created_at, allergies")
      .eq("id", patientId)
      .single();

    const { data: rxData, error: rxError } = await supabase.rpc(
      "medication_table_for_patient",
      { p_patient_id: patientId }
    );

    const normalizedRx = ((rxData ?? []) as any[]).map((rx) => ({
      ...rx,
      id: rx.prescription_id,
    }));

    if (rxError) {
      setError(rxError.message);
      setLoading(false);
      return;
    }

    setPrescriptions(normalizedRx);

    if (error) setError(error.message);
    else setPatient(data as PatientRow);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [patientId, supabase]);

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
          <Link
            href="/nurse/patients"
            style={{
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            ← Back to patients
          </Link>
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

        <div style={{ justifySelf: "end" }}>
          <button
            onClick={() => router.push("/me")}
            aria-label="Account"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#ffffff",
              padding: "8px 10px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 13 }}>Account</span>
          </button>
        </div>
      </div>

      <PatientDetailLayoutNurse
        patient={patient}
        calcAge={calcAge}
        onViewHistory={handleHeaderViewHistory}
        onAdministerMedication={handleHeaderAdminister}
      />

      <div style={{ padding: 24, }}>
        {prescriptions.length === 0 ? (
          <p style={{ marginTop: 12 }}>No prescriptions yet.</p>
        ) : (
          <>
            <div style={{ marginTop: 0 }}>
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
              <MedicationTableNurse
                prescriptions={currentRegular}
                displayForRouteCode={displayForRouteCode}
                displayForFrequencyCode={displayForFrequencyCode}
                onViewHistory={viewMedicationHistory}
                onAdminister={handleAdminister}
              />
            </div>

            <div style={{ marginTop: 24 }}>
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
              <MedicationTableNurse
                prescriptions={currentPrn}
                displayForRouteCode={displayForRouteCode}
                displayForFrequencyCode={displayForFrequencyCode}
                onViewHistory={viewMedicationHistory}
                onAdminister={handleAdminister}
              />
            </div>

            <div style={{ marginTop: 24 }}>
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
              <MedicationTableNurse
                prescriptions={stopped}
                displayForRouteCode={displayForRouteCode}
                displayForFrequencyCode={displayForFrequencyCode}
                onViewHistory={viewMedicationHistory}
                onAdminister={handleAdminister}
              />
            </div>
          </>
        )}
      </div>

            <AdministerMedicationDialog
        open={isAdminDialogOpen}
        rx={adminTarget}
        saving={isSavingAdministration}
        onClose={() => {
          if (isSavingAdministration) return;
          setIsAdminDialogOpen(false);
          setAdminTarget(null);
        }}
        onSave={handleSaveAdministration}
      />
            <AdministrationHistoryDialog
        open={isHistoryOpen}
        loading={isLoadingHistory}
        rows={historyRows}
        onClose={() => setIsHistoryOpen(false)}
      />
    </main>
  );
}