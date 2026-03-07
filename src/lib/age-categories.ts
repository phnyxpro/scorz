export const AGE_CATEGORIES = [
  { value: "adult", label: "Adult" },
  { value: "adult_18_24", label: "Adult | 18-24" },
  { value: "adult_25_34", label: "Adult | 25-34" },
  { value: "adult_35_44", label: "Adult | 35-44" },
  { value: "adult_45_54", label: "Adult | 45-54" },
  { value: "adult_55_plus", label: "Adult | 55+" },
  { value: "minor", label: "Minor (Under 18)" },
] as const;

export type AgeCategoryValue = (typeof AGE_CATEGORIES)[number]["value"];

export function getAgeCategoryLabel(value: string): string {
  return AGE_CATEGORIES.find((c) => c.value === value)?.label || value;
}

export function isMinorCategory(value: string): boolean {
  return value === "minor";
}

/** Map CSV age strings to our age category values */
export function mapAgeCategory(raw: string): AgeCategoryValue {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (s.includes("under18") || s === "minor") return "minor";
  if (s.includes("18-24") || s.includes("18–24")) return "adult_18_24";
  if (s.includes("25-34") || s.includes("25–34")) return "adult_25_34";
  if (s.includes("35-44") || s.includes("35–44")) return "adult_35_44";
  if (s.includes("45-54") || s.includes("45–54")) return "adult_45_54";
  if (s.includes("55+") || s.includes("55-64") || s.includes("55–64") || s.includes("65+") || s.includes("65")) return "adult_55_plus";
  return "adult";
}

/** Extract guardian name from consent text */
export function extractGuardianName(consentText: string): string {
  const match = consentText.match(/\[Parent.*?Full Name\]\s*(.+?),/i);
  return match?.[1]?.trim() || "";
}

/** Parse time slot string like "Sunday, Mar 08, 2026 9:00 AM-9:05 AM" */
export function parseTimeSlot(raw: string): { start_time: string; end_time: string } | null {
  const match = raw.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
  if (!match) return null;
  return {
    start_time: to24h(match[1]),
    end_time: to24h(match[2]),
  };
}

function to24h(time12: string): string {
  const m = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return "00:00:00";
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}:00`;
}
