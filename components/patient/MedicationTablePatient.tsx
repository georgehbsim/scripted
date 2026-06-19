export type PrescriptionRowPatient = {
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
  created_at: string;
  start_date?: string | null;
  medication_section: "current_regular" | "current_prn" | "stopped";
  regimen_lines?: any[];
  additional_information?: string | null;
  change_reason?: string | null;
  nzf_url?: string | null;
};

type PatientMedicationRow = {
  prescriptionId: string;
  medicationLabel: string;
  morning: string;
  lunch: string;
  dinner: string;
  evening: string;
  indication: string;
  nzfUrl: string | null;
};

type Props = {
  prescriptions: PrescriptionRowPatient[];
  mode?: "regular" | "simple";
  emptyText?: string;
  showInstructions?: boolean;
};

function normaliseFrequencyCode(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function buildMedicationLabel(rx: PrescriptionRowPatient) {
  const medicationName = rx.medication_name?.trim();
  const bannerName = rx.banner_name?.trim();

  if (medicationName) {
    return medicationName;
  }

  if (bannerName) {
    return bannerName;
  }

  return "Medication";
}

function slotValuesForFrequency(
  frequency: string | null | undefined,
  doseText: string | null | undefined
) {
  const dose = doseText?.trim() || "";
  const code = normaliseFrequencyCode(frequency);

  const blank = { morning: "", lunch: "", dinner: "", evening: "" };

  if (!dose) return blank;

  if (code === "OD") {
    return { ...blank, morning: dose };
  }

  if (code === "BD") {
    return { ...blank, morning: dose, evening: dose };
  }

  if (code === "TDS") {
    return { ...blank, morning: dose, lunch: dose, evening: dose };
  }

  if (code === "QID") {
    return { ...blank, morning: dose, lunch: dose, dinner: dose, evening: dose };
  }

  if (code === "NOCTE") {
    return { ...blank, evening: dose };
  }

  if (code === "MANE") {
    return { ...blank, morning: dose };
  }

  return blank;
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
}

function normaliseUnit(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function isTabletLikeUnit(unit: string | null | undefined) {
  const u = normaliseUnit(unit);
  return (
    u === "tablet" ||
    u === "tablets" ||
    u === "capsule" ||
    u === "capsules" ||
    u === "tab" ||
    u === "tabs" ||
    u === "cap" ||
    u === "caps"
  );
}

function pluraliseTabletLike(unit: string | null | undefined, amount: number) {
  const u = normaliseUnit(unit);

  if (u === "capsule" || u === "capsules" || u === "cap" || u === "caps") {
    return amount === 1 ? "capsule" : "capsules";
  }

  return amount === 1 ? "tablet" : "tablets";
}

function parseMgStrength(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)\s*mg/i);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isNaN(parsed) ? null : parsed;
}

function isTabletLikeForm(value: string | null | undefined) {
  const v = normaliseUnit(value);
  return (
    v.includes("tablet") ||
    v.includes("capsule") ||
    v === "tab" ||
    v === "tabs" ||
    v === "cap" ||
    v === "caps"
  );
}

function preferredDoseForPatient(rx: PrescriptionRowPatient) {
  const firstLine = Array.isArray(rx.regimen_lines) ? rx.regimen_lines[0] : null;

  if (firstLine) {
    const calculatedAmount = Number(firstLine.dose_amount_low_calculated);
    const calculatedUnit = firstLine.dose_unit_calculated as string | null | undefined;

    if (
      !Number.isNaN(calculatedAmount) &&
      calculatedAmount > 0 &&
      isTabletLikeUnit(calculatedUnit)
    ) {
      return `${formatNumber(calculatedAmount)} ${pluraliseTabletLike(calculatedUnit, calculatedAmount)}`;
    }

    const productStrengthMg = parseMgStrength(firstLine.product_strength);
    const productForm = firstLine.product_dose_form as string | null | undefined;

    if (
      !Number.isNaN(calculatedAmount) &&
      calculatedAmount > 0 &&
      normaliseUnit(calculatedUnit) === "mg" &&
      productStrengthMg &&
      productStrengthMg > 0 &&
      isTabletLikeForm(productForm)
    ) {
      const tabletCount = calculatedAmount / productStrengthMg;

      if (Number.isFinite(tabletCount) && tabletCount > 0) {
        return `${formatNumber(tabletCount)} ${pluraliseTabletLike(productForm, tabletCount)}`;
      }
    }

    const doseAmount = Number(firstLine.dose_amount_low);
    const doseUnit = firstLine.dose_unit as string | null | undefined;

    if (!Number.isNaN(doseAmount) && doseAmount > 0 && isTabletLikeUnit(doseUnit)) {
      return `${formatNumber(doseAmount)} ${pluraliseTabletLike(doseUnit, doseAmount)}`;
    }

    if (typeof firstLine.dose_text === "string" && firstLine.dose_text.trim()) {
      return firstLine.dose_text.trim();
    }
  }

  return rx.dose?.trim() || "";
}

