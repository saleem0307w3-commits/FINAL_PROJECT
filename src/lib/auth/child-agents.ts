import { randomBytes } from 'node:crypto';

export const CHILD_AGENT_ROLES = ['admin', 'agent', 'viewer'] as const;
export type ChildAgentRole = (typeof CHILD_AGENT_ROLES)[number];

export const MAX_AGENT_NAME_LEN = 120;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isChildAgentRole(value: unknown): value is ChildAgentRole {
  return (
    typeof value === 'string' &&
    (CHILD_AGENT_ROLES as readonly string[]).includes(value)
  );
}

export function normalizeAgentEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export function normalizeAgentName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (!name || name.length > MAX_AGENT_NAME_LEN) return null;
  return name;
}

export function generateAgentPassword(): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = randomBytes(20);
  const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(
    '',
  );
  return `Aa1!${suffix}`;
}
