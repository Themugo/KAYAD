// A KAYAD dealer is a BUSINESS. Its identity is the company name, which is always different from the personal name of the people
// behind it (they use personal accounts, joined to the dealership as team members). These helpers are the single rule used by
// registration, dealer onboarding and profile edits.

const norm = (s) => String(s ?? "").normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/**
 * @returns {{ ok: true, value: string } | { ok: false, code: string, message: string }}
 */
export function validateCompanyName(businessName, { personName } = {}) {
  const value = String(businessName ?? "").trim().replace(/\s+/g, " ");
  if (!value) return { ok: false, code: "COMPANY_NAME_REQUIRED", message: "A dealer must be registered under its company name." };
  if (value.length < 2 || value.length > 120) return { ok: false, code: "COMPANY_NAME_LENGTH", message: "The company name must be between 2 and 120 characters." };
  if (!/\p{L}/u.test(value)) return { ok: false, code: "COMPANY_NAME_INVALID", message: "The company name must contain letters." };
  if (/@|https?:\/\/|www\./i.test(value) || /^\+?[\d\s()-]{7,}$/.test(value)) {
    return { ok: false, code: "COMPANY_NAME_INVALID", message: "Enter the registered company or trading name, not an email address, web address or phone number." };
  }
  const company = norm(value);
  const person = norm(personName);
  if (person && (company === person || [...company.split(" ")].sort().join(" ") === [...person.split(" ")].sort().join(" "))) {
    return {
      ok: false,
      code: "COMPANY_NAME_IS_PERSONAL_NAME",
      message: "A dealer is registered under its company name, not a personal name. Use the business's registered or trading name; people join the dealership through their own personal accounts.",
    };
  }
  return { ok: true, value };
}

/** The only name shown publicly for a dealer. Never falls back to the personal name of the owner. */
export const dealerPublicName = (dealer) => String(dealer?.businessName || "").trim() || "KAYAD dealer";
