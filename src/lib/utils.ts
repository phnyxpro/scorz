import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Display-friendly role name using British English spelling */
const ROLE_DISPLAY: Record<string, string> = {
  admin: "admin",
  organizer: "organiser",
  chief_judge: "chief judge",
  judge: "judge",
  tabulator: "tabulator",
  witness: "witness",
  contestant: "contestant",
  audience: "audience",
};

export function formatRoleName(role: string): string {
  return ROLE_DISPLAY[role] ?? role.replace("_", " ");
}

/** Convert a full_name or email into a display-friendly name */
export function friendlyDisplayName(fullName: string | null | undefined, email: string | null | undefined): string {
  if (fullName) return fullName;
  if (!email) return "Unknown";
  const local = email.split("@")[0];
  return local.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
