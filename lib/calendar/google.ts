import { google, type Auth } from 'googleapis';

type OAuth2Client = Auth.OAuth2Client;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/calendar/google/callback`;

export function getOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function buildAuthUrl(state: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    state,
  });
}

export async function exchangeCode(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();

  return { tokens, email: data.email!, name: data.name ?? data.email! };
}

export async function refreshCredentials(refreshToken: string) {
  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

export function buildClient(accessToken: string, refreshToken: string) {
  const client = getOAuth2Client();
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return client;
}

export async function listCalendars(auth: OAuth2Client) {
  const cal = google.calendar({ version: 'v3', auth });
  const res = await cal.calendarList.list();
  return (res.data.items ?? []).map((c) => ({ id: c.id!, name: c.summary ?? c.id! }));
}

export async function fetchEvents(
  auth: OAuth2Client,
  calendarId: string,
  syncToken?: string,
): Promise<{ events: GoogleEvent[]; nextSyncToken: string | null }> {
  const cal = google.calendar({ version: 'v3', auth });
  const params: any = { calendarId, singleEvents: true };
  if (syncToken) {
    params.syncToken = syncToken;
  } else {
    params.timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    params.timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  }

  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  do {
    if (pageToken) params.pageToken = pageToken;
    const res = await cal.events.list(params);
    events.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
    nextSyncToken = res.data.nextSyncToken ?? null;
  } while (pageToken);

  return { events, nextSyncToken };
}

export async function createBusyBlock(
  auth: OAuth2Client,
  calendarId: string,
  title: string,
  start: string,
  end: string,
): Promise<string> {
  const cal = google.calendar({ version: 'v3', auth });
  const res = await cal.events.insert({
    calendarId,
    requestBody: {
      summary: `Busy (blocked by ${title})`,
      start: { dateTime: start },
      end: { dateTime: end },
      status: 'opaque',
      visibility: 'private',
    },
  });
  return res.data.id!;
}

export async function deleteBusyBlock(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const cal = google.calendar({ version: 'v3', auth });
  await cal.events.delete({ calendarId, eventId }).catch(() => {});
}

export type GoogleEvent = any;

export function normalizeEvent(ev: GoogleEvent, accountId: string, calendarId: string) {
  const cancelled = ev.status === 'cancelled';
  const isAllDay = !ev.start?.dateTime;
  const start = ev.start?.dateTime ?? ev.start?.date ?? null;
  const end = ev.end?.dateTime ?? ev.end?.date ?? null;
  const attendees = (ev.attendees ?? []).map((a: any) => ({
    email: a.email,
    name: a.displayName ?? a.email,
    responseStatus: a.responseStatus,
  }));
  const videoLink = extractVideoLink(ev);

  return {
    source_account_id: accountId,
    source_calendar_id: calendarId,
    source_event_id: ev.id,
    title: ev.summary ?? '(No title)',
    description: ev.description ?? null,
    location: ev.location ?? null,
    start_time: start,
    end_time: end,
    attendees,
    video_link: videoLink,
    organizer_email: ev.organizer?.email ?? null,
    organizer_name: ev.organizer?.displayName ?? null,
    status: cancelled ? 'cancelled' : (ev.status ?? 'confirmed'),
    is_all_day: isAllDay,
    raw_data: ev,
  };
}

function extractVideoLink(ev: GoogleEvent): string | null {
  if (ev.conferenceData?.entryPoints) {
    const video = ev.conferenceData.entryPoints.find((e: any) => e.entryPointType === 'video');
    if (video?.uri) return video.uri;
  }
  const desc: string = ev.description ?? '';
  const match = desc.match(/https?:\/\/[^\s"<>]*(zoom\.us|teams\.microsoft|meet\.google|webex)[^\s"<>]*/i);
  return match?.[0] ?? null;
}
