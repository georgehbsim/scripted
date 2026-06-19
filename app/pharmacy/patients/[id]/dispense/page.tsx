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
  prescription_id: string;
  medication_banner_id: string | null;
  medication_title: string;
  medication_subtitle: string | null;
  authored_supply_text: string | null;
  authored_repeats_text: string | null;
  repeats_value: number | null;
  blister_pack: boolean | null;
  dispensed_count?: number;
  total_allowed_dispenses?: number;
  remaining_dispenses?: number;
};

type ConfirmAction =
  | { type: "single"; itemIds: string[]; label: string }
  | { type: "all_in_prescription"; itemIds: string[]; label: string }
  | { type: "selected"; itemIds: string[]; label: string }
  | null;

export default function PharmacyDispensePage() {
  return (
    <RequireRole allowed={["pharmacist"]}>
      <PharmacyDispenseInner />
    </RequireRole>
  );
}

function PharmacyDispenseInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientId = params.id;
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<CommunityPrescription[]>([]);
  const [items, setItems] = useState<CommunityPrescriptionItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function calcAge(dob: string | null) {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "—";

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

  if (!hasHadBirthday) age -= 1;
  return age;
}

  useEffect(() => {
  reloadData();
}, [patientId, supabase]);

  const itemsByPrescription = new Map<string, CommunityPrescriptionItem[]>();
  for (const item of items) {
    const arr = itemsByPrescription.get(item.community_prescription_id) ?? [];
    arr.push(item);
    itemsByPrescription.set(item.community_prescription_id, arr);
  }

  const visiblePrescriptions = prescriptions.filter((cp) => {
  const prescriptionItems = itemsByPrescription.get(cp.id) ?? [];
  return prescriptionItems.length > 0;
});

  function toggleItem(itemId: string) {
  const item = items.find((i) => i.id === itemId);
  if (!item || (item.remaining_dispenses ?? 0) <= 0) return;

  setSelectedItemIds((prev) =>
    prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
  );
}

  function openSingle(item: CommunityPrescriptionItem) {
  if ((item.remaining_dispenses ?? 0) <= 0) return;

  setConfirmAction({
    type: "single",
    itemIds: [item.id],
    label: `Dispense single medication: ${item.medication_title}`,
  });
}

  function openAllInPrescription(cp: CommunityPrescription, prescriptionItems: CommunityPrescriptionItem[]) {
  const availableItems = prescriptionItems.filter((item) => (item.remaining_dispenses ?? 0) > 0);
  if (availableItems.length === 0) return;

  setConfirmAction({
    type: "all_in_prescription",
    itemIds: availableItems.map((i) => i.id),
    label: `Dispense all medications in community prescription sent ${cp.sent_at ?? cp.created_at}`,
  });
}

  function openSelected() {
  const availableSelectedIds = selectedItemIds.filter((itemId) => {
    const item = items.find((i) => i.id === itemId);
    return (item?.remaining_dispenses ?? 0) > 0;
  });

  if (availableSelectedIds.length === 0) return;

  setConfirmAction({
    type: "selected",
    itemIds: availableSelectedIds,
    label: `Dispense ${availableSelectedIds.length} selected medication${availableSelectedIds.length === 1 ? "" : "s"}`,
  });
}

  function handlePrint() {
    window.print();
  }

  async function reloadData() {
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

  let cpiData: CommunityPrescriptionItem[] = [];
  if (cpIds.length > 0) {
    const { data, error } = await supabase
      .from("community_prescription_items")
      .select(
        "id, community_prescription_id, prescription_id, medication_banner_id, medication_title, medication_subtitle, authored_supply_text, authored_repeats_text, repeats_value, blister_pack"
      )
      .in("community_prescription_id", cpIds)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    cpiData = (data as CommunityPrescriptionItem[]) ?? [];
  }

      if (cpiData.length > 0) {
      const itemIds = cpiData.map((item) => item.id);

      const { data: dispenseRows, error: dispenseError } = await supabase
        .from("community_item_dispenses")
        .select("community_prescription_item_id")
        .in("community_prescription_item_id", itemIds);

      if (dispenseError) {
        setError(dispenseError.message);
        setLoading(false);
        return;
      }

      const counts = new Map<string, number>();
      for (const row of dispenseRows ?? []) {
        const itemId = row.community_prescription_item_id as string;
        counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
      }

      cpiData = cpiData.map((item) => {
        const dispensedCount = counts.get(item.id) ?? 0;
        const totalAllowedDispenses = 1 + (item.repeats_value ?? 0);
        const remainingDispenses = Math.max(0, totalAllowedDispenses - dispensedCount);

        return {
          ...item,
          dispensed_count: dispensedCount,
          total_allowed_dispenses: totalAllowedDispenses,
          remaining_dispenses: remainingDispenses,
        };
      });
    }

  setPatient((patientData as Patient | null) ?? null);
  setPrescriptions((cpData as CommunityPrescription[]) ?? []);
  setItems(cpiData.filter((item) => (item.remaining_dispenses ?? 0) > 0));
  setLoading(false);
}

