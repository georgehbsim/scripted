"use client";

import { useEffect, useMemo, useState } from "react";
import { displayForRouteCode } from "@/components/routeOptions";
import type { PrescriptionRowNurse } from "@/components/nurse/MedicationTableNurse";

type AdministrationStatus =
  | "given"
  | "not_given"
  | "withheld"
  | "refused"
  | "partially_given";

type Props = {
  open: boolean;
  rx: PrescriptionRowNurse | null;
  onClose: () => void;
  saving: boolean;
    onSave: (payload: {
    administration_status: AdministrationStatus;
    actual_time: string;
    route_used: string | null;
    reason_not_given: string | null;
    note: string | null;
    dose_value: string | null;
    dose_unit: string | null;
    prescribed_dose_value: string | null;
    prescribed_dose_unit: string | null;
    prescribed_dose_text: string | null;
  }) => void;
};

function nowLocalDateTimeValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function AdministerMedicationDialog({
  open,
  rx,
  saving,
  onClose,
  onSave,
}: Props) {
  const [status, setStatus] = useState<AdministrationStatus>("given");
  const [actualTime, setActualTime] = useState(nowLocalDateTimeValue());
  const [routeUsed, setRouteUsed] = useState<string>("");
  const [reasonNotGiven, setReasonNotGiven] = useState("");
  const [note, setNote] = useState("");
  const [doseValue, setDoseValue] = useState("");
  const [doseUnit, setDoseUnit] = useState("");


  const allowedRoutes = useMemo(() => {
    const firstLineRoutes = rx?.regimen_lines?.[0]?.route_codes ?? [];
    if (firstLineRoutes.length > 0) return firstLineRoutes;
    if (rx?.route) return [rx.route];
    return [];
  }, [rx]);

    const prescribedLine = rx?.regimen_lines?.[0] ?? null;

   const prescribedDoseValue = useMemo(() => {
    if (!prescribedLine) return "";
    if (
      prescribedLine.dose_amount_low_calculated !== null &&
      prescribedLine.dose_amount_low_calculated !== undefined
    ) {
      return String(prescribedLine.dose_amount_low_calculated);
    }
    return "";
  }, [prescribedLine]);

  const prescribedDoseHighValue = useMemo(() => {
    if (!prescribedLine) return "";
    if (
      prescribedLine.dose_amount_high_calculated !== null &&
      prescribedLine.dose_amount_high_calculated !== undefined
    ) {
      return String(prescribedLine.dose_amount_high_calculated);
    }
    return "";
  }, [prescribedLine]);

  const prescribedDoseUnit = useMemo(() => {
    return prescribedLine?.dose_unit_calculated || "";
  }, [prescribedLine]);

  const prescribedDoseText = useMemo(() => {
    if (!prescribedLine) return "";
    if (
      prescribedLine.dose_amount_low_calculated !== null &&
      prescribedLine.dose_amount_low_calculated !== undefined &&
      prescribedLine.dose_unit_calculated
    ) {
      return prescribedLine.dose_amount_high_calculated !== null &&
        prescribedLine.dose_amount_high_calculated !== undefined
        ? `${prescribedLine.dose_amount_low_calculated}-${prescribedLine.dose_amount_high_calculated} ${prescribedLine.dose_unit_calculated}`
        : `${prescribedLine.dose_amount_low_calculated} ${prescribedLine.dose_unit_calculated}`;
    }
    return "";
  }, [prescribedLine]);

    useEffect(() => {
    if (!open || !rx) return;

    setStatus("given");
    setActualTime(nowLocalDateTimeValue());
    setRouteUsed(allowedRoutes[0] ?? "");
    setReasonNotGiven("");
    setNote("");
    setDoseValue(prescribedDoseValue);
    setDoseUnit(prescribedDoseUnit);
  }, [open, rx, allowedRoutes, prescribedDoseValue, prescribedDoseUnit]);

  if (!open || !rx) return null;

  const routeRequired = status === "given" || status === "partially_given";
  const reasonRequired =
    status === "not_given" || status === "withheld" || status === "refused";

  const doseRequired = status === "given" || status === "partially_given";

    const canSave =
    actualTime.trim() &&
    (!routeRequired || routeUsed.trim()) &&
    (!reasonRequired || reasonNotGiven.trim()) &&
    (!doseRequired || (doseValue.trim() && doseUnit.trim()));

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: "100%",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <div style={{ fontWeight: 700, color: "#111827" }}>
            Administer medication
          </div>
          <div style={{ marginTop: 4, color: "#374151", fontSize: 14 }}>
            {rx.banner_name ?? rx.medication_name}
          </div>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
              Status
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AdministrationStatus)}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                background: "#fff",
                color: "#111827",
              }}
            >
              <option value="given">Given</option>
              <option value="not_given">Not given</option>
              <option value="withheld">Withheld</option>
              <option value="refused">Refused</option>
              <option value="partially_given">Partially given</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
              Actual time
            </div>
            <input
              type="datetime-local"
              value={actualTime}
              onChange={(e) => setActualTime(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                background: "#fff",
                color: "#111827",
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
              Route used
            </div>
            <select
              value={routeUsed}
              onChange={(e) => setRouteUsed(e.target.value)}
              disabled={!routeRequired}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                background: routeRequired ? "#fff" : "#f3f4f6",
                color: "#111827",
              }}
            >
              <option value="">
                {allowedRoutes.length ? "Select route" : "No route options available"}
              </option>
              {allowedRoutes.map((route) => (
                <option key={route} value={route}>
                  {displayForRouteCode(route) || route}
                </option>
              ))}
            </select>
          </div>

                    <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: "#f9fafb",
              padding: 12,
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
              Prescribed dose
            </div>
            <div style={{ color: "#111827", fontWeight: 600 }}>
              {prescribedDoseText ||
                [prescribedDoseValue, prescribedDoseUnit].filter(Boolean).join(" ") ||
                "—"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
              Dose administered
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <input
                value={doseValue}
                onChange={(e) => setDoseValue(e.target.value)}
                disabled={!doseRequired}
                placeholder="Dose value"
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  background: doseRequired ? "#fff" : "#f3f4f6",
                  color: "#111827",
                  boxSizing: "border-box",
                }}
              />

              <input
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value)}
                disabled={!doseRequired}
                placeholder="Unit"
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  background: doseRequired ? "#fff" : "#f3f4f6",
                  color: "#111827",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {reasonRequired ? (
            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                Reason not given
              </div>
              <input
                value={reasonNotGiven}
                onChange={(e) => setReasonNotGiven(e.target.value)}
                placeholder="Enter reason"
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  background: "#fff",
                  color: "#111827",
                }}
              />
            </div>
          ) : null}

          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
              Note
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional note"
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                background: "#fff",
                color: "#111827",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() =>
                            onSave({
                administration_status: status,
                actual_time: actualTime,
                route_used: routeRequired ? routeUsed || null : null,
                reason_not_given: reasonRequired ? reasonNotGiven.trim() || null : null,
                note: note.trim() || null,
                dose_value: doseRequired ? doseValue.trim() || null : null,
                dose_unit: doseRequired ? doseUnit.trim() || null : null,
                prescribed_dose_value: prescribedDoseValue || null,
                prescribed_dose_unit: prescribedDoseUnit || null,
                prescribed_dose_text: prescribedDoseText || null,
              })
            }
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #111827",
              background: "#111827",
              color: "#fff",
              cursor: !canSave || saving ? "not-allowed" : "pointer",
              opacity: !canSave || saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save administration"}
          </button>
        </div>
      </div>
    </div>
  );
}