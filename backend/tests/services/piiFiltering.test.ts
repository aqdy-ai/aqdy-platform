import { redactPII } from "../../src/services/piiFiltering.js";

describe("PII Filtering Service", () => {
  describe("Email Addresses", () => {
    test("should redact valid standard email addresses", () => {
      const input = "Contact us at info@example.com for more details.";
      const expected = "Contact us at [REDACTED] for more details.";
      expect(redactPII(input)).toBe(expected);
    });

    test("should redact emails with complex domains and user names", () => {
      const input = "Send to john.doe+spam@sub.domain.co.uk today.";
      const expected = "Send to [REDACTED] today.";
      expect(redactPII(input)).toBe(expected);
    });

    test("should not redact invalid emails", () => {
      const input = "This is not an email @domain.com or user@.";
      expect(redactPII(input)).toBe(input);
    });
  });

  describe("Phone Numbers", () => {
    test("should redact standard Egyptian mobile numbers", () => {
      const input = "My number is 01012345678, call me.";
      const expected = "My number is [REDACTED], call me.";
      expect(redactPII(input)).toBe(expected);
    });

    test("should redact Egyptian mobile numbers with country code", () => {
      const input = "International format +201112345678 or 00201212345678.";
      const expected = "International format [REDACTED] or [REDACTED].";
      expect(redactPII(input)).toBe(expected);
    });

    test("should redact Arabic numeral Egyptian mobile numbers", () => {
      const input = "رقمي هو ٠١٠١٢٣٤٥٦٧٨ اتصل بي";
      const expected = "رقمي هو [REDACTED] اتصل بي";
      expect(redactPII(input)).toBe(expected);
    });

    test("should redact generic international phone numbers", () => {
      const input = "Call me at +1 800-555-1234 tomorrow.";
      // INTL_PHONE_REGEX keeps the leading whitespace, so +1... becomes space + [REDACTED]
      const expected = "Call me at [REDACTED] tomorrow.";
      expect(redactPII(input)).toBe(expected);
    });

    test("should not redact short random numbers", () => {
      const input = "The price is 12345 dollars.";
      expect(redactPII(input)).toBe(input);
    });
  });

  describe("Egyptian National ID", () => {
    test("should redact valid 14-digit Egyptian national IDs", () => {
      const input = "ID number 29001011234567 is registered.";
      const expected = "ID number [REDACTED] is registered.";
      expect(redactPII(input)).toBe(expected);
    });

    test("should redact Arabic numeral 14-digit national IDs", () => {
      const input = "الرقم القومي ٢٩٠٠١٠١١٢٣٤٥٦٧ مسجل.";
      const expected = "الرقم القومي [REDACTED] مسجل.";
      expect(redactPII(input)).toBe(expected);
    });

    test("should not redact invalid 13-digit numbers starting with 2/3", () => {
      const input = "My ID is 2900101123456 (too short).";
      expect(redactPII(input)).toBe(input);
    });
  });

  describe("Social Security Numbers (SSN)", () => {
    test("should redact valid US SSN format", () => {
      const input = "His SSN is 123-45-6789.";
      const expected = "His SSN is [REDACTED].";
      expect(redactPII(input)).toBe(expected);
    });

    test("should not redact similar formats that are not SSN", () => {
      const input = "Part number 123-456-7890.";
      expect(redactPII(input)).toBe(input); // Would be caught by phone regex if it matched, but it shouldn't match SSN
    });
  });

  describe("Credit Card Numbers", () => {
    test("should redact 16-digit credit cards with spaces", () => {
      const input = "My Visa is 4123 4567 8901 2345.";
      const expected = "My Visa is [REDACTED].";
      expect(redactPII(input)).toBe(expected);
    });

    test("should redact 16-digit credit cards with dashes", () => {
      const input = "Mastercard 5123-4567-8901-2345.";
      const expected = "Mastercard [REDACTED].";
      expect(redactPII(input)).toBe(expected);
    });

    test("should redact 15-digit Amex cards", () => {
      const input = "Amex 3412 345678 90123.";
      const expected = "Amex [REDACTED].";
      expect(redactPII(input)).toBe(expected);
    });

    test("should redact 16-digit contiguous numbers", () => {
      const input = "Card 4123456789012345 was declined.";
      const expected = "Card [REDACTED] was declined.";
      expect(redactPII(input)).toBe(expected);
    });
  });

  describe("Edge Cases & False Positives", () => {
    test("should handle null/empty input gracefully", () => {
      expect(redactPII("")).toBe("");
      // @ts-ignore for testing
      expect(redactPII(null)).toBeNull();
    });

    test("should handle multiple PII types in the same string", () => {
      const input =
        "Contact 01012345678 or test@example.com. SSN: 123-45-6789. Card: 4123 4567 8901 2345.";
      const expected =
        "Contact [REDACTED] or [REDACTED]. SSN: [REDACTED]. Card: [REDACTED].";
      expect(redactPII(input)).toBe(expected);
    });

    test("should not break clause extraction or contract structure", () => {
      const input =
        "Clause 1.2: The employee (ID: 29001011234567) shall be paid $1000.";
      const expected =
        "Clause 1.2: The employee (ID: [REDACTED]) shall be paid $1000.";
      expect(redactPII(input)).toBe(expected);
    });

    test("should not redact typical monetary amounts", () => {
      const input = "The total is 12345678 dollars.";
      expect(redactPII(input)).toBe(input);
    });
  });
});
