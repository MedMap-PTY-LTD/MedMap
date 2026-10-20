type DoctorVisibilityRecord = Record<string, unknown> & {
  profiles?: { first_name?: unknown; last_name?: unknown } | null;
};

const TEST_PROFILE_FLAG_KEYS = [
  'isTest',
  'isTestAccount',
  'isTestProfile',
  'isTestDoctor',
  'isDemo',
  'isSample',
] as const;

const TEST_OR_PLACEHOLDER_NAME = /\b(?:test|demo|fake|ghost|sample|placeholder)\b/i;
const GENERIC_DOCTOR_NAME = /^(?:dr\.?\s*)?(?:doctor|unknown doctor|medical practice)$/i;

export function isPublicDoctorProfile(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const doctor = value as DoctorVisibilityRecord;
  const verified = doctor.verificationStatus === 'verified' || doctor.verified === true;
  if (!verified || TEST_PROFILE_FLAG_KEYS.some((key) => doctor[key] === true)) return false;

  const profiles = doctor.profiles;
  const candidates = [
    doctor.fullName,
    doctor.full_name,
    doctor.name,
    [doctor.firstName, doctor.lastName].filter(Boolean).join(' '),
    [doctor.first_name, doctor.last_name].filter(Boolean).join(' '),
    [profiles?.first_name, profiles?.last_name].filter(Boolean).join(' '),
  ].filter((name): name is string => typeof name === 'string' && name.trim().length > 0);

  const hasRealName = candidates.some((name) => {
    const normalizedName = name.trim();
    return !GENERIC_DOCTOR_NAME.test(normalizedName) && !TEST_OR_PLACEHOLDER_NAME.test(normalizedName);
  });
  const email = typeof doctor.email === 'string' ? doctor.email : '';

  return hasRealName && !TEST_OR_PLACEHOLDER_NAME.test(email);
}