function mapPrescriptionToPatientRow(rx: PrescriptionRowPatient): PatientMedicationRow {
  const preferredDose = preferredDoseForPatient(rx);
  const firstLine = Array.isArray(rx.regimen_lines) ? rx.regimen_lines[0] : null;
  const frequencyCode =
    (firstLine?.frequency_code as string | null | undefined) ?? rx.frequency;

  const slots = slotValuesForFrequency(frequencyCode, preferredDose);

  return {
    prescriptionId: rx.prescription_id,
    medicationLabel: buildMedicationLabel(rx),
    morning: slots.morning,
    lunch: slots.lunch,
    dinner: slots.dinner,
    evening: slots.evening,
    indication: rx.indication?.trim() || "—",
    nzfUrl: rx.nzf_url ?? null,
  };
}

export default function MedicationTablePatient({
  prescriptions,
  mode = "regular",
  emptyText,
  showInstructions = true,
}: Props) {
  if (prescriptions.length === 0) {
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#ffffff",
          padding: 16,
        }}
      >
        {emptyText ?? "No medications."}
      </div>
    );
  }

    const rows = prescriptions.map(mapPrescriptionToPatientRow);

  if (mode === "simple") {
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 700,
            }}
          >
            <thead>
              <tr style={{ background: "#f9fafb" }}>
  <th style={thStyle}>Medication</th>
  {showInstructions ? <th style={thStyle}>Instructions</th> : null}
  <th style={thStyle}>Indication</th>
</tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => {
                const firstLine = Array.isArray(rx.regimen_lines) ? rx.regimen_lines[0] : null;
                const frequencyCode =
                  (firstLine?.frequency_code as string | null | undefined) ?? rx.frequency;
                const instructions = [preferredDoseForPatient(rx), frequencyCode]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <tr key={rx.prescription_id}>
  <td style={tdStyleMedication}>{buildMedicationLabel(rx)}</td>
  {showInstructions ? <td style={tdStyle}>{instructions || "—"}</td> : null}
  <td style={tdStyle}>{rx.indication?.trim() || "—"}</td>
</tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
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
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 1100,
          }}
        >
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={thStyle}>Medication</th>
              <th style={thStyle}>Morning</th>
              <th style={thStyle}>Lunch</th>
              <th style={thStyle}>Dinner</th>
              <th style={thStyle}>Evening</th>
              <th style={thStyle}>Indication</th>
              <th style={thStyle}>NZF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.prescriptionId}>
                <td style={tdStyleMedication}>{row.medicationLabel}</td>
                <td style={tdStyleCenter}>{row.morning || "—"}</td>
                <td style={tdStyleCenter}>{row.lunch || "—"}</td>
                <td style={tdStyleCenter}>{row.dinner || "—"}</td>
                <td style={tdStyleCenter}>{row.evening || "—"}</td>
                <td style={tdStyle}>{row.indication}</td>
                <td style={tdStyleCenter}>
  {row.nzfUrl ? (
    <a
      href={row.nzfUrl}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "inline-block",
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #14532d",
        background: "rgba(20, 133, 199, 0.30)",
        color: "#000000",
        textDecoration: "none",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      NZF
    </a>
  ) : (
    "—"
  )}
</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
  borderBottom: "1px solid #e5e7eb",
  fontSize: 14,
  fontWeight: 700,
  color: "#111827",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
  color: "#111827",
};

const tdStyleMedication: React.CSSProperties = {
  ...tdStyle,
  fontWeight: 600,
  minWidth: 260,
};

const tdStyleCenter: React.CSSProperties = {
  ...tdStyle,
  textAlign: "center",
  whiteSpace: "nowrap",
};