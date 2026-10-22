export type ClinicType = 'clinic' | 'hospital';
export type ClinicStatus = 'draft' | 'pending_review' | 'changes_requested' | 'active' | 'rejected';

export interface ClinicApplication {
  id: string;
  slug: string;
  clinicName: string;
  type: ClinicType;
  registrationNumber: string;
  primaryAdmin: string;
  contactEmail: string;
  phone: string;
  website: string;
  facilityName: string;
  address: string;
  city: string;
  province: string;
  departments: string[];
  services: string[];
  practitioners: string[];
  status: ClinicStatus;
  submittedAt: string;
  approvedAt?: string;
  reviewNote?: string;
}

export interface ClinicInvitation {
  id: string;
  clinicName: string;
  contactName: string;
  email: string;
  invitedAt: string;
  status: 'sent' | 'started' | 'submitted';
  applicationId?: string;
}

export interface ClinicPrototypeState {
  applications: ClinicApplication[];
  invitations: ClinicInvitation[];
}

const STORAGE_KEY = 'medmap-clinic-prototype-v1';

const initialDemoState: ClinicPrototypeState = {
  applications: [
    {
      id: 'demo-harbourview',
      slug: 'harbourview-family-clinic',
      clinicName: 'Harbourview Family Clinic',
      type: 'clinic',
      registrationNumber: 'DEMO-2026-001',
      primaryAdmin: 'Taylor Morgan',
      contactEmail: 'clinic.admin@harbourview.example',
      phone: '010 000 0101',
      website: '',
      facilityName: 'Harbourview Main Clinic',
      address: '10 Example Road',
      city: 'Johannesburg',
      province: 'Gauteng',
      departments: ['General practice', 'Family medicine'],
      services: ['GP consultation', 'Wellness check'],
      practitioners: ['Dr Alex Example', 'Dr Sam Example'],
      status: 'pending_review',
      submittedAt: '2026-10-22T08:30:00.000Z',
    },
  ],
  invitations: [
    {
      id: 'demo-invitation-harbourview',
      clinicName: 'Harbourview Family Clinic',
      contactName: 'Taylor Morgan',
      email: 'clinic.admin@harbourview.example',
      invitedAt: '2026-10-21T09:00:00.000Z',
      status: 'submitted',
      applicationId: 'demo-harbourview',
    },
  ],
};

function copyState(state: ClinicPrototypeState): ClinicPrototypeState {
  return JSON.parse(JSON.stringify(state)) as ClinicPrototypeState;
}

export function readClinicPrototypeState(): ClinicPrototypeState {
  if (typeof window === 'undefined') return copyState(initialDemoState);

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ClinicPrototypeState;
      if (Array.isArray(parsed.applications) && Array.isArray(parsed.invitations)) {
        return parsed;
      }
    }
  } catch {
    // Use the demo seed if browser storage is unavailable or contains invalid data.
  }

  const seed = copyState(initialDemoState);
  writeClinicPrototypeState(seed);
  return seed;
}

export function writeClinicPrototypeState(state: ClinicPrototypeState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetClinicPrototypeState(): ClinicPrototypeState {
  const seed = copyState(initialDemoState);
  writeClinicPrototypeState(seed);
  return seed;
}

export function createClinicId(prefix: string): string {
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 12);
  return prefix + '-' + randomId;
}

export function slugifyClinicName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function splitClinicList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
