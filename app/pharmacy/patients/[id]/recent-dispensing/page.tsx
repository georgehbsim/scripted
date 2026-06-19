"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { RequireRole } from "@/components/RequireRole";

type Patient = {
  id: string;
  full_name: string | null;
  nhi: string | null;
  date_of_birth: string | null;
};

type CommunityPrescription = {
  id: string;
  patient_id: string;
  created_by_user_id: string;
  status: string;
  pharmacist_note: string | null;
  sent_at: string | null;
  created_at: string;
};

type CommunityPrescriptionItem = {
  id: string;
  community_prescription_id: string;
  medication_title: string;
  medication_subtitle: string | null;
  authored_supply_text: string | null;
  authored_repeats_text: string | null;
  blister_pack: boolean | null;
};

type CommunityItemDispense = {
  id: string;
  community_prescription_item_id: string;
  dispense_number: number;
  dispensed_at: string;
  dispensed_by_user_id: string;
};

type RecentDispenseRow = {
  dispense: CommunityItemDispense;
  item: CommunityPrescriptionItem;
};

export default function PharmacyRecentDispensingPage() {
  return (
    <RequireRole allowed={["pharmacist"]}>
      <PharmacyRecentDispensingInner />
    </RequireRole>
  );
}

function PharmacyRecentDispensingInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientId = params.id;
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<CommunityPrescription[]>([]);
  const [recentRows, setRecentRows] = useState<RecentDispenseRow[]>([]);

  useEffect(() => {
    async function load() {
      if (!patientId) return;

      setLoading(true);
      setError(null);

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id, full_name, nhi, date_of_birth")
        .eq("id", patientId)
        .maybeSingle();

      if (patientError) {
        setError(patientError.message);
        setLoading(false);
        return;
      }

      const { data: cpData, error: cpError } = await supabase
        .from("community_prescriptions")
        .select("id, patient_id, created_by_user_id, status, pharmacist_note, sent_at, created_at")
        .eq("patient_id", patientId)
        .order("sent_at", { ascending: false });

      if (cpError) {
        setError(cpError.message);
        setLoading(false);
        return;
      }

      const cpIds = (cpData ?? []).map((row) => row.id);

      if (cpIds.length === 0) {
        setPatient((patientData as Patient | null) ?? null);
        setPrescriptions([]);
        setRecentRows([]);
        setLoading(false);
        return;
      }

      const { data: itemData, error: itemError } = await supabase
        .from("community_prescription_items")
        .select(
          "id, community_prescription_id, medication_title, medication_subtitle, authored_supply_text, authored_repeats_text, blister_pack"
        )
        .in("community_prescription_id", cpIds);

      if (itemError) {
        setError(itemError.message);
        setLoading(false);
        return;
      }

      const items = (itemData ?? []) as CommunityPrescriptionItem[];
      const itemIds = items.map((item) => item.id);

      if (itemIds.length === 0) {
        setPatient((patientData as Patient | null) ?? null);
        setPrescriptions((cpData as CommunityPrescription[]) ?? []);
        setRecentRows([]);
        setLoading(false);
        return;
      }

      const { data: dispenseData, error: dispenseError } = await supabase
        .from("community_item_dispenses")
        .select("id, community_prescription_item_id, dispense_number, dispensed_at, dispensed_by_user_id")
        .in("community_prescription_item_id", itemIds)
        .order("dispensed_at", { ascending: false })
        .limit(10);

      if (dispenseError) {
        setError(dispenseError.message);
        setLoading(false);
        return;
      }

      const itemMap = new Map(items.map((item) => [item.id, item]));
      const rows: RecentDispenseRow[] = ((dispenseData ?? []) as CommunityItemDispense[])
        .map((dispense) => {
          const item = itemMap.get(dispense.community_prescription_item_id);
          if (!item) return null;
          return { dispense, item };
        })
        .filter((row): row is RecentDispenseRow => row !== null);

      setPatient((patientData as Patient | null) ?? null);
      setPrescriptions((cpData as CommunityPrescription[]) ?? []);
      setRecentRows(rows);
      setLoading(false);
    }

    load();
  }, [patientId, supabase]);

  const rowsByPrescription = new Map<string, RecentDispenseRow[]>();
  for (const row of recentRows) {
    const arr = rowsByPrescription.get(row.item.community_prescription_id) ?? [];
    arr.push(row);
    rowsByPrescription.set(row.item.community_prescription_id, arr);
  }

  return (
    <main style={{ fontFamily: "system-ui", background: "#f3f4f6", minHeight: "100vh", color: "#111827" }}>
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
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ justifySelf: "start" }}>
          <button
            type="button"
            onClick={() => router.push(`/pharmacy/patients/${patientId}`)}
            style={{
              color: "#ffffff",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ← Back to patient
          </button>
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

      <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        {loading && <p>Loading…</p>}
        {error && <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>}

        {!loading && !error && patient && (
          <>
            <div
  style={{
    marginBottom: 18,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "#ffffff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 100px",
    gap: 16,
    alignItems: "center",
  }}
>
  <div style={{ minWidth: 0 }}>
    <div
      style={{
        fontSize: 14,
        color: "#6b7280",
        marginBottom: 8,
      }}
    >
      Patient details
    </div>

    <div
      style={{
        fontSize: 28,
        fontWeight: 700,
        color: "#111827",
        lineHeight: 1.15,
        marginBottom: 10,
        wordBreak: "break-word",
      }}
    >
      {patient.full_name ?? "Unknown patient"}
    </div>

    <div
      style={{
        fontSize: 15,
        color: "#374151",
        marginBottom: 4,
      }}
    >
      Recent dispensing
    </div>

    <div
      style={{
        fontSize: 15,
        color: "#374151",
      }}
    >
      NHI: {patient.nhi ?? "—"}
    </div>
  </div>

  <div
    style={{
      width: 100,
      height: 100,
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#9ca3af",
      background: "#f9fafb",
      flexShrink: 0,
      marginLeft: "auto",
    }}
    title="Patient photo (later)"
  >
    Photo
  </div>
</div>

            {recentRows.length === 0 ? (
              <p>No recent dispensing found.</p>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {prescriptions.map((cp) => {
                  const prescriptionRows = rowsByPrescription.get(cp.id) ?? [];
                  if (prescriptionRows.length === 0) return null;

                  return (
                    <section
                      key={cp.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        padding: 18,
                        background: "#fff",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>
                          Community Prescription
                        </div>
                        <div style={{ fontSize: 14 }}>
                          Sent: {cp.sent_at ?? cp.created_at}
                        </div>
                        {cp.pharmacist_note ? (
                          <div style={{ marginTop: 8, fontSize: 14 }}>
                            <strong>Note:</strong> {cp.pharmacist_note}
                          </div>
                        ) : null}
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        {prescriptionRows.map(({ dispense, item }) => (
                          <div
                            key={dispense.id}
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: 12,
                              padding: 14,
                              background: "#f9fafb",
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 1fr) 220px",
                              gap: 16,
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700 }}>{item.medication_title}</div>
                              {item.medication_subtitle ? (
                                <div style={{ marginTop: 4 }}>
                                  {item.medication_subtitle}
                                </div>
                              ) : null}
                            </div>

                            <div style={{ fontSize: 14 }}>
                              <div>
                                <strong>Supply:</strong> {item.authored_supply_text ?? "—"}
                              </div>
                              <div style={{ marginTop: 4 }}>
                                <strong>Dispensed:</strong> {dispense.dispensed_at}
                              </div>
                              {item.blister_pack ? (
                                <div
                                  style={{
                                    marginTop: 8,
                                    display: "inline-block",
                                    padding: "4px 8px",
                                    borderRadius: 999,
                                    background: "#dbeafe",
                                    color: "#1d4ed8",
                                    fontWeight: 700,
                                  }}
                                >
                                  Blister pack
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}