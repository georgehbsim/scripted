// components/durationOptions.ts

export type CourseType = "ONGOING" | "COURSE";

export type DurationOption = {
  key: string;
  display: string;
  kind: "ongoing" | "course";
  unit?: "day" | "week" | "month" | "year";
  value?: number;
};

function plural(n: number, word: string) {
  return n === 1 ? `${n} ${word}` : `${n} ${word}s`;
}

export const COURSE_TYPE_OPTIONS = [
  { key: "ONGOING" as const, display: "Ongoing / continuous" },
  { key: "COURSE" as const, display: "Defined course" },
];

export const DURATION_OPTIONS: DurationOption[] = [
  { key: "ONGOING", display: "Ongoing / continuous", kind: "ongoing" },

  // days 1-31
  ...Array.from({ length: 31 }, (_, i) => {
    const v = i + 1;
    return {
      key: `D:${v}`,
      display: plural(v, "day"),
      kind: "course" as const,
      unit: "day" as const,
      value: v,
    };
  }),
  // weeks 1-12
  ...Array.from({ length: 12 }, (_, i) => {
    const v = i + 1;
    return {
      key: `W:${v}`,
      display: plural(v, "week"),
      kind: "course" as const,
      unit: "week" as const,
      value: v,
    };
  }),
  // months 1-18
  ...Array.from({ length: 18 }, (_, i) => {
    const v = i + 1;
    return {
      key: `M:${v}`,
      display: plural(v, "month"),
      kind: "course" as const,
      unit: "month" as const,
      value: v,
    };
  }),
  // years 1-5
  ...Array.from({ length: 5 }, (_, i) => {
    const v = i + 1;
    return {
      key: `Y:${v}`,
      display: plural(v, "year"),
      kind: "course" as const,
      unit: "year" as const,
      value: v,
    };
  }),
];


function norm(s: unknown) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}


export function rankCourseTypes(query: string) {
  const q = norm(query ?? "");
  if (!q) return COURSE_TYPE_OPTIONS;

  return COURSE_TYPE_OPTIONS
    .map((o) => {
      const hay = [o.display, o.key].map(norm);
      let score = 0;
      if (o.key.toLowerCase().startsWith(q)) score += 200;
      if (hay.some((h) => h.startsWith(q))) score += 120;
      if (hay.some((h) => h.includes(q))) score += 60;
      return { o, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.o);
}

export function rankDurations(query: string): DurationOption[] {
  const q = norm(query);
  if (!q) return DURATION_OPTIONS;

  // allow “5 d”, “5 day”, “2 w”, “3 mo”, “1 yr” etc.
  const expanded = q
    .replace(/\b(d)\b/g, "day")
    .replace(/\b(w)\b/g, "week")
    .replace(/\b(mo)\b/g, "month")
    .replace(/\b(m)\b/g, "month")
    .replace(/\b(yr)\b/g, "year")
    .replace(/\b(y)\b/g, "year");

  return DURATION_OPTIONS
    .map((opt) => {
const unit = opt.unit ?? "";
const val = opt.value ?? "";

const hay = [
  opt.display,
  opt.key,
  unit && val ? `${val} ${unit}` : "",
  unit && val ? `${val}${unit[0]}` : "",
].map(norm);
      let score = 0;
      if (hay.some((h) => h.startsWith(expanded))) score += 120;
      if (hay.some((h) => h.includes(expanded))) score += 60;

      // strong numeric match
const numMatch = expanded.match(/\b(\d+)\b/);
if (numMatch && opt.value && Number(numMatch[1]) === opt.value) score += 40;

      return { opt, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.opt);
}

export function displayForDurationKey(key: string): string {
  const hit = DURATION_OPTIONS.find((d) => d.key === key);
  return hit ? hit.display : key;
}

export function isCourseDurationKey(key: string): boolean {
  // Treat anything other than ONGOING (or empty) as a defined course
  return !!key && key !== "ONGOING";
}

