import { describe, expect, it } from 'vitest'

import {
  BLOCKED_TAG_COLOR,
  BLOCKED_TAG_NAME,
  isBlockedTagName,
  isContactBlocked,
  isContactBlockedInDb,
} from './blocked'

function fakeDb(rows: unknown[], error: { message: string } | null = null) {
  const eqCalls: { column: string; value: string }[] = []
  const db = {
    from: () => ({
      select: () => ({
        eq: (column: string, value: string) => {
          eqCalls.push({ column, value })
          return {
            eq: (nestedColumn: string, nestedValue: string) => {
              eqCalls.push({ column: nestedColumn, value: nestedValue })
              return Promise.resolve({ data: rows, error })
            },
          }
        },
      }),
    }),
  }
  return { db, eqCalls }
}

describe('isBlockedTagName', () => {
  it('matches the reserved name case-insensitively, ignoring padding', () => {
    expect(isBlockedTagName(BLOCKED_TAG_NAME)).toBe(true)
    expect(isBlockedTagName('blocked')).toBe(true)
    expect(isBlockedTagName('  BLOCKED  ')).toBe(true)
  })

  it('rejects other tags and empty input', () => {
    expect(isBlockedTagName('VIP')).toBe(false)
    expect(isBlockedTagName('Blocked lead')).toBe(false)
    expect(isBlockedTagName(null)).toBe(false)
    expect(isBlockedTagName(undefined)).toBe(false)
  })
})

describe('isContactBlocked', () => {
  it('is true when any assigned tag is the reserved Blocked tag', () => {
    expect(
      isContactBlocked([{ name: 'VIP' }, { name: BLOCKED_TAG_NAME }]),
    ).toBe(true)
  })

  it('is false without tags or with only other tags', () => {
    expect(isContactBlocked([])).toBe(false)
    expect(isContactBlocked(null)).toBe(false)
    expect(isContactBlocked(undefined)).toBe(false)
    expect(isContactBlocked([{ name: 'VIP' }])).toBe(false)
  })
})

describe('isContactBlockedInDb', () => {
  it('finds the reserved tag in an embedded tag row', async () => {
    const { db, eqCalls } = fakeDb([{ tags: { name: BLOCKED_TAG_NAME } }])

    await expect(
      isContactBlockedInDb(db as never, 'acc-1', 'contact-1'),
    ).resolves.toBe(true)
    expect(eqCalls).toEqual([
      { column: 'contact_id', value: 'contact-1' },
      { column: 'tags.account_id', value: 'acc-1' },
    ])
  })

  it('finds the reserved tag in an array of embedded tags', async () => {
    const { db } = fakeDb([{ tags: [{ name: 'VIP' }, { name: 'blocked' }] }])

    await expect(
      isContactBlockedInDb(db as never, 'acc-1', 'contact-1'),
    ).resolves.toBe(true)
  })

  it('is false for unrelated tags, no rows, or a failed lookup', async () => {
    await expect(
      isContactBlockedInDb(
        fakeDb([{ tags: { name: 'VIP' } }]).db as never,
        'acc-1',
        'contact-1',
      ),
    ).resolves.toBe(false)
    await expect(
      isContactBlockedInDb(fakeDb([]).db as never, 'acc-1', 'contact-1'),
    ).resolves.toBe(false)
    await expect(
      isContactBlockedInDb(
        fakeDb([{ tags: { name: 'Blocked' } }], { message: 'db down' }).db as never,
        'acc-1',
        'contact-1',
      ),
    ).resolves.toBe(false)
  })
})

describe('BLOCKED_TAG_COLOR', () => {
  it('uses the destructive red', () => {
    expect(BLOCKED_TAG_COLOR).toBe('#ef4444')
  })
})
