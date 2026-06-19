"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AutoResult = {
  banner_id: string;
  banner_name: string;
  matched_term: string;
  match_source: "banner" | "synonym";
  score: number;
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function MedicationAutocomplete(props: {
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSelect: (r: AutoResult) => void;
}) {
  const { label, placeholder, autoFocus = false, onSelect } = props;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // typed = what user is intending to search
  const [typed, setTyped] = useState("");
  const debouncedTyped = useDebouncedValue(typed, 200);

  // display = what is shown in the input (may include ghost fill)
  const [display, setDisplay] = useState("");

  const [results, setResults] = useState<AutoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const canSearch = useMemo(
    () => debouncedTyped.trim().length >= 2,
    [debouncedTyped]
  );

  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/meds/autocomplete?q=${encodeURIComponent(debouncedTyped)}&lim=8`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const res = Array.isArray(json?.results) ? (json.results as AutoResult[]) : [];
        setResults(res);
        setOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        setResults([]);
        setOpen(false);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedTyped, canSearch]);

  // Ghost-fill the top result into the input (select the suggested tail)
  useEffect(() => {
    if (!open) return;
    if (!typed.trim()) return;
    if (!results.length) return;

    const topName = results[0].banner_name ?? "";
    const t = typed.trim();

    if (topName.toLowerCase().startsWith(t.toLowerCase())) {
      setDisplay(topName);

      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.setSelectionRange(t.length, topName.length);
      });
    }
  }, [results, typed, open]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = containerRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
        {label}
      </div>

      <input
        ref={inputRef}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={display}
        onChange={(e) => {
          const v = e.target.value;
          setTyped(v);
          setDisplay(v);
        }}
        onFocus={() => {
          if (results.length) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (results.length) {
              const top = results[0];
              onSelect(top);
              setTyped(top.banner_name);
              setDisplay(top.banner_name);
              setOpen(false);
            }
          }
          if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        style={{
          width: "100%",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "10px 12px",
          outline: "none",
          background: "#fff",
          color: "#111827",
        }}
      />

      {open && (loading || results.length > 0) && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            marginTop: 6,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
            overflow: "hidden",
            zIndex: 20,
          }}
        >
          {loading && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>
              Searching…
            </div>
          )}

          {!loading &&
            results.map((r) => (
              <button
                key={`${r.banner_id}-${r.matched_term}`}
                onClick={() => {
                  onSelect(r);
                  setTyped(r.banner_name);
                  setDisplay(r.banner_name);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  background: "#fff",
                  cursor: "pointer",
                  color: "#111827",
                }}
              >
                <div style={{ fontWeight: 700, color: "#111827" }}>{r.banner_name}</div>
                {r.match_source === "synonym" &&
                  r.matched_term.toLowerCase() !== r.banner_name.toLowerCase() && (
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      matched: {r.matched_term}
                    </div>
                  )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
