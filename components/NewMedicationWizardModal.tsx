"use client";
import React from "react";
import MedicationAutocomplete from "@/components/MedicationAutocomplete";
import ProductAutocomplete, { type ProductOption } from "@/components/ProductAutocomplete";
import DoseFrequencyStep from "@/components/DoseFrequencyStep";
import DetailsStep from "@/components/DetailsStep";

type Props = {
  // header
  step: string;
  newMed: string;
  regimenSubtitle: string;
  onBack: () => void;
  onClose: () => void;

  // med/product step props
  stepResetKey: number;
  onBannerSelected: (bannerId: string, bannerName: string) => void;

  productOptions: ProductOption[];
  productQuery: string;
  setProductQuery: (v: string) => void;
  selectedProductId: string | null;
  selectedProductLabel: string | null;
  onProductSelected: (p: ProductOption | null) => void;
  onSelectForm: (form: string) => void;
  editTarget?: unknown;
  changeReason: string;
  setChangeReason: (v: string) => void;

  // dose props
doseStepKey: number;

doseValue: string;
setDoseValue: (v: string) => void;

doseUnit: string;
setDoseUnit: (v: string) => void;

isDoseRange: boolean;
setIsDoseRange: (v: boolean) => void;

doseValueTo: string;
setDoseValueTo: (v: string) => void;

routeCodes: string[];
setRouteCodes: (v: string[]) => void;

routeText: string;
setRouteText: (v: string) => void;

allowedRouteCodes: string[];

frequencyCode: string;
setFrequencyCode: (v: string) => void;

frequencyText: string;
setFrequencyText: (v: string) => void;

durationKey: string;
setDurationKey: (v: string) => void;

durationText: string;
setDurationText: (v: string) => void;

unitOptions: string[];

onAddLine: () => void;
onFocusContinue: () => void;

// details props
detailsStepKey: number;

newIndication: string;
setNewIndication: (v: string) => void;

startDate: string;
setStartDate: (v: string) => void;

additionalInfo: string;
setAdditionalInfo: (v: string) => void;

onFocusSave: () => void; 

availableForAdministration: boolean;
setAvailableForAdministration: (v: boolean) => void;

};



export default function NewMedicationWizardModal({
  // existing header + med/product props...
  step,
  newMed,
  regimenSubtitle,
  onBack,
  onClose,
  stepResetKey,
  onBannerSelected,
  productOptions,
  productQuery,
  setProductQuery,
  selectedProductId,
  selectedProductLabel,
  onProductSelected,
  onSelectForm,

  // NEW: dose
  doseStepKey,
  doseValue,
  setDoseValue,
  doseUnit,
  setDoseUnit,
  isDoseRange,
  setIsDoseRange,
  doseValueTo,
  setDoseValueTo,
  routeCodes,
  setRouteCodes,
  routeText,
  setRouteText,
  allowedRouteCodes,
  frequencyCode,
  setFrequencyCode,
  frequencyText,
  setFrequencyText,
  durationKey,
  setDurationKey,
  durationText,
  setDurationText,
  unitOptions,
  onAddLine,
  onFocusContinue,

  // NEW: details
  detailsStepKey,
  newIndication,
  setNewIndication,
  startDate,
  setStartDate,
  additionalInfo,
  setAdditionalInfo,
  onFocusSave,
  editTarget,
  changeReason,
  setChangeReason,
  availableForAdministration,
  setAvailableForAdministration,
}: Props) {
  return (
    <>
      {/* Header */}
<div style={{ gridColumn: "1 / -1" }}>
  <div
    style={{
      padding: "10px 12px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "#f9fafb",
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 700, color: "#111827" }}>
        {step === "med" ? "New Medication" : newMed || "New Medication"}
      </div>

      {!!regimenSubtitle && step !== "med" && (
        <div
          style={{
            marginTop: 2,
            fontSize: 13,
            color: "#374151",
            fontWeight: 600,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {regimenSubtitle}
        </div>
      )}
    </div>

    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
      <button
        type="button"
        onClick={onBack}
        disabled={step === "med"}
        style={{
          border: "1px solid #d1d5db",
          background: "#fff",
          borderRadius: 8,
          padding: "6px 10px",
          cursor: step === "med" ? "not-allowed" : "pointer",
          color: "#111827",
          opacity: step === "med" ? 0.5 : 1,
        }}
        title={step === "med" ? "You’re already at the first step" : "Back"}
      >
        Back
      </button>

      <button
        type="button"
        onClick={onClose}
        style={{
          border: "1px solid #d1d5db",
          background: "#fff",
          borderRadius: 8,
          padding: "6px 10px",
          cursor: "pointer",
          color: "#111827",
        }}
      >
        Close
      </button>
    </div>
  </div>
</div>

      {/* Step 1: Medication */}
      {step === "med" && (
        <div style={{ gridColumn: "1 / -1" }}>
          <MedicationAutocomplete
            key={`med-${stepResetKey}`}
            autoFocus
            placeholder="Start typing..."
            onSelect={(r) => onBannerSelected(r.banner_id, r.banner_name)}
          />
        </div>
      )}

      {/* Step 2: Product */}
      {step === "product" && (
        <div style={{ gridColumn: "1 / -1" }}>
          <ProductAutocomplete
            key={`product-${stepResetKey}`}
            options={productOptions}
            query={productQuery}
            onQueryChange={setProductQuery}
            selectedProductId={selectedProductId}
            selectedProductLabel={selectedProductLabel}
            onSelect={onProductSelected}
            onSelectForm={onSelectForm}
            autoFocus
            placeholder="Start typing..."
          />
        </div>
      )}

      {/* Step 3: Dose */}
{step === "dose" && (
  <div style={{ gridColumn: "1 / -1" }}>
    <DoseFrequencyStep
      key={`dose-${doseStepKey}`}
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
      allowedRouteCodes={allowedRouteCodes}
      frequencyCode={frequencyCode}
      setFrequencyCode={setFrequencyCode}
      frequencyText={frequencyText}
      setFrequencyText={setFrequencyText}
      durationKey={durationKey}
      setDurationKey={setDurationKey}
      durationText={durationText}
      setDurationText={setDurationText}
      unitOptions={unitOptions}
      autoFocusValue
      onAddLine={onAddLine}
      onFocusContinue={onFocusContinue}
      onContinue={() => {}}
    />
  </div>
)}

{/* Step 4: Details */}
{step === "details" && (
  <div style={{ gridColumn: "1 / -1" }}>
    <DetailsStep
      key={`details-${detailsStepKey}`}
      indication={newIndication}
      setIndication={setNewIndication}
      startDate={startDate}
      setStartDate={setStartDate}
      additionalInfo={additionalInfo}
      setAdditionalInfo={setAdditionalInfo}
      autoFocus
      maxIndicationChars={100}
      onFocusSave={onFocusSave}
      editTarget={editTarget}
      changeReason={changeReason}
      setChangeReason={setChangeReason}
      availableForAdministration={availableForAdministration}
      setAvailableForAdministration={setAvailableForAdministration}
    />
  </div>
)}
    </>
  );
}