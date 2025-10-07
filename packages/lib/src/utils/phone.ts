import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

export function normalizePhone(phone: string, defaultCountry: CountryCode = 'AU'): string | null {
  try {
    // Remove whitespace and common separators
    const cleaned = phone.replace(/[\s\-().]/g, '');

    // Check if valid
    if (!isValidPhoneNumber(cleaned, defaultCountry)) {
      return null;
    }

    // Parse and return E.164 format
    const parsed = parsePhoneNumber(cleaned, defaultCountry);
    return parsed ? parsed.format('E.164') : null;
  } catch {
    return null;
  }
}

export function isValidPhone(phone: string, defaultCountry: CountryCode = 'AU'): boolean {
  try {
    return isValidPhoneNumber(phone, defaultCountry);
  } catch {
    return false;
  }
}
