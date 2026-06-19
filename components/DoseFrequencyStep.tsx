// components/DoseFrequencyStep.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { displayForFrequencyCode, rankFrequencies } from "@/components/frequencyOptions";
import { displayForRouteCode, rankRoutes } from "@/components/routeOptions";
import {
  DURATION_OPTIONS,
  rankDurations,
  displayForDurationKey,
} from "@/components/durationOptions";


type Props = {
  doseValue: string;
  setDoseValue: (v: string) => void;

  // Optional dose range support
  isDoseRange?: boolean;
  setIsDoseRange?: (v: boolean) => void;
  doseValueTo?: string;
  setDoseValueTo?: (v: string) => void;

  doseUnit: string;
  setDoseUnit: (v: string) => void;

  // multi-select routes
  routeCodes: string[];
  setRouteCodes: (v: string[]) => void;
  routeText: string;
  setRouteText: (v: string) => void;
  allowedRouteCodes?: string[];

  // frequency
  frequencyCode: string;
  setFrequencyCode: (v: string) => void;
  frequencyText: string;
  setFrequencyText: (v: string) => void;

  // duration (textbox + key)
  durationKey: string;
  setDurationKey: (v: string) => void;
  durationText: string;
  setDurationText: (v: string) => void;


  unitOptions: string[];
  autoFocusValue?: boolean;

  onContinue: () => void;

  // Regimen builder actions
  onAddLine: (connector: "AND" | "THEN") => void;
  onFocusContinue?: () => void;
  showActionButtons?: boolean;
};

function norm(s: string) {
  return s.toLowerCase().trim();
}


export type DoseFooterActionsProps = {
  doseValue: string;
  isDoseRange?: boolean;
  doseValueTo?: string;
  doseUnit: string;
  routeCodes: string[];
  frequencyCode: string;
  durationKey: string;
  regimenLinesCount: number;
  pendingConnector: "AND" | "THEN" | null;
  onAddLine: () => void;
  setPendingConnector: (v: "AND" | "THEN" | null) => void;
  onContinue: () => void; 
  registerFocusContinue?: (fn: () => void) => void; 

};


/**
 * Left side of the modal footer for the dose step.
 * Keeps page.tsx small while preserving the sticky modal footer layout.
 */
export function DoseFooterActions({
  doseValue,
  doseUnit,
  routeCodes,
  frequencyCode,
  durationKey,
  regimenLinesCount,
  pendingConnector,
  onAddLine,
  setPendingConnector,
  onContinue,
  registerFocusContinue,
  isDoseRange = false,
  doseValueTo = "",
}: DoseFooterActionsProps) {
  const hasDoseFrom = !!(doseValue ?? "").trim();
  const hasDoseTo = !isDoseRange || !!(doseValueTo ?? "").trim();
  const hasDose = hasDoseFrom && hasDoseTo && !!(doseUnit ?? "").trim();  const hasRoute = routeCodes.length > 0;
  const hasFreq = !!frequencyCode;
  const hasDur = !!durationKey;

  const lineComplete = hasDose && hasRoute && hasFreq && hasDur;

  const isTimeLimited = !!durationKey && durationKey !== "ONGOING";
  const thenDisabled = !lineComplete;

  const continueBtnRef = useRef<HTMLButtonElement | null>(null);

useEffect(() => {
  registerFocusContinue?.(() => continueBtnRef.current?.focus());
}, [registerFocusContinue]);


  return (
  <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 8 }}>
    {/* left actions */}
