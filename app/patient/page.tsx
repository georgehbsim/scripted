import { RequireRole } from "@/components/RequireRole";

export default function PatientPage() {
  return (
    <RequireRole allowed={["patient"]}>
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Patient Dashboard</h1>
        <p>Welcome. Next: read-only medication list.</p>
      </main>
    </RequireRole>
  );
}
