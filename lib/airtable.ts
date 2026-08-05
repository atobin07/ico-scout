import 'server-only';

/**
 * Optional Airtable sync for leads. If AIRTABLE_TOKEN + AIRTABLE_BASE_ID are
 * set, every quote/onboarding submission is mirrored into an Airtable table so
 * you can work leads in a friendly spreadsheet UI. Best-effort: if it's not
 * configured or the call fails, we log and move on — Supabase remains the
 * source of truth, so a lead is never lost to an Airtable hiccup.
 *
 * Set up (see the Leads base you create in Airtable):
 *   AIRTABLE_TOKEN        Personal Access Token with data.records:write on the base
 *   AIRTABLE_BASE_ID      starts with "app…"
 *   AIRTABLE_LEADS_TABLE  table name (defaults to "Leads")
 *
 * The table must have these columns (exact names): Name, Business, Email,
 * Phone, Trade, Type, Notes, Status.
 */

export interface AirtableLead {
  name?: string | null;
  businessName?: string | null;
  email?: string | null;
  phone?: string | null;
  trade?: string | null;
  type: 'quote' | 'onboarding';
  notes?: string | null;
}

const API = 'https://api.airtable.com/v0';

export function airtableConfigured(): boolean {
  return Boolean(process.env.AIRTABLE_TOKEN && process.env.AIRTABLE_BASE_ID);
}

export async function pushLeadToAirtable(lead: AirtableLead): Promise<boolean> {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_LEADS_TABLE || 'Leads';
  if (!token || !baseId) return false; // not configured — skip silently

  try {
    const res = await fetch(`${API}/${baseId}/${encodeURIComponent(table)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // typecast lets Airtable coerce values and create the "New" Status option.
      body: JSON.stringify({
        typecast: true,
        records: [
          {
            fields: {
              Name: lead.name ?? '',
              Business: lead.businessName ?? '',
              Email: lead.email ?? '',
              Phone: lead.phone ?? '',
              Trade: lead.trade ?? '',
              Type: lead.type,
              Notes: lead.notes ?? '',
              Status: 'New',
            },
          },
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[airtable] push failed ${res.status}: ${text.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[airtable] push error:', err);
    return false;
  }
}
