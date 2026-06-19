"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { displayForFrequencyCode } from "@/components/frequencyOptions";
import { displayForRouteCode } from "@/components/routeOptions";
import { displayForDurationKey } from "@/components/durationOptions";
import PrescriptionDetailsModal from "@/components/medicationHistory/PrescriptionDetailsModal";
import ScrollLane from "@/components/medicationHistory/ScrollLane";
import HistorySummaryHeader from "@/components/medicationHistory/HistorySummaryHeader";

import type {
  AdministrationRow,
  DispenseRow,
  HistoryLine,
  HistoryPrescription,
  PatientRow,
} from "@/components/medicationHistory/types";

import {
  eventDate,
  formatDateOnly,
  formatDateTime,
  formatRegimen,
  calcAge,
} from "@/components/medicationHistory/helpers";


import {
  AdministrationCard,
  DispenseCard,
  PrescribingCard,
} from "@/components/medicationHistory/HistoryCards";


export default function MedicationHistoryPage() {
  const params = useParams<{ id: string; bannerId: string }>();
  const patientId = params.id;
  const bannerId = params.bannerId;

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [bannerName, setBannerName] = useState("Medication history");
  const [prescriptions, setPrescriptions] = useState<HistoryPrescription[]>([]);
  const [linesByPrescription, setLinesByPrescription] = useState<Record<string, HistoryLine[]>>({});
  const [dispenses, setDispenses] = useState<DispenseRow[]>([]);
  const [administrations, setAdministrations] = useState<AdministrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingPrescription, setViewingPrescription] = useState<HistoryPrescription | null>(null);


  const currentRx = useMemo(() => {
    const active = prescriptions.filter((p) => p.status === "active");
    if (active.length > 0) {
      return [...active].sort(
        (a, b) => new Date(eventDate(b)).getTime() - new Date(eventDate(a)).getTime()
      )[0];
    }

    return [...prescriptions].sort(
      (a, b) => new Date(eventDate(b)).getTime() - new Date(eventDate(a)).getTime()
    )[0] ?? null;
  }, [prescriptions]);

 const compactCurrentRegimen = useMemo(() => {
  if (!currentRx) return "—";

  const lines = linesByPrescription[currentRx.id] ?? [];
  if (!lines.length) return "—";

  return lines
    .map((line, index) => {
      const dose =
        line.dose_amount_low_calculated != null && line.dose_unit_calculated
          ? line.dose_amount_high_calculated != null
            ? `${line.dose_amount_low_calculated}-${line.dose_amount_high_calculated} ${line.dose_unit_calculated}`
            : `${line.dose_amount_low_calculated} ${line.dose_unit_calculated}`
          : line.dose_text || "—";

      const frequency =
        displayForFrequencyCode(line.frequency_code) || line.frequency_code || "";

      const text = [dose, frequency].filter(Boolean).join(" ");

      return index > 0 && line.connector_from_prev
        ? `${line.connector_from_prev} ${text}`
        : text;
    })
    .join(" ");
}, [currentRx, linesByPrescription]);

  const currentRegimen = useMemo(() => {
    if (!currentRx) return "—";
    return formatRegimen(linesByPrescription[currentRx.id] ?? []);
  }, [currentRx, linesByPrescription]);

  const firstStarted = useMemo(() => {
    if (!prescriptions.length) return "—";
    const sorted = [...prescriptions].sort(
      (a, b) => new Date(eventDate(a)).getTime() - new Date(eventDate(b)).getTime()
    );
    return formatDateOnly(eventDate(sorted[0]));
  }, [prescriptions]);

  const lastChanged = useMemo(() => {
  if (!prescriptions.length) return "—";
  const sorted = [...prescriptions].sort(
    (a, b) => new Date(eventDate(b)).getTime() - new Date(eventDate(a)).getTime()
  );
  return formatDateOnly(eventDate(sorted[0]));
}, [prescriptions]);

  const lastDispensed = useMemo(() => {
  const actualDispenses = dispenses.filter(
    (d) => d.event_type === "dispensed" && d.dispensed_at
  );

  if (!actualDispenses.length) return "—";

  return formatDateTime(
    [...actualDispenses].sort(
      (a, b) =>
        new Date(b.dispensed_at || 0).getTime() -
        new Date(a.dispensed_at || 0).getTime()
    )[0]?.dispensed_at
  );
}, [dispenses]);

  const lastAdministered = useMemo(() => {
    if (!administrations.length) return "—";
    return formatDateTime(
      [...administrations].sort(
        (a, b) =>
          new Date(b.actual_time || b.created_at).getTime() -
          new Date(a.actual_time || a.created_at).getTime()
      )[0]?.actual_time
    );
  }, [administrations]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id, full_name, date_of_birth, nhi")
        .eq("id", patientId)
        .single();

      if (patientError) {
        setError(patientError.message);
        setLoading(false);
        return;
      }

      setPatient(patientData as PatientRow);

      const { data: rxData, error: rxError } = await supabase
  .from("prescriptions")
  .select(
    `
    id,
    patient_id,
    medication_banner_id,
    medication_name,
    indication,
    start_date,
    additional_information,
    is_prn,
    is_stat,
    status,
    duration,
    created_at,
    updated_at,
    stop_reason,
    stopped_at,
    change_reason,
    available_for_administration
  `
  )
  .eq("patient_id", patientId)
  .eq("medication_banner_id", bannerId)
  .order("created_at", { ascending: true });
      if (rxError) {
        setError(rxError.message);
        setLoading(false);
        return;
      }

      const rxRows = (rxData ?? []) as HistoryPrescription[];
      setPrescriptions(rxRows);
      if (rxRows.length > 0) {
  const firstName = rxRows[0].medication_name || "Medication history";
  const cleaned = firstName
    .replace(/\s+\d+(\.\d+)?\s*(mg|mcg|g|mL|ml|units?)\b.*$/i, "")
    .trim();
  setBannerName(cleaned || firstName);
}

      const prescriptionIds = rxRows.map((p) => p.id);

      if (prescriptionIds.length > 0) {
        const { data: lineData, error: lineError } = await supabase
          .from("prescription_lines")
          .select(
  `
  id,
  prescription_id,
  line_index,
  connector_from_prev,
  dose_text,
  dose_amount_low,
  dose_amount_high,
  dose_unit,
  dose_amount_low_calculated,
  dose_amount_high_calculated,
  dose_unit_calculated,
  selected_product_id,
  source_product_code,
  product_label,
  product_strength,
  product_dose_form,
  route_codes,
  frequency_code,
  duration_key,
  is_prn
`
)
          .in("prescription_id", prescriptionIds)
          .order("line_index", { ascending: true });

        if (lineError) {
          setError(lineError.message);
          setLoading(false);
          return;
        }

        const grouped: Record<string, HistoryLine[]> = {};
for (const line of (lineData ?? []) as HistoryLine[]) {
  grouped[line.prescription_id] ??= [];
  grouped[line.prescription_id].push(line);
}
setLinesByPrescription(grouped);

const lineMap = new Map<string, HistoryLine>();
Object.values(grouped).flat().forEach((line) => {
  lineMap.set(line.id, line);
});
      } else {
        setLinesByPrescription({});
      }

      const { data: dispenseData, error: dispenseError } = await supabase.rpc(
  "dispenses_for_patient_banner",
  {
    p_patient_id: patientId,
    p_banner_id: bannerId,
  }
);

if (dispenseError) {
  setError(dispenseError.message);
  setLoading(false);
  return;
}

setDispenses((dispenseData ?? []) as DispenseRow[]);

      const { data: adminData, error: adminError } = await supabase
        .from("administration_events")
        .select(
          `
          id,
patient_id,
prescription_id,
prescription_line_id,
medication_banner_id,
administered_by_user_id,
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
created_at,
updated_at
        `
        )
        .eq("patient_id", patientId)
        .eq("medication_banner_id", bannerId)
        .order("actual_time", { ascending: false })
        .limit(10);

      if (adminError) {
        setError(adminError.message);
        setLoading(false);
        return;
      }

      const adminRows = (adminData ?? []) as AdministrationRow[];
      const lineMap = new Map<string, HistoryLine>();
      Object.values(linesByPrescription).flat().forEach((line) => {
        lineMap.set(line.id, line);
      });

      const enrichedAdmins = adminRows.map((a) => {
        const line = lineMap.get(a.prescription_line_id || "");
        const rx = rxRows.find((r) => r.id === a.prescription_id);
        return {
          ...a,
          medication_name: rx?.medication_name ?? null,
          prescription_status: rx?.status ?? null,
          line_index: line?.line_index ?? null,
          dose_text: line?.dose_text ?? null,
          frequency_code: line?.frequency_code ?? null,
          duration_key: line?.duration_key ?? null,
          product_label: line?.product_label ?? null,
        };
      });

      setAdministrations(
        enrichedAdmins.sort(
          (a, b) =>
            new Date(a.actual_time || a.created_at).getTime() -
            new Date(b.actual_time || b.created_at).getTime()
        )
      );

      setLoading(false);
    }

    load();
  }, [bannerId, patientId, supabase]);

  if (loading) {
    return <main style={{ padding: 24 }}>Loading…</main>;
  }

  if (error) {
    return <main style={{ padding: 24 }}>Error: {error}</main>;
  }

  return (
<main
  style={{
    fontFamily: "system-ui",
    background: "#f9fafb",
    minHeight: "100vh",
    color: "#111827",
    colorScheme: "light",
  }}
>
      <div
        style={{
          height: 56,
          background: "#111827",
          color: "#ffffff",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ justifySelf: "start" }}>
          <Link
            href={`/doctor/patients/${patientId}`}
            style={{ color: "#ffffff", textDecoration: "none", fontWeight: 600 }}
          >
            ← Back to patient
          </Link>
        </div>

        <div style={{ justifySelf: "center", fontWeight: 800, letterSpacing: 0.2, fontSize: 18 }}>
          Scripted
        </div>

        <div style={{ justifySelf: "end", fontSize: 13, opacity: 0.9 }}>Medication history</div>
      </div>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: 24, display: "grid", gap: 24 }}>
        <HistorySummaryHeader
  bannerName={bannerName}
  patient={patient}
  currentRx={currentRx}
  compactCurrentRegimen={compactCurrentRegimen}
  firstStarted={firstStarted}
  lastChanged={lastChanged}
  lastDispensed={lastDispensed}
  lastAdministered={lastAdministered}
