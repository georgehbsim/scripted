import { displayForDurationKey } from "@/components/durationOptions";
import { displayForFrequencyCode } from "@/components/frequencyOptions";
import { displayForRouteCode } from "@/components/routeOptions";
import type { HistoryLine, HistoryPrescription } from "./types";

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function calcAge(dobIso: string | null): string {
  if (!dobIso) return "—";
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return "—";

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? String(age) : "—";
}

export function formatStatus(status: string | null | undefined) {
  if (!status) return "—";
  return status.replaceAll("_", " ");
}

export function eventDate(rx: HistoryPrescription) {
  return rx.stopped_at ?? rx.start_date ?? rx.created_at;
}

export function eventType(rx: HistoryPrescription, allRows: HistoryPrescription[]) {
  const sorted = [...allRows].sort(
    (a, b) => new Date(eventDate(a)).getTime() - new Date(eventDate(b)).getTime()
  );
  const firstId = sorted[0]?.id;

  if (rx.status === "stopped") return "Stopped";
  if (rx.change_reason) return "Changed";
  if (rx.id === firstId) return "Started";
  return "Changed";
}

export function formatDoseDisplay(line: HistoryLine) {
  const low =
    line.dose_amount_low_calculated !== null &&
    line.dose_amount_low_calculated !== undefined &&
    line.dose_unit_calculated;

  if (low) {
    const lowValue = String(line.dose_amount_low_calculated);
    const highValue =
      line.dose_amount_high_calculated !== null && line.dose_amount_high_calculated !== undefined
        ? String(line.dose_amount_high_calculated)
        : null;

    return highValue
      ? `${lowValue}-${highValue} ${line.dose_unit_calculated}`
      : `${lowValue} ${line.dose_unit_calculated}`;
  }

  return line.dose_text || "—";
}

export function formatRegimen(lines: HistoryLine[]) {
  if (!lines.length) return "—";

  return lines
    .map((line, index) => {
      const parts = [
        formatDoseDisplay(line),
        (line.route_codes ?? []).map((code) => displayForRouteCode(code) || code).join(" + "),
        displayForFrequencyCode(line.frequency_code) || line.frequency_code,
        line.duration_key === "ONGOING"
          ? "ongoing"
          : line.duration_key
          ? `for ${displayForDurationKey(line.duration_key)}`
          : "",
        line.product_label || "",
      ].filter(Boolean);

      const text = parts.join(" · ");
      return `${index > 0 && line.connector_from_prev ? `${line.connector_from_prev} ` : ""}${text}`;
    })
    .join(" ");
}

export const laneButtonStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#ffffff",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
};

export const badgeBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 700,
  border: "1px solid #d1d5db",
};

export function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "active") {
    return {
      ...badgeBase,
      background: "#ecfdf5",
      color: "#065f46",
      borderColor: "#a7f3d0",
    };
  }
  if (normalized === "stopped") {
    return {
      ...badgeBase,
      background: "#fef2f2",
      color: "#991b1b",
      borderColor: "#fecaca",
    };
  }
  return {
    ...badgeBase,
    background: "#f3f4f6",
    color: "#111827",
    borderColor: "#d1d5db",
  };
}

export function adminBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "given") {
    return {
      ...badgeBase,
      background: "#ecfdf5",
      color: "#065f46",
      borderColor: "#a7f3d0",
    };
  }
  if (normalized === "not_given") {
    return {
      ...badgeBase,
      background: "#fff7ed",
      color: "#9a3412",
      borderColor: "#fdba74",
    };
  }
  return {
    ...badgeBase,
    background: "#f3f4f6",
    color: "#111827",
    borderColor: "#d1d5db",
  };
}