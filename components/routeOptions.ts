// components/routeOptions.ts

export type RouteOption = {
  code: string;      // what you store e.g. "PO"
  label: string;     // e.g. "Oral"
  display: string;   // e.g. "Oral (PO)"
  aliases: string[]; // searchable terms
};

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export const ROUTE_OPTIONS: RouteOption[] = [
  { code: "PO", label: "Oral", display: "Oral (PO)", aliases: ["po", "oral", "by mouth"] },
  { code: "IV", label: "Intravenous", display: "Intravenous (IV)", aliases: ["iv", "intravenous", "intravenously"] },
  { code: "IM", label: "Intramuscular", display: "Intramuscular (IM)", aliases: ["im", "intramuscular"] },
  { code: "SC", label: "Subcutaneous", display: "Subcutaneous (SC)", aliases: ["sc", "subcut", "subcutaneous", "subcutaneous injection"] },
  { code: "PR", label: "Rectal", display: "Rectal (PR)", aliases: ["pr", "rectal"] },
  { code: "SL", label: "Sublingual", display: "Sublingual (SL)", aliases: ["sl", "sublingual", "under the tongue"] },
  { code: "INH", label: "Inhaled", display: "Inhaled (INH)", aliases: ["inh", "inhaled", "inhalation", "puffer", "neb", "nebulised"] },
  { code: "TOP", label: "Topical", display: "Topical (TOP)", aliases: ["top", "topical", "cream", "ointment", "skin"] },
];

export function rankRoutes(query: string, allowedCodes?: string[]): RouteOption[] {
  const q = norm(query);
  const base = allowedCodes?.length
    ? ROUTE_OPTIONS.filter((r) => allowedCodes.includes(r.code))
    : ROUTE_OPTIONS;

  if (!q) return base;

  const scored = base.map((opt) => {
    const hay = [opt.display, opt.label, opt.code, ...opt.aliases].map(norm);
    let score = 0;

    if (opt.code.toLowerCase().startsWith(q)) score += 200;
    if (hay.some((h) => h.startsWith(q))) score += 120;
    if (hay.some((h) => h.includes(q))) score += 60;

    const tokens = q.split(" ").filter(Boolean);
    if (tokens.length > 1 && tokens.every((t) => hay.some((h) => h.includes(t)))) score += 25;

    return { opt, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.opt);
}

export function displayForRouteCode(code: string): string {
  const hit = ROUTE_OPTIONS.find((o) => o.code === code);
  return hit ? hit.display : code;
}
