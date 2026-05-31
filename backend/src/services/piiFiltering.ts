const D = "[0-9٠-٩]";
const B_START = `(?<!${D})`;
const B_END = `(?!${D})`;

// Egyptian National ID: 14 digits, starts with 2 or 3
const EGY_NID_REGEX = new RegExp(`${B_START}[23٢٣]${D}{13}${B_END}`, "g");

// US SSN: XXX-XX-XXXX
const SSN_REGEX = new RegExp(`${B_START}${D}{3}-${D}{2}-${D}{4}${B_END}`, "g");

// Credit Cards: Visa (4), Mastercard (5), Discover (6) - 16 digits, or Amex (34/37) - 15 digits
const CC_REGEX = new RegExp(
  `${B_START}(?:[456٤٥٦]${D}{3}[ -]?${D}{4}[ -]?${D}{4}[ -]?${D}{4}|3[47٣٤٧]${D}{2}[ -]?${D}{6}[ -]?${D}{5})${B_END}`,
  "g",
);

// Egyptian Phone: 010, 011, 012, 015 optionally prefixed by +20 or 0020
const EGY_PHONE_PREFIX = `(?:(?:\\+|00|٠٠)[2٢][0٠][ -]?[0٠]?|[0٠])`;
const EGY_PHONE_REGEX = new RegExp(
  `${B_START}${EGY_PHONE_PREFIX}[1١][0125٠١٢٥][ -]?(?:${D}[ -]?){7}${D}${B_END}`,
  "g",
);

// International Phone: + or 00 followed by 1-3 digits country code, then 8-15 digits
const INTL_PHONE_REGEX = new RegExp(
  `(?:^|\\s)(?:\\+|00|٠٠)${D}{1,3}[ -]?(?:${D}[ -]?){7,14}${D}${B_END}`,
  "g",
);

// Email
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Detects and redacts PII from text.
 * Covers: Emails, Phones, Credit Cards, National IDs (EGY), SSN.
 * Replaces detected values with [REDACTED].
 */
export function redactPII(text: string): string {
  if (!text) return text;

  let redacted = text;
  redacted = redacted.replace(EMAIL_REGEX, "[REDACTED]");
  redacted = redacted.replace(CC_REGEX, "[REDACTED]");
  redacted = redacted.replace(EGY_NID_REGEX, "[REDACTED]");
  redacted = redacted.replace(SSN_REGEX, "[REDACTED]");
  redacted = redacted.replace(EGY_PHONE_REGEX, "[REDACTED]");

  redacted = redacted.replace(INTL_PHONE_REGEX, (match) => {
    // Preserve leading whitespace if it was matched
    if (match.match(/^\s/)) {
      return match[0] + "[REDACTED]";
    }
    return "[REDACTED]";
  });

  return redacted;
}
