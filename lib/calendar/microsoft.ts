import * as msal from '@azure/msal-node';

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/calendar/microsoft/callback`;
const SCOPES = ['Calendars.ReadWrite', 'User.Read', 'offline_access'];
const AUTHORITY = 'https://login.microsoftonline.com/common';

function getConfidentialClient() {
  return new msal.ConfidentialClientApplication({
    auth: { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, authority: AUTHORITY },
  });
}

export function buildAuthUrl(state: string): string {
  const url = new URL(`${AUTHORITY}/oauth2/v2.0/authorize`);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

export async function exchangeCode(code: string) {
  const client = getConfidentialClient();
  const result = await client.acquireTokenByCode({
    code,
    redirectUri: REDIRECT_URI,
    scopes: SCOPES,
  });
  if (!result) throw new Error('No token result from Microsoft');

  const userInfo = await graphGet(result.accessToken, '/me');
  const expiry = result.expiresOn?.toISOString() ?? new Date(Date.now() + 3600 * 1000).toISOString();

  return {
    accessToken: result.accessToken,
    refreshToken: (result as any).refreshToken ?? '',
    expiresOn: expiry,
    email: userInfo.mail ?? userInfo.userPrincipalName,
    name: userInfo.displayName ?? userInfo.mail,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const client = getConfidentialClient();
  const result = await client.acquireTokenByRefreshToken({
    refreshToken,
    scopes: SCOPES,
    forceCache: true,
  });
  if (!result) throw new Error('Failed to refresh Microsoft token');
  return {
    accessToken: result.accessToken,
    expiresOn: result.expiresOn?.toISOString() ?? new Date(Date.now() + 3600 * 1000).toISOString(),
  };
}

export async function listCalendars(accessToken: string) {
  const data = await graphGet(accessToken, '/me/calendars');
  return (data.value ?? []).map((c: any) => ({ id: c.id, name: c.name }));
}

export async function fetchEvents(
  accessToken: string,
  calendarId: string,
  deltaLink?: string,
): Promise<{ events: MsEvent[]; nextDeltaLink: string | null }> {
  const events: MsEvent[] = [];
  let nextDeltaLink: string | null = null;

  let url: string | null = deltaLink ?? null;
  if (!url) {
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    url = `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/calendarView/delta?startDateTime=${start}&endDateTime=${end}`;
  }

  while (url) {
    const fetchUrl: string = url;
    const res = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data: Record<string, any> = await res.json();
    if (!res.ok) throw new Error(`Graph API error: ${JSON.stringify(data)}`);
    events.push(...(data.value ?? []));
    url = data['@odata.nextLink'] ?? null;
    if (!url) nextDeltaLink = data['@odata.deltaLink'] ?? null;
  }

  return { events, nextDeltaLink };
}

export async function createBusyBlock(
  accessToken: string,
  calendarId: string,
  title: string,
  start: string,
  end: string,
): Promise<string> {
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: `Busy (blocked by ${title})`,
      start: { dateTime: start, timeZone: 'UTC' },
      end: { dateTime: end, timeZone: 'UTC' },
      showAs: 'busy',
      sensitivity: 'private',
    }),
  });
  const data = await res.json();
  return data.id;
}

export async function deleteBusyBlock(accessToken: string, calendarId: string, eventId: string) {
  await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}

async function graphGet(accessToken: string, path: string) {
  const url = path.startsWith('http') ? path : `https://graph.microsoft.com/v1.0${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Graph error ${res.status}: ${await res.text()}`);
  return res.json();
}

export type MsEvent = any;

export function normalizeEvent(ev: MsEvent, accountId: string, calendarId: string) {
  const cancelled = !!(ev['@removed'] || ev.isCancelled);
  const isAllDay = ev.isAllDay ?? false;
  const start = isAllDay ? ev.start?.date : (ev.start?.dateTime ? new Date(ev.start.dateTime).toISOString() : null);
  const end = isAllDay ? ev.end?.date : (ev.end?.dateTime ? new Date(ev.end.dateTime).toISOString() : null);
  const attendees = (ev.attendees ?? []).map((a: any) => ({
    email: a.emailAddress?.address,
    name: a.emailAddress?.name ?? a.emailAddress?.address,
    responseStatus: a.status?.response,
  }));
  const videoLink = extractVideoLink(ev);

  return {
    source_account_id: accountId,
    source_calendar_id: calendarId,
    source_event_id: ev.id,
    title: ev.subject ?? '(No title)',
    description: ev.body?.content ?? null,
    location: ev.location?.displayName ?? null,
    start_time: start,
    end_time: end,
    attendees,
    video_link: videoLink,
    organizer_email: ev.organizer?.emailAddress?.address ?? null,
    organizer_name: ev.organizer?.emailAddress?.name ?? null,
    status: cancelled ? 'cancelled' : 'confirmed',
    is_all_day: isAllDay,
    raw_data: ev,
  };
}

function extractVideoLink(ev: MsEvent): string | null {
  if (ev.onlineMeeting?.joinUrl) return ev.onlineMeeting.joinUrl;
  const body: string = ev.body?.content ?? ev.bodyPreview ?? '';
  const match = body.match(/https?:\/\/[^\s"<>]*(zoom\.us|teams\.microsoft|meet\.google|webex)[^\s"<>]*/i);
  return match?.[0] ?? null;
}
