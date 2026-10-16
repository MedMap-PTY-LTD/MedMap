export function hasPaidMembershipAccess(
  status: unknown,
  paidThrough: unknown,
  gracePeriodEnd?: unknown,
  now = Date.now(),
): boolean {
  const paidThroughTime = typeof paidThrough === 'string' ? Date.parse(paidThrough) : NaN;
  if (!Number.isFinite(paidThroughTime)) return false;
  if (status === 'active') return paidThroughTime > now;
  if (status !== 'past_due') return false;
  const graceEndTime = typeof gracePeriodEnd === 'string' ? Date.parse(gracePeriodEnd) : NaN;
  return Number.isFinite(graceEndTime) ? graceEndTime > now : paidThroughTime > now;
}
