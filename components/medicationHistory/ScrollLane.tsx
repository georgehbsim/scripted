"use client";

import { useEffect, useRef } from "react";
import { laneButtonStyle } from "./helpers";

export default function ScrollLane({
  title,
  subtitle,
  children,
  emptyText,
  minHeight = 230,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode[];
  emptyText: string;
  minHeight?: number;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [children.length]);

  function scrollByAmount(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  const hasItems = children.length > 0;

  return (
    <section style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
          {subtitle ? (
            <div style={{ fontSize: 13, color: "#111827", marginTop: 2 }}>{subtitle}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => scrollByAmount(-320)} style={laneButtonStyle}>
            ←
          </button>
          <button type="button" onClick={() => scrollByAmount(320)} style={laneButtonStyle}>
            →
          </button>
        </div>
      </div>

      <div
  style={{
    position: "relative",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#ffffff",
    overflowX: "hidden",
    overflowY: "visible",
  }}
>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 32,
            background: "linear-gradient(to right, rgba(255,255,255,0.96), rgba(255,255,255,0))",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 32,
            background: "linear-gradient(to left, rgba(255,255,255,0.96), rgba(255,255,255,0))",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
       <div
  ref={scrollerRef}
  style={{
    overflowX: "auto",
    overflowY: "visible",
    minHeight: hasItems ? minHeight : 0,
    padding: 18,
    scrollbarWidth: "thin",
  }}
>
          {hasItems ? (
            <div
  style={{
    display: "inline-flex",
    alignItems: "stretch",
    gap: 16,
    paddingBottom: 4,
  }}
>
              {children}
            </div>
          ) : (
            <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#111827",
    fontWeight: 600,
    padding: "8px 0",
  }}
>
  {emptyText}
</div>
          )}
        </div>
      </div>
    </section>
  );
}