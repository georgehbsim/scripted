import { RequireRole } from "@/components/RequireRole";

export default function NursePage() {
  return (
    <RequireRole allowed={["nurse"]}>
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Nurse Dashboard</h1>
        <p>Welcome. Next: view meds + record administrations.</p>
      </main>
    </RequireRole>
  );
}
