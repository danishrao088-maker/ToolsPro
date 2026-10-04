export const CONTACT_FIELDS = ["name", "email", "subject", "message"] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];
export type ContactFields = Record<ContactField, string>;
export type ContactErrors = Partial<Record<ContactField, string>>;

export const LIMITS = {
  name: 100,
  email: 254,
  subject: 150,
  messageMin: 10,
  message: 2000,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(values: ContactFields): ContactErrors {
  const errors: ContactErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const subject = values.subject.trim();
  const message = values.message.trim();

  if (!name) errors.name = "Enter your name.";
  else if (name.length > LIMITS.name) errors.name = `Name must be ${LIMITS.name} characters or fewer.`;

  if (!email) errors.email = "Enter your email address.";
  else if (email.length > LIMITS.email) errors.email = `Email must be ${LIMITS.email} characters or fewer.`;
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";

  if (!subject) errors.subject = "Enter a subject.";
  else if (subject.length > LIMITS.subject) {
    errors.subject = `Subject must be ${LIMITS.subject} characters or fewer.`;
  }

  if (!message) errors.message = "Enter your message.";
  else if (message.length < LIMITS.messageMin) {
    errors.message = `Your message must be at least ${LIMITS.messageMin} characters.`;
  } else if (message.length > LIMITS.message) {
    errors.message = `Your message must be ${LIMITS.message.toLocaleString("en-US")} characters or fewer.`;
  }

  return errors;
}

// Server ke VALIDATION_ERROR ka details ({ email: ["..."] }) ko form ke errors mein badalta hai.
// Sirf hamare 4 fields lete hain, baqi (jaise honeypot) ignore.
export function serverErrorsToFields(details?: Record<string, string[]>): ContactErrors {
  const errors: ContactErrors = {};
  if (!details) return errors;
  for (const field of CONTACT_FIELDS) {
    const message = details[field]?.[0];
    if (message) errors[field] = message;
  }
  return errors;
}