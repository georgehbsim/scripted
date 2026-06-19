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
  is_prn?: boolean;
};

export type PrescriptionRowPharmacy = {
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
  is_prn?: boolean;
  is_stat?: boolean;
  dispense_cycle: number;
  created_at: string;
  start_date?: string | null;
  medication_section: "current_regular" | "current_prn" | "stopped";
  regimen_lines?: PrescriptionLineRow[];
  last_dispensed_at?: string | null;
  last_dispensed_cycle?: number | null;
  additional_information?: string | null;
  change_reason?: string | null;
  dispense_available?: boolean;
};

type MedicationTablePharmacyProps = {
  prescriptions: PrescriptionRowPharmacy[];
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
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

export default function MedicationTablePharmacy({
  prescriptions,
  displayForRouteCode,
  displayForFrequencyCode,
  onViewHistory,
}: MedicationTablePharmacyProps) {
  if (prescriptions.length === 0) {
    return <p style={{ color: "#6b7280", marginTop: 8 }}>None</p>;
  }

  return (
    <div
      style={{
        width: "100%",
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
            <th style={{ ...headerCellStyle, textAlign: "right", width: 180 }}>
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
              <tr
                key={rx.prescription_id || `${rx.medication_banner_id ?? "med"}-${rx.created_at}`}
              >
                <td style={{ ...rowCellStyle, width: 260 }}>
                  <div style={{ fontWeight: 700 }}>
                    {rx.banner_name ?? rx.medication_name}
                  </div>
                </td>

                <td style={{ ...rowCellStyle, width: 150 }}>
                  {doseLines.length ? (
                    doseLines.map((line, idx) => <div key={idx}>{line}</div>)
                  ) : (
                    <div>{rx.dose || "—"}</div>
                  )}
                </td>

                <td style={{ ...rowCellStyle, width: 180 }}>
                  {frequencyLines.length ? (
                    frequencyLines.map((line, idx) => <div key={idx}>{line}</div>)
                  ) : (
                    <div>{rx.frequency || "—"}</div>
                  )}
                </td>

                <td style={rowCellStyle}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      {routeLines.length ? (
                        routeLines.map((line, idx) => <div key={idx}>{line}</div>)
                      ) : (
                        <div>{rx.route || "—"}</div>
                      )}
                    </div>

                    {rx.dispense_available ? (
                      <div style={badgeStyle}>Dispense available</div>
                    ) : null}
                  </div>
                </td>

                <td
                  style={{
                    ...rowCellStyle,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                    width: 180,
                  }}
                >
                  {rx.medication_banner_id ? (
                    <button
                      onClick={() => onViewHistory(rx.medication_banner_id!)}
                      style={actionButtonStyle}
                    >
                      View history
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