/>

        <ScrollLane
  title="Prescribing history"
  subtitle={`${prescriptions.length} event${prescriptions.length === 1 ? "" : "s"}`}
  emptyText="No prescribing history found."
  minHeight={215}
>
{[...prescriptions]
  .sort((a, b) => new Date(eventDate(a)).getTime() - new Date(eventDate(b)).getTime())
.map((rx) => (
  <PrescribingCard
    key={rx.id}
    rx={rx}
    lines={linesByPrescription[rx.id] ?? []}
    allRows={prescriptions}
    onOpenDetails={setViewingPrescription}
  />
))}
          </ScrollLane>

        <ScrollLane
  title="Dispensing history"
  subtitle={`${dispenses.length} event${dispenses.length === 1 ? "" : "s"}`}
  emptyText="No dispensing history."
  minHeight={215}
>
  {[...dispenses]
  .sort(
    (a, b) =>
      new Date(a.event_at || 0).getTime() -
      new Date(b.event_at || 0).getTime()
  )
  .map((d, index) => (
    <DispenseCard
      key={`${d.event_type}-${d.event_id ?? d.dispense_id ?? d.community_prescription_item_id ?? index}`}
      d={d}
    />
  ))}
</ScrollLane>


        <ScrollLane
  title="Administration history"
  subtitle={`Latest ${administrations.length} administration event${
    administrations.length === 1 ? "" : "s"
  }`}
  emptyText="No administration history."
  minHeight={215}
>
          {[...administrations]
            .sort(
              (a, b) =>
                new Date(a.actual_time || a.created_at).getTime() -
                new Date(b.actual_time || b.created_at).getTime()
            )
.map((a) => (
  <AdministrationCard key={a.id} a={a} />
))}
        </ScrollLane>
      </div>

      <PrescriptionDetailsModal
  open={!!viewingPrescription}
  rx={viewingPrescription}
lines={viewingPrescription ? linesByPrescription[viewingPrescription.id] ?? [] : []}
  onClose={() => setViewingPrescription(null)}
/>

    </main>
  );
}