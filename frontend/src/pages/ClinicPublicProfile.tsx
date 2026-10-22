import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Globe2, MapPin, Phone, ShieldCheck, Stethoscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { readClinicPrototypeState } from '@/lib/clinicPrototypeStore';

const ClinicPublicProfile = () => {
  const { slug = '' } = useParams();
  const [state] = useState(() => readClinicPrototypeState());
  const clinic = useMemo(() => state.applications.find((item) => item.slug === slug && item.status === 'active'), [state, slug]);

  if (!clinic) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <Card className="mx-auto max-w-lg border-slate-200">
          <CardHeader><CardTitle>Profile not available</CardTitle><CardDescription>This clinic profile has not been approved for public viewing.</CardDescription></CardHeader>
          <CardContent><Button asChild variant="outline"><Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to MedMap</Link></Button></CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6"><Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-800"><ArrowLeft className="h-4 w-4" />MedMap</Link><Badge className="bg-emerald-100 text-emerald-800"><ShieldCheck className="mr-1 h-3 w-3" />Verified organisation</Badge></div></header>
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:py-10">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm"><Building2 className="h-7 w-7" /></div><div><Badge className="mb-2 bg-blue-100 text-blue-800">{clinic.type === 'clinic' ? 'Private clinic' : 'Private hospital'}</Badge><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{clinic.clinicName}</h1><p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="h-4 w-4" />{clinic.facilityName} · {clinic.city}, {clinic.province}</p></div></div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Public profile prototype</div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-[1fr_0.75fr]">
          <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">About this organisation</CardTitle><CardDescription>Information provided by the clinic</CardDescription></CardHeader><CardContent className="space-y-5"><div><h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"><Stethoscope className="h-4 w-4 text-blue-600" />Services and departments</h2><div className="flex flex-wrap gap-2">{[...clinic.departments, ...clinic.services].map((item) => <Badge key={item} variant="secondary" className="font-normal">{item}</Badge>)}</div>{!clinic.departments.length && !clinic.services.length && <p className="text-sm text-slate-500">Contact the clinic for information about its services.</p>}</div><div><h2 className="mb-2 text-sm font-semibold text-slate-900">Practitioners</h2>{clinic.practitioners.length ? <ul className="space-y-2">{clinic.practitioners.map((name) => <li key={name} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{name}</li>)}</ul> : <p className="text-sm text-slate-500">Practitioner information has not been added.</p>}</div></CardContent></Card>
          <Card className="h-fit border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">Contact and location</CardTitle><CardDescription>{clinic.facilityName}</CardDescription></CardHeader><CardContent className="space-y-4"><p className="flex items-start gap-2 text-sm text-slate-700"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />{clinic.address}, {clinic.city}, {clinic.province}</p>{clinic.phone && <p className="flex items-center gap-2 text-sm text-slate-700"><Phone className="h-4 w-4 text-blue-600" />{clinic.phone}</p>}{clinic.website && <a href={clinic.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-700 hover:underline"><Globe2 className="h-4 w-4" />Visit organisation website</a>}<p className="border-t border-slate-100 pt-3 text-xs text-slate-500">Appointment booking and live clinic contact actions can be connected in a later phase.</p></CardContent></Card>
        </div>
        <p className="text-center text-xs text-slate-500">Organisation profile published on MedMap after admin approval.</p>
      </main>
    </div>
  );
};

export default ClinicPublicProfile;
