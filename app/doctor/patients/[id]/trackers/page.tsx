"use client";

import Link from "next/link";
import { use } from "react";
import { RequireRole } from "@/components/RequireRole";

export default function PatientTrackersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const trackers = [
  {
    key: "immunosuppression",
    title: "Immunosuppression",
    subtitle: "Track therapy following renal transplant",
    icon: "🛡️",
  },
  {
    key: "heartFailure",
    title: "Heart failure",
    subtitle: "Track pillar therapies and key observations over time",
    icon: "❤️",
  },
  {
    key: "blood-pressure",
    title: "Blood pressure",
    subtitle: "Coming soon",
    icon: "🩺",
    disabled: true,
  },
  {
    key: "diabetes",
    title: "Diabetes",
    subtitle: "Coming soon",
    icon: "🩸",
    disabled: true,
  },
];

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
              href={`/doctor/patients/${id}`}
              style={{
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              ← Back to patient
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

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, color: "#111827" }}>Trackers</h1>
          <p style={{ margin: "0 0 24px", color: "#4b5563" }}>
            Select a tracker to view medication changes over time.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {trackers.map((tracker) => {
              const cardStyle: React.CSSProperties = {
                display: "block",
                textDecoration: "none",
                background: tracker.disabled ? "#f3f4f6" : "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                padding: 20,
                boxShadow: tracker.disabled ? "none" : "0 6px 18px rgba(0,0,0,0.06)",
                color: "#111827",
                opacity: tracker.disabled ? 0.7 : 1,
                cursor: tracker.disabled ? "default" : "pointer",
              };

              const content = (
                <>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{tracker.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
                    {tracker.title}
                  </div>
                  <div style={{ fontSize: 14, color: "#6b7280" }}>{tracker.subtitle}</div>
                </>
              );

              if (tracker.disabled) {
                return (
                  <div key={tracker.key} style={cardStyle}>
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={tracker.key}
                  href={`/doctor/patients/${id}/trackers/${tracker.key}`}
                  style={cardStyle}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </RequireRole>
  );
}