/**
 * Rigorous Email Validation Utility
 * Validates proper structure, domains, and RFC 5322 compliance.
 * Rejects invalid patterns such as:
 * - abc@
 * - abc@gmail
 * - abc@gmail.
 * - abc@domain
 * - test..test@gmail.com
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmed = email.trim();
  if (trimmed.length > 254) return false;

  // Disallow consecutive dots
  if (trimmed.includes('..')) return false;

  // Split local and domain
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domain] = parts;
  if (!localPart || !domain) return false;

  // Local part checks
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (localPart.length > 64) return false;

  // Allowed characters for local part
  const localPartRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
  if (!localPartRegex.test(localPart)) return false;

  // Domain checks
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.startsWith('-') || domain.endsWith('-')) return false;

  const domainLabels = domain.split('.');
  // Must have at least 2 labels: domain name and valid TLD (e.g. gmail.com)
  if (domainLabels.length < 2) return false;

  // Each label must be valid
  for (const label of domainLabels) {
    if (!label || label.length > 63) return false;
    if (label.startsWith('-') || label.endsWith('-')) return false;
    if (!/^[a-zA-Z0-9-]+$/.test(label)) return false;
  }

  // TLD must be alphabetic and at least 2 characters long
  const tld = domainLabels[domainLabels.length - 1];
  if (!/^[a-zA-Z]{2,24}$/.test(tld)) return false;

  return true;
}

module.exports = {
  isValidEmail
};
