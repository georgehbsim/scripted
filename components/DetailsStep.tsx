"use client";

import { useEffect, useMemo, useRef } from "react";

type Props = {
  indication: string;
  setIndication: (v: string) => void;

  startDate: string;
  setStartDate: (v: string) => void;

  autoFocus?: boolean;
  maxIndicationChars?: number;

  additionalInfo: string;
  setAdditionalInfo: (v: string) => void;

  changeReason: string;
  setChangeReason: (v: string) => void;
  editTarget?: unknown;

  registerFocusSave?: (fn: () => void) => void;
  onFocusSave?: () => void;

  availableForAdministration: boolean;
  setAvailableForAdministration: (v: boolean) => void;
};

function todayLocalISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function DetailsStep({
  indication,
  setIndication,
  startDate,
  setStartDate,
  additionalInfo,
  setAdditionalInfo,
  changeReason,
  setChangeReason,
  editTarget,
  autoFocus,
  maxIndicationChars = 100,
  onFocusSave,
  availableForAdministration,
  setAvailableForAdministration,
}: Props) {
  // Default start date to today (only if empty)
  useEffect(() => {
    if (!startDate) setStartDate(todayLocalISO());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remaining = useMemo(
    () => maxIndicationChars - (indication?.length ?? 0),
    [indication, maxIndicationChars]
  );

  const indicationRef = useRef<HTMLInputElement | null>(null);
  const startDateRef = useRef<HTMLInputElement | null>(null);
  const additionalRef = useRef<HTMLInputElement | null>(null);



  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        width: "100%",
      }}
    >
      {/* Indication spans full width */}
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
          Indication
        </div>
        <input
          autoFocus={autoFocus}
          value={indication}
          maxLength={maxIndicationChars}
          onChange={(e) => setIndication(e.target.value.slice(0, maxIndicationChars))}
          placeholder="Free text (max 100 characters)"

          style={{
            width: "100%",
            display: "block",
            boxSizing: "border-box",
            padding: 10,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            color: "#111827",
            background: "#fff",

          }}
          onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      startDateRef.current?.focus();
    }
  }}
        />
        {indication.trim().length < 3 && (
  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
    Indication must be at least 3 characters to save.
  </div>
)}
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
          {remaining} characters remaining
        </div>
      </div>

      {editTarget ? (
  <div style={{ gridColumn: "1 / -1", marginTop: 12 }}>
    <label
      style={{
        display: "block",
        marginBottom: 6,
        fontSize: 14,
        fontWeight: 600,
        color: "#111827",
      }}
    >
      Reason for change
    </label>
    <textarea
      value={changeReason}
      onChange={(e) => setChangeReason(e.target.value)}
      rows={3}
      placeholder="Enter reason for change"
      style={{
        width: "100%",
        padding: 12,
        borderRadius: 8,
        border: "1px solid #9ca3af",
        background: "#ffffff",
        color: "#111827",
        fontSize: 15,
        lineHeight: 1.4,
        outline: "none",
        boxSizing: "border-box",
      }}
    />
  </div>
) : null}

      {/* Start date (left column) */}
      <div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
          Start date
        </div>
        <input
          type="date"
          ref={startDateRef}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{
            width: "100%",
            display: "block",
            boxSizing: "border-box",
            padding: 10,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            color: "#111827",
            background: "#fff",
          }}
          onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      additionalRef.current?.focus();
    }
  }}

        />
      </div>
      {/* Right column reserved for start time / other toggles later */}
      <div />

      {/* Additional information spans full width */}
<div style={{ gridColumn: "1 / -1" }}>
  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
    Additional information
  </div>
  <input
    value={additionalInfo}
    ref={additionalRef}
    maxLength={100}
    onChange={(e) => setAdditionalInfo(e.target.value.slice(0, 100))}
    placeholder="Free text (max 100 characters)"
    style={{
      width: "100%",
      display: "block",
      boxSizing: "border-box",
      padding: 10,
      border: "1px solid #d1d5db",
      borderRadius: 8,
      color: "#111827",
      background: "#fff",
    }}
    onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      requestAnimationFrame(() => onFocusSave?.());
    }
  }}

  />
  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
    {100 - (additionalInfo?.length ?? 0)} characters remaining
  </div>

        {/* Available for administration */}
      <div style={{ gridColumn: "1 / -1" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            background: "#fff",
            color: "#111827",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={availableForAdministration}
            onChange={(e) => setAvailableForAdministration(e.target.checked)}
          />
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            Available for administration
          </span>
        </label>
      </div>
</div>
    </div>
  );
}