async function handleConfirmDispense() {
  if (!confirmAction) return;

  try {
    setIsSubmitting(true);
    setError(null);

    if (confirmAction.type === "single") {
      const itemId = confirmAction.itemIds[0];

      const { error } = await supabase.rpc("dispense_community_item", {
        p_community_prescription_item_id: itemId,
      });

      if (error) {
        throw error;
      }
    } else {
      const { error } = await supabase.rpc("dispense_community_items", {
        p_community_prescription_item_ids: confirmAction.itemIds,
      });

      if (error) {
        throw error;
      }
    }

    setConfirmAction(null);
    setSelectedItemIds([]);
    await reloadData();
  } catch (err: any) {
    setError(err?.message ?? "Failed to dispense medication(s)");
  } finally {
    setIsSubmitting(false);
  }
}

  const itemsById = new Map(items.map((item) => [item.id, item]));
const confirmItems = confirmAction
  ? confirmAction.itemIds
      .map((id) => itemsById.get(id))
      .filter((item): item is CommunityPrescriptionItem => Boolean(item))
  : [];

  return (
<main
  style={{
    fontFamily: "system-ui",
    background: "#f3f4f6",
    minHeight: "100vh",
    color: "#111827",
  }}
>
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
      {calcAge(patient.date_of_birth)} years old
    </div>

    <div
      style={{
        fontSize: 15,
        color: "#374151",
        marginBottom: 4,
      }}
    >
      DOB: {patient.date_of_birth ?? "—"}
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

            <div style={{ marginBottom: 20 }}>
              <button
                type="button"
                disabled={selectedItemIds.length === 0}
                onClick={openSelected}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #111827",
                  background: selectedItemIds.length === 0 ? "#d1d5db" : "#111827",
                  color: "#fff",
                  cursor: selectedItemIds.length === 0 ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                Dispense selected medications
                {selectedItemIds.length > 0 ? ` (${selectedItemIds.length})` : ""}
              </button>
            </div>

            {visiblePrescriptions.length === 0 ? (
  <p>No community prescriptions found.</p>
) : (
  <div style={{ display: "grid", gap: 16 }}>
    {visiblePrescriptions.map((cp) => {
                  const prescriptionItems = itemsByPrescription.get(cp.id) ?? [];
                    if (prescriptionItems.length === 0) return null;
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
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 16,
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, marginBottom: 6 }}>
                            Community Prescription
                          </div>
                          <div style={{ color: "#111827", fontSize: 14 }}>
                            Sent: {cp.sent_at ?? cp.created_at}
                          </div>
                          {cp.pharmacist_note ? (
                            <div style={{ marginTop: 8, fontSize: 14 }}>
                              <strong>Note:</strong> {cp.pharmacist_note}
                            </div>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => openAllInPrescription(cp, prescriptionItems)}
                          disabled={prescriptionItems.filter((item) => (item.remaining_dispenses ?? 0) > 0).length === 0}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            border: "1px solid #111827",
                            background: "#111827",
                            color: "#fff",
                            cursor:
                              prescriptionItems.filter((item) => (item.remaining_dispenses ?? 0) > 0).length === 0
                                ? "not-allowed"
                                : "pointer",                            
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Dispense all medications
                        </button>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        {prescriptionItems.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: 12,
                              padding: 14,
                              background: "#f9fafb",
                              display: "grid",
                              gridTemplateColumns: "32px minmax(0, 1fr) 220px 220px",
                              gap: 16,
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <input
  type="checkbox"
  checked={selectedItemIds.includes(item.id)}
  disabled={(item.remaining_dispenses ?? 0) <= 0}
  onChange={() => toggleItem(item.id)}
/>
                            </div>

                            <div>
                              <div style={{ fontWeight: 700 }}>{item.medication_title}</div>
                              {item.medication_subtitle ? (
                                <div style={{ marginTop: 4, color: "#374151" }}>
                                  {item.medication_subtitle}
                                </div>
                              ) : null}
                            </div>

                            <div style={{ fontSize: 14, color: "#374151" }}>
                              <div>
                                <strong>Supply:</strong> {item.authored_supply_text ?? "—"}
                              </div>
                              <div style={{ marginTop: 4 }}>
                                <strong>Repeats:</strong> {item.authored_repeats_text ?? "None"}
                              </div>
                              <div style={{ marginTop: 4 }}>
  <strong>Dispensed:</strong> {item.dispensed_count ?? 0} of {item.total_allowed_dispenses ?? 1}
</div>
<div style={{ marginTop: 4 }}>
  <strong>Remaining:</strong> {item.remaining_dispenses ?? 0}
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

                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <button
  type="button"
  onClick={() => openSingle(item)}
  disabled={(item.remaining_dispenses ?? 0) <= 0}
  style={{
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #111827",
    background: (item.remaining_dispenses ?? 0) <= 0 ? "#9ca3af" : "#111827",
    color: "#fff",
    cursor: (item.remaining_dispenses ?? 0) <= 0 ? "not-allowed" : "pointer",
    fontWeight: 600,
  }}
>
  {(item.remaining_dispenses ?? 0) <= 0 ? "Fully dispensed" : "Dispense single medication"}
</button>
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

      {confirmAction ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 620,
              borderRadius: 16,
              background: "#fff",
              padding: 20,
              boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Confirm dispense for {patient?.full_name ?? "patient"} (NHI: {patient?.nhi ?? "unknown"})</h2>
            <p style={{ color: "#374151" }}>{confirmAction.label}</p>
            <p style={{ color: "#111827", fontSize: 14 }}>
  Selected medications: {confirmAction.itemIds.length}
</p>

<div
  style={{
    marginTop: 12,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    background: "#f9fafb",
  }}
>
  {confirmItems.map((item) => (
    <div key={item.id} style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, color: "#111827" }}>{item.medication_title}</div>

      {item.medication_subtitle ? (
        <div style={{ marginTop: 2, color: "#111827" }}>{item.medication_subtitle}</div>
      ) : null}

      <div style={{ marginTop: 4, color: "#111827", fontSize: 14 }}>
        Dispensing for: {item.authored_supply_text ?? "—"}
      </div>
      <div style={{ marginTop: 4, color: "#111827", fontSize: 14 }}>
  Already dispensed: {item.dispensed_count ?? 0} of {item.total_allowed_dispenses ?? 1}
</div>
    </div>
  ))}
</div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Print
              </button>

              <button
  type="button"
  onClick={handleConfirmDispense}
  disabled={isSubmitting}
  style={{
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #111827",
    background: isSubmitting ? "#9ca3af" : "#111827",
    color: "#fff",
    cursor: isSubmitting ? "not-allowed" : "pointer",
    fontWeight: 600,
  }}
>
{isSubmitting ? "Dispensing..." : `Confirm dispense for ${patient?.full_name ?? "patient"}`}</button>

              <button
  type="button"
  onClick={() => {
    if (!isSubmitting) setConfirmAction(null);
  }}
  disabled={isSubmitting}
  style={{
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: isSubmitting ? "not-allowed" : "pointer",
  }}
>
  Cancel
</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}