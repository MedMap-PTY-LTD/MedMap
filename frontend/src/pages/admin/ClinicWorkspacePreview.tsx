import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  Eye,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { readClinicPrototypeState, slugifyClinicName } from '@/lib/clinicPrototypeStore';

const demoBookingEvents = [
  { id: 'MM-4102', date: '23 Oct 2026', time: '09:00', doctorIndex: 0, service: 'GP consultation', status: 'Confirmed' },
  { id: 'MM-4097', date: '22 Oct 2026', time: '10:30', doctorIndex: 1, service: 'Wellness check', status: 'Confirmed' },
  { id: 'MM-4080', date: '21 Oct 2026', time: '11:15', doctorIndex: 0, service: 'Family medicine', status: 'Cancelled' },
  { id: 'MM-4054', date: '19 Oct 2026', time: '14:00', doctorIndex: 1, service: 'GP consultation', status: 'Completed' },
];

const ClinicWorkspacePreview = () => {
  const { clinicId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
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

  const clinicDoctors = clinic.practitioners.map((name, index) => ({ name, id: `doctor-${index}-${slugifyClinicName(name)}` }));
  const clinicInvitation = state.invitations.find((invitation) => invitation.applicationId === clinic.id);
  const bookingRows = demoBookingEvents.map((booking) => ({
    ...booking,
    doctorName: clinic.practitioners[booking.doctorIndex] || clinic.practitioners[0] || 'Unassigned practitioner',
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" aria-label="Back to clinic management"><Link to="/admin/clinics"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><Building2 className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{clinic.clinicName}</p><p className="text-xs text-slate-500">Clinic administrator workspace preview</p></div>
          </div>
          {clinic.status === 'active' && <Button asChild size="sm" variant="outline"><Link to={'/clinics/' + clinic.slug}>Public profile <ExternalLink className="ml-2 h-4 w-4" /></Link></Button>}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex flex-wrap gap-2"><Badge className="bg-blue-100 text-blue-800">Clinic administrator view</Badge><Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Demo only</Badge></div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Welcome, {clinic.primaryAdmin}</h1>
            <p className="mt-1 text-sm text-slate-600">Manage your organisation, practitioner access, and booking activity from one workspace.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><ShieldCheck className="h-4 w-4 shrink-0" />Demo information is saved in this browser only</div>
        </div>

        {clinic.status !== 'active' ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Profile not public yet.</strong> {clinic.status === 'pending_review' ? 'MedMap is reviewing the submitted organisation details.' : 'Complete the setup and submit it for MedMap approval before it can be published.'}</p></div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="h-5 w-5 shrink-0" /><p><strong>Your organisation is live.</strong> Its approved profile can now be viewed by patients.</p></div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={Building2} label="Organisation" value={clinic.type === 'clinic' ? 'Private clinic' : 'Private hospital'} />
          <SummaryCard icon={MapPin} label="Main location" value={`${clinic.city}, ${clinic.province}`} />
          <SummaryCard icon={Stethoscope} label="Services listed" value={String(clinic.services.length)} />
          <SummaryCard icon={Users} label="Linked practitioners" value={String(clinic.practitioners.length)} />
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setSearchParams(value === 'overview' ? {} : { tab: value })} className="space-y-5">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-auto min-w-full justify-start gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:min-w-0">
              <TabsTrigger value="overview">Organisation</TabsTrigger>
              <TabsTrigger value="doctors">Doctors & access</TabsTrigger>
              <TabsTrigger value="billing">Bookings & billing</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><CardTitle className="text-base">Organisation profile</CardTitle><CardDescription className="mt-1">Details managed by the clinic administrator</CardDescription></div>
                  {clinicInvitation && <Button asChild size="sm" variant="outline"><Link to={'/admin/clinics/setup/' + clinicInvitation.id}><Eye className="mr-2 h-4 w-4" />Preview clinic profile editor</Link></Button>}
                </CardHeader>
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
                <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">Services and departments</CardTitle><CardDescription>What patients can find on the clinic profile</CardDescription></CardHeader><CardContent className="space-y-4"><List label="Departments" items={clinic.departments} /><List label="Services" items={clinic.services} /></CardContent></Card>
                <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-blue-700" />Your team</CardTitle><CardDescription>Practitioners have individual portal views in this demo.</CardDescription></CardHeader>
                  <CardContent><Button variant="outline" onClick={() => navigate('/admin/clinics/workspace/' + clinic.id + '?tab=doctors')} className="w-full">Manage doctors & access</Button></CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="doctors" className="space-y-4">
            <SectionHeading title="Doctors & portal access" description="Each practitioner has a separate demo view showing their own schedule and appointments." />
            <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Access setup is still to be confirmed.</strong> The real account invitation, clinic linking, and permission model will be agreed before implementation. These buttons only preview separate doctor views.</p></div>
            {clinicDoctors.length === 0 ? (
              <EmptyState title="No practitioners linked yet" text="Add practitioner names in clinic setup to preview individual doctor portals." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {clinicDoctors.map((doctor, index) => (
                  <Card key={doctor.id} className="border-slate-200 shadow-sm">
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Stethoscope className="h-5 w-5" /></div>
                        <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{doctor.name}</p><p className="mt-1 text-sm text-slate-500">Individual practitioner view · Demo doctor {index + 1}</p><Badge variant="outline" className="mt-2 border-amber-300 bg-amber-50 text-amber-800">Access method TBD</Badge></div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/clinics/workspace/${clinic.id}/doctors/${doctor.id}`)}><Eye className="mr-2 h-4 w-4" />Preview portal</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="billing" className="space-y-5">
            <SectionHeading title="Booking usage & month-end billing" description="A sample view of booking activity MedMap could reconcile for the clinic each month." />
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Billing rules need agreement.</strong> The credit unit, which booking events count, cancellation handling, and price per credit are open clarifications. No amount on this demo is an invoice or a final rate.</p></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Sample booking events" value={String(bookingRows.length)} icon={CalendarDays} />
              <Metric label="Credit conversion" value="To be agreed" icon={Banknote} />
              <Metric label="Rate per credit" value="To be agreed" icon={CircleHelp} />
              <Metric label="Month-end total" value="Pending rules" icon={ReceiptText} />
            </div>
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardHeader><CardTitle className="text-base">Sample booking ledger</CardTitle><CardDescription>Example activity for October 2026. Credit and fee treatment is intentionally left undecided.</CardDescription></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Booking</th><th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Doctor</th><th className="px-5 py-3 font-medium">Service</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Credit treatment</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {bookingRows.map((booking) => (
                        <tr key={booking.id} className="text-slate-700"><td className="px-5 py-3 font-medium text-slate-900">{booking.id}</td><td className="px-5 py-3">{booking.date} · {booking.time}</td><td className="px-5 py-3">{booking.doctorName}</td><td className="px-5 py-3">{booking.service}</td><td className="px-5 py-3"><Badge variant="outline" className={booking.status === 'Cancelled' ? 'border-slate-300 text-slate-600' : 'border-blue-200 bg-blue-50 text-blue-800'}>{booking.status}</Badge></td><td className="px-5 py-3 text-slate-500">Rule to be agreed</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-3">
              <ProcessCard number="01" title="Record bookings" text="Track appointment events against the clinic and practitioner." />
              <ProcessCard number="02" title="Reconcile monthly" text="Apply the agreed credit and cancellation rules at month end." />
              <ProcessCard number="03" title="Issue statement" text="Send the clinic a usage statement and invoice for the agreed fees." />
            </div>
          </TabsContent>
        </Tabs>
        <p className="text-center text-xs text-slate-500">This is a meeting prototype. It uses sample data and does not create real doctor accounts, track live bookings, or issue invoices.</p>
      </main>
    </div>
  );
};

function SummaryCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return <Card className="border-slate-200 shadow-sm"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className="truncate font-semibold text-slate-900">{value || 'Not provided'}</p></div></CardContent></Card>;
}

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return <Card className="border-slate-200 shadow-sm"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></div><div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-slate-900">{value}</p></div></CardContent></Card>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2.5"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-sm text-slate-900">{value || 'Not provided'}</p></div>;
}

function List({ label, items }: { label: string; items: string[] }) {
  return <div><p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>{items.length ? <div className="flex flex-wrap gap-2">{items.map((item) => <Badge key={item} variant="secondary" className="font-normal">{item}</Badge>)}</div> : <p className="text-sm text-slate-500">None added yet</p>}</div>;
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div><h2 className="text-lg font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p></div>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <Card className="border-dashed border-slate-300 bg-white"><CardContent className="p-6 text-center"><p className="font-medium text-slate-900">{title}</p><p className="mt-1 text-sm text-slate-500">{text}</p></CardContent></Card>;
}

function ProcessCard({ number, title, text }: { number: string; title: string; text: string }) {
  return <Card className="border-slate-200 shadow-sm"><CardContent className="flex gap-3 p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">{number}</span><div><p className="font-semibold text-slate-900">{title}</p><p className="mt-1 text-sm text-slate-600">{text}</p></div></CardContent></Card>;
}

export default ClinicWorkspacePreview;
