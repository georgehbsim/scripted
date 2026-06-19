"use client";

type AdministrationHistoryRow = {
  id: string;
  banner_name: string | null;
  medication_name: string | null;
  administration_status: string;
  actual_time: string;
  route_used: string | null;
  reason_not_given: string | null;
  note: string | null;
};

type Props = {
  open: boolean;
  loading: boolean;
  rows: AdministrationHistoryRow[];
  onClose: () => void;
};

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString("en-NZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdministrationHistoryDialog({
  open,
  loading,
  rows,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 760,
          maxWidth: "100%",
          maxHeight: "80vh",
          overflow: "hidden",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontWeight: 700, color: "#111827" }}>
            Administration history
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
              color: "#111827",
            }}
          >
            Close
          </button>
        </div>

        <div style={{ padding: 16, overflow: "auto" }}>
          {loading ? (
            <p>Loading…</p>
          ) : rows.length === 0 ? (
            <p style={{ color: "#111827" }}>No administration history yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, color: "#111827" }}>Medication</th>
                  <th style={{ textAlign: "left", padding: 8, color: "#111827" }}>Status</th>
                  <th style={{ textAlign: "left", padding: 8, color: "#111827" }}>Time</th>
                  <th style={{ textAlign: "left", padding: 8, color: "#111827" }}>Route</th>
                  <th style={{ textAlign: "left", padding: 8, color: "#111827" }}>Reason</th>
                  <th style={{ textAlign: "left", padding: 8, color: "#111827" }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td
  style={{
    borderBottom: "1px solid #eee",
    padding: 8,
    verticalAlign: "top",
    color: "#111827",
  }}
>
  {row.banner_name ?? row.medication_name ?? "—"}
</td>
<td
  style={{
    borderBottom: "1px solid #eee",
    padding: 8,
    verticalAlign: "top",
    color: "#111827",
  }}
>
                  {row.administration_status}
                    </td>
<td
  style={{
    borderBottom: "1px solid #eee",
    padding: 8,
    verticalAlign: "top",
    color: "#111827",
  }}
>
                     {formatDateTime(row.actual_time)}
                    </td>
<td
  style={{
    borderBottom: "1px solid #eee",
    padding: 8,
    verticalAlign: "top",
    color: "#111827",
  }}
>
                     {row.route_used ?? "—"}
                    </td>
<td
  style={{
    borderBottom: "1px solid #eee",
    padding: 8,
    verticalAlign: "top",
    color: "#111827",
  }}
>
                     {row.reason_not_given ?? "—"}
                    </td>
<td
  style={{
    borderBottom: "1px solid #eee",
    padding: 8,
    verticalAlign: "top",
    color: "#111827",
  }}
>
                     {row.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}