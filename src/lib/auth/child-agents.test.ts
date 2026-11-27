import { describe, expect, it } from 'vitest';

import {
  CHILD_AGENT_ROLES,
  MAX_AGENT_NAME_LEN,
  generateAgentPassword,
  isChildAgentRole,
  normalizeAgentEmail,
  normalizeAgentName,
} from './child-agents';

describe('isChildAgentRole', () => {
  it('accepts only non-owner account roles', () => {
    for (const role of CHILD_AGENT_ROLES) {
      expect(isChildAgentRole(role)).toBe(true);
    }
    expect(isChildAgentRole('owner')).toBe(false);
    expect(isChildAgentRole('')).toBe(false);
    expect(isChildAgentRole(null)).toBe(false);
  });
});

describe('normalizeAgentEmail', () => {
  it('trims and lowercases a valid email', () => {
    expect(normalizeAgentEmail('  Agent@Gmail.com ')).toBe('agent@gmail.com');
  });

  it('rejects malformed and oversized input', () => {
    expect(normalizeAgentEmail('not-an-email')).toBeNull();
    expect(normalizeAgentEmail('a@b')).toBeNull();
    expect(normalizeAgentEmail(`${'a'.repeat(250)}@example.com`)).toBeNull();
    expect(normalizeAgentEmail(42)).toBeNull();
  });
});

describe('normalizeAgentName', () => {
  it('trims a valid name', () => {
    expect(normalizeAgentName('  Sara Ahmed  ')).toBe('Sara Ahmed');
  });

  it('rejects empty and oversized input', () => {
    expect(normalizeAgentName('   ')).toBeNull();
    expect(normalizeAgentName('a'.repeat(MAX_AGENT_NAME_LEN + 1))).toBeNull();
    expect(normalizeAgentName(undefined)).toBeNull();
  });
});

describe('generateAgentPassword', () => {
  it('returns a long, unique password with mixed character classes', () => {
    const a = generateAgentPassword();
    const b = generateAgentPassword();

    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(20);
    expect(a).toMatch(/[A-Z]/);
    expect(a).toMatch(/[a-z]/);
    expect(a).toMatch(/[0-9]/);
    expect(a).toMatch(/[^A-Za-z0-9]/);
  });
});
