import { createServiceSupabase } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.NOTIFICATION_FROM_EMAIL ?? 'calendar@callcatchai.online';
const RECIPIENT = process.env.NOTIFICATION_TO_EMAIL ?? '';

export async function checkAndSendNotifications() {
  if (!RECIPIENT) return;
  const db = createServiceSupabase();
  const now = new Date();

  const windows = [
    { type: '24h', from: addMinutes(now, 23 * 60), to: addMinutes(now, 25 * 60) },
    { type: '15min', from: addMinutes(now, 10), to: addMinutes(now, 20) },
  ];

  for (const { type, from, to } of windows) {
    const { data: events } = await db
      .from('events')
      .select('*')
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())
      .neq('status', 'cancelled')
      .eq('is_all_day', false);

    for (const event of events ?? []) {
      const { data: sent } = await db
        .from('notifications')
        .select('id')
        .eq('event_id', event.id)
        .eq('notification_type', type)
        .single();
      if (sent) continue;

      try {
        await sendEmail(event, type);
        await db.from('notifications').insert({
          event_id: event.id,
          notification_type: type,
          sent_at: new Date().toISOString(),
          recipient_email: RECIPIENT,
          status: 'sent',
        });
      } catch (err: any) {
        await db.from('notifications').insert({
          event_id: event.id,
          notification_type: type,
          sent_at: new Date().toISOString(),
          recipient_email: RECIPIENT,
          status: 'failed',
          error_message: err.message,
        });
      }
    }
  }
}

async function sendEmail(event: any, type: string) {
  const label = type === '24h' ? 'Tomorrow' : 'In 15 minutes';
  const start = new Date(event.start_time);
  const timeStr = start.toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  const attendeesList = (event.attendees ?? [])
    .map((a: any) => `<span style="display:inline-block;background:#1e293b;color:#94a3b8;padding:2px 8px;border-radius:12px;font-size:13px;margin:2px">${a.name ?? a.email}</span>`)
    .join(' ');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:560px;margin:40px auto;background:#1e293b;border-radius:12px;overflow:hidden">
  <div style="background:#0ea5e9;padding:24px 32px">
    <p style="margin:0;color:#e0f2fe;font-size:13px;text-transform:uppercase;letter-spacing:1px">${label}</p>
    <h1 style="margin:8px 0 0;color:#fff;font-size:22px;line-height:1.3">${event.title}</h1>
  </div>
  <div style="padding:24px 32px">
    <p style="margin:0 0 16px;color:#94a3b8;font-size:15px">📅 ${timeStr}</p>
    ${event.location ? `<p style="margin:0 0 16px;color:#94a3b8;font-size:15px">📍 ${event.location}</p>` : ''}
    ${event.video_link ? `<a href="${event.video_link}" style="display:inline-block;background:#22c55e;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:16px">Join Meeting →</a>` : ''}
    ${attendeesList ? `<div style="margin:16px 0"><p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px">Attendees</p>${attendeesList}</div>` : ''}
    ${event.description ? `<div style="margin:16px 0;padding:16px;background:#0f172a;border-radius:8px;color:#94a3b8;font-size:14px;line-height:1.6">${event.description.substring(0, 500)}</div>` : ''}
  </div>
</div>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to: RECIPIENT,
    subject: `[${label}] ${event.title}`,
    html,
  });
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}
