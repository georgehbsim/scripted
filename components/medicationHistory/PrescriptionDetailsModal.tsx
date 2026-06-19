"use client";

import { useEffect } from "react";
import { displayForDurationKey } from "@/components/durationOptions";
import { displayForFrequencyCode } from "@/components/frequencyOptions";
import { displayForRouteCode } from "@/components/routeOptions";
import { eventDate, formatDateOnly, formatDateTime, formatStatus } from "./helpers";
import type { HistoryLine, HistoryPrescription } from "./types";

export default function PrescriptionDetailsModal({
  open,
  rx,
  lines,
  onClose,
}: {
  open: boolean;
  rx: HistoryPrescription | null;
  lines: HistoryLine[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !rx) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,24,39,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 760,
          maxWidth: "100%",
          maxHeight: "calc(100vh - 48px)",
          overflow: "auto",
          background: "#ffffff",
          color: "#111827",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "start",
            position: "sticky",
            top: 0,
            background: "#ffffff",
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{rx.medication_name}</div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#374151" }}>
              {formatDateTime(eventDate(rx))} · {formatStatus(rx.status)}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #d1d5db",
              background: "#fff",
              borderRadius: 8,
              padding: "8px 10px",
              cursor: "pointer",
              color: "#111827",
              fontWeight: 700,
            }}
          >
            Close
          </button>
        </div>

        <div style={{ padding: 18, display: "grid", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr",
              gap: 10,
              alignItems: "start",
            }}
          >
            <div style={{ fontWeight: 700 }}>Medication</div>
            <div>{rx.medication_name || "—"}</div>
          </div>

          <div>
            {lines.length === 0 ? (
              <div>—</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {lines.map((line, idx) => (
                  <div
                    key={line.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 14,
                      background: "#f9fafb",
                    }}
                  >
                    <div style={{ fontWeight: 800, marginBottom: 10 }}>
                      {idx === 0
                        ? `Line ${idx + 1}`
                        : `${line.connector_from_prev || "AND"} · Line ${idx + 1}`}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "180px 1fr",
                        gap: 8,
                        alignItems: "start",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>Medication / form</div>
                      <div>{line.product_label || line.product_dose_form || rx.medication_name || "—"}</div>

                      <div style={{ fontWeight: 700 }}>Dose wording</div>
                      <div>{line.dose_text || "—"}</div>

                      <div style={{ fontWeight: 700 }}>Dose value</div>
                      <div>{line.dose_amount_low ?? "—"}</div>

                      <div style={{ fontWeight: 700 }}>Dose range</div>
                      <div>{line.dose_amount_high ?? "—"}</div>

                      <div style={{ fontWeight: 700 }}>Units</div>
                      <div>{line.dose_unit || "—"}</div>

                      <div style={{ fontWeight: 700 }}>Calculated dose</div>
                      <div>
                        {line.dose_amount_low_calculated != null && line.dose_unit_calculated
                          ? line.dose_amount_high_calculated != null
                            ? `${line.dose_amount_low_calculated}-${line.dose_amount_high_calculated} ${line.dose_unit_calculated}`
                            : `${line.dose_amount_low_calculated} ${line.dose_unit_calculated}`
                          : "—"}
                      </div>

                      <div style={{ fontWeight: 700 }}>Route</div>
                      <div>
                        {(line.route_codes ?? [])
                          .map((code) => displayForRouteCode(code) || code)
                          .join(", ") || "—"}
                      </div>

                      <div style={{ fontWeight: 700 }}>Frequency</div>
                      <div>
                        {line.frequency_code
                          ? displayForFrequencyCode(line.frequency_code) || line.frequency_code
                          : "—"}
                      </div>

                      <div style={{ fontWeight: 700 }}>Duration</div>
                      <div>
                        {line.duration_key
                          ? line.duration_key === "ONGOING"
                            ? "Ongoing"
                            : displayForDurationKey(line.duration_key) || line.duration_key
                          : "—"}
                      </div>

                      <div style={{ fontWeight: 700 }}>Product strength</div>
                      <div>{line.product_strength || "—"}</div>

                      <div style={{ fontWeight: 700 }}>Product dose form</div>
                      <div>{line.product_dose_form || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr",
              gap: 10,
              alignItems: "start",
            }}
          >
            <div style={{ fontWeight: 700 }}>Status</div>
            <div>{formatStatus(rx.status)}</div>

            <div style={{ fontWeight: 700 }}>Indication</div>
            <div>{rx.indication || "—"}</div>

            <div style={{ fontWeight: 700 }}>Start date</div>
            <div>{formatDateOnly(rx.start_date)}</div>

            <div style={{ fontWeight: 700 }}>Created</div>
            <div>{formatDateTime(rx.created_at)}</div>

            <div style={{ fontWeight: 700 }}>Additional information</div>
            <div>{rx.additional_information || "—"}</div>

            <div style={{ fontWeight: 700 }}>Change reason</div>
            <div>{rx.change_reason || "—"}</div>

            <div style={{ fontWeight: 700 }}>Stop reason</div>
            <div>{rx.stop_reason || "—"}</div>

            <div style={{ fontWeight: 700 }}>Stopped at</div>
            <div>{formatDateTime(rx.stopped_at)}</div>

            <div style={{ fontWeight: 700 }}>PRN</div>
            <div>{rx.is_prn ? "Yes" : "No"}</div>

            <div style={{ fontWeight: 700 }}>STAT</div>
            <div>{rx.is_stat ? "Yes" : "No"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}