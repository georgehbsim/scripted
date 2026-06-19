"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { RequireRole } from "@/components/RequireRole";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import MedicationAutocomplete from "@/components/MedicationAutocomplete";
import ProductAutocomplete, { type ProductOption } from "@/components/ProductAutocomplete";
import DoseFrequencyStep, { DoseFooterActions } from "@/components/DoseFrequencyStep";
import DetailsStep from "@/components/DetailsStep";
import { displayForFrequencyCode } from "@/components/frequencyOptions";
import { displayForRouteCode } from "@/components/routeOptions";
import { displayForDurationKey, isCourseDurationKey } from "@/components/durationOptions";
import NewMedicationWizardModal from "@/components/NewMedicationWizardModal";
import NewMedicationWizardFooter from "@/components/NewMedicationWizardFooter";
import MedicationTable from "@/components/medicationTable";
import { useRouter } from "next/navigation";
import StopMedicationDialog from "@/components/StopMedicationDialog";
import PatientDetailLayout from "@/components/PatientDetailLayout";

type PatientRow = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  nhi: string | null;
  created_at: string;
  allergies: string | null;
};

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
  is_prn?: boolean | null;
  dose_amount_low_calculated?: number | null;
  dose_amount_high_calculated?: number | null;
  dose_unit_calculated?: string | null;
  selected_product_id?: string | null;
  source_product_code?: string | null;
  product_label?: string | null;
  product_strength?: string | null;
  product_dose_form?: string | null;
};

type PrescriptionRow = {
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
  status: string;
  medication_section: string | null;
  is_prn?: boolean | null;
  is_stat?: boolean | null;
  created_at: string;
  regimen_lines?: PrescriptionLineRow[];
  last_dispensed_at?: string | null;
  last_dispensed_cycle?: number | null;
  additional_information?: string | null;
  dispense_cycle: number;
};

type FormOption = { dose_form: string; options: number };


type DispenseRow = {
  prescription_id: string;
  dispensed_at: string;
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

function formatRegimenLines(lines?: PrescriptionLineRow[]) {
  if (!lines || lines.length === 0) return [];

  return lines.map((line, index) => {
    const dosePart = line.dose_text;
    const routePart = (line.route_codes ?? [])
      .map((code) => displayForRouteCode(code) || code)
      .join(" ");
    const freqPart = displayForFrequencyCode(line.frequency_code) || line.frequency_code;
    const durPart =
      line.duration_key && line.duration_key !== "ONGOING"
        ? `for ${displayForDurationKey(line.duration_key)}`
        : line.duration_key === "ONGOING"
        ? "ongoing"
        : "";

    let text = [dosePart, routePart, freqPart, durPart].filter(Boolean).join(" ");

    if (index < lines.length - 1) {
      const nextConnector = lines[index + 1]?.connector_from_prev;
      if (nextConnector) text += ` ${nextConnector}`;
    }

    return text;
  });
}


function PatientDetailInner({ patientId }: { patientId: string }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [busyRxId, setBusyRxId] = useState<string | null>(null);
  const [dispenseHistory, setDispenseHistory] = useState<Record<string, string[]>>({});
  const [isEditingAllergies, setIsEditingAllergies] = useState(false);
  const [allergiesDraft, setAllergiesDraft] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [newMed, setNewMed] = useState("");
  const [newDose, setNewDose] = useState("");
  const [newFrequency, setNewFrequency] = useState("");
  const [isSavingRx, setIsSavingRx] = useState(false);
  const [newRoute, setNewRoute] = useState("");     
  const [newIsPrn, setNewIsPrn] = useState(false);  
  const [newIsStat, setNewIsStat] = useState(false);
  const [newIndication, setNewIndication] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newMedBannerId, setNewMedBannerId] = useState<string | null>(null);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [selectedProductLabel, setSelectedProductLabel] = useState<string | null>(null);
  const [baseMedName, setBaseMedName] = useState("");
  const [step, setStep] = useState<"med" | "product" | "dose" | "frequency" | "route" | "details">("med");
  const [formOptions, setFormOptions] = useState<FormOption[]>([]);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [routeOptions, setRouteOptions] = useState<string[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [formQuery, setFormQuery] = useState("");
  const productInputRef = useRef<HTMLInputElement | null>(null);
  const medInputRef = useRef<HTMLInputElement | null>(null);
  const [doseValue, setDoseValue] = useState("");
  const [isDoseRange, setIsDoseRange] = useState(false);
  const [doseValueTo, setDoseValueTo] = useState("");
  const [doseUnit, setDoseUnit] = useState("");  const [frequencyCode, setFrequencyCode] = useState(""); // store code
  const [frequencyText, setFrequencyText] = useState(""); // textbox text
  const [routeCodes, setRouteCodes] = useState<string[]>([]);
  const [routeText, setRouteText] = useState("");
  const [regimenLines, setRegimenLines] = useState<RegimenLine[]>([]);
  const [courseType, setCourseType] = useState<"ONGOING" | "COURSE">("ONGOING");
  const [courseTypeText, setCourseTypeText] = useState("Ongoing / continuous");
  const [durationKey, setDurationKey] = useState<string>("");
  const [durationText, setDurationText] = useState<string>("");
  const focusContinueRef = useRef<null | (() => void)>(null);
  const [pendingConnector, setPendingConnector] = useState<"AND" | "THEN" | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [additionalInfo, setAdditionalInfo] = useState<string>("");
  const focusSaveRef = useRef<null | (() => void)>(null);
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const [stopTarget, setStopTarget] = useState<PrescriptionRow | null>(null);
  const [stopReason, setStopReason] = useState("");
  const [stopDate, setStopDate] = useState("");
  const [isStopOpen, setIsStopOpen] = useState(false);
  const stopReasonRef = useRef<HTMLTextAreaElement | null>(null);
  const [editTarget, setEditTarget] = useState<PrescriptionRow | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [availableForAdministration, setAvailableForAdministration] = useState(false);
  const canSaveDetails = newIndication.trim().length >= 3 && (!editTarget || changeReason.trim().length >= 2);  const [stepResetKey, setStepResetKey] = useState(0);

  const currentRegular = prescriptions.filter(
  (rx) => rx.medication_section === "current_regular"
);

const currentPrn = prescriptions.filter(
  (rx) => rx.medication_section === "current_prn"
);

const stopped = prescriptions.filter(
  (rx) => rx.medication_section === "stopped"
);

function isoDateMinusOneDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);

  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}T12:00:00`;
}

function viewMedicationHistory(medicationBannerId: string) {
  router.push(`/doctor/patients/${patientId}/medications/${medicationBannerId}`);
}

function handleAddMedication() {
  setNewMed("");
  setNewMedBannerId(null);
  setIsComposerOpen(true);
  setStep("med");
  setFormOptions([]);
  setSelectedForm(null);
  setSelectedProductId(null);
  setRouteOptions([]);
  setSelectedRoutes([]);
  setDurationKey("");
}

function openChangeMedication(rx: PrescriptionRow) {
  setEditTarget(rx);
  setChangeReason("");

  setNewMed(rx.medication_name ?? rx.banner_name ?? "");
  setNewMedBannerId(rx.medication_banner_id ?? null);
  setBaseMedName(rx.banner_name ?? rx.medication_name ?? "");

  setNewIndication(rx.indication ?? "");
  setAdditionalInfo(rx.additional_information ?? "");
  setStartDate(new Date().toISOString().slice(0, 10));
  setNewIsStat(rx.is_stat ?? false);

  const lines = (rx.regimen_lines ?? []).map((line) => ({
    connector_from_prev: line.connector_from_prev,
    dose_value:
      line.dose_amount_high != null && line.dose_amount_low != null
        ? `${line.dose_amount_low}-${line.dose_amount_high}`
        : line.dose_amount_low != null
        ? String(line.dose_amount_low)
        : line.dose_text.split(" ")[0] ?? "",
    dose_unit: line.dose_unit,
    route_codes: line.route_codes ?? [],
    frequency_code: line.frequency_code,
    duration_key: line.duration_key,
    is_prn: line.is_prn ?? false,

    dose_amount_low_calculated: line.dose_amount_low_calculated ?? null,
    dose_amount_high_calculated: line.dose_amount_high_calculated ?? null,
    dose_unit_calculated: line.dose_unit_calculated ?? null,

    selected_product_id: line.selected_product_id ?? null,
    source_product_code: line.source_product_code ?? null,
    product_label: line.product_label ?? null,
    product_strength: line.product_strength ?? null,
    product_dose_form: line.product_dose_form ?? null,
  }));

  const firstLine = lines[0];
  const remainingLines = lines.slice(1);

  setRegimenLines(remainingLines);
  setNewIsPrn(lines.some((l) => l.is_prn));

  setSelectedProductId(lines[0]?.selected_product_id ?? null);
  setSelectedProductLabel(lines[0]?.product_label ?? null);

const firstSavedLine = lines[0];

if (
  firstSavedLine?.selected_product_id &&
  firstSavedLine?.product_dose_form &&
  (firstSavedLine?.product_strength || firstSavedLine?.product_label)
) {
  setProductOptions([
    {
      product_id: firstSavedLine.selected_product_id,
      dose_form: firstSavedLine.product_dose_form,
      strength: firstSavedLine.product_strength ?? "",
      label:
        firstSavedLine.product_label ??
        `${firstSavedLine.product_strength ?? ""} ${firstSavedLine.product_dose_form}`.trim(),
      source_product_code: firstSavedLine.source_product_code ?? "",
    },
  ]);
} else {
  setProductOptions([]);
}

if (firstLine) {
  const rawDose = firstLine.dose_value ?? "";

  if (rawDose.includes("-")) {
    const [low, high] = rawDose.split("-", 2);
    setDoseValue(low ?? "");
    setDoseValueTo(high ?? "");
    setIsDoseRange(true);
  } else {
    setDoseValue(rawDose);
    setDoseValueTo("");
    setIsDoseRange(false);
  }

  setDoseUnit(firstLine.dose_unit ?? "");
  setRouteCodes(firstLine.route_codes ?? []);
  setRouteText((firstLine.route_codes ?? []).join(", "));
  setFrequencyCode(firstLine.frequency_code ?? "");
  setFrequencyText(firstLine.frequency_code ?? "");
  setDurationKey(firstLine.duration_key ?? "");
  setDurationText(firstLine.duration_key ?? "");
} else {
  setDoseValue("");
  setDoseValueTo("");
  setIsDoseRange(false);
  setDoseUnit("");
  setRouteCodes([]);
  setRouteText("");
  setFrequencyCode("");
  setFrequencyText("");
  setDurationKey("");
  setDurationText("");
}

  setStep("dose");
  setIsComposerOpen(true);
}

function openStopDialog(rx: PrescriptionRow) {
  setStopTarget(rx);
  setStopReason("");
  setStopDate(new Date().toISOString().slice(0, 10));
  setIsStopOpen(true);

  setTimeout(() => {
    stopReasonRef.current?.focus();
    stopReasonRef.current?.select();
  }, 0);
}

function handleFrequencyCodeChange(code: string) {
  setFrequencyCode(code);
  setNewIsPrn(code === "PRN");
}

useEffect(() => {
    if (step !== "details") return;
    focusSaveRef.current = () => saveBtnRef.current?.focus();
  }, [step]);

function goBack() {
  if (step === "details") {
  // clear details draft
  setNewIndication("");
  setStartDate("");
  setAdditionalInfo("");

  // ALSO clear dose/regimen (if you want dose step blank on return)
  setRegimenLines([]);
  setPendingConnector(null);
  setDoseValue("");
  setDoseUnit("");
  setIsDoseRange(false);
setDoseValueTo("");
  setRouteCodes([]);
  setRouteText("");
  setFrequencyCode("");
  setFrequencyText("");
  setDurationKey("");
  setDurationText("");

  setStepResetKey((k) => k + 1);
  setStep("dose");
  return;
}

  if (step === "dose") {
  // Clear dose editor + regimen
  setRegimenLines([]);
  setPendingConnector(null);

  setDoseValue("");
  setDoseUnit("");
  setIsDoseRange(false);
setDoseValueTo("");
  setRouteCodes([]);
  setRouteText("");
  setFrequencyCode("");
  setFrequencyText("");
  setDurationKey("");
  setDurationText("");

  // ALSO clear product selection + query (so Product step is visually blank)
  setSelectedProductId(null);
  setSelectedProductLabel(null);
  setProductQuery("");
  setSelectedForm(null);

  // Header back to base med name
  setNewMed(baseMedName);

  setStepResetKey((k) => k + 1);
  setStep("product");
  return;
}

  if (step === "product") {
    // clear product selection + everything downstream
    setSelectedProductId(null);
    setSelectedProductLabel(null);
    setProductQuery("");
    setSelectedForm(null);

    setRegimenLines([]);
    setPendingConnector(null);

    setDoseValue("");
    setDoseUnit("");
    setIsDoseRange(false);
setDoseValueTo("");
    setRouteCodes([]);
    setRouteText("");
    setFrequencyCode("");
    setFrequencyText("");
    setDurationKey("");
    setDurationText("");

    setNewIndication("");
    setStartDate("");
    setAdditionalInfo("");

    // revert header back to base med name (no product/form)
    setNewMed(baseMedName);

    setStepResetKey((k) => k + 1);
    setStep("med");
    return;
  }

  // already on med
}

function resetDoseEditor() {
  setDoseValue("");
  setDoseUnit("");
  setIsDoseRange(false);
setDoseValueTo("");
  setRouteCodes([]);
  setRouteText("");
  setFrequencyCode("");
  setFrequencyText("");
  setDurationKey("");
  setDurationText("");
  setPendingConnector(null);
}

function resetRegimen() {
  setRegimenLines([]);
  setPendingConnector(null);
  resetDoseEditor();
}

function resetDetails() {
  setNewIndication("");
  setStartDate("");        // will default to today again on details mount
  setAdditionalInfo("");
}

function resetProductSelection() {
  setSelectedProductId(null);
  setSelectedProductLabel(null);
  setProductQuery("");
  // optional: if you keep separate selectedForm/strength state, clear those too:
  setSelectedForm(null);
}

function parseSimpleStrength(strength?: string | null): { amount: number; unit: string } | null {
  if (!strength) return null;

  const m = strength.trim().match(/([\d.]+)\s*(mcg|µg|mg|g|mL|ml|unit|units)\b/i);
  if (!m) return null;

  const amount = Number(m[1]);
  const unit = m[2];

  if (!Number.isFinite(amount)) return null;

  return { amount, unit };
}

function parseRatioStrength(strength?: string | null): {
  numeratorAmount: number;
  numeratorUnit: string;
  denominatorAmount: number;
  denominatorUnit: string;
} | null {
  if (!strength) return null;

  const m = strength
    .trim()
    .match(/^([\d.]+)\s*([a-zA-Zµ]+)\s*\/\s*([\d.]+)\s*([a-zA-Zµ]+)$/i);

  if (!m) return null;

  const numeratorAmount = Number(m[1]);
  const numeratorUnit = m[2];
  const denominatorAmount = Number(m[3]);
  const denominatorUnit = m[4];

  if (
    !Number.isFinite(numeratorAmount) ||
    !Number.isFinite(denominatorAmount) ||
    denominatorAmount === 0
  ) {
    return null;
  }

  return {
    numeratorAmount,
    numeratorUnit,
    denominatorAmount,
    denominatorUnit,
  };
}

function normalizeAdministrationUnit(unit: string) {
  const u = unit.trim().toLowerCase();

  if (u === "tablets") return "tablet";
  if (u === "capsules") return "capsule";
  if (u === "mls") return "ml";
  if (u === "grams") return "g";
  if (u === "caps") return "capsule";
  if (u === "tabs") return "tablet";

  return u.endsWith("s") ? u.slice(0, -1) : u;
}

function normalizeDoseForm(doseForm?: string | null) {
  if (!doseForm) return "";

  const f = doseForm.trim().toLowerCase();

  if (f.startsWith("tablet")) return "tablet";
  if (f.startsWith("capsule")) return "capsule";
  if (f.startsWith("oral liquid")) return "ml";
  if (f.startsWith("liquid")) return "ml";
  if (f.startsWith("solution")) return "ml";
  if (f.startsWith("suspension")) return "ml";
  if (f.startsWith("mixture")) return "ml";
  if (f.startsWith("cream")) return "g";
  if (f.startsWith("ointment")) return "g";
  if (f.startsWith("eye ointment")) return "g";

  return f;
}

function calculateDoseFromProduct(params: {
  selectedProduct: ProductOption | null;
  doseValue: string;
  doseValueTo?: string;
  doseUnit: string;
  isDoseRange: boolean;
}) {
  const { selectedProduct, doseValue, doseValueTo, doseUnit, isDoseRange } = params;

  const low = Number(doseValue);
  if (!Number.isFinite(low)) {
    return {
      dose_amount_low_calculated: null,
      dose_amount_high_calculated: null,
      dose_unit_calculated: null,
    };
  }

  const high = isDoseRange ? Number(doseValueTo) : null;
  const validHigh =
    isDoseRange && Number.isFinite(high as number) ? (high as number) : null;

  const prescribedUnit = normalizeAdministrationUnit(doseUnit);

  // If the prescriber already entered the dose in mg, that is already the
  // calculated dose and no product conversion is needed.
  if (prescribedUnit === "mg") {
    return {
      dose_amount_low_calculated: low,
      dose_amount_high_calculated: validHigh != null ? validHigh : null,
      dose_unit_calculated: "mg",
    };
  }

  const strengthText = selectedProduct?.strength || selectedProduct?.label || null;

  if (!strengthText || !selectedProduct?.dose_form) {
    return {
      dose_amount_low_calculated: null,
      dose_amount_high_calculated: null,
      dose_unit_calculated: null,
    };
  }

  const normalizedForm = normalizeDoseForm(selectedProduct.dose_form);

  const simpleStrength = parseSimpleStrength(strengthText);
  if (simpleStrength && prescribedUnit === normalizedForm) {
    return {
      dose_amount_low_calculated: low * simpleStrength.amount,
      dose_amount_high_calculated:
        validHigh != null ? validHigh * simpleStrength.amount : null,
      dose_unit_calculated: simpleStrength.unit,
    };
  }

  const ratioStrength = parseRatioStrength(strengthText);
  if (
    ratioStrength &&
    prescribedUnit === normalizeAdministrationUnit(ratioStrength.denominatorUnit)
  ) {
    const multiplier = ratioStrength.numeratorAmount / ratioStrength.denominatorAmount;

    return {
      dose_amount_low_calculated: low * multiplier,
      dose_amount_high_calculated:
        validHigh != null ? validHigh * multiplier : null,
      dose_unit_calculated: ratioStrength.numeratorUnit,
    };
  }

  return {
    dose_amount_low_calculated: null,
    dose_amount_high_calculated: null,
    dose_unit_calculated: null,
  };
}


function handleAddRegimenLine() {

  const selectedProduct = selectedProductId
  ? productOptions.find((p) => p.product_id === selectedProductId) ?? null
  : null;

const calculatedDose = calculateDoseFromProduct({
  selectedProduct,
  doseValue,
  doseValueTo,
  doseUnit,
  isDoseRange,
});

  // basic validation (keep light for now)
  if (!doseValue.trim() || !doseUnit.trim() || (isDoseRange && !doseValueTo.trim())) {
  alert("Please enter dose value and units.");
  return;
}
  if (!frequencyCode) {
    alert("Please select a frequency.");
    return;
  }
  if (!durationKey) {
    alert("Please select a duration.");
    return;
  }

  // default PO if none selected
  const routes = routeCodes.length ? routeCodes : ["PO"];

  const line: RegimenLine = {
    connector_from_prev: regimenLines.length === 0 ? null : (pendingConnector ?? "AND"),
    dose_value: isDoseRange ? `${doseValue.trim()}-${doseValueTo.trim()}` : doseValue.trim(),    dose_unit: doseUnit.trim(),
    route_codes: routes,
    frequency_code: frequencyCode,
    duration_key: durationKey,
    is_prn: frequencyCode === "PRN",
    dose_amount_low_calculated: calculatedDose.dose_amount_low_calculated,
    dose_amount_high_calculated: calculatedDose.dose_amount_high_calculated,
    dose_unit_calculated: calculatedDose.dose_unit_calculated,
    selected_product_id: selectedProduct?.product_id ?? null,
    source_product_code: selectedProduct?.source_product_code ?? null,
    product_label: selectedProduct?.label ?? null,
    product_strength: selectedProduct?.strength ?? null,
    product_dose_form: selectedProduct?.dose_form ?? null,
  };

  setRegimenLines((prev) => [...prev, line]);

  // Once we’ve used the pending connector, clear it
  setPendingConnector(null);

  // reset editor for next line
  setDoseValue("");
  setDoseUnit("");
  setIsDoseRange(false);
setDoseValueTo("");
  setRouteCodes([]);
  setRouteText("");
  setFrequencyCode("");
  setFrequencyText("");
  setDurationKey("");
  setDurationText("");
}

const regimenSubtitle = useMemo(() => {
  if (regimenLines.length === 0) return "";

  // Build each line's "core" text first
  const cores = regimenLines.map((l) => {
    const dosePart = `${l.dose_value} ${l.dose_unit}`.trim();
    const routePart = l.route_codes.join(" ");
    const freqPart = displayForFrequencyCode(l.frequency_code);

    const durPart =
      l.duration_key && l.duration_key !== "ONGOING"
        ? `for ${displayForDurationKey(l.duration_key)}`
        : "";

    return [dosePart, routePart, freqPart, durPart].filter(Boolean).join(" ");
  });

  // Now attach the NEXT line's connector to the END of the current line
  const linesWithConnectors: string[] = [];
  for (let i = 0; i < cores.length; i++) {
    const next = regimenLines[i + 1];
    const connectorAfterThis = next?.connector_from_prev ?? null; // AND/THEN belongs after line i

    linesWithConnectors.push(
      connectorAfterThis ? `${cores[i]} ${connectorAfterThis}` : cores[i]
    );
  }

  // If user has clicked AND/THEN to start a new line (but hasn't added it yet),
  // show the trailing connector after the last committed line.
  if (pendingConnector && linesWithConnectors.length > 0) {
    linesWithConnectors[linesWithConnectors.length - 1] =
      `${linesWithConnectors[linesWithConnectors.length - 1]} ${pendingConnector}`;
  }

  return linesWithConnectors.join("\n");
}, [regimenLines, pendingConnector]);




type RegimenLine = {
  connector_from_prev: "AND" | "THEN" | null;
  dose_value: string;
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
is_prn: boolean;
};




const sigLine = useMemo(() => {
  const parts: string[] = [];

  // dose
  const dv = doseValue?.trim();
  const du = doseUnit?.trim();
  if (dv && du) parts.push(`${dv} ${du}`);
  else if (dv) parts.push(dv);

  // routes (multi)
  if (routeCodes?.length) {
    // show as codes like "PO NGT" (or change to display if you prefer)
    parts.push(routeCodes.join(" "));
  }

  // frequency
  if (frequencyCode) {
    // show full like "Once daily (OD)" OR just "OD"
    parts.push(displayForFrequencyCode(frequencyCode));
  }

  return parts.join(" ");
}, [doseValue, doseUnit, routeCodes, frequencyCode]);

const unitOptions = useMemo(() => {
  const selected = selectedProductId
    ? productOptions.find((p) => p.product_id === selectedProductId)
    : null;

  const form = (selected?.dose_form || selectedProductLabel || "").toLowerCase();

  if (form.includes("tablet")) return ["tablet", "mg"];
  if (form.includes("capsule")) return ["capsule", "mg"];
  if (form.includes("oral liquid") || form.includes("syrup") || form.includes("suspension")) return ["mL", "mg"];
  if (form.includes("injection") || form.includes("iv") || form.includes("im") || form.includes("sc")) return ["mL", "mg", "unit"];
  if (form.includes("patch")) return ["patch"];
  if (form.includes("drop")) return ["drop"];
  return ["mg", "tablet", "capsule", "mL", "unit"];
}, [productOptions, selectedProductId, selectedProductLabel]);

async function onProductSelected(p: ProductOption | null) {
  setSelectedProductId(p?.product_id ?? null);
  setSelectedProductLabel(p?.label ?? "No product");

  if (p?.label) setNewMed(`${baseMedName} ${p.label}`.trim());
  else setNewMed(baseMedName);

  let nextBannerId = newMedBannerId;

  if (p?.product_id) {
    const { data: resolvedBannerId, error: resolveError } = await supabase.rpc(
      "resolve_banner_for_product",
      {
        p_product_id: p.product_id,
        p_fallback_banner_id: newMedBannerId,
      }
    );

    if (resolveError) {
      alert(resolveError.message);
      return;
    }

    if (resolvedBannerId) {
      nextBannerId = resolvedBannerId;
      setNewMedBannerId(resolvedBannerId);
    }
  }

  console.log("product selected", p?.label);
  console.log("resolved banner id", nextBannerId);

  setDoseValue("");
  setDoseUnit("");
  setFrequencyCode("");
  setFrequencyText("");
  setRouteCodes([]);
  setRouteText("");

  setRegimenLines([]);
  setDoseValue("");
  setDoseUnit("");
  setRouteCodes([]);
  setRouteText("");
  setFrequencyCode("");
  setFrequencyText("");
  setDurationKey("");
  setDurationText("");
  setAvailableForAdministration(false);

  setStep("dose");
}

async function onBannerSelected(bannerId: string, bannerName: string) {
  setBaseMedName(bannerName);     // ✅ add this
  setNewMed(bannerName);          // keep this (header + payload start)
  setNewMedBannerId(bannerId);

  setSelectedProductId(null);
  setSelectedProductLabel(null);
  setRouteOptions([]);
  setSelectedRoutes([]);
  setProductQuery("");

  setRegimenLines([]);
setDoseValue(""); 
setDoseUnit("");
setRouteCodes([]); 
setRouteText("");
setFrequencyCode(""); 
setFrequencyText("");
setDurationKey("");
setDurationText("");
setAvailableForAdministration(false);



  const { data, error } = await supabase.rpc("products_for_banner", { p_banner_id: bannerId });
  if (error) {
    alert(error.message);
    return;
  }

  setProductOptions((data ?? []) as ProductOption[]);
  setStep("product");
}


async function handleSavePrescription() {

  if (!patient?.id) {
    alert("Patient not loaded yet");
    return;
  }

  if (!newMed.trim()) {
    alert("Medication is required");
    return;
  }

  if (!newMedBannerId) {
    alert("Please select a medication from the autocomplete list.");
    return;
  }

  if (regimenLines.length === 0) {
    alert("Please add at least one regimen line.");
    return;
  }

  setIsSavingRx(true);

  if (editTarget && changeReason.trim().length < 2) {
  alert("Please enter a reason for change.");
  setIsSavingRx(false);
  return;
}

  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const prescriberUserId = userData.user?.id;

    if (userErr || !prescriberUserId) {
      throw new Error(userErr?.message ?? "Not logged in.");
    }

    const firstLine = regimenLines[0];

    const firstDoseText = `${firstLine.dose_value} ${firstLine.dose_unit}`.trim();
    const firstRouteText =
      firstLine.route_codes && firstLine.route_codes.length > 0
        ? firstLine.route_codes.join(" ")
        : null;

    const parseDoseAmounts = (doseValue: string) => {
      const raw = doseValue.trim();

      if (raw.includes("-")) {
        const [lowRaw, highRaw] = raw.split("-", 2).map((s) => s.trim());
        const low = Number(lowRaw);
        const high = Number(highRaw);

        return {
          dose_amount_low: Number.isFinite(low) ? low : null,
          dose_amount_high: Number.isFinite(high) ? high : null,
        };
      }

      const single = Number(raw);
      return {
        dose_amount_low: Number.isFinite(single) ? single : null,
        dose_amount_high: null,
      };
    };

    let bannerIdToSave = newMedBannerId;

if (selectedProductId) {
  const { data: resolvedBannerId, error: resolveError } = await supabase.rpc(
    "resolve_banner_for_product",
    {
      p_product_id: selectedProductId,
      p_fallback_banner_id: newMedBannerId,
    }
  );

  if (resolveError) {
    setIsSavingRx(false);
    alert(resolveError.message);
    return;
  }

  if (resolvedBannerId) {
    bannerIdToSave = resolvedBannerId;
  }
}

if (!selectedProductId && selectedProductLabel) {
  const { data: resolvedFormBannerId, error: resolveFormError } = await supabase.rpc(
    "resolve_banner_for_form",
    {
      p_form_code: selectedProductLabel,
      p_fallback_banner_id: bannerIdToSave,
    }
  );

  if (resolveFormError) {
    setIsSavingRx(false);
    alert(resolveFormError.message);
    return;
  }

  if (resolvedFormBannerId) {
    bannerIdToSave = resolvedFormBannerId;
  }
}

if (!bannerIdToSave) {
  setIsSavingRx(false);
  alert("Please select a medication from the autocomplete list.");
  return;
}

    const prescriptionPayload = {
      patient_id: patient.id,
      prescriber_user_id: prescriberUserId,
      medication_banner_id: bannerIdToSave,
      medication_name: newMed.trim(),

      // keep old flat columns alive for now
      dose: firstDoseText || null,
      route: firstRouteText,
      frequency: firstLine.frequency_code || null,
      duration: firstLine.duration_key || null,

      indication: newIndication.trim() || null,
      is_prn: firstLine.frequency_code === "PRN",
      is_stat: newIsStat,
      status: "active",
      start_date: startDate || null,
      additional_information: additionalInfo.trim() || null,
      change_reason: editTarget ? changeReason.trim() || null : null,

      available_for_administration: availableForAdministration,
    };

    const { data: insertedPrescription, error: prescriptionError } = await supabase
      .from("prescriptions")
      .insert(prescriptionPayload)
.select(
  "id, medication_banner_id, medication_name, dose, route, frequency, is_prn, is_stat, status, created_at"
)
      .single();

    if (prescriptionError || !insertedPrescription) {
      throw new Error(prescriptionError?.message ?? "Failed to save prescription.");
    }

    const lineRows = regimenLines.map((line, index) => {
      const parsed = parseDoseAmounts(line.dose_value);

      return {
        prescription_id: insertedPrescription.id,
        line_index: index,
        connector_from_prev: line.connector_from_prev,
        dose_text: `${line.dose_value} ${line.dose_unit}`.trim(),
        dose_amount_low: parsed.dose_amount_low,
        dose_amount_high: parsed.dose_amount_high,
        dose_unit: line.dose_unit,
        route_codes: line.route_codes ?? [],
        frequency_code: line.frequency_code,
        duration_key: line.duration_key,
        dose_amount_low_calculated: line.dose_amount_low_calculated ?? null,
        dose_amount_high_calculated: line.dose_amount_high_calculated ?? null,
        dose_unit_calculated: line.dose_unit_calculated ?? null,
        selected_product_id: line.selected_product_id ?? null,
        source_product_code: line.source_product_code ?? null,
        product_label: line.product_label ?? null,
        product_strength: line.product_strength ?? null,
        product_dose_form: line.product_dose_form ?? null,
        is_prn: line.is_prn ?? false,
      };
    });

    const { error: linesError } = await supabase
      .from("prescription_lines")
      .insert(lineRows);

    if (linesError) {
      throw new Error(linesError.message);
    }

        if (editTarget) {
      if (!startDate) {
        throw new Error("Changed prescriptions need a start date.");
      }

      const stoppedAtIso = isoDateMinusOneDay(startDate);

      const { error: stopOldError } = await supabase
        .from("prescriptions")
        .update({
          status: "stopped",
          stopped_at: stoppedAtIso,
          stop_reason: "Changed",
        })
        .eq("id", editTarget.id);

      if (stopOldError) {
        throw new Error(stopOldError.message);
      }
    }

    const { error: hfRebuildError } = await supabase.rpc(
  "rebuild_heart_failure_tracker_for_patient",
  {
    p_patient_id: patient.id,
  }
);

if (hfRebuildError) {
  throw new Error(`Heart failure tracker rebuild failed: ${hfRebuildError.message}`);
}

const { error: imRebuildError } = await supabase.rpc(
  "rebuild_immunosuppression_tracker_for_patient",
  {
    p_patient_id: patient.id,
  }
);

if (imRebuildError) {
  throw new Error(`Immunosuppression tracker rebuild failed: ${imRebuildError.message}`);
}

console.log("rebuild trackers after save", {
  patientId: patient.id,
  hfRebuildError,
  imRebuildError,
});

await load();

    console.log("selectedProductId", selectedProductId);
    console.log("selectedForm", selectedForm);
    console.log("selectedProductLabel", selectedProductLabel);
    console.log("newMed", newMed);

    // reset + close
    setNewMed("");
    setNewDose("");
    setNewFrequency("");
    setNewRoute("");
    setNewIsPrn(false);
    setNewIsStat(false);
    setIsComposerOpen(false);
    setNewIndication("");
    setNewDuration("");
    setNewMedBannerId(null);

    setStep("med");
    setFormOptions([]);
    setSelectedForm(null);
    setSelectedProductId(null);
    setRouteOptions([]);
    setSelectedRoutes([]);
    setBaseMedName("");
    setSelectedProductLabel(null);
    setProductOptions([]);
    setDurationKey("");

    setRegimenLines([]);
    setPendingConnector(null);
    setDoseValue("");
    setDoseValueTo("");
    setIsDoseRange(false);
    setDoseUnit("");
    setRouteCodes([]);
    setRouteText("");
    setFrequencyCode("");
    setFrequencyText("");
    setDurationText("");
    setStartDate("");
    setAvailableForAdministration(false);
    setAdditionalInfo("");
    setEditTarget(null);
  setChangeReason("");
  } catch (err: any) {
    console.error("Save prescription error:", err);
    alert(`Failed to save prescription: ${err.message ?? "Unknown error"}`);
  } finally {
    setIsSavingRx(false);
  }
}

  useEffect(() => {
    if (patient) {
      setAllergiesDraft(patient.allergies ?? "");
    }
  }, [patient]);

  useEffect(() => {
  if (!isComposerOpen) return;

  if (step === "med") {
    // MedicationAutocomplete handles its own autofocus via prop
    return;
  }

  if (step === "product") {
    requestAnimationFrame(() => {
      const el = productInputRef.current;
      if (!el) return;
      el.focus();
      el.select(); // optional: highlights existing text if any
    });
  }
}, [isComposerOpen, step]);


async function confirmStopMedication() {
  if (!stopTarget) return;

  setBusyRxId(stopTarget.id);

  try {
    const stoppedAtIso = stopDate
      ? `${stopDate}T12:00:00`
      : new Date().toISOString();

    const { error: updateError } = await supabase
      .from("prescriptions")
      .update({
        status: "stopped",
        stopped_at: stoppedAtIso,
        stop_reason: stopReason.trim() || null,
      })
      .eq("id", stopTarget.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { error: hfRebuildError } = await supabase.rpc(
      "rebuild_heart_failure_tracker_for_patient",
      {
        p_patient_id: patientId,
      }
    );

    if (hfRebuildError) {
      console.error("Heart failure tracker rebuild failed:", hfRebuildError);
    }

    const { error: imRebuildError } = await supabase.rpc(
      "rebuild_immunosuppression_tracker_for_patient",
      {
        p_patient_id: patientId,
      }
    );

    if (imRebuildError) {
      console.error("Immunosuppression tracker rebuild failed:", imRebuildError);
    }

    setIsStopOpen(false);
    setStopTarget(null);
    setStopReason("");
    setStopDate("");

    await load();
  } catch (err: any) {
    alert(err.message ?? "Failed to stop medication.");
  } finally {
    setBusyRxId(null);
  }
}



async function handleSaveAllergies() {
  if (!patient?.id) {
    console.error("No patient id available");
    alert("Patient not loaded yet");
    return;
  }

  const { data, error } = await supabase
    .from("patients")
    .update({ allergies: allergiesDraft })
    .eq("id", patient.id)
    .select("id, allergies")
    .single();

  if (error) {
    console.error("Supabase update error:", error);
    alert(`Failed to save allergies: ${error.message}`);
    return;
  }

  // Update local UI state so it shows immediately
  setPatient((prev) => (prev ? { ...prev, allergies: data.allergies ?? "" } : prev));

  console.log("Saved allergies:", data);
  setIsEditingAllergies(false);
  // If you use Next router refresh:
  // router.refresh();
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

  setDispenseHistory({});
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
    {/* Top App Header */}
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
    borderBottom: "1px solid #e5e7eb",
  }}
>
  {/* Left */}
  <div style={{ justifySelf: "start" }}>
    <Link
      href="/doctor/patients"
      style={{
        color: "#ffffff",
        textDecoration: "none",
        fontWeight: 600,
      }}
    >
      ← Back to patients
    </Link>
  </div>

  {/* Center */}
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

  {/* Right */}
  <div style={{ justifySelf: "end" }}>
    <button
      onClick={() => alert("Preferences coming soon")}
      aria-label="Preferences"
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
      <span style={{ fontSize: 16, lineHeight: 1 }}>⚙︎</span>
      <span style={{ fontSize: 13 }}>Preferences</span>
    </button>
  </div>
</div>

    {/* Sticky patient banner */}
    <PatientDetailLayout
  patient={patient}
  calcAge={calcAge}
  onAddMedication={handleAddMedication}
  onCreateCommunityPrescription={() => {
    router.push(`/doctor/patients/${patient.id}/community-prescription/new`);
  }}
  onOpenTrackers={() => {
    router.push(`/doctor/patients/${patient.id}/trackers`);
  }}
  isEditingAllergies={isEditingAllergies}
  allergiesDraft={allergiesDraft}
  setAllergiesDraft={setAllergiesDraft}
  setIsEditingAllergies={setIsEditingAllergies}
  handleSaveAllergies={handleSaveAllergies}
/>

   {/* Body */}
<div style={{ padding: 24, maxWidth: "100%" }}>
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
        <MedicationTable
  prescriptions={currentRegular}
  busyRxId={busyRxId}
  onStop={openStopDialog}
  displayForRouteCode={displayForRouteCode}
  displayForFrequencyCode={displayForFrequencyCode}
  onViewHistory={viewMedicationHistory}
  onChangeMedication={openChangeMedication}

/>
      </div>

      <div style={{ marginTop: 24 }}>
<div
  style={{
    marginTop: 24,
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
</div>        <MedicationTable
  prescriptions={currentPrn}
  busyRxId={busyRxId}
  onStop={openStopDialog}
  displayForRouteCode={displayForRouteCode}
  displayForFrequencyCode={displayForFrequencyCode}
  onViewHistory={viewMedicationHistory}
  onChangeMedication={openChangeMedication}

/>
      </div>

      <div style={{ marginTop: 24 }}>
<div
  style={{
    marginTop: 24,
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
</div>        <MedicationTable
  prescriptions={stopped}
  busyRxId={busyRxId}
  onStop={openStopDialog}
  displayForRouteCode={displayForRouteCode}
  displayForFrequencyCode={displayForFrequencyCode}
  onViewHistory={viewMedicationHistory}
  onChangeMedication={openChangeMedication}

/>
      </div>
    </>
  )}

{/* Popup Window for stopping medication */}
  {isStopOpen && stopTarget && (
  <StopMedicationDialog
    open={isStopOpen && !!stopTarget}
    medicationName={stopTarget?.banner_name ?? stopTarget?.medication_name ?? ""}
    stopReason={stopReason}
    onChangeStopReason={setStopReason}
    stopDate={stopDate}
    onChangeStopDate={setStopDate}
    onCancel={() => {
      setIsStopOpen(false);
      setStopTarget(null);
      setStopReason("");
      setStopDate("");
    }}
    onConfirm={confirmStopMedication}
  />
)}

  
  {/* Popup Window for new prescriptions */}
      {isComposerOpen && (
  <div
    style={{
      position: "fixed",
      right: 16,
      bottom: 16,
      width: 680,
      maxWidth: "calc(100vw - 32px)",
      height: 640,
      maxHeight: "calc(100vh - 32px)",
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
      display: "flex",
      flexDirection: "column",
      zIndex: 50,
      overflow: "hidden",
    }}
  >
    {/* Body */}
    <div style={{ padding: 12, flex: 1, overflow: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <NewMedicationWizardModal
          step={step}
          newMed={newMed}
          regimenSubtitle={regimenSubtitle}
          onBack={goBack}
          onClose={() => setIsComposerOpen(false)}
          stepResetKey={stepResetKey}
          onBannerSelected={onBannerSelected}
          productOptions={productOptions}
          productQuery={productQuery}
          setProductQuery={setProductQuery}
          selectedProductId={selectedProductId}
          selectedProductLabel={selectedProductLabel}
          onProductSelected={onProductSelected}
          onSelectForm={(form) => {
            setSelectedProductId(null);
            setSelectedProductLabel(form);
            setNewMed(`${baseMedName} ${form}`.trim());
            setStep("dose");
          }}
          doseStepKey={stepResetKey}
          doseValue={doseValue}
          setDoseValue={setDoseValue}
          doseUnit={doseUnit}
          setDoseUnit={setDoseUnit}
          isDoseRange={isDoseRange}
          setIsDoseRange={setIsDoseRange}
          doseValueTo={doseValueTo}
          setDoseValueTo={setDoseValueTo}
          routeCodes={routeCodes}
          setRouteCodes={setRouteCodes}
          routeText={routeText}
          setRouteText={setRouteText}
          allowedRouteCodes={routeOptions}
          frequencyCode={frequencyCode}
          setFrequencyCode={handleFrequencyCodeChange}
          frequencyText={frequencyText}
          setFrequencyText={setFrequencyText}
          durationKey={durationKey}
          setDurationKey={setDurationKey}
          durationText={durationText}
          setDurationText={setDurationText}
          unitOptions={unitOptions}
          onAddLine={() => handleAddRegimenLine()}
          onFocusContinue={() => focusContinueRef.current?.()}
          detailsStepKey={stepResetKey}
          newIndication={newIndication}
          setNewIndication={setNewIndication}
          startDate={startDate}
          setStartDate={setStartDate}
          additionalInfo={additionalInfo}
          setAdditionalInfo={setAdditionalInfo}
          onFocusSave={() => focusSaveRef.current?.()}
          editTarget={editTarget}
          changeReason={changeReason}
          setChangeReason={setChangeReason}
          availableForAdministration={availableForAdministration}
          setAvailableForAdministration={setAvailableForAdministration}
        />
      </div>
    </div>

    <NewMedicationWizardFooter
  step={step}
  doseValue={doseValue}
  doseUnit={doseUnit}
  isDoseRange={isDoseRange}
  doseValueTo={doseValueTo}
  routeCodes={routeCodes}
  frequencyCode={frequencyCode}
  durationKey={durationKey}
  regimenLinesCount={regimenLines.length}
  pendingConnector={pendingConnector}
  setPendingConnector={setPendingConnector}
  onAddLine={() => handleAddRegimenLine()}
  onContinueFromDose={() => {
    handleAddRegimenLine();
    setPendingConnector(null);
    setStep("details");
  }}
  registerFocusContinue={(fn) => {
    focusContinueRef.current = fn;
  }}
  saveBtnRef={saveBtnRef}
  onSave={handleSavePrescription}
  isSavingRx={isSavingRx}
  canSaveDetails={canSaveDetails}
/>
</div>
)}
</div>
  </main>
);
}
