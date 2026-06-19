"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { RequireRole } from "@/components/RequireRole";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type PatientRow = {
  full_name: string | null;
  nhi: string | null;
};

type ImmunosuppressionTrackerRow = {
  id: string;
  row_date: string;
  row_kind: "event" | "synthetic_before_change" | "observation";

  weight_kg: number | null;

  aza_dose_mg: number | null;
  pred_dose_mg: number | null;
  mmf_dose_mg: number | null;
  cyad_dose_mg: number | null;
  cyal_level: number | null;
  tacd_dose_mg: number | null;
  tacl_level: number | null;

  hgb: number | null;
  wbc: number | null;
  glu: number | null;
  urea: number | null;
  crea: number | null;
};

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

function formatValue(value: number | null) {
  if (value == null) return "";
  return Number.isInteger(value) ? String(value) : String(value);
}

function formatDose(value: number | null) {
  if (value == null) return "";
  return `${formatValue(value)} mg`;
}

export default function ImmunosuppressionTrackerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [rows, setRows] = useState<ImmunosuppressionTrackerRow[]>([]);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        .from("immunosuppression_tracker_rows")
        .select("*")
        .eq("patient_id", id)
        .order("row_date", { ascending: false });

      if (!active) return;

      if (error) {
        setError(error.message);
        setRows([]);
        setPatient(patientData as PatientRow);
      } else {
        setRows((data ?? []) as ImmunosuppressionTrackerRow[]);
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

        <div style={{ maxWidth: 1700, margin: "0 auto", padding: 24 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, color: "#111827" }}>
            Immunosuppression tracker for {patient?.full_name ?? "Unknown patient"} (NHI:{" "}
            {patient?.nhi ?? "—"})
          </h1>
          <p style={{ margin: 0, color: "#4b5563" }}>
            Track therapy following renal transplant.
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
                  minWidth: 1600,
                }}
              >
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Weight</th>
                    <th style={thStyle}>AZA</th>
                    <th style={thStyle}>Pred</th>
                    <th style={thStyle}>MMF</th>
                    <th style={thStyle}>CyAD</th>
                    <th style={thStyle}>CyAL</th>
                    <th style={thStyle}>TacD</th>
                    <th style={thStyle}>TacL</th>
                    <th style={thStyle}>HGB</th>
                    <th style={thStyle}>WBC</th>
                    <th style={thStyle}>GLU</th>
                    <th style={thStyle}>UREA</th>
                    <th style={thStyle}>CREA</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td style={tdStyle} colSpan={14}>
                        No tracker rows yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id}>
                        <td style={tdStyle}>{formatDate(row.row_date)}</td>
                        <td style={tdStyle}>{formatValue(row.weight_kg)}</td>
                        <td style={tdStyle}>{formatDose(row.aza_dose_mg)}</td>
                        <td style={tdStyle}>{formatDose(row.pred_dose_mg)}</td>
                        <td style={tdStyle}>{formatDose(row.mmf_dose_mg)}</td>
                        <td style={tdStyle}>{formatDose(row.cyad_dose_mg)}</td>
                        <td style={tdStyle}>{formatValue(row.cyal_level)}</td>
                        <td style={tdStyle}>{formatDose(row.tacd_dose_mg)}</td>
                        <td style={tdStyle}>{formatValue(row.tacl_level)}</td>
                        <td style={tdStyle}>{formatValue(row.hgb)}</td>
                        <td style={tdStyle}>{formatValue(row.wbc)}</td>
                        <td style={tdStyle}>{formatValue(row.glu)}</td>
                        <td style={tdStyle}>{formatValue(row.urea)}</td>
                        <td style={tdStyle}>{formatValue(row.crea)}</td>
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