"use client";

import { displayForFrequencyCode } from "@/components/frequencyOptions";
import type {
  AdministrationRow,
  DispenseRow,
  HistoryLine,
  HistoryPrescription,
} from "./types";
import {
  adminBadge,
  badgeBase,
  formatDateOnly,
  formatDateTime,
  formatStatus,
} from "./helpers";

export function PrescribingCard({
  rx,
  lines,
  allRows,
  onOpenDetails,
}: {
  rx: HistoryPrescription;
  lines: HistoryLine[];
  allRows: HistoryPrescription[];
  onOpenDetails: (rx: HistoryPrescription) => void;
}) {

  const regimenLines = lines.length
  ? lines.map((line, index) => {
      const dose =
        line.dose_amount_low_calculated != null && line.dose_unit_calculated
          ? line.dose_amount_high_calculated != null
            ? `${line.dose_amount_low_calculated}-${line.dose_amount_high_calculated} ${line.dose_unit_calculated}`
            : `${line.dose_amount_low_calculated} ${line.dose_unit_calculated}`
          : line.dose_text || "—";

      const frequency = line.frequency_code
        ? displayForFrequencyCode(line.frequency_code) || line.frequency_code
        : "";

      const text = [dose, frequency].filter(Boolean).join(" ");

      return index > 0 && line.connector_from_prev
        ? `${line.connector_from_prev} ${text}`
        : text;
    })
  : [];

  return (
    <div
      key={rx.id}
      style={{
        width: 320,
        minHeight: 170,
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        background: "#ffffff",
        color: "#111827",
        padding: 16,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        display: "grid",
        gap: 10,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: -10,
          width: 20,
          height: 2,
          background: "#d1d5db",
        }}
      />

            <div style={{ display: "grid", gap: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: rx.status === "stopped" ? "#b91c1c" : "#166534",
            }}
          >
            {rx.status === "stopped" ? "Stopped" : "Current"}
          </div>

          <button
            type="button"
            onClick={() => onOpenDetails(rx)}
            title="View full prescription"
            aria-label="View full prescription"
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              cursor: "pointer",
              fontWeight: 800,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              flexShrink: 0,
            }}
          >
            i
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 8,
            alignItems: "center",
            fontSize: 13,
            color: "#374151",
          }}
        >
          <div style={{ justifySelf: "start", fontWeight: 600 }}>
            {rx.start_date ? formatDateOnly(rx.start_date) : "—"}
          </div>

          <div style={{ color: "#9ca3af", fontWeight: 700 }}>→</div>

          <div style={{ justifySelf: "end", fontWeight: 600 }}>
            {rx.stopped_at ? formatDateOnly(rx.stopped_at) : "Ongoing"}
          </div>
        </div>
      </div>

<div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.35 }}>
  {regimenLines.length ? (
    regimenLines.map((line, index) => (
      <div key={index}>{line}</div>
    ))
  ) : (
    "—"
  )}
</div>

      <div style={{ display: "grid", gap: 6, fontSize: 14, color: "#111827" }}>
        <div>
          <strong>Indication:</strong> {rx.indication || "—"}
        </div>

        {rx.change_reason ? (
          <div>
            <strong>Change reason:</strong> {rx.change_reason}
          </div>
        ) : null}

        {rx.stop_reason ? (
          <div>
            <strong>Stop reason:</strong> {rx.stop_reason}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DispenseCard({ d }: { d: DispenseRow }) {
  const isSent = d.event_type === "sent";

  return (
    <div
      style={{
        width: 290,
        minHeight: 170,
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        background: "#ffffff",
        padding: 16,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        display: "grid",
        gap: 10,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: -10,
          width: 20,
          height: 2,
          background: "#d1d5db",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "#111827", marginBottom: 4 }}>
            {formatDateTime(d.event_at)}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>
            {isSent ? "Sent to pharmacy" : `Dispense ${d.dispense_number ?? "—"}`}
          </div>
        </div>
        <div style={badgeBase}>{formatStatus(d.event_type)}</div>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.45 }}>
        <div style={{ fontWeight: 700 }}>{d.medication_title || "Medication"}</div>
        <div style={{ marginTop: 6, color: "#111827" }}>{d.medication_subtitle || "—"}</div>
      </div>

      <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#111827" }}>
        <div>
          <strong>Supply:</strong> {d.authored_supply_text || "—"}
        </div>
        <div>
          <strong>Repeats:</strong> {d.authored_repeats_text || "—"}
        </div>
        <div>
          <strong>Blister pack:</strong> {d.blister_pack ? "Yes" : "No"}
        </div>
      </div>
    </div>
  );
}

export function AdministrationCard({ a }: { a: AdministrationRow }) {
  return (
    <div
      key={a.id}
      style={{
        width: 290,
        minHeight: 170,
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        background: "#ffffff",
        padding: 16,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        display: "grid",
        gap: 10,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: -10,
          width: 20,
          height: 2,
          background: "#d1d5db",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "#111827", marginBottom: 4 }}>
            {formatDateTime(a.actual_time)}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Administration</div>
        </div>
        <div style={adminBadge(a.administration_status)}>
          {formatStatus(a.administration_status)}
        </div>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.45 }}>
<div style={{ fontWeight: 700 }}>
  {[a.dose_value, a.dose_unit].filter(Boolean).join(" ") ||
    a.prescribed_dose_text ||
    [a.prescribed_dose_value, a.prescribed_dose_unit].filter(Boolean).join(" ") ||
    "Dose not recorded"}
</div>
        <div style={{ marginTop: 6, color: "#111827" }}>
          {(a.route_used || "") +
            "  " +
            (a.frequency_code ? displayForFrequencyCode(a.frequency_code) || a.frequency_code : "")}
        </div>
      </div>

      <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#111827" }}>
        {a.reason_not_given ? (
          <div>
            <strong>Reason not given:</strong> {a.reason_not_given}
          </div>
        ) : null}
        {a.note ? (
          <div>
            <strong>Note:</strong> {a.note}
          </div>
        ) : null}
        {!a.reason_not_given && !a.note ? <div>—</div> : null}
      </div>
    </div>
  );
}