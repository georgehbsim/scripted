import React from "react";

type PrescriptionLineRow = {
  id: string;
  line_index: number;
  connector_from_prev: "AND" | "THEN" | null;
  dose_text: string;
  dose_amount_low: number | null;
  dose_amount_high: number | null;
  dose_unit: string;
  route_codes: string[];
  frequency_code: string;
  duration_key: string;
  dose_amount_low_calculated?: number | null;
  dose_amount_high_calculated?: number | null;
  dose_unit_calculated?: string | null;
  selected_product_id?: string | null;
  source_product_code?: string | null;
  product_label?: string | null;
  product_strength?: string | null;
  product_dose_form?: string | null;
  is_prn?: boolean | null;
};

export type PrescriptionRow = {
  id: string;
  prescription_id: string;
  medication_banner_id: string | null;
  medication_name: string;
  banner_name: string | null;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  duration?: string | null;
  indication?: string | null;
  is_prn?: boolean | null;
  is_stat?: boolean | null;
  dispense_cycle: number;
  created_at: string;
  start_date?: string | null;
  medication_section: string | null;  regimen_lines?: PrescriptionLineRow[];
  last_dispensed_at?: string | null;
  last_dispensed_cycle?: number | null;
  additional_information?: string | null;
  change_reason?: string | null;
  status: string;
};

type MedicationTableProps = {
  prescriptions: PrescriptionRow[];
  busyRxId: string | null;
  onStop: (rx: PrescriptionRow) => void;
  onChangeMedication: (rx: PrescriptionRow) => void;
  displayForRouteCode: (code: string) => string;
  displayForFrequencyCode: (code: string) => string;
  onViewHistory: (medicationBannerId: string) => void;
};

function formatCalculatedDose(line: PrescriptionLineRow) {
  if (line.dose_amount_low_calculated == null || !line.dose_unit_calculated) {
    return line.dose_text;
  }

  if (line.dose_amount_high_calculated != null) {
    return `${line.dose_amount_low_calculated}-${line.dose_amount_high_calculated} ${line.dose_unit_calculated}`;
  }

  return `${line.dose_amount_low_calculated} ${line.dose_unit_calculated}`;
}

function getDoseLines(lines?: PrescriptionLineRow[]) {
  if (!lines || lines.length === 0) return [];

  return lines.map((line, index) => {
    const connector =
      index > 0 && line.connector_from_prev ? `${line.connector_from_prev} ` : "";
    return `${connector}${formatCalculatedDose(line)}`;
  });
}

function getFrequencyLines(
  lines: PrescriptionLineRow[] | undefined,
  displayForFrequencyCode: (code: string) => string
) {
  if (!lines || lines.length === 0) return [];

  return lines.map((line, index) => {
    const connector =
      index > 0 && line.connector_from_prev ? `${line.connector_from_prev} ` : "";
    return `${connector}${displayForFrequencyCode(line.frequency_code) || line.frequency_code}`;
  });
}

function getRouteLines(
  lines: PrescriptionLineRow[] | undefined,
  displayForRouteCode: (code: string) => string
) {
  if (!lines || lines.length === 0) return [];

  return lines.map((line, index) => {
    const connector =
      index > 0 && line.connector_from_prev ? `${line.connector_from_prev} ` : "";
    const routeText =
      (line.route_codes ?? [])
        .map((code) => displayForRouteCode(code) || code)
        .join(", ") || "—";

    return `${connector}${routeText}`;
  });
}

const headerCellStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
};

const bodyCellStyle: React.CSSProperties = {
  padding: "14px",
  verticalAlign: "top",
  borderBottom: "1px solid #e5e7eb",
  color: "#111827",
  background: "#ffffff",
};

const actionButtonStyle: React.CSSProperties = {
  padding: "7px 12px",
  background: "#f8fbff",
  color: "#111827",
  border: "1px solid #111827",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  marginLeft: 8,
};

export default function MedicationTable({
  prescriptions,
  busyRxId,
  onStop,
  onViewHistory,
  onChangeMedication,
  displayForRouteCode,
  displayForFrequencyCode,
}: MedicationTableProps) {
  if (prescriptions.length === 0) {
    return <p style={{ color: "#6b7280", marginTop: 8 }}>None</p>;
  }

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr>
  <th style={{ ...headerCellStyle, width: 260 }}>Medication</th>
  <th style={{ ...headerCellStyle, width: 150 }}>Dose</th>
  <th style={{ ...headerCellStyle, width: 180 }}>Frequency</th>
  <th style={headerCellStyle}>Route</th>
  <th style={{ ...headerCellStyle, textAlign: "right", width: 320 }}>
    Actions
  </th>
</tr>
        </thead>

        <tbody>
          {prescriptions.map((rx, rowIndex) => {
            const doseLines = getDoseLines(rx.regimen_lines);
            const frequencyLines = getFrequencyLines(
              rx.regimen_lines,
              displayForFrequencyCode
            );
            const routeLines = getRouteLines(rx.regimen_lines, displayForRouteCode);

            const rowCellStyle: React.CSSProperties =
              rowIndex === prescriptions.length - 1
                ? { ...bodyCellStyle, borderBottom: "none" }
                : bodyCellStyle;

            return (
              <tr key={rx.id}>
                <td style={{ ...rowCellStyle, width: "25%" }}>
                  <div style={{ fontWeight: 700 }}>
                    {rx.banner_name ?? rx.medication_name}
                  </div>
                </td>

                <td style={rowCellStyle}>
                  {doseLines.length ? (
                    doseLines.map((line, idx) => <div key={idx}>{line}</div>)
                  ) : (
                    <div>{rx.dose || "—"}</div>
                  )}
                </td>

                <td style={rowCellStyle}>
                  {frequencyLines.length ? (
                    frequencyLines.map((line, idx) => <div key={idx}>{line}</div>)
                  ) : (
                    <div>{rx.frequency || "—"}</div>
                  )}
                </td>

                <td style={rowCellStyle}>
                  {routeLines.length ? (
                    routeLines.map((line, idx) => <div key={idx}>{line}</div>)
                  ) : (
                    <div>{rx.route || "—"}</div>
                  )}
                </td>

                <td
                  style={{
                    ...rowCellStyle,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                    width: 320,
                  }}
                >
                  {rx.medication_banner_id ? (
                    <button
                      onClick={() => onViewHistory(rx.medication_banner_id!)}
                      style={actionButtonStyle}
                    >
                      View history
                    </button>
                  ) : null}

                  {rx.medication_section !== "stopped" ? (
                    <button
                      onClick={() => onChangeMedication(rx)}
                      style={actionButtonStyle}
                    >
                      Change
                    </button>
                  ) : null}

                  {rx.medication_section !== "stopped" ? (
                    <button
                      onClick={() => onStop(rx)}
                      disabled={busyRxId === rx.id}
                      style={{
                        ...actionButtonStyle,
                        opacity: busyRxId === rx.id ? 0.7 : 1,
                        cursor: busyRxId === rx.id ? "default" : "pointer",
                      }}
                    >
                      {busyRxId === rx.id ? "Working…" : "Stop"}
                    </button>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}