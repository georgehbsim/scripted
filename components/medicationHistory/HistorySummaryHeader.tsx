"use client";

import type { HistoryPrescription, PatientRow } from "./types";
import { calcAge, eventDate, formatDateOnly } from "./helpers";

function smallStat(label: string, value: string) {
  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 12,
        padding: "10px 12px",
        background: "#ffffff",
      }}
    >
      <div style={{ fontSize: 12, color: "#111827", marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value || "—"}</div>
    </div>
  );
}

export default function HistorySummaryHeader({
  bannerName,
  patient,
  currentRx,
  compactCurrentRegimen,
  firstStarted,
  lastChanged,
  lastDispensed,
  lastAdministered,
}: {
  bannerName: string;
  patient: PatientRow | null;
  currentRx: HistoryPrescription | null;
  compactCurrentRegimen: string;
  firstStarted: string;
  lastChanged: string;
  lastDispensed: string;
  lastAdministered: string;
}) {
  return (
    <section
      style={{
        position: "sticky",
        top: 72,
        zIndex: 30,
        background: "#f9fafb",
        paddingBottom: 8,
      }}
    >
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          background: "#ffffff",
          padding: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          display: "grid",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>{bannerName}</div>
            <div style={{ marginTop: 8, fontSize: 15, color: "#111827" }}>
              {patient?.full_name ?? "Patient"} · NHI {patient?.nhi || "—"} · Age{" "}
              {calcAge(patient?.date_of_birth ?? null)}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 6,
              justifyItems: "end",
              textAlign: "right",
              alignSelf: "start",
              color: "#111827",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              Indication: {currentRx?.indication || "—"}
            </div>

            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {currentRx?.status === "stopped"
                ? `Stopped on ${formatDateOnly(currentRx.stopped_at || eventDate(currentRx))}`
                : `Current regimen: ${compactCurrentRegimen}`}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {smallStat("First started", firstStarted)}
          {smallStat("Last changed", lastChanged)}
          {smallStat("Last dispensed", lastDispensed)}
          {smallStat("Last administered", lastAdministered)}
        </div>
      </div>
    </section>
  );
}