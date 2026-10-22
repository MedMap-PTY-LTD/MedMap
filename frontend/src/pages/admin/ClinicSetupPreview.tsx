import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CheckCircle2, Info, Save, Send, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  ClinicApplication,
  ClinicInvitation,
  ClinicPrototypeState,
  createClinicId,
  readClinicPrototypeState,
  slugifyClinicName,
  splitClinicList,
  writeClinicPrototypeState,
} from '@/lib/clinicPrototypeStore';

interface ClinicSetupForm {
  clinicName: string;
  type: 'clinic' | 'hospital';
  registrationNumber: string;
  primaryAdmin: string;
  contactEmail: string;
  phone: string;
  website: string;
  facilityName: string;
  address: string;
  city: string;
  province: string;
  departments: string;
  services: string;
  practitioners: string;
}

const emptyForm: ClinicSetupForm = {
  clinicName: '',
  type: 'clinic',
  registrationNumber: '',
  primaryAdmin: '',
  contactEmail: '',
  phone: '',
  website: '',
  facilityName: '',
  address: '',
  city: '',
  province: '',
  departments: '',
  services: '',
  practitioners: '',
};

function formFromRecords(
  invitation?: ClinicInvitation,
  application?: ClinicApplication
): ClinicSetupForm {
  if (application) {
    return {
      clinicName: application.clinicName,
      type: application.type,
      registrationNumber: application.registrationNumber,
      primaryAdmin: application.primaryAdmin,
      contactEmail: application.contactEmail,
      phone: application.phone,
      website: application.website,
      facilityName: application.facilityName,
      address: application.address,
      city: application.city,
      province: application.province,
      departments: application.departments.join(', '),
      services: application.services.join(', '),
      practitioners: application.practitioners.join(', '),
    };
  }

  return {
    ...emptyForm,
    clinicName: invitation?.clinicName || '',
    primaryAdmin: invitation?.contactName || '',
    contactEmail: invitation?.email || '',
    facilityName: invitation?.clinicName || '',
  };
}

const ClinicSetupPreview = () => {
  const { inviteId = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [state, setState] = useState<ClinicPrototypeState>(() => readClinicPrototypeState());
  const [form, setForm] = useState<ClinicSetupForm>(emptyForm);

  const invitation = state.invitations.find((item) => item.id === inviteId);
  const application = state.applications.find((item) => item.id === invitation?.applicationId);

  useEffect(() => {
    const latestState = readClinicPrototypeState();
    const latestInvitation = latestState.invitations.find((item) => item.id === inviteId);
    const latestApplication = latestState.applications.find((item) => item.id === latestInvitation?.applicationId);
    setState(latestState);
    setForm(formFromRecords(latestInvitation, latestApplication));
  }, [inviteId]);

  const saveForm = (status: 'draft' | 'pending_review') => {
    const currentState = readClinicPrototypeState();
    const currentInvitation = currentState.invitations.find((item) => item.id === inviteId);
    if (!currentInvitation) {
      toast({ title: 'Invitation not found', description: 'Return to the admin workspace and create a demo invitation.', variant: 'destructive' });
      return;
    }

    const existingApplication = currentState.applications.find((item) => item.id === currentInvitation.applicationId);
    const now = new Date().toISOString();
    const nextApplication: ClinicApplication = {
      id: existingApplication?.id || createClinicId('clinic-application'),
      slug: slugifyClinicName(form.clinicName) || 'clinic-profile',
      clinicName: form.clinicName.trim(),
      type: form.type,
      registrationNumber: form.registrationNumber.trim(),
      primaryAdmin: form.primaryAdmin.trim(),
      contactEmail: form.contactEmail.trim(),
      phone: form.phone.trim(),
      website: form.website.trim(),
      facilityName: form.facilityName.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      province: form.province.trim(),
      departments: splitClinicList(form.departments),
      services: splitClinicList(form.services),
      practitioners: splitClinicList(form.practitioners),
      status,
      submittedAt: status === 'pending_review' ? now : (existingApplication?.submittedAt || now),
      ...(existingApplication?.approvedAt ? { approvedAt: existingApplication.approvedAt } : {}),
    };

    const nextState: ClinicPrototypeState = {
      applications: existingApplication
        ? currentState.applications.map((item) => item.id === existingApplication.id ? nextApplication : item)
        : [nextApplication, ...currentState.applications],
      invitations: currentState.invitations.map((item) => (
        item.id === currentInvitation.id
          ? { ...item, status: status === 'pending_review' ? 'submitted' : 'started', applicationId: nextApplication.id }
          : item
      )),
    };

    writeClinicPrototypeState(nextState);
    setState(nextState);
    if (status === 'pending_review') {
      toast({ title: 'Setup submitted', description: 'The clinic is now waiting for MedMap admin review.' });
      navigate('/admin/clinics?tab=applications');
    } else {
      toast({ title: 'Draft saved', description: 'The clinic can continue setup before submitting it for review.' });
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.clinicName.trim() || !form.registrationNumber.trim() || !form.primaryAdmin.trim()
      || !form.contactEmail.trim() || !form.facilityName.trim() || !form.address.trim()
      || !form.city.trim() || !form.province.trim()) {
      toast({
        title: 'Complete the required fields',
        description: 'Add the organisation, registration, administrator, and facility details before submitting.',
        variant: 'destructive',
      });
      return;
    }
    saveForm('pending_review');
  };

  const update = (field: keyof ClinicSetupForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  if (!invitation) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <Card className="mx-auto max-w-lg border-slate-200">
          <CardHeader>
            <CardTitle>Invitation not found</CardTitle>
            <CardDescription>This demo invitation may have been reset.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link to="/admin/clinics">Return to clinic management</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button asChild variant="ghost" size="icon" aria-label="Back to clinic management">
            <Link to="/admin/clinics"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Clinic setup</p>
            <p className="text-xs text-slate-500">Clinic-side invitation preview</p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge className="bg-blue-100 text-blue-800">Clinic setup preview</Badge>
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Demo only</Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Set up your organisation</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Add your clinic details, facility information, services, and practitioners. You can save a draft and submit it to MedMap for approval when ready.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white bg-white/80 px-3 py-2 text-xs text-slate-600">
              <ShieldCheck className="h-4 w-4 text-blue-700" />
              Only approved profiles are visible to patients
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This is a meeting prototype. Information is saved only in this browser; no account is created and no email or real clinic information is sent.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <SectionTitle number="01" title="Organisation details" text="Tell us about the clinic or hospital group." />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Organisation name" required>
                <Input value={form.clinicName} onChange={(event) => update('clinicName', event.target.value)} placeholder="Example Family Clinic" />
              </Field>
              <Field label="Organisation type" required>
                <select
                  value={form.type}
                  onChange={(event) => update('type', event.target.value as ClinicSetupForm['type'])}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="clinic">Private clinic</option>
                  <option value="hospital">Private hospital</option>
                </select>
              </Field>
              <Field label="Business / facility registration number" required>
                <Input value={form.registrationNumber} onChange={(event) => update('registrationNumber', event.target.value)} placeholder="Registration number" />
              </Field>
              <Field label="Organisation website">
                <Input type="url" value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="https://" />
              </Field>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <SectionTitle number="02" title="Administrator contact" text="This person manages the clinic's MedMap workspace." />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Administrator name" required>
                <Input value={form.primaryAdmin} onChange={(event) => update('primaryAdmin', event.target.value)} placeholder="Full name" />
              </Field>
              <Field label="Administrator email" required>
                <Input type="email" value={form.contactEmail} onChange={(event) => update('contactEmail', event.target.value)} placeholder="name@clinic.co.za" />
              </Field>
              <Field label="Contact number">
                <Input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+27" />
              </Field>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <SectionTitle number="03" title="Main facility" text="Start with one location. Additional branches can be added later." />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Facility name" required>
                <Input value={form.facilityName} onChange={(event) => update('facilityName', event.target.value)} placeholder="Main clinic" />
              </Field>
              <Field label="Street address" required>
                <Input value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="Street address" />
              </Field>
              <Field label="City" required>
                <Input value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="City" />
              </Field>
              <Field label="Province" required>
                <Input value={form.province} onChange={(event) => update('province', event.target.value)} placeholder="Province" />
              </Field>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <SectionTitle number="04" title="Services and practitioners" text="Use comma-separated entries in this prototype." />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Departments or specialties">
                <Textarea value={form.departments} onChange={(event) => update('departments', event.target.value)} placeholder="General practice, Paediatrics" rows={3} />
              </Field>
              <Field label="Services offered">
                <Textarea value={form.services} onChange={(event) => update('services', event.target.value)} placeholder="GP consultation, Wellness check" rows={3} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Practitioners to link">
                  <Textarea value={form.practitioners} onChange={(event) => update('practitioners', event.target.value)} placeholder="Dr Alex Example, Dr Sam Example" rows={2} />
                </Field>
                <p className="mt-1.5 text-xs text-slate-500">In the live version, practitioners will accept an invitation before being linked. This preview uses names only.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => saveForm('draft')}>
              <Save className="mr-2 h-4 w-4" />
              Save draft
            </Button>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button asChild type="button" variant="ghost">
                <Link to="/admin/clinics?tab=invitations">Back to admin demo</Link>
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Send className="mr-2 h-4 w-4" />
                Submit for MedMap approval
              </Button>
            </div>
          </div>
        </form>

        {application?.status === 'active' && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="flex items-center gap-3 p-4 text-emerald-900">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">This sample clinic is approved and live in the public profile preview.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

function SectionTitle({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">{number}</span>
      <div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="mt-1">{text}</CardDescription>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}{required ? ' *' : ''}</Label>
      {children}
    </div>
  );
}

export default ClinicSetupPreview;
