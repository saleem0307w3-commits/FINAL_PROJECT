import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Contact blocking is backed by a reserved account tag. Keeping it as a
 * plain tag means it survives reloads, syncs across every agent's device,
 * and shows up in the existing tag UI without any schema changes.
 */
export const BLOCKED_TAG_NAME = 'Blocked'
export const BLOCKED_TAG_COLOR = '#ef4444'

export function isBlockedTagName(name: string | null | undefined): boolean {
  return name?.trim().toLowerCase() === BLOCKED_TAG_NAME.toLowerCase()
}

export function isContactBlocked(
  tags: ReadonlyArray<{ name: string }> | null | undefined,
): boolean {
  return (tags ?? []).some((tag) => isBlockedTagName(tag.name))
}

type EmbeddedTagRow = {
  tags: { name: string | null } | { name: string | null }[] | null
}

export async function isContactBlockedInDb(
  db: SupabaseClient,
  accountId: string,
  contactId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from('contact_tags')
    .select('tags!inner(name)')
    .eq('contact_id', contactId)
    .eq('tags.account_id', accountId)

  if (error) {
    console.error('[contacts/blocked] lookup failed:', error.message)
    return false
  }

  return ((data ?? []) as unknown as EmbeddedTagRow[]).some((row) => {
    const tags = Array.isArray(row.tags) ? row.tags : [row.tags]
    return tags.some((tag) => isBlockedTagName(tag?.name))
  })
}
