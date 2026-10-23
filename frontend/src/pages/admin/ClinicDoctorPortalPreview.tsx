import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock3,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { readClinicPrototypeState } from '@/lib/clinicPrototypeStore';

const scheduleSamples = [
  [
    { time: '09:00', code: 'APT-2031', patient: 'Patient A', service: 'GP consultation', status: 'Confirmed' },
    { time: '10:30', code: 'APT-2040', patient: 'Patient B', service: 'Family medicine', status: 'Checked in' },
    { time: '13:00', code: 'APT-2054', patient: 'Patient C', service: 'Wellness check', status: 'Confirmed' },
  ],
  [
    { time: '09:30', code: 'APT-2036', patient: 'Patient D', service: 'Wellness check', status: 'Confirmed' },
    { time: '11:00', code: 'APT-2048', patient: 'Patient E', service: 'GP consultation', status: 'Confirmed' },
  ],
];

const upcomingSamples = [
  { date: 'Monday, 26 October', time: '09:00', patient: 'Patient F', service: 'GP consultation' },
  { date: 'Monday, 26 October', time: '11:30', patient: 'Patient G', service: 'Family medicine' },
];

const ClinicDoctorPortalPreview = () => {
  const { clinicId = '', doctorId = '' } = useParams();
  const [state] = useState(() => readClinicPrototypeState());
  const clinic = useMemo(() => state.applications.find((item) => item.id === clinicId), [state, clinicId]);
  const doctorIndex = Number(doctorId.match(/^doctor-(\d+)-/)?.[1]);
  const doctorName = Number.isInteger(doctorIndex) ? clinic?.practitioners[doctorIndex] : undefined;
  const todayBookings = scheduleSamples[doctorIndex % scheduleSamples.length] || scheduleSamples[0];

  if (!clinic || !doctorName) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <Card className="mx-auto max-w-lg border-slate-200">
          <CardHeader><CardTitle>Doctor portal preview not found</CardTitle><CardDescription>Return to the clinic workspace and choose a linked practitioner.</CardDescription></CardHeader>
          <CardContent><Button asChild><Link to={'/admin/clinics/workspace/' + clinicId}>Return to clinic workspace</Link></Button></CardContent>
        </Card>
      </main>
    );
  }

  const bookingsThisWeek = todayBookings.length + upcomingSamples.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" aria-label="Back to clinic workspace"><Link to={'/admin/clinics/workspace/' + clinic.id}><ArrowLeft className="h-4 w-4" /></Link></Button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><Stethoscope className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">Doctor portal</p><p className="truncate text-xs text-slate-500">{clinic.clinicName}</p></div>
          </div>
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Demo doctor view</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex flex-wrap gap-2"><Badge className="bg-blue-100 text-blue-800">Individual practitioner view</Badge><Badge variant="outline">{clinic.facilityName}</Badge></div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Good morning, {doctorName}</h1>
            <p className="mt-1 text-sm text-slate-600">Your own appointments, schedule, and practitioner profile.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><ShieldCheck className="h-4 w-4 shrink-0" />Demo only · no real patient information</div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Doctor access details are to be confirmed.</strong> This preview demonstrates an individual doctor's view. The real sign-in method, invitation process, and permissions still need agreement.</p></div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard icon={CalendarDays} label="Today's appointments" value={String(todayBookings.length)} />
          <SummaryCard icon={Clock3} label="Next appointment" value={todayBookings[0]?.time || 'No appointments'} />
          <SummaryCard icon={CheckCircle2} label="Bookings this week" value={String(bookingsThisWeek)} />
        </div>

        <Tabs defaultValue="today" className="space-y-5">
          <TabsList className="h-auto rounded-xl border border-slate-200 bg-white p-1">
            <TabsTrigger value="today">Today's schedule</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="profile">My profile</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            <div><h2 className="text-lg font-semibold text-slate-900">Friday, 23 October</h2><p className="mt-1 text-sm text-slate-600">Appointments assigned to {doctorName}.</p></div>
            <div className="space-y-3">
              {todayBookings.map((booking) => <AppointmentCard key={booking.code} time={booking.time} code={booking.code} patient={booking.patient} service={booking.service} status={booking.status} />)}
            </div>
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            <div><h2 className="text-lg font-semibold text-slate-900">Upcoming appointments</h2><p className="mt-1 text-sm text-slate-600">Only appointments assigned to this doctor appear here.</p></div>
            <div className="space-y-3">
              {upcomingSamples.slice(doctorIndex % upcomingSamples.length).concat(upcomingSamples.slice(0, doctorIndex % upcomingSamples.length)).map((booking) => (
                <Card key={`${booking.date}-${booking.time}`} className="border-slate-200 shadow-sm"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CalendarDays className="h-5 w-5" /></div><div><p className="font-semibold text-slate-900">{booking.date} · {booking.time}</p><p className="mt-1 text-sm text-slate-600">{booking.service} · {booking.patient}</p></div></div><Badge variant="outline" className="w-fit border-blue-200 bg-blue-50 text-blue-800">Scheduled</Badge></CardContent></Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="max-w-2xl border-slate-200 shadow-sm">
              <CardHeader><CardTitle className="text-base">Practitioner profile</CardTitle><CardDescription>Your clinic-linked information shown to patients</CardDescription></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Detail label="Doctor" value={doctorName} />
                <Detail label="Organisation" value={clinic.clinicName} />
                <Detail label="Facility" value={clinic.facilityName} />
                <Detail label="Services" value={clinic.services.join(', ')} />
                <div className="sm:col-span-2"><Detail label="Access permissions" value="Individual appointments and schedule · final permissions to be agreed" /></div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {clinic.practitioners.length > 1 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Other doctor previews</CardTitle><CardDescription>Switch views to demonstrate that each practitioner has a separate portal.</CardDescription></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {clinic.practitioners.map((name, index) => {
                const id = `doctor-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
                return <Button key={id} asChild variant={index === doctorIndex ? 'default' : 'outline'} size="sm"><Link to={`/admin/clinics/workspace/${clinic.id}/doctors/${id}`}><UserRound className="mr-2 h-4 w-4" />{name}</Link></Button>;
              })}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-slate-500">Appointments and patient labels above are fictional demo data. This preview does not sign in a real doctor or connect to live bookings.</p>
      </main>
    </div>
  );
};

function SummaryCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return <Card className="border-slate-200 shadow-sm"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></div><div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-slate-900">{value}</p></div></CardContent></Card>;
}

function AppointmentCard({ time, code, patient, service, status }: { time: string; code: string; patient: string; service: string; status: string }) {
  return <Card className="border-slate-200 shadow-sm"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-700">{time}</div><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{service}</p><p className="mt-1 text-sm text-slate-600">{patient} · {code}</p></div></div><Badge variant="outline" className={status === 'Checked in' ? 'w-fit border-emerald-200 bg-emerald-50 text-emerald-800' : 'w-fit border-blue-200 bg-blue-50 text-blue-800'}>{status}</Badge></CardContent></Card>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2.5"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-sm text-slate-900">{value || 'Not provided'}</p></div>;
}

export default ClinicDoctorPortalPreview;
