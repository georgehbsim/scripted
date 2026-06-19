type Patient = {
  full_name: string | null;
  nhi: string | null;
  date_of_birth: string | null;
  allergies: string | null;
};

type PatientDetailLayoutProps = {
  patient: Patient;
  calcAge: (dob: string | null) => string | number;

  onAddMedication: () => void;
  onCreateCommunityPrescription?: () => void;
  onOpenTrackers?: () => void;

  isEditingAllergies: boolean;
  allergiesDraft: string;
  setAllergiesDraft: (value: string) => void;
  setIsEditingAllergies: (value: boolean) => void;
  handleSaveAllergies: () => void;
};

export default function PatientDetailLayout({
  patient,
  calcAge,
  onAddMedication,
  onCreateCommunityPrescription,
  onOpenTrackers,
  isEditingAllergies,
  allergiesDraft,
  setAllergiesDraft,
  setIsEditingAllergies,
  handleSaveAllergies,
}: PatientDetailLayoutProps) {
  return (
    <section
  style={{
    position: "sticky",
    top: 56,
    zIndex: 90,
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  }}
>
      <div
  style={{
    width: "100%",
    padding: 20,
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: "220px fit-content(520px) minmax(280px, 1fr) 220px",
    gap: 16,
    alignItems: "stretch",
  }}
>
        {/* Left: medication actions */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#f9fafb",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            justifyContent: "center",
          }}
        >
          <button
            onClick={onAddMedication}
            style={{
              color: "#111827",
              background: "#ADD8E6",
              border: "1px solid #d1d5db",
              padding: "10px 12px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            + Add Medication
          </button>

          <button
            onClick={onCreateCommunityPrescription}
            style={{
              color: "#111827",
              background: "#ffffff",
              border: "1px solid #d1d5db",
              padding: "10px 12px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Create Community Prescription
          </button>
        </div>

        {/* Middle: patient details */}
        <div
  style={{
    width: "100%",
    maxWidth: 520,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "#ffffff",
    position: "relative",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 120px",
    gap: 16,
    alignItems: "center",
    minWidth: 0,
    boxSizing: "border-box",
  }}
>
          <button
            type="button"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 28,
              height: 28,
              borderRadius: 999,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#374151",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1,
            }}
            title="More patient information"
          >
            i
          </button>

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

        {/* Allergies */}
        <div
  style={{
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    position: "relative",
    background: "#ffffff",
    minWidth: 0,
    boxSizing: "border-box",
  }}
>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div
              style={{
                fontWeight: 700,
                color: patient.allergies?.trim() ? "#dc2626" : "#111827",
              }}
            >
              Allergies
            </div>

            {!isEditingAllergies && (
              <button
                onClick={() => setIsEditingAllergies(true)}
                style={{
                  fontSize: 12,
                  color: "#2563eb",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Edit
              </button>
            )}
          </div>

          <div style={{ marginTop: 8 }}>
            {!isEditingAllergies ? (
              <div style={{ whiteSpace: "pre-wrap", color: "#374151" }}>
                {patient.allergies?.trim() || "No allergies recorded"}
              </div>
            ) : (
              <>
                <textarea
                  value={allergiesDraft}
                  onChange={(e) => setAllergiesDraft(e.target.value)}
                  rows={4}
                  style={{
                    width: "100%",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    padding: 8,
                    background: "#ffffff",
                    color: "#111827",
                    resize: "vertical",
                  }}
                />

                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button
                    onClick={handleSaveAllergies}
                    style={{
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Save
                  </button>

                  <button
                    onClick={() => {
                      setAllergiesDraft(patient.allergies ?? "");
                      setIsEditingAllergies(false);
                    }}
                    style={{
                      background: "#f3f4f6",
                      border: "1px solid #d1d5db",
                      padding: "6px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#f9fafb",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            justifyContent: "center",
          }}
        >
          <button
            onClick={onOpenTrackers}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Trackers
          </button>

          <button
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#9ca3af",
              fontWeight: 600,
              cursor: "not-allowed",
            }}
            disabled
          >
            Interaction checker
          </button>

          <button
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#9ca3af",
              fontWeight: 600,
              cursor: "not-allowed",
            }}
            disabled
          >
            Inpatient Mode
          </button>
        </div>
      </div>
    </section>
  );
}