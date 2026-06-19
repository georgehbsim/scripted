"use client";

import { useEffect, useRef } from "react";

type StopMedicationDialogProps = {
  open: boolean;
  medicationName: string;
  stopReason: string;
  onChangeStopReason: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  stopDate: string;
  onChangeStopDate: (value: string) => void;
};

export default function StopMedicationDialog({
  open,
  medicationName,
  stopReason,
  onChangeStopReason,
  onCancel,
  onConfirm,
  stopDate,
  onChangeStopDate,
}: StopMedicationDialogProps) {
  const stopReasonRef = useRef<HTMLTextAreaElement | null>(null);

  
  useEffect(() => {
  if (!open) return;

  if (!stopDate) {
    onChangeStopDate(new Date().toISOString().slice(0, 10));
  }

  const id = window.setTimeout(() => {
    stopReasonRef.current?.focus();
    stopReasonRef.current?.select();
  }, 0);

  return () => window.clearTimeout(id);
}, [open, stopDate, onChangeStopDate]);

  useEffect(() => {
    if (!open) return;

    const id = window.setTimeout(() => {
      stopReasonRef.current?.focus();
      stopReasonRef.current?.select();
    }, 0);

    return () => window.clearTimeout(id);
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: 20,
          borderRadius: 12,
          width: "min(520px, 92vw)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
        }}
      >
        <p
          style={{
            marginTop: 0,
            marginBottom: 12,
            fontSize: 16,
            fontWeight: 600,
            color: "#111827",
          }}
        >
          Why is <strong>{medicationName}</strong> being stopped?
        </p>

        <textarea
          ref={stopReasonRef}
          value={stopReason}
          onChange={(e) => onChangeStopReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onConfirm();
            }
          }}
          rows={4}
          placeholder="Enter stop reason"
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
          }}
        />

        <div style={{ marginBottom: 12 }}>
  <label
    style={{
      display: "block",
      marginBottom: 6,
      fontSize: 14,
      fontWeight: 600,
      color: "#111827",
    }}
  >
    Stop date
  </label>
  <input
  type="date"
  value={stopDate ?? ""}
  onChange={(e) => onChangeStopDate(e.target.value)}
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
  <p
    style={{
      marginTop: 6,
      marginBottom: 0,
      fontSize: 12,
      color: "#6b7280",
    }}
  >
    Prefilled with today’s date.
  </p>
</div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 12px",
              background: "#111827",
              color: "#ffffff",
              border: "1px solid #111827",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            style={{
              padding: "8px 12px",
              background: "#111827",
              color: "#ffffff",
              border: "1px solid #111827",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}