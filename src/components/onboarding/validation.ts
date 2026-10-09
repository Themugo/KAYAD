/** Client-side checks that mirror the backend schemas, so people see problems before submitting. */
export const PASSWORD_RULES: Array<{ id: string; label: string; test: (v: string) => boolean }> = [
  { id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'digit', label: 'A number', test: (v) => /\d/.test(v) },
  { id: 'special', label: 'A special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];
export const passwordProblems = (v: string) => PASSWORD_RULES.filter((r) => !r.test(v)).map((r) => r.label);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v: string) => EMAIL.test(v.trim());
export const isPlausiblePhone = (v: string) => { const d = v.replace(/[^\d]/g, ''); return d.length >= 9 && d.length <= 15; };

export type FieldErrors = Record<string, string>;

export interface AccountForm {
  name: string; email: string; phone: string; password: string; businessName: string; location: string;
}

/** `backendRole` decides which fields are required, exactly as the backend does. */
export function validateAccount(form: AccountForm, backendRole: 'user' | 'individual_seller' | 'dealer'): FieldErrors {
  const e: FieldErrors = {};
  if (form.name.trim().length < 2) e.name = 'Enter your full name.';
  if (!form.email.trim()) e.email = 'Enter your email address.';
  else if (!isEmail(form.email)) e.email = 'Enter a valid email address, like name@example.co.ke.';
  if (form.phone.trim() && !isPlausiblePhone(form.phone)) e.phone = 'Enter a valid phone number (9–15 digits).';
  if (backendRole !== 'user' && !form.phone.trim()) e.phone = 'Enter a phone number so KAYAD can reach you about your approval.';
  if (!form.password) e.password = 'Create a password.';
  else if (passwordProblems(form.password).length) e.password = `Password needs: ${passwordProblems(form.password).join(', ').toLowerCase()}.`;
  if (backendRole === 'dealer') {
    if (!form.businessName.trim()) e.businessName = 'Enter your dealership’s business name.';
    if (!form.location.trim()) e.location = 'Enter your dealership’s city or location.';
  }
  return e;
}

export interface ProfessionalForm {
  name: string; email: string; phone: string; idNumber: string; location: string; yearsOfExperience: string;
  specialties: string; preferredRegions: string; toolsAvailable: string;
}

const splitList = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);
export const parseList = splitList;

/** Mirrors backend/validation/inspectorApplication.schema.js. */
export function validateProfessional(form: ProfessionalForm): FieldErrors {
  const e: FieldErrors = {};
  if (form.name.trim().length < 2) e.name = 'Enter your full name.';
  if (!form.email.trim()) e.email = 'Enter your email address.';
  else if (!isEmail(form.email)) e.email = 'Enter a valid email address.';
  if (!isPlausiblePhone(form.phone)) e.phone = 'Enter a valid phone number (9–15 digits).';
  if (form.idNumber.trim().length < 3) e.idNumber = 'Enter your national ID or passport number.';
  if (!form.location.trim()) e.location = 'Enter your city or town.';
  const years = Number(form.yearsOfExperience);
  if (form.yearsOfExperience.trim() === '' || !Number.isFinite(years) || years < 0 || years > 80) e.yearsOfExperience = 'Enter your years of experience (0–80).';
  const specialties = splitList(form.specialties);
  if (specialties.length === 0) e.specialties = 'Add at least one specialty, separated by commas.';
  else if (specialties.length > 20) e.specialties = 'List at most 20 specialties.';
  return e;
}