<div style={{ display: "flex", gap: 8 }}>
  {lineComplete && (
    <button
      type="button"
      onClick={() => {
        onAddLine();                 // commit current line
        setPendingConnector("AND");  // next line is an AND line
      }}
      style={{
        border: "none",
        background: "#111827",
        color: "#fff",
        borderRadius: 8,
        padding: "8px 12px",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      {pendingConnector === "THEN" ? "+ Add THEN step" : "+ Add dose line"}
    </button>
  )}

  {isTimeLimited && (
    <button
      type="button"
      disabled={thenDisabled}
      onClick={() => {
        if (thenDisabled) return;

        onAddLine();                 // commit current line
        setPendingConnector("THEN"); // next line is a THEN step
      }}
      style={{
        border: "1px solid #d1d5db",
        background: "#fff",
        color: "#111827",
        borderRadius: 8,
        padding: "8px 12px",
        cursor: thenDisabled ? "not-allowed" : "pointer",
        fontWeight: 700,
        opacity: thenDisabled ? 0.5 : 1,
      }}
      title={thenDisabled ? "Complete this dose line first" : undefined}
    >
      THEN
    </button>
  )}
</div>


    {/* spacer */}
    <div style={{ flex: 1 }} />

    {/* right action */}
    <button
      ref={continueBtnRef}
      type="button"
      onClick={() => {
  onContinue();
  setPendingConnector(null);
}}
      disabled={!lineComplete}
      style={{
        border: "none",
        background: lineComplete ? "#2563eb" : "#9ca3af",
        color: "#fff",
        borderRadius: 8,
        padding: "8px 12px",
        cursor: lineComplete ? "pointer" : "not-allowed",
        fontWeight: 700,
      }}
    >
      Continue
    </button>
  </div>
);
}

export default function DoseFrequencyStep({
  doseValue,
  setDoseValue,
  doseUnit,
  setDoseUnit,

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
  autoFocusValue,

  onAddLine,
  onFocusContinue,
  showActionButtons = true,

  isDoseRange = false,
  setIsDoseRange,
  doseValueTo = "",
  setDoseValueTo,
}: Props) {
  const valueRef = useRef<HTMLInputElement | null>(null);
  const unitRef = useRef<HTMLInputElement | null>(null);
  const routeRef = useRef<HTMLInputElement | null>(null);
  const freqRef = useRef<HTMLInputElement | null>(null);
  const durationRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!autoFocusValue) return;
    requestAnimationFrame(() => valueRef.current?.focus());
  }, [autoFocusValue]);

  // ---------- Units ----------
  const rankedUnits = useMemo(() => {
    const q = norm(doseUnit);
    if (!q) return unitOptions;

    const starts = unitOptions.filter((u) => norm(u).startsWith(q));
    const contains = unitOptions.filter((u) => !starts.includes(u) && norm(u).includes(q));
    return [...starts, ...contains];
  }, [doseUnit, unitOptions]);

  const topUnit = rankedUnits[0];

  // ---------- Routes ----------
  const rankedRoutes = useMemo(
    () => rankRoutes(routeText, allowedRouteCodes),
    [routeText, allowedRouteCodes]
  );
  const topRoute = rankedRoutes[0];

  function addRoute(code: string) {
    if (routeCodes.includes(code)) return;
    setRouteCodes([...routeCodes, code]);
  }

  function removeRoute(code: string) {
    setRouteCodes(routeCodes.filter((c) => c !== code));
  }

  // ---------- Frequency ----------
  const rankedFreq = useMemo(() => rankFrequencies(frequencyText), [frequencyText]);
  const topFreq = rankedFreq[0];

  // If frequencyCode already set but text empty (returning to step)
  useEffect(() => {
    if (!frequencyText && frequencyCode) {
      setFrequencyText(displayForFrequencyCode(frequencyCode));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Duration ----------
  const rankedDur = useMemo(() => rankDurations(durationText), [durationText]);
  const topDur = rankedDur[0];

  useEffect(() => {
  if (!durationText && durationKey && durationKey !== "ONGOING") {
    setDurationText(displayForDurationKey(durationKey));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  return (
    <div style={{ gridColumn: "1 / -1" }}>
      {/* Dose row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
  {/* label row with checkbox on the right */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: 12,
      fontWeight: 600,
      marginBottom: 6,
      color: "#374151",
    }}
  >
    <span>Dose value</span>

    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={!!isDoseRange}
        onChange={(e) => {
          const next = e.target.checked;
          setIsDoseRange?.(next);
          if (!next) setDoseValueTo?.(""); // clear "to" when turning off
        }}
      />
      <span>Dose range</span>
    </label>
  </div>

  {/* input(s) */}
  {!isDoseRange ? (
    <input
      ref={valueRef}
      value={doseValue}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "" || /^[0-9]*\.?[0-9]*$/.test(raw)) setDoseValue(raw);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          unitRef.current?.focus();
          unitRef.current?.select?.();
        }
      }}
      placeholder="e.g. 1 or 500"
      style={{
        width: "100%",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "10px 12px",
        outline: "none",
        background: "#fff",
        color: "#111827",
      }}
    />
  ) : (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8 }}>
      <input
        ref={valueRef}
        value={doseValue}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" || /^[0-9]*\.?[0-9]*$/.test(raw)) setDoseValue(raw);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            // move to "to" input
            (e.currentTarget.parentElement?.querySelector(
              'input[data-dose-to="1"]'
            ) as HTMLInputElement | null)?.focus();
          }
        }}
        placeholder="e.g. 25"
        style={{
          width: "100%",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "10px 12px",
          outline: "none",
          background: "#fff",
          color: "#111827",
        }}
      />

      <div style={{ alignSelf: "center", color: "#6b7280", fontWeight: 600 }}>to</div>

      <input
        data-dose-to="1"
        value={doseValueTo}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" || /^[0-9]*\.?[0-9]*$/.test(raw)) setDoseValueTo?.(raw);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            unitRef.current?.focus();
            unitRef.current?.select?.();
          }
        }}
        placeholder="e.g. 50"
        style={{
          width: "100%",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "10px 12px",
          outline: "none",
          background: "#fff",
          color: "#111827",
        }}
      />
    </div>
  )}
