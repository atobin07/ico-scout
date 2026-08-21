import { createServiceSupabase } from '@/lib/supabase';
import * as googleCal from './google';
import * as msCal from './microsoft';

export async function syncAll(): Promise<{ synced: number; errors: string[] }> {
  const db = createServiceSupabase();
  const errors: string[] = [];
  let synced = 0;

  const { data: accounts } = await db.from('calendar_accounts').select('*');
  if (!accounts?.length) return { synced: 0, errors: [] };

  for (const account of accounts) {
    try {
      await syncAccount(db, account, accounts);
      synced++;
    } catch (err: any) {
      errors.push(`${account.account_email}: ${err.message}`);
    }
  }

  return { synced, errors };
}

async function syncAccount(db: any, account: any, allAccounts: any[]) {
  // Refresh token if needed
  let accessToken = account.access_token;
  if (account.provider === 'google') {
    try {
      const creds = await googleCal.refreshCredentials(account.refresh_token);
      accessToken = creds.access_token!;
      await db.from('calendar_accounts').update({
        access_token: accessToken,
        token_expiry: creds.expiry_date ? new Date(creds.expiry_date).toISOString() : null,
      }).eq('id', account.id);
    } catch { /* use existing token */ }
  } else if (account.provider === 'microsoft') {
    try {
      const refreshed = await msCal.refreshAccessToken(account.refresh_token);
      accessToken = refreshed.accessToken;
      await db.from('calendar_accounts').update({
        access_token: accessToken,
        token_expiry: refreshed.expiresOn,
      }).eq('id', account.id);
    } catch { /* use existing token */ }
  }

  const calendarIds: string[] = account.calendar_ids ?? [];
  if (!calendarIds.length) return;

  for (const calendarId of calendarIds) {
    const { data: syncState } = await db
      .from('sync_state')
      .select('*')
      .eq('account_id', account.id)
      .eq('calendar_id', calendarId)
      .single();

    let events: any[] = [];
    let nextToken: string | null = null;

    if (account.provider === 'google') {
      const auth = googleCal.buildClient(accessToken, account.refresh_token);
      const result = await googleCal.fetchEvents(auth, calendarId, syncState?.sync_token ?? undefined);
      events = result.events;
      nextToken = result.nextSyncToken;
    } else {
      const result = await msCal.fetchEvents(accessToken, calendarId, syncState?.delta_link ?? undefined);
      events = result.events;
      nextToken = result.nextDeltaLink;
    }

    for (const ev of events) {
      const normalized = account.provider === 'google'
        ? googleCal.normalizeEvent(ev, account.id, calendarId)
        : msCal.normalizeEvent(ev, account.id, calendarId);

      if (normalized.status === 'cancelled') {
        await cancelEvent(db, normalized, allAccounts);
      } else {
        await upsertEvent(db, normalized, account, allAccounts);
      }
    }

    // Save sync state
    if (nextToken) {
      const stateRow: any = { account_id: account.id, calendar_id: calendarId, last_sync_at: new Date().toISOString() };
      if (account.provider === 'google') stateRow.sync_token = nextToken;
      else stateRow.delta_link = nextToken;
      await db.from('sync_state').upsert(stateRow, { onConflict: 'account_id,calendar_id' });
    }
  }
}

async function upsertEvent(db: any, normalized: any, account: any, allAccounts: any[]) {
  const { data: existing } = await db
    .from('events')
    .select('id')
    .eq('source_account_id', normalized.source_account_id)
    .eq('source_calendar_id', normalized.source_calendar_id)
    .eq('source_event_id', normalized.source_event_id)
    .single();

  const row = { ...normalized, last_synced_at: new Date().toISOString() };
  const { data: upserted } = await db
    .from('events')
    .upsert(row, { onConflict: 'source_account_id,source_calendar_id,source_event_id' })
    .select('id')
    .single();

  if (!upserted) return;

  // Create busy blocks on other primary accounts (only if event is not all-day and has times)
  if (!normalized.is_all_day && normalized.start_time && normalized.end_time && account.is_primary) {
    const others = allAccounts.filter((a) => a.id !== account.id && a.is_primary);
    for (const other of others) {
      const { data: exists } = await db
        .from('busy_blocks')
        .select('id')
        .eq('source_event_id', upserted.id)
        .eq('target_account_id', other.id)
        .single();
      if (exists) continue;

      const primaryCal = (other.calendar_ids ?? [])[0];
      if (!primaryCal) continue;

      try {
        let blockId: string;
        if (other.provider === 'google') {
          const auth = googleCal.buildClient(other.access_token, other.refresh_token);
          blockId = await googleCal.createBusyBlock(auth, primaryCal, normalized.title, normalized.start_time, normalized.end_time);
        } else {
          blockId = await msCal.createBusyBlock(other.access_token, primaryCal, normalized.title, normalized.start_time, normalized.end_time);
        }
        await db.from('busy_blocks').insert({
          source_event_id: upserted.id,
          target_account_id: other.id,
          target_calendar_id: primaryCal,
          target_event_id: blockId,
        });
      } catch { /* skip if block creation fails */ }
    }
  }
}

async function cancelEvent(db: any, normalized: any, allAccounts: any[]) {
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('source_account_id', normalized.source_account_id)
    .eq('source_calendar_id', normalized.source_calendar_id)
    .eq('source_event_id', normalized.source_event_id)
    .single();

  if (!event) return;

  await db.from('events').update({ status: 'cancelled' }).eq('id', event.id);

  const { data: blocks } = await db.from('busy_blocks').select('*').eq('source_event_id', event.id);
  for (const block of blocks ?? []) {
    const target = allAccounts.find((a) => a.id === block.target_account_id);
    if (!target) continue;
    try {
      if (target.provider === 'google') {
        const auth = googleCal.buildClient(target.access_token, target.refresh_token);
        await googleCal.deleteBusyBlock(auth, block.target_calendar_id, block.target_event_id);
      } else {
        await msCal.deleteBusyBlock(target.access_token, block.target_calendar_id, block.target_event_id);
      }
    } catch { /* already deleted */ }
    await db.from('busy_blocks').delete().eq('id', block.id);
  }
}
