"use client";

import React from "react";
import { DoseFooterActions } from "@/components/DoseFrequencyStep";

export default function NewMedicationWizardFooter(props: {
  step: "med" | "product" | "dose" | "details" | string;

  // Dose footer
  doseValue: string;
  doseUnit: string;
  isDoseRange: boolean;
  doseValueTo: string;
  routeCodes: string[];
  frequencyCode: string;
  durationKey: string;
  regimenLinesCount: number;
  pendingConnector: "AND" | "THEN" | null;
  setPendingConnector: (c: "AND" | "THEN" | null) => void;
  onAddLine: () => void;
  onContinueFromDose: () => void;
  registerFocusContinue: (fn: () => void) => void;

  // Details save
  saveBtnRef: React.RefObject<HTMLButtonElement | null>;
  onSave: () => void;
  isSavingRx: boolean;
  canSaveDetails: boolean;
}) {
  const {
    step,

    doseValue,
    doseUnit,
    isDoseRange,
    doseValueTo,
    routeCodes,
    frequencyCode,
    durationKey,
    regimenLinesCount,
    pendingConnector,
    setPendingConnector,
    onAddLine,
    onContinueFromDose,
    registerFocusContinue,

    saveBtnRef,
    onSave,
    isSavingRx,
    canSaveDetails,
  } = props;

  return (
    <div
      style={{
        padding: 12,
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
      }}
    >
      {step === "dose" && (
        <div style={{ width: "100%" }}>
          <DoseFooterActions
            doseValue={doseValue}
            doseUnit={doseUnit}
            isDoseRange={isDoseRange}
            doseValueTo={doseValueTo}
            routeCodes={routeCodes}
            frequencyCode={frequencyCode}
            durationKey={durationKey}
            regimenLinesCount={regimenLinesCount}
            pendingConnector={pendingConnector}
            onAddLine={onAddLine}
            setPendingConnector={setPendingConnector}
            onContinue={onContinueFromDose}
            registerFocusContinue={registerFocusContinue}
          />
        </div>
      )}

      {step === "details" && (
        <button
          type="button"
          ref={saveBtnRef}
          onClick={onSave}
          disabled={isSavingRx || !canSaveDetails}
          title={!canSaveDetails ? "Indication must be at least 3 characters" : undefined}
          style={{
            border: "none",
            background: isSavingRx || !canSaveDetails ? "#9ca3af" : "#2563eb",
            color: "#fff",
            borderRadius: 8,
            padding: "8px 12px",
            cursor: isSavingRx || !canSaveDetails ? "not-allowed" : "pointer",
            fontWeight: 600,
            opacity: isSavingRx ? 0.7 : 1,
          }}
        >
          {isSavingRx ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}