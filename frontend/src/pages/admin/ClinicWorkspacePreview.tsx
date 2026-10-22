import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { readClinicPrototypeState } from '@/lib/clinicPrototypeStore';

const ClinicWorkspacePreview = () => {
  const { clinicId = '' } = useParams();
  const [state] = useState(() => readClinicPrototypeState());
  const clinic = useMemo(() => state.applications.find((item) => item.id === clinicId), [state, clinicId]);

  if (!clinic) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <Card className="mx-auto max-w-lg border-slate-200">
          <CardHeader><CardTitle>Clinic workspace not found</CardTitle><CardDescription>The clinic may have been removed from this browser's demo data.</CardDescription></CardHeader>
          <CardContent><Button asChild><Link to="/admin/clinics">Return to clinic management</Link></Button></CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" aria-label="Back to clinic management"><Link to="/admin/clinics"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Building2 className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{clinic.clinicName}</p><p className="text-xs text-slate-500">Clinic workspace preview</p></div>
          </div>
          {clinic.status === 'active' && <Button asChild size="sm" variant="outline"><Link to={'/clinics/' + clinic.slug}>Public profile <ExternalLink className="ml-2 h-4 w-4" /></Link></Button>}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex flex-wrap gap-2"><Badge className="bg-blue-100 text-blue-800">Clinic-side view</Badge><Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Demo only</Badge></div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Welcome, {clinic.primaryAdmin}</h1>
            <p className="mt-1 text-sm text-slate-600">Manage the information your organisation shares on MedMap.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><ShieldCheck className="h-4 w-4 shrink-0" />Prototype data is saved in this browser only</div>
        </div>

        {clinic.status !== 'active' && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Profile not public yet.</strong> {clinic.status === 'pending_review' ? 'MedMap is reviewing the submitted organisation details.' : 'Complete the setup and submit it for MedMap approval before it can be published.'}</p></div>}
        {clinic.status === 'active' && <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="h-5 w-5 shrink-0" /><p><strong>Your organisation is live.</strong> Its approved profile can now be viewed by patients.</p></div>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={Building2} label="Organisation" value={clinic.type === 'clinic' ? 'Private clinic' : 'Private hospital'} />
          <SummaryCard icon={MapPin} label="Main location" value={`${clinic.city}, ${clinic.province}`} />
          <SummaryCard icon={Stethoscope} label="Services listed" value={String(clinic.services.length)} />
          <SummaryCard icon={Users} label="Practitioners linked" value={String(clinic.practitioners.length)} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="text-base">Organisation profile</CardTitle><CardDescription>Details entered by the clinic team</CardDescription></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Detail label="Registered name" value={clinic.clinicName} />
              <Detail label="Registration number" value={clinic.registrationNumber} />
              <Detail label="Facility" value={clinic.facilityName} />
              <Detail label="Contact email" value={clinic.contactEmail} />
              <Detail label="Contact number" value={clinic.phone} />
              <Detail label="Website" value={clinic.website} />
              <div className="sm:col-span-2"><Detail label="Address" value={`${clinic.address}, ${clinic.city}, ${clinic.province}`} /></div>
            </CardContent>
          </Card>
          <div className="space-y-5">
            <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">Services and departments</CardTitle></CardHeader><CardContent className="space-y-4"><List label="Departments" items={clinic.departments} /><List label="Services" items={clinic.services} /></CardContent></Card>
            <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">Practitioner links</CardTitle><CardDescription>Practitioner names shown in this prototype</CardDescription></CardHeader><CardContent><List label="Practitioners" items={clinic.practitioners} /></CardContent></Card>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500">The live workspace can grow to support more branches, staff roles, and clinic operations.</p>
      </main>
    </div>
  );
};

function SummaryCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return <Card className="border-slate-200 shadow-sm"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className="truncate font-semibold text-slate-900">{value || 'Not provided'}</p></div></CardContent></Card>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2.5"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-sm text-slate-900">{value || 'Not provided'}</p></div>;
}

function List({ label, items }: { label: string; items: string[] }) {
  return <div><p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>{items.length ? <div className="flex flex-wrap gap-2">{items.map((item) => <Badge key={item} variant="secondary" className="font-normal">{item}</Badge>)}</div> : <p className="text-sm text-slate-500">None added yet</p>}</div>;
}

export default ClinicWorkspacePreview;
