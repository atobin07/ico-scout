import { cookies } from 'next/headers';

/** True when the ops-console passcode cookie matches ADMIN_PASSCODE. */
export function isOpsAuthed(): boolean {
  const pass = cookies().get('ccops')?.value;
  return Boolean(process.env.ADMIN_PASSCODE && pass === process.env.ADMIN_PASSCODE);
}
