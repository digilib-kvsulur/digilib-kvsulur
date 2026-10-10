import { VACATION_ERROR_MESSAGES } from "./constants";

export function vacationErrorMessage(error: unknown): string {
  const raw =
    (error as { message?: string; code?: string })?.message ||
    (error as { code?: string })?.code ||
    String(error || "Something went wrong");
  const key = Object.keys(VACATION_ERROR_MESSAGES).find((code) => raw.includes(code));
  return key ? VACATION_ERROR_MESSAGES[key] : raw;
}
