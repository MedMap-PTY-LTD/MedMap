export function hasPaidMembershipAccess(data: Record<string, any> | undefined, now = Date.now()): boolean {
  if (!data || !['active', 'past_due'].includes(String(data.status))) return false;
  const paidThrough = Date.parse(data.currentPeriodEnd || '');
  if (!Number.isFinite(paidThrough)) return false;
  if (data.status === 'active') return paidThrough > now;
  const graceEnd = Date.parse(data.gracePeriodEnd || '');
  return Number.isFinite(graceEnd) ? graceEnd > now : paidThrough > now;
}

export function membershipGraceWindow(data: Record<string, any>, now = Date.now()) {
  const storedStart = Date.parse(data.gracePeriodStart || '');
  const periodEnd = Date.parse(data.currentPeriodEnd || '');
  const start = Number.isFinite(storedStart) ? storedStart : Math.max(Number.isFinite(periodEnd) ? periodEnd : now, now);
  const storedEnd = Date.parse(data.gracePeriodEnd || '');
  return {
    start: new Date(start).toISOString(),
    end: new Date(Number.isFinite(storedEnd) ? storedEnd : start + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function southAfricanRunDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (!Number.isFinite(date.getTime())) throw new Error('Membership renewal date is invalid');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
