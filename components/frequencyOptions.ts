// components/frequencyOptions.ts

export type FrequencyOption = {
  code: string;      // what you store in DB, e.g. "BD"
  label: string;     // human label, e.g. "Twice daily"
  display: string;   // what user sees, e.g. "Twice daily (BD)"
  aliases: string[]; // searchable terms, includes code + words
};

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  {
    code: "STAT",
    label: "Immediate",
    display: "Immediate (STAT)",
    aliases: ["stat", "immediate", "now"],
  },
  {
    code: "OD",
    label: "Once daily",
    display: "Once daily (OD)",
    aliases: ["od", "once", "once daily", "once a day", "daily", "1x daily", "every day"],
  },
  {
    code: "BD",
    label: "Twice daily",
    display: "Twice daily (BD)",
    aliases: ["bd", "twice", "twice daily", "twice a day", "2x daily", "every 12 hours", "q12h"],
  },
  {
    code: "TDS",
    label: "Three times daily",
    display: "Three times daily (TDS)",
    aliases: ["tds", "three times", "three times daily", "3x daily", "every 8 hours", "q8h"],
  },
  {
    code: "QID",
    label: "Four times daily",
    display: "Four times daily (QID)",
    aliases: ["qid", "four times", "four times daily", "4x daily", "every 6 hours", "q6h"],
  },
  {
    code: "ON",
    label: "At night",
    display: "At night (ON)",
    aliases: ["on", "night", "at night", "nocte", "bedtime", "hs"],
  },
  {
    code: "PRN",
    label: "As required",
    display: "As required (PRN)",
    aliases: ["prn", "as required", "as needed", "when required", "when needed"],
  },
  {
    code: "WEEKLY",
    label: "Weekly",
    display: "Weekly (WEEKLY)",
    aliases: ["weekly", "once weekly", "every week"],
  },
  {
    code: "MONTHLY",
    label: "Monthly",
    display: "Monthly (MONTHLY)",
    aliases: ["monthly", "once monthly", "every month"],
  },
];

export function rankFrequencies(query: string): FrequencyOption[] {
  const q = norm(query);
  if (!q) return FREQUENCY_OPTIONS;

  const scored = FREQUENCY_OPTIONS.map((opt) => {
    const hay = [opt.display, opt.label, opt.code, ...opt.aliases].map(norm);

    let score = 0;

    // strongest: startsWith on code (typing "bd")
    if (opt.code.toLowerCase().startsWith(q)) score += 200;

    // any alias startsWith (typing "twic")
    if (hay.some((h) => h.startsWith(q))) score += 120;

    // any alias includes (typing "12h")
    if (hay.some((h) => h.includes(q))) score += 60;

    // small bonus if query tokens are all found somewhere
    const tokens = q.split(" ").filter(Boolean);
    if (tokens.length > 1 && tokens.every((t) => hay.some((h) => h.includes(t)))) score += 25;

    return { opt, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.opt);
}

export function displayForFrequencyCode(code: string): string {
  const hit = FREQUENCY_OPTIONS.find((o) => o.code === code);
  return hit ? hit.display : code;
}