</div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" }}>
            Units
          </div>
          <input
            ref={unitRef}
            value={doseUnit}
            onChange={(e) => {
              const raw = e.target.value;
              setDoseUnit(raw);

              const q = raw.trim().toLowerCase();
              if (!q) return;

              const match = unitOptions.find((u) => u.toLowerCase().startsWith(q)) ?? topUnit;
              if (!match) return;
              if (!match.toLowerCase().startsWith(q)) return;

              setDoseUnit(match);

              requestAnimationFrame(() => {
                const el = unitRef.current;
                if (!el) return;
                try {
                  el.setSelectionRange(raw.length, match.length);
                } catch {}
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (topUnit) setDoseUnit(topUnit);
                routeRef.current?.focus();
                routeRef.current?.select?.();
              }
            }}
            placeholder="e.g. mg or tablet"
            style={{
              width: "100%",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "10px 12px",
              outline: "none",
              background: "#fff",
              color: "#111827",
            }}
          />
        </div>
      </div>

      {/* Route (multi-select): left search, right selected */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" }}>
          Route
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <input
              ref={routeRef}
              value={routeText}
              onChange={(e) => setRouteText(e.target.value)}
              placeholder="e.g. PO, oral, NGT"
              style={{
                width: "100%",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "10px 12px",
                outline: "none",
                background: "#fff",
                color: "#111827",
                marginBottom: 10,
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();

                  const q = routeText.trim();
                  const oral = rankedRoutes.find((r) => r.code === "PO");

                  // If empty: default to PO if none selected
                  if (!q) {
                    if (routeCodes.length === 0 && oral) addRoute("PO");
                    freqRef.current?.focus();
                    freqRef.current?.select?.();
                    return;
                  }

                  // If typed: choose top match (fallback to PO)
                  const chosen = rankedRoutes[0] ?? oral;
                  if (chosen) addRoute(chosen.code);

                  setRouteText("");
                  freqRef.current?.focus();
                  freqRef.current?.select?.();
                }
              }}
            />

            {/* Route suggestions ONLY when typing */}
            {routeText.trim() && rankedRoutes.length > 0 && (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                  padding: 8,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {rankedRoutes.slice(0, 10).map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => {
  addRoute(opt.code);
  setRouteText(""); // ✅ hide suggestions after selecting
}}

                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #d1d5db",
                      background: routeCodes.includes(opt.code) ? "#2563eb" : "#fff",
                      color: routeCodes.includes(opt.code) ? "#fff" : "#111827",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {opt.display}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected routes */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" }}>
              Selected
            </div>

            {routeCodes.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: 13, padding: "8px 0" }}>None selected</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {routeCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => removeRoute(code)}
                    title="Click to remove"
                    style={{
                      padding: "8px 10px",
                      borderRadius: 999,
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      color: "#111827",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    {displayForRouteCode(code)} ✕
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Frequency */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" }}>
          Frequency
        </div>
        <input
          ref={freqRef}
          value={frequencyText}
          onChange={(e) => {
            const raw = e.target.value;
            setFrequencyText(raw);
            setFrequencyCode("");
          }}
          placeholder="e.g. BD or twice daily"
          style={{
            width: "100%",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "10px 12px",
            outline: "none",
            background: "#fff",
            color: "#111827",
            marginBottom: 10,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();

              // If empty: default to once daily (top of blank-ranked list)
              if (!frequencyText.trim()) {
                const blankRanked = rankFrequencies("");
                const od =
                  blankRanked.find((x) => x.code === "OD") ??
                  blankRanked.find((x) => x.code === "QD") ??
                  blankRanked[0];

                if (od) {
                  setFrequencyCode(od.code);
                  setFrequencyText(od.display);
                }

                durationRef.current?.focus();
                durationRef.current?.select?.();
                return;
              }

              if (topFreq) {
                setFrequencyCode(topFreq.code);
                setFrequencyText(topFreq.display);
              }

              durationRef.current?.focus();
              durationRef.current?.select?.();
            }
          }}
        />

        {frequencyText.trim() && !frequencyCode && rankedFreq.length > 0 && (
  <div
    style={{
      border: "1px solid #e5e7eb",
      borderRadius: 10,
      background: "#fff",
      padding: 8,
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
    }}
  >
    {rankedFreq.slice(0, 8).map((opt) => (
      <button
        key={opt.code}
        type="button"
        onClick={() => {
          setFrequencyCode(opt.code);
          setFrequencyText(opt.display);
          durationRef.current?.focus();
          durationRef.current?.select?.();
        }}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid #d1d5db",
          background: "#fff",
          color: "#111827",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {opt.display}
      </button>
    ))}
  </div>
)}

      </div>

      {/* Duration */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" }}>
          Ongoing or defined course
        </div>

        <input
          ref={durationRef}
          value={durationText}
          onChange={(e) => {
            const raw = e.target.value;
            setDurationText(raw);
            setDurationKey("");
          }}
          placeholder="Start typing… (e.g. ongoing, 5 days, 6 weeks)"
          style={{
            width: "100%",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "10px 12px",
            outline: "none",
            background: "#fff",
            color: "#111827",
            marginBottom: 10,
          }}
          onKeyDown={(e) => {
  if (e.key === "Enter") {
    e.preventDefault();

    // If duration already selected, jump straight to Continue
    if (durationKey) {
      requestAnimationFrame(() => onFocusContinue?.());
      return;
    }

    const q = durationText.trim();

    // If empty: default to ongoing
    if (!q) {
      const ongoing =
        DURATION_OPTIONS.find((d) => d.key === "ONGOING") ?? DURATION_OPTIONS[0];
      if (ongoing) {
        setDurationKey(ongoing.key);
        setDurationText(ongoing.display);
        requestAnimationFrame(() => onFocusContinue?.());
      }
      return;
    }

    // Otherwise pick the top match
    if (topDur) {
      setDurationKey(topDur.key);
      setDurationText(topDur.display);
      requestAnimationFrame(() => onFocusContinue?.());
    }
  }
}}

        />

{durationText.trim() && !durationKey && rankedDur.length > 0 && (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: "#fff",
              padding: 8,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {rankedDur.slice(0, 10).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setDurationKey(opt.key);
                  setDurationText(opt.display);
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: durationKey === opt.key ? "#2563eb" : "#fff",
                  color: durationKey === opt.key ? "#fff" : "#111827",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {opt.display}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
