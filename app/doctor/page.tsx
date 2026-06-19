"use client";

import Link from "next/link";
import { RequireRole } from "@/components/RequireRole";

export default function DoctorPage() {
  return (
    <RequireRole allowed={["doctor"]}>
      <main style={{ fontFamily: "system-ui", background: "#f9fafb", minHeight: "100vh" }}>
        <div
          style={{
            position: "sticky",
    top: 0,
    zIndex: 100,
    height: 56,
    background: "#111827",
    color: "#ffffff",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    padding: "0 16px",
    borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div />
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
          <div />
        </div>

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 24,
              background: "#ffffff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 32,
                lineHeight: 1.2,
                color: "#111827",
              }}
            >
              Doctor dashboard
            </h1>

            <p
              style={{
                marginTop: 12,
                color: "#4b5563",
                fontSize: 16,
                maxWidth: 700,
              }}
            >
              Search patients, open medication charts, and manage prescribing.
            </p>

            <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/doctor/patients" style={{ textDecoration: "none" }}>
                <button
                  type="button"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid #111827",
                    background: "#111827",
                    color: "#ffffff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Patient search
                </button>
              </Link>

              <Link href="/me" style={{ textDecoration: "none" }}>
                <button
                  type="button"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    color: "#111827",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Account
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </RequireRole>
  );
}