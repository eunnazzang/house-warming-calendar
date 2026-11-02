export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidPhone(input: string): boolean {
  return /^01[016789]\d{7,8}$/.test(normalizePhone(input));
}

export function formatPhone(digits: string): string {
  const d = normalizePhone(digits);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return d;
}
