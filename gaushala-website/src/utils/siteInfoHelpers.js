// Default siteInfo values (see src/data/defaultData.js) use bracketed
// placeholders like "[PHONE NUMBER]" until the admin fills in real details
// via /admin → Website Information. These helpers detect that so the
// public site never turns a placeholder into a misleading, fake-looking
// clickable tel:/mailto:/wa.me link — placeholders render as plain text
// instead, real values become real links.

export function isPlaceholder(value) {
  if (!value) return true;
  const trimmed = String(value).trim();
  return trimmed === "" || (trimmed.startsWith("[") && trimmed.endsWith("]"));
}

export function buildTelLink(phone) {
  if (isPlaceholder(phone)) return null;
  return `tel:${phone}`;
}

export function buildMailLink(email) {
  if (isPlaceholder(email)) return null;
  return `mailto:${email}`;
}

export function buildWhatsAppLink(whatsapp, message = "") {
  if (isPlaceholder(whatsapp)) return null;
  let digits = String(whatsapp).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${query}`;
}
