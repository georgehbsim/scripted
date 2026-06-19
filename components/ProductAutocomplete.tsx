"use client";

import { useEffect, useMemo, useRef } from "react";

export type ProductOption = {
  product_id: string;
  dose_form: string;
  strength: string;
  label: string;
  source_product_code: string;
};

export function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNumericToken(t: string) {
  return /^[0-9]+$/.test(t);
}

export function fuzzyProductScore(queryRaw: string, labelRaw: string): number {
  const q = normalize(queryRaw);
  const l = normalize(labelRaw);
  if (!q) return 0;

  const qTokens = q.split(" ");
  const lTokens = l.split(" ");

  let score = 0;

  for (const qt of qTokens) {
    let best = 0;

    for (const lt of lTokens) {
      if (isNumericToken(qt)) {
        // numeric: "5" should match "500"
        if (lt.startsWith(qt)) best = Math.max(best, 60);
        else if (lt.includes(qt)) best = Math.max(best, 40);
      } else {
        // text: "mod" should match "modified"
        if (lt.startsWith(qt)) best = Math.max(best, 100);
        else if (lt.includes(qt)) best = Math.max(best, 50);
      }
    }

    if (best === 0) return -Infinity; // every token must match somewhere
    score += best;
  }

  // small bonuses
  if (l.startsWith(q)) score += 30; // exact prefix of full label
  score -= Math.max(0, lTokens.length - qTokens.length) * 2; // prefer tighter matches

  return score;
}

type Props = {
  options: ProductOption[];
  query: string;
  onQueryChange: (v: string) => void;
  selectedProductId: string | null;
  selectedProductLabel: string | null;
  onSelect: (p: ProductOption | null) => void;
  onSelectForm?: (form: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
};


export default function ProductAutocomplete({
  options,
  query,
  onQueryChange,
  selectedProductId,
  selectedProductLabel,
  onSelect,
  onSelectForm,
  autoFocus,
  placeholder = "Start typing…",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!autoFocus) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [autoFocus]);

  const rankedProducts = useMemo(() => {
    const q = query.trim();
    if (!q) return options;

    return [...options]
      .map((p) => ({ p, score: fuzzyProductScore(q, p.label ?? "") }))
      .filter((x) => Number.isFinite(x.score))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p);
  }, [options, query]);

  const formOptions = useMemo(() => {
  const uniq = Array.from(new Set(options.map((o) => o.dose_form).filter(Boolean)));
  // optional: sort alphabetically
  return uniq.sort((a, b) => a.localeCompare(b));
}, [options]);

  const groupedByForm = useMemo(() => {
    return Object.entries(
      rankedProducts.reduce<Record<string, ProductOption[]>>((acc, p) => {
        (acc[p.dose_form] ||= []).push(p);
        return acc;
      }, {})
    );
  }, [rankedProducts]);

  function applyTypeahead(raw: string) {
    const q = raw.trim().toLowerCase();
    if (!q) return;

    // Prefer a simple prefix match first (nice for "500")
    const match =
      options.find((p) => (p.label ?? "").toLowerCase().startsWith(q)) ?? rankedProducts[0];

    if (!match?.label) return;
    const full = match.label;
    const fullLower = full.toLowerCase();

    // Only typeahead if the user's input is a prefix of the suggestion
    if (!fullLower.startsWith(q)) return;

    // Don't keep re-setting if already equal
    if (raw === full) return;

    onQueryChange(full);

    // Highlight the autocompleted part
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      const start = raw.length;
      const end = full.length;
      try {
        el.setSelectionRange(start, end);
      } catch {
        // ignore
      }
    });
  }

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <input
        ref={inputRef}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          const raw = e.target.value;
          onQueryChange(raw);
          applyTypeahead(raw);
        }}
        style={{
          width: "100%",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "10px 12px",
          outline: "none",
          background: "#fff",
          color: "#111827",
          marginBottom: 10,
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const top = rankedProducts[0];
            if (top) onSelect(top);
          }
        }}
      />

    

      {groupedByForm.map(([form, items]) => (
        <div key={form} style={{ marginBottom: 10 }}>
<button
  type="button"
  onClick={() => onSelectForm?.(form)}
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: selectedProductId === null && selectedProductLabel === form ? "#2563eb" : "#fff",
    color: selectedProductId === null && selectedProductLabel === form ? "#fff" : "#111827",
    cursor: "pointer",
    fontWeight: 800,
    marginBottom: 6,
  }}
>
  {form}
</button>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {items.map((p) => (
              <button
                key={p.product_id}
                onClick={() => onSelect(p)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: selectedProductId === p.product_id ? "#2563eb" : "#fff",
                  color: selectedProductId === p.product_id ? "#fff" : "#111827",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>


        </div>
      ))}

      <button
        onClick={() => onSelect(null)}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid #d1d5db",
          background:
            selectedProductId === null && selectedProductLabel === "No product" ? "#2563eb" : "#fff",
          color:
            selectedProductId === null && selectedProductLabel === "No product" ? "#fff" : "#111827",
          cursor: "pointer",
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        No product
      </button>
    </div>
  );
}
