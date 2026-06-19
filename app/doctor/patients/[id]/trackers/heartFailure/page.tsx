"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { RequireRole } from "@/components/RequireRole";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type HeartFailureTrackerRow = {
  id: string;
  row_date: string;
  row_kind: "event" | "synthetic_before_change" | "observation";
  weight_kg: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  bnp: number | null;
  beta_blocker_name: string | null;
  beta_blocker_total_daily_dose_mg: number | null;
  ace_arb_arni_name: string | null;
  ace_arb_arni_total_daily_dose_mg: number | null;
  mra_name: string | null;
  mra_total_daily_dose_mg: number | null;
  sglt2_name: string | null;
  sglt2_total_daily_dose_mg: number | null;
  loop_diuretic_name: string | null;
  loop_diuretic_total_daily_dose_mg: number | null;
};

type PatientRow = {
  full_name: string | null;
  nhi: string | null;
};

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

function formatDose(value: number | null) {
  if (value == null) return "";
  return Number.isInteger(value) ? `${value} mg` : `${value} mg`;
}

function medCell(name: string | null, dose: number | null) {
  if (!name) return "";
  const doseText = formatDose(dose);
  return doseText ? `${name} (${doseText})` : name;
}

export default function HeartFailureTrackerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [rows, setRows] = useState<HeartFailureTrackerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientRow | null>(null);

  useEffect(() => {
  let active = true;

  async function load() {
    setLoading(true);
    setError(null);

    const { data: patientData, error: patientError } = await supabase
      .from("patients")
      .select("full_name, nhi")
      .eq("id", id)
      .single();

    if (patientError) {
      if (!active) return;
      setError(patientError.message);
      setRows([]);
      setPatient(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("heart_failure_tracker_rows")
      .select("*")
      .eq("patient_id", id)
      .order("row_date", { ascending: false });

    if (!active) return;

    if (error) {
      setError(error.message);
      setRows([]);
      setPatient(patientData as PatientRow);
    } else {
      setRows((data ?? []) as HeartFailureTrackerRow[]);
      setPatient(patientData as PatientRow);
    }

    setLoading(false);
  }

  load();

  return () => {
    active = false;
  };
}, [id, supabase]);

  return (
    <RequireRole allowed={["doctor"]}>
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
            <Link
              href={`/doctor/patients/${id}/trackers`}
              style={{
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              ← Back to trackers
            </Link>
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

          <div style={{ justifySelf: "end" }} />
        </div>

        <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, color: "#111827" }}>
  Heart failure tracker for {patient?.full_name ?? "Unknown patient"} (NHI: {patient?.nhi ?? "—"})
</h1>
          <p style={{ margin: 0, color: "#4b5563" }}>
            Track heart failure medications and key observations over time.
          </p>

          {loading ? (
            <p style={{ marginTop: 24 }}>Loading…</p>
          ) : error ? (
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 24 }}>{error}</pre>
          ) : (
            <div
              style={{
                marginTop: 24,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                overflow: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 1200,
                }}
              >
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Weight</th>
                    <th style={thStyle}>BP</th>
                    <th style={thStyle}>BNP</th>
                    <th style={thStyle}>Beta blocker</th>
                    <th style={thStyle}>ACE / ARB / ARNI</th>
                    <th style={thStyle}>MRA</th>
                    <th style={thStyle}>SGLT2</th>
                    <th style={thStyle}>Loop diuretic</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td style={tdStyle} colSpan={9}>
                        No tracker rows yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id}>
                        <td style={tdStyle}>{formatDate(row.row_date)}</td>
                        <td style={tdStyle}>{row.weight_kg ?? ""}</td>
                        <td style={tdStyle}>
                          {row.systolic_bp != null && row.diastolic_bp != null
                            ? `${row.systolic_bp}/${row.diastolic_bp}`
                            : ""}
                        </td>
                        <td style={tdStyle}>{row.bnp ?? ""}</td>
                        <td style={tdStyle}>
                          {medCell(row.beta_blocker_name, row.beta_blocker_total_daily_dose_mg)}
                        </td>
                        <td style={tdStyle}>
                          {medCell(row.ace_arb_arni_name, row.ace_arb_arni_total_daily_dose_mg)}
                        </td>
                        <td style={tdStyle}>
                          {medCell(row.mra_name, row.mra_total_daily_dose_mg)}
                        </td>
                        <td style={tdStyle}>
                          {medCell(row.sglt2_name, row.sglt2_total_daily_dose_mg)}
                        </td>
                        <td style={tdStyle}>
                          {medCell(
                            row.loop_diuretic_name,
                            row.loop_diuretic_total_daily_dose_mg
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </RequireRole>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  borderBottom: "1px solid #e5e7eb",
  color: "#111827",
  fontSize: 14,
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #e5e7eb",
  color: "#111827",
  verticalAlign: "top",
};