import { RequireRole } from "@/components/RequireRole";

export default function PharmacyPage() {
  return (
    <RequireRole allowed={["pharmacist"]}>
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Pharmacy Dashboard</h1>
        <p>Welcome. Next: prescription queue + dispense.</p>
      </main>
    </RequireRole>
  );
}
