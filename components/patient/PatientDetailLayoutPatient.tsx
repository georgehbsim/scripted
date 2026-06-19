type Patient = {
  id: string;
  full_name: string | null;
  nhi: string | null;
  date_of_birth: string | null;
  allergies: string | null;
};

type Props = {
  patient: Patient;
  calcAge: (dob: string | null) => string | number;
};

export default function PatientDetailLayoutPatient({ patient, calcAge }: Props) {
  return (
    <section
      style={{
        position: "sticky",
        top: 56,
        zIndex: 90,
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: 20,
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr 1fr",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#f9fafb",
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
            Patient
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {patient.full_name ?? "Unknown patient"}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>
            Details
          </div>
          <div style={{ display: "grid", gap: 6, fontSize: 15 }}>
            <div>
              <strong>DOB:</strong> {patient.date_of_birth ?? "—"}
            </div>
            <div>
              <strong>Age:</strong> {calcAge(patient.date_of_birth)}
            </div>
            <div>
              <strong>NHI:</strong> {patient.nhi ?? "—"}
            </div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>
            Allergies
          </div>
          <div style={{ fontSize: 15, whiteSpace: "pre-wrap" }}>
            {patient.allergies?.trim() || "No allergies recorded"}
          </div>
        </div>
      </div>
    </section>
  );
}