"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";


function titleCase(text: string): string {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseSupplyText(input: string): {
  authoredText: string;
  supplyValue: number | null;
  supplyUnit: "day" | "week" | "month" | "tablet" | null;
  supplyDays: number | null;
} {
  const text = input.trim().toLowerCase();
  const match = text.match(/^(\d+)\s+(day|days|week|weeks|month|months|tablet|tablets)$/);

  if (!match) {
    return {
      authoredText: input.trim(),
      supplyValue: null,
      supplyUnit: null,
      supplyDays: null,
    };
  }

  const value = Number(match[1]);
  const rawUnit = match[2];

  if (rawUnit.startsWith("day")) {
    return {
      authoredText: input.trim(),
      supplyValue: value,
      supplyUnit: "day",
      supplyDays: value,
    };
  }

  if (rawUnit.startsWith("week")) {
    return {
      authoredText: input.trim(),
      supplyValue: value,
      supplyUnit: "week",
      supplyDays: value * 7,
    };
  }

  if (rawUnit.startsWith("month")) {
    return {
      authoredText: input.trim(),
      supplyValue: value,
      supplyUnit: "month",
      supplyDays: value * 30,
    };
  }

  return {
    authoredText: input.trim(),
    supplyValue: value,
    supplyUnit: "tablet",
    supplyDays: null,
  };
}

function parseRepeatsText(input: string): {
  authoredText: string | null;
  repeatsValue: number | null;
} {
  const text = input.trim();
  if (!text) {
    return {
      authoredText: null,
      repeatsValue: null,
    };
  }

  const match = text.toLowerCase().match(/^(\d+)\s+repeat(s)?$/);
  if (!match) {
    return {
      authoredText: text,
      repeatsValue: null,
    };
  }

  return {
    authoredText: text,
    repeatsValue: Number(match[1]),
  };
}

function formatRouteCodes(routeCodes?: string[] | null): string {
  if (!routeCodes || routeCodes.length === 0) return "";

  const routeMap: Record<string, string> = {
    PO: "orally",
    IV: "IV",
    IM: "IM",
    SC: "subcutaneously",
    SUBCUT: "subcutaneously",
    NGT: "via NGT",
    PEG: "via PEG",
    TOP: "topically",
    INH: "inhaled",
    NEB: "nebulised",
    SL: "sublingually",
    PR: "rectally",
    PV: "vaginally",
    OPHTH: "to eye",
    OTIC: "to ear",
  };

  return routeCodes
    .map((code) => routeMap[code] ?? code)
    .join(" + ");
}

function formatFrequency(code?: string | null): string {
  if (!code) return "";

  const map: Record<string, string> = {
    OD: "once daily",
    BD: "BD",
    TDS: "TDS",
    QID: "QID",
    NOCTE: "nocte",
    MANE: "mane",
    PRN: "PRN",
  };

  return map[code] ?? code;
}

function formatDurationKey(key?: string | null): string {
  if (!key) return "";

  if (key === "ONGOING") return "ongoing";

  const match = key.match(/^([DWMY]):(\d+)$/);
  if (!match) return key;

  const [, unitCode, rawNum] = match;
  const num = Number(rawNum);

  const unit =
    unitCode === "D"
      ? num === 1
        ? "day"
        : "days"
      : unitCode === "W"
      ? num === 1
        ? "week"
        : "weeks"
      : unitCode === "M"
      ? num === 1
        ? "month"
        : "months"
      : num === 1
      ? "year"
      : "years";

  return `for ${num} ${unit}`;
}

function formatSingleRegimenLine(line: RegimenLine): string {
  const parts: string[] = [];

  if (line.dose_text?.trim()) parts.push(line.dose_text.trim());

  const freq = formatFrequency(line.frequency_code);
  if (freq) parts.push(freq);

  const route = formatRouteCodes(line.route_codes);
  if (route) parts.push(route);

  const duration = formatDurationKey(line.duration_key);
  if (duration && duration !== "ongoing") parts.push(duration);

  if ((line.is_prn || line.frequency_code === "PRN") && !parts.includes("PRN")) {
    parts.push("PRN");
  }

  return parts.join(" ");
}

function getBaseMedicationLabel(rx: PrescriptionRow): string {
  if (rx.banner_name?.trim()) {
    const firstLineProduct = rx.regimen_lines?.find((line) => line.product_label?.trim());
    if (firstLineProduct?.product_label?.trim()) {
      return `${rx.banner_name} ${firstLineProduct.product_label.trim()}`;
    }
    return rx.banner_name;
  }

  return titleCase(rx.medication_name);
}

function buildFullPrescriptionDisplay(rx: PrescriptionRow): string {
  const base = getBaseMedicationLabel(rx);
  const lines = (rx.regimen_lines ?? []).slice().sort((a, b) => (a.line_index ?? 0) - (b.line_index ?? 0));

  if (lines.length === 0) return base;

  const rendered = lines
    .map((line, index) => {
      const text = formatSingleRegimenLine(line);
      if (!text) return "";

      if (index === 0) return text;

      const connector = line.connector_from_prev?.trim();
      return connector ? `${connector} ${text}` : text;
    })
    .filter(Boolean)
    .join(" ");

  return rendered ? `${base} | ${rendered}` : base;
}

type PatientRow = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  nhi: string | null;
  allergies?: string | null;
};

type RegimenLine = {
  id?: string;
  line_index?: number;
  connector_from_prev?: "AND" | "THEN" | null;
  dose_text?: string | null;
  dose_amount_low?: string | null;
  dose_amount_high?: string | null;
  dose_unit?: string | null;
  route_codes?: string[] | null;
  frequency_code?: string | null;
  duration_key?: string | null;
  selected_product_id?: string | null;
  source_product_code?: string | null;
  product_label?: string | null;
  product_strength?: string | null;
  product_dose_form?: string | null;
  is_prn?: boolean | null;
};

type PrescriptionRow = {
  prescription_id: string;
  medication_banner_id: string | null;
  banner_name: string | null;
  medication_name: string;
  is_prn?: boolean;
  is_stat?: boolean;
  indication?: string | null;
  start_date?: string | null;
  additional_information?: string | null;
  stop_reason?: string | null;
  stopped_at?: string | null;
  dose?: string | null;
  route?: string | null;
  frequency?: string | null;
  duration?: string | null;
  dispense_cycle: number;
  created_at: string;
  medication_section?: "current_regular" | "current_prn" | "stopped";
  regimen_lines?: RegimenLine[] | null;
};

type CommunityPrescriptionItem = {
  id: string;
  prescriptionId: string;
  medicationBannerId: string | null;
  medicationType: "regular" | "prn";
  title: string;
  subtitle: string;
  durationText: string;
  repeatsText: string;
  blisterPack: boolean;
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

function makePrescriptionSupplyOptions(): string[] {
  const days = Array.from({ length: 90 }, (_, i) => `${i + 1} day${i === 0 ? "" : "s"}`);
  const weeks = Array.from({ length: 12 }, (_, i) => `${i + 1} week${i === 0 ? "" : "s"}`);
  const months = Array.from({ length: 3 }, (_, i) => `${i + 1} month${i === 0 ? "" : "s"}`);
  const tablets = Array.from({ length: 200 }, (_, i) => `${i + 1} tablet${i === 0 ? "" : "s"}`);

  return [...days, ...weeks, ...months, ...tablets];
}

const SUPPLY_OPTIONS = makePrescriptionSupplyOptions();

function makeRepeatOptions(): string[] {
  return Array.from(
    { length: 12 },
    (_, i) => `${i + 1} repeat${i === 0 ? "" : "s"}`
  );
}

const REPEAT_OPTIONS = makeRepeatOptions();

function matchesOption(query: string, option: string) {
  return option.toLowerCase().includes(query.trim().toLowerCase());
}

function buildPrescriptionTitle(rx: PrescriptionRow): string {
  return getBaseMedicationLabel(rx);
}

function buildPrescriptionSubtitle(rx: PrescriptionRow): string {
  const lines = (rx.regimen_lines ?? [])
    .slice()
    .sort((a, b) => (a.line_index ?? 0) - (b.line_index ?? 0));

  if (lines.length === 0) return "";

  return lines
    .map((line, index) => {
      const text = formatSingleRegimenLine(line);
      if (!text) return "";

      if (index === 0) return text;

      const connector = line.connector_from_prev?.trim();
      return connector ? `${connector} ${text}` : text;
    })
    .filter(Boolean)
    .join(" ");
}

function AutocompleteTextInput({
  value,
  onChange,
  options,
  placeholder,
  onOpenChange,
}: {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [focused, setFocused] = useState(false);

  const filtered = useMemo(() => {
    if (!value.trim()) return options.slice(0, 12);
    return options.filter((opt) => matchesOption(value, opt)).slice(0, 12);
  }, [options, value]);

  const isOpen = focused && filtered.length > 0;

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          padding: "7px 11px",
          fontSize: 13,
          background: "#fff",
          color: "#111827",
          minHeight: 34,
        }}
      />

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 6,
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            maxHeight: 240,
            overflowY: "auto",
            zIndex: 9999,
          }}
        >
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                setFocused(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                border: "none",
                background: "#fff",
                cursor: "pointer",
                fontSize: 14,
                color: "#111827",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CommunityPrescriptionRow({
  item,
  onDurationChange,
  onRepeatsChange,
  onToggleBlisterPack,
}: {
  item: CommunityPrescriptionItem;
  onDurationChange: (id: string, value: string) => void;
  onRepeatsChange: (id: string, value: string) => void;
  onToggleBlisterPack: (id: string) => void;
}) {
  const [durationDropdownOpen, setDurationDropdownOpen] = useState(false);
  const [repeatsDropdownOpen, setRepeatsDropdownOpen] = useState(false);

  const showQuickButtons = item.medicationType === "regular";
  const showBlisterPack = item.medicationType === "regular";
  const hasDuration = item.durationText.trim().length > 0;
  const hasRepeats = (item.repeatsText ?? "").trim().length > 0;
  const isActive = hasDuration || item.blisterPack || hasRepeats;
  const quickDurationOptions = ["3 months", "1 month"];
  const quickRepeatOptions = ["1 repeat", "2 repeats"];

  const anyDropdownOpen = durationDropdownOpen || repeatsDropdownOpen;

  return (
    <div
      style={{
        border: isActive ? "1px solid #e5e7eb" : "1px solid #d1d5db",
        borderRadius: 12,
        padding: 12,
        background: isActive ? "#ffffff" : "#f3f4f6",
        opacity: isActive ? 1 : 0.72,
        transition: "all 120ms ease",
        position: "relative",
        overflow: "visible",
        zIndex: anyDropdownOpen ? 100 : isActive ? 2 : 1,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: 12,
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              color: "#111827",
              fontSize: 16,
              lineHeight: 1.3,
            }}
          >
            {item.title}
          </div>

          <div
            style={{
              marginTop: 2,
              color: "#4b5563",
              fontSize: 14,
              lineHeight: 1.2,
              whiteSpace: "pre-wrap",
            }}
          >
            {item.subtitle || "—"}
          </div>
        </div>

        <div
          style={{
            width: showBlisterPack ? 470 : 360,
            marginLeft: "auto",
            display: "grid",
            gridTemplateColumns: showBlisterPack ? "175px 135px 100px" : "175px 135px",
            gap: 10,
            alignItems: "start",
            justifyContent: "end",
            boxSizing: "border-box",
          }}
        >
          <div>
            <AutocompleteTextInput
              value={item.durationText}
              onChange={(value) => onDurationChange(item.id, value)}
              options={SUPPLY_OPTIONS}
              placeholder="Type duration..."
              onOpenChange={setDurationDropdownOpen}
            />

            {showQuickButtons && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginTop: 6,
                }}
              >
                {quickDurationOptions.map((option) => {
                    const isQuickActive = (item.repeatsText ?? "") === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onDurationChange(item.id, option)}
                      style={{
                        border: isQuickActive ? "1px solid #2563eb" : "1px solid #d1d5db",
                        background: isQuickActive ? "#dbeafe" : "#ffffff",
                        color: isQuickActive ? "#1d4ed8" : "#374151",
                        borderRadius: 8,
                        padding: "4px 6px",
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        minHeight: 24,
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <AutocompleteTextInput
              value={item.repeatsText ?? ""}
              onChange={(value) => onRepeatsChange(item.id, value)}
              options={REPEAT_OPTIONS}
              placeholder="Repeats..."
              onOpenChange={setRepeatsDropdownOpen}
            />

            {showQuickButtons && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginTop: 6,
                }}
              >
                {quickRepeatOptions.map((option) => {
                  const isQuickActive = item.repeatsText === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onRepeatsChange(item.id, option)}
                      style={{
                        border: isQuickActive ? "1px solid #2563eb" : "1px solid #d1d5db",
                        background: isQuickActive ? "#dbeafe" : "#ffffff",
                        color: isQuickActive ? "#1d4ed8" : "#374151",
                        borderRadius: 8,
                        padding: "4px 6px",
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        minHeight: 24,
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {showBlisterPack && (
            <button
              type="button"
              onClick={() => {
                if (!hasDuration) return;
                onToggleBlisterPack(item.id);
              }}
              disabled={!hasDuration}
              style={{
                border: item.blisterPack ? "1px solid #2563eb" : "1px solid #d1d5db",
                background: item.blisterPack
                  ? "#dbeafe"
                  : hasDuration
                  ? "#ffffff"
                  : "#f3f4f6",
                color: item.blisterPack
                  ? "#1d4ed8"
                  : hasDuration
                  ? "#374151"
                  : "#9ca3af",
                borderRadius: 8,
                padding: "6px 8px",
                fontSize: 11,
                fontWeight: 700,
                cursor: hasDuration ? "pointer" : "not-allowed",
                minHeight: 56,
                alignSelf: "start",
                lineHeight: 1.1,
                textAlign: "center",
                opacity: hasDuration ? 1 : 0.7,
              }}
            >
              Blister
              <br />
              pack
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewCommunityPrescriptionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const patientId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [items, setItems] = useState<CommunityPrescriptionItem[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pharmacistNote, setPharmacistNote] = useState("");


async function handleConfirmSend() {
  if (!patientId) return;

  const selectedItems = items.filter((item) => item.durationText.trim().length > 0);
  if (selectedItems.length === 0) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    alert("Could not determine current user.");
    return;
  }

  let parsedItems: Array<{
    item: CommunityPrescriptionItem;
    supply: ReturnType<typeof parseSupplyText>;
    repeats: ReturnType<typeof parseRepeatsText>;
  }>;

  try {
    parsedItems = selectedItems.map((item) => {
      const supply = parseSupplyText(item.durationText);
      const repeats = parseRepeatsText(item.repeatsText ?? "");

      if (
        !supply.authoredText ||
        supply.supplyValue === null ||
        supply.supplyUnit === null
      ) {
        throw new Error(`Invalid duration for ${item.title}: "${item.durationText}"`);
      }

      if ((item.repeatsText ?? "").trim().length > 0 && repeats.repeatsValue === null) {
        throw new Error(`Invalid repeats for ${item.title}: "${item.repeatsText}"`);
      }

      return {
        item,
        supply,
        repeats,
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid prescription values.";
    alert(message);
    return;
  }

  const nowIso = new Date().toISOString();

  const { data: parentRow, error: parentError } = await supabase
    .from("community_prescriptions")
    .insert({
      patient_id: patientId,
      created_by_user_id: user.id,
      status: "sent",
      pharmacist_note: pharmacistNote.trim() || null,
      sent_at: nowIso,
    })
    .select("id")
    .single();

  if (parentError || !parentRow) {
    console.error(parentError);
    alert(parentError?.message ?? "Failed to create community prescription.");
    return;
  }

  const itemRows = parsedItems.map(({ item, supply, repeats }) => ({
    community_prescription_id: parentRow.id,
    prescription_id: item.prescriptionId,
    medication_banner_id: item.medicationBannerId,
    medication_title: item.title,
    medication_subtitle: item.subtitle || null,
    authored_supply_text: supply.authoredText,
    supply_value: supply.supplyValue,
    supply_unit: supply.supplyUnit,
    supply_days: supply.supplyDays,
    authored_repeats_text: repeats.authoredText,
    repeats_value: repeats.repeatsValue,
    blister_pack: item.blisterPack,
    sent_at: nowIso,
    pharmacist_status: "sent",
  }));

  const { error: itemsError } = await supabase
    .from("community_prescription_items")
    .insert(itemRows);

  if (itemsError) {
    console.error(itemsError);
    alert(itemsError.message ?? "Failed to save community prescription items.");
    return;
  }

  setIsConfirmModalOpen(false);
  setPharmacistNote("");
  alert("Community prescription sent");
  router.push(`/doctor/patients/${patientId}`);
}

  useEffect(() => {
    if (!patientId) return;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id, full_name, date_of_birth, nhi, allergies")
        .eq("id", patientId)
        .single();

      if (patientError) {
        setError(patientError.message);
        setLoading(false);
        return;
      }

      const { data: rxData, error: rxError } = await supabase.rpc(
        "medication_table_for_patient",
        { p_patient_id: patientId }
      );

      if (rxError) {
        setError(rxError.message);
        setLoading(false);
        return;
      }

      const normalizedRx = ((rxData ?? []) as any[]).map((rx) => ({
        ...rx,
        id: rx.prescription_id,
      })) as PrescriptionRow[];

      const activeItems: CommunityPrescriptionItem[] = normalizedRx
  .filter(
    (rx) =>
      rx.medication_section === "current_regular" ||
      rx.medication_section === "current_prn"
  )
  .map((rx) => ({
    id: rx.prescription_id,
    prescriptionId: rx.prescription_id,
    medicationBannerId: rx.medication_banner_id ?? null,
    medicationType:
      rx.medication_section === "current_prn" ? "prn" : "regular",
    title: buildPrescriptionTitle(rx),
    subtitle: buildPrescriptionSubtitle(rx),
    durationText: "",
    repeatsText: "",
    blisterPack: false,
  }));

      setPatient(patientData as PatientRow);
      setItems(activeItems);
      setLoading(false);
    }

    load();
  }, [patientId, supabase]);

  const regularItems = items.filter((item) => item.medicationType === "regular");
  const prnItems = items.filter((item) => item.medicationType === "prn");

  function updateItem(id: string, patch: Partial<CommunityPrescriptionItem>) {
  setItems((curr) =>
    curr.map((item) => {
      if (item.id !== id) return item;

      const nextItem = { ...item, ...patch };

      if ("durationText" in patch && !nextItem.durationText.trim()) {
        nextItem.blisterPack = false;
      }

      return nextItem;
    })
  );
}

  function fillAllRegularWithThreeMonths() {
    setItems((curr) =>
      curr.map((item) =>
        item.medicationType === "regular"
          ? { ...item, durationText: "3 months" }
          : item
      )
    );
  }

  function blisterPackAllRegular() {
  setItems((curr) =>
    curr.map((item) =>
      item.medicationType === "regular"
        ? { ...item, blisterPack: true }
        : item
    )
  );
}

const hasAnySelectedMedication = items.some(
  (item) => item.durationText.trim().length > 0
);

const selectedItems = items.filter((item) => item.durationText.trim().length > 0);

const selectedCount = items.filter((item) => item.durationText.trim().length > 0).length;

  if (loading) {
    return (
      <main style={{ fontFamily: "system-ui", padding: 24 }}>
        Loading community prescription...
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ fontFamily: "system-ui", padding: 24, color: "#b91c1c" }}>
        Error: {error}
      </main>
    );
  }

  if (!patient) {
    return (
      <main style={{ fontFamily: "system-ui", padding: 24 }}>
        Patient not found.
      </main>
    );
  }

  return (
    <main style={{ fontFamily: "system-ui", minHeight: "100vh", background: "#f9fafb" }}>
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
        }}
      >
        <div style={{ justifySelf: "start" }}>
          <button
            onClick={() => router.back()}
            style={{
              color: "#ffffff",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              padding: 0,
            }}
          >
            ← Back
          </button>
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
          <Link
            href={`/doctor/patients/${patientId}`}
            style={{
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Patient page
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: 24 }}>
        <div
  style={{
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 20,
  }}
>
  <div
    style={{
      fontSize: 28,
      fontWeight: 800,
      color: "#111827",
      lineHeight: 1.25,
    }}
  >
    Creating community prescription for{" "}
    <span style={{ color: "#2563eb" }}>{patient.full_name}</span>
  </div>

  <div
    style={{
      marginTop: 8,
      fontSize: 15,
      color: "#4b5563",
      display: "flex",
      flexWrap: "wrap",
      gap: 16,
    }}
  >
    <span>
      <strong>Age:</strong> {calcAge(patient.date_of_birth)}
    </span>
    <span>
      <strong>DOB:</strong> {patient.date_of_birth ?? "—"}
    </span>
    <span>
      <strong>NHI:</strong> {patient.nhi ?? "—"}
    </span>
  </div>
</div>

        

        <section style={{ marginBottom: 24 }}>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    }}
  >
    <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
      Current Regular Medications
    </div>

    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
  <button
    type="button"
    onClick={fillAllRegularWithThreeMonths}
    style={{
      background: "#eef2ff",
      color: "#3730a3",
      border: "1px solid #c7d2fe",
      padding: "8px 12px",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}
  >
    Fill all with 3 months
  </button>

  <button
    type="button"
    onClick={blisterPackAllRegular}
    style={{
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
      padding: "8px 12px",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}
  >
    Blister pack all
  </button>
</div>
  </div>

          <div style={{ display: "grid", gap: 12 }}>
            {regularItems.length === 0 ? (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  color: "#6b7280",
                }}
              >
                No current regular medications.
              </div>
            ) : (
              regularItems.map((item) => (
                <CommunityPrescriptionRow
  key={item.id}
  item={item}
  onDurationChange={(id, value) => updateItem(id, { durationText: value })}
  onRepeatsChange={(id, value) => updateItem(id, { repeatsText: value })}
  onToggleBlisterPack={(id) =>
    updateItem(id, {
      blisterPack: !items.find((x) => x.id === id)?.blisterPack,
    })
  }
/>
              ))
            )}
          </div>
        </section>

        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 12 }}>
            Current PRN Medications
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {prnItems.length === 0 ? (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  color: "#6b7280",
                }}
              >
                No current PRN medications.
              </div>
            ) : (
              prnItems.map((item) => (
                <CommunityPrescriptionRow
  key={item.id}
  item={item}
  onDurationChange={(id, value) => updateItem(id, { durationText: value })}
  onRepeatsChange={(id, value) => updateItem(id, { repeatsText: value })}
  onToggleBlisterPack={(id) =>
    updateItem(id, {
      blisterPack: !items.find((x) => x.id === id)?.blisterPack,
    })
  }
/>
              ))
            )}
          </div>
        </section>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            paddingTop: 8,
          }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              background: "#ffffff",
              color: "#111827",
              border: "1px solid #d1d5db",
              padding: "10px 16px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Cancel
          </button>

          <button
  type="button"
  disabled={!hasAnySelectedMedication}
  onClick={() => setIsConfirmModalOpen(true)}
  style={{
    background: hasAnySelectedMedication ? "#111827" : "#9ca3af",
    color: "#ffffff",
    border: "none",
    padding: "10px 16px",
    borderRadius: 8,
    cursor: hasAnySelectedMedication ? "pointer" : "not-allowed",
    fontWeight: 700,
    opacity: hasAnySelectedMedication ? 1 : 0.8,
  }}
>
  Send to Pharmacy
</button>
        </div>
      </div>

{isConfirmModalOpen && (
  <div
    onClick={() => setIsConfirmModalOpen(false)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000,
      padding: 24,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: 760,
        maxHeight: "85vh",
        overflowY: "auto",
        background: "#ffffff",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          padding: "20px 24px 12px 24px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>
          Confirm Send to Pharmacy for {patient.full_name}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        <div style={{ display: "grid", gap: 12 }}>
          {selectedItems.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                background: "#f9fafb",
              }}
            >
              <div style={{ fontWeight: 700, color: "#111827", fontSize: 15 }}>
                {item.title}
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: "#4b5563",
                  fontSize: 14,
                  lineHeight: 1.3,
                  whiteSpace: "pre-wrap",
                }}
              >
                {item.subtitle}
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "#eef2ff",
                    color: "#3730a3",
                    fontWeight: 700,
                  }}
                >
                  Duration: {item.durationText}
                </div>

{item.repeatsText.trim() && (
  <div
    style={{
      padding: "6px 10px",
      borderRadius: 999,
      background: "#f3f4f6",
      color: "#374151",
      fontWeight: 700,
    }}
  >
    Repeats: {item.repeatsText}
  </div>
)}

                {item.blisterPack && (
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#dbeafe",
                      color: "#1d4ed8",
                      fontWeight: 700,
                    }}
                  >
                    Blister pack
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 8,
            }}
          >
            Notes to pharmacist
          </div>

          <textarea
            value={pharmacistNote}
            onChange={(e) => setPharmacistNote(e.target.value)}
            rows={5}
            placeholder="Add any notes for the pharmacist..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: 12,
              fontSize: 14,
              color: "#111827",
              background: "#ffffff",
              resize: "vertical",
            }}
          />
        </div>
      </div>

      <div
        style={{
          padding: "16px 24px 20px 24px",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setIsConfirmModalOpen(false)}
          style={{
            background: "#ffffff",
            color: "#111827",
            border: "1px solid #d1d5db",
            padding: "10px 16px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleConfirmSend}
          style={{
            background: "#111827",
            color: "#ffffff",
            border: "none",
            padding: "10px 16px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Confirm send for {patient.full_name}
        </button>
      </div>
    </div>
  </div>
)}


    </main>
  );
}