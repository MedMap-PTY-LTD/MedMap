import crypto from 'crypto';

// PayFast custom integration uses PHP-style URL encoding and field order.
export function payFastEncode(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');
}

export function payFastSignature(
  fields: Record<string, string>,
  passphrase?: string,
  includeBlank = false
): string {
  const parameters = Object.entries(fields)
    .filter(([key, value]) => key !== 'signature' && (includeBlank || value !== ''))
    .map(([key, value]) => `${key}=${payFastEncode(value)}`);
  if (passphrase?.trim()) parameters.push(`passphrase=${payFastEncode(passphrase)}`);
  return crypto.createHash('md5').update(parameters.join('&')).digest('hex');
}

// PayFast's recurring-billing API uses alphabetically sorted parameters,
// unlike its custom checkout signature which preserves field order.
export function payFastApiSignature(fields: Record<string, string>, passphrase: string): string {
  const parameters = Object.entries({ ...fields, passphrase })
    .filter(([, value]) => value !== '')
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => `${key}=${payFastEncode(value)}`);
  return crypto.createHash('md5').update(parameters.join('&')).digest('hex');
}
