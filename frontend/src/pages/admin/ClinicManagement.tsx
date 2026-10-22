import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  ClinicApplication,
  ClinicInvitation,
  ClinicPrototypeState,
  createClinicId,
  readClinicPrototypeState,
  resetClinicPrototypeState,
  writeClinicPrototypeState,
} from '@/lib/clinicPrototypeStore';

const statusLabels: Record<ClinicApplication['status'], string> = {
  draft: 'Setup in progress',
  pending_review: 'Awaiting review',
  changes_requested: 'Changes requested',
  active: 'Live to patients',
  rejected: 'Not approved',
};

function StatusBadge({ status }: { status: ClinicApplication['status'] }) {
  const styles: Record<ClinicApplication['status'], string> = {
    draft: 'bg-slate-100 text-slate-700',
    pending_review: 'bg-amber-100 text-amber-800',
    changes_requested: 'bg-orange-100 text-orange-800',
    active: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
  };

  return <Badge className={styles[status]}>{statusLabels[status]}</Badge>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

const emptyInvite = {
  clinicName: '',
  contactName: '',
  email: '',
};

const ClinicManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [state, setState] = useState<ClinicPrototypeState>(() => readClinicPrototypeState());
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteDetails, setInviteDetails] = useState(emptyInvite);
  const [selectedApplication, setSelectedApplication] = useState<ClinicApplication | null>(null);

  const pendingApplications = useMemo(
    () => state.applications.filter((application) => ['pending_review', 'changes_requested'].includes(application.status)),
    [state.applications]
  );
  const activeClinics = useMemo(
    () => state.applications.filter((application) => application.status === 'active'),
    [state.applications]
  );
  const outstandingInvitations = useMemo(
    () => state.invitations.filter((invitation) => invitation.status !== 'submitted'),
    [state.invitations]
  );

  const updateState = (next: ClinicPrototypeState) => {
    writeClinicPrototypeState(next);
    setState(next);
  };

  const handleCreateInvite = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invitation: ClinicInvitation = {
      id: createClinicId('clinic-invite'),
      clinicName: inviteDetails.clinicName.trim(),
      contactName: inviteDetails.contactName.trim(),
      email: inviteDetails.email.trim(),
      invitedAt: new Date().toISOString(),
      status: 'sent',
    };
    const next = {
      ...state,
      invitations: [invitation, ...state.invitations],
    };
    updateState(next);
    setInviteOpen(false);
    setInviteDetails(emptyInvite);
    toast({
      title: 'Demo invitation created',
      description: 'No email was sent. Open the clinic setup preview from the Invitations tab.',
    });
    setTab('invitations');
  };

  const updateApplicationStatus = (application: ClinicApplication, status: ClinicApplication['status']) => {
    const updatedApplication: ClinicApplication = {
      ...application,
      status,
      ...(status === 'active' ? { approvedAt: new Date().toISOString(), reviewNote: undefined } : {}),
      ...(status === 'changes_requested' ? { reviewNote: 'Please confirm the facility registration details.' } : {}),
    };
    const next: ClinicPrototypeState = {
      ...state,
      applications: state.applications.map((item) => (
        item.id === application.id ? updatedApplication : item
      )),
    };
    updateState(next);
    setSelectedApplication(null);
    toast({
      title: status === 'active' ? 'Clinic approved' : 'Changes requested',
      description: status === 'active'
        ? 'The clinic profile is now available in the public preview.'
        : 'The clinic can update its setup before resubmitting.',
    });
  };

  const handleReset = () => {
    setState(resetClinicPrototypeState());
    setSelectedApplication(null);
    toast({ title: 'Demo reset', description: 'The sample invitation and application have been restored.' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/admin"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Back to admin dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">Clinics & hospitals</p>
              <p className="hidden text-xs text-slate-500 sm:block">Organisation onboarding and approvals</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="hidden sm:inline-flex">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset demo
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Invite clinic
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">Admin workspace</Badge>
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                Interactive prototype
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Organisation management</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">
              Invite a clinic, let its team complete setup, then review and publish its profile.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:max-w-sm">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Demo details stay in this browser. Invitations are not emailed and no clinic data is sent to MedMap.</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Live organisations" value={activeClinics.length} icon={Building2} tone="blue" />
          <MetricCard label="Awaiting review" value={pendingApplications.length} icon={Clock3} tone="amber" />
          <MetricCard label="Invites to complete" value={outstandingInvitations.length} icon={Mail} tone="violet" />
          <MetricCard
            label="Linked practitioners"
            value={activeClinics.reduce((total, clinic) => total + clinic.practitioners.length, 0)}
            icon={Stethoscope}
            tone="teal"
          />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-auto min-w-full justify-start gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:min-w-0">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="invitations">Invitations</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="clinics">Live clinics</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
              <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-5 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Pilot workflow</p>
                      <h2 className="mt-1 text-xl font-semibold text-slate-900">From invitation to public profile</h2>
                      <p className="mt-1 text-sm text-slate-600">The clinic enters its information; MedMap reviews and approves before it goes live.</p>
                    </div>
                    <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white sm:flex">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <CardContent className="p-5 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <WorkflowStep number="01" title="Invite" text="MedMap admin sends the clinic a setup invitation." />
                    <WorkflowStep number="02" title="Clinic setup" text="The clinic fills in its profile, location, services, and practitioner links." />
                    <WorkflowStep number="03" title="Review & publish" text="Admin checks the application. Approval makes its profile visible." />
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button onClick={() => setInviteOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Create invitation
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/admin/clinics/workspace/demo-harbourview')}>
                      <Eye className="mr-2 h-4 w-4" />
                      View clinic workspace
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Needs your attention</CardTitle>
                  <CardDescription>Applications waiting for a MedMap decision</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingApplications.length === 0 ? (
                    <EmptyState
                      title="No applications to review"
                      text="When a clinic submits its setup, it will appear here."
                    />
                  ) : (
                    pendingApplications.slice(0, 2).map((application) => (
                      <div key={application.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{application.clinicName}</p>
                            <p className="mt-1 text-xs text-slate-500">{application.city}, {application.province}</p>
                          </div>
                          <StatusBadge status={application.status} />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => setSelectedApplication(application)}
                        >
                          Review application
                        </Button>
                      </div>
                    ))
                  )}
                  {pendingApplications.length > 2 && (
                    <Button variant="ghost" className="w-full" onClick={() => setTab('applications')}>
                      View all {pendingApplications.length} applications
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recently updated</CardTitle>
                <CardDescription>Clinic onboarding activity in this demo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {state.invitations.slice(0, 3).map((invitation) => (
                  <div key={invitation.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{invitation.clinicName}</p>
                        <p className="truncate text-xs text-slate-500">{invitation.email} · invited {formatDate(invitation.invitedAt)}</p>
                      </div>
                    </div>
                    <InvitationStatus status={invitation.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <SectionHeading
              title="Clinic invitations"
              description="Invitations are simulated in this prototype; no email is sent."
              action={<Button onClick={() => setInviteOpen(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" />Invite clinic</Button>}
            />
            {state.invitations.length === 0 ? (
              <EmptyState title="No invitations yet" text="Create an invitation to walk through clinic setup." />
            ) : (
              state.invitations.map((invitation) => (
                <Card key={invitation.id} className="border-slate-200 shadow-sm">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{invitation.clinicName}</p>
                        <p className="truncate text-sm text-slate-500">{invitation.contactName} · {invitation.email}</p>
                        <p className="mt-1 text-xs text-slate-400">Created {formatDate(invitation.invitedAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <InvitationStatus status={invitation.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/admin/clinics/setup/' + invitation.id)}
                      >
                        {invitation.status === 'submitted' ? 'View setup' : 'Open clinic setup preview'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            <SectionHeading
              title="Applications"
              description="Review submitted clinic details before making a profile public."
            />
            {state.applications.length === 0 ? (
              <EmptyState title="No clinic applications" text="Submitted clinic setups will appear here for review." />
            ) : (
              state.applications.map((application) => (
                <Card key={application.id} className="border-slate-200 shadow-sm">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{application.clinicName}</p>
                          <StatusBadge status={application.status} />
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{application.type === 'clinic' ? 'Private clinic' : 'Private hospital'} · {application.facilityName}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{application.city}, {application.province}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedApplication(application)}>
                        Review details
                      </Button>
                      {application.status === 'active' ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => navigate('/admin/clinics/workspace/' + application.id)}>
                            <Eye className="mr-2 h-4 w-4" />Workspace
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link to={'/clinics/' + application.slug}><ExternalLink className="mr-2 h-4 w-4" />Public preview</Link>
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => setSelectedApplication(application)} className="bg-blue-600 hover:bg-blue-700">
                          Review & approve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="clinics" className="space-y-4">
            <SectionHeading
              title="Live organisations"
              description="Approved clinic profiles are available to patients."
            />
            {activeClinics.length === 0 ? (
              <EmptyState title="No live clinics yet" text="Approve an application to publish its profile preview." />
            ) : (
              activeClinics.map((clinic) => (
                <Card key={clinic.id} className="border-slate-200 shadow-sm">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-slate-900">{clinic.clinicName}</p>
                          <StatusBadge status={clinic.status} />
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{clinic.facilityName} · {clinic.city}, {clinic.province}</p>
                        <p className="mt-1 text-xs text-slate-500">{clinic.practitioners.length} linked practitioners · {clinic.services.length} services</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate('/admin/clinics/workspace/' + clinic.id)}>
                        <Eye className="mr-2 h-4 w-4" />Workspace
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={'/clinics/' + clinic.slug}><ExternalLink className="mr-2 h-4 w-4" />Public profile</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite a clinic or hospital</DialogTitle>
            <DialogDescription>
              Create a demo invitation so the clinic can complete its own setup.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Prototype only: this does not send an email or create an account. Use sample details for the walkthrough.
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicName">Clinic or hospital name</Label>
              <Input
                id="clinicName"
                required
                value={inviteDetails.clinicName}
                onChange={(event) => setInviteDetails({ ...inviteDetails, clinicName: event.target.value })}
                placeholder="Example Family Clinic"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicContactName">Contact person</Label>
              <Input
                id="clinicContactName"
                required
                value={inviteDetails.contactName}
                onChange={(event) => setInviteDetails({ ...inviteDetails, contactName: event.target.value })}
                placeholder="Clinic administrator"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicContactEmail">Contact email</Label>
              <Input
                id="clinicContactEmail"
                type="email"
                required
                value={inviteDetails.email}
                onChange={(event) => setInviteDetails({ ...inviteDetails, email: event.target.value })}
                placeholder="clinic@example.com"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Create demo invitation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedApplication} onOpenChange={(open) => !open && setSelectedApplication(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedApplication && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{selectedApplication.clinicName}</DialogTitle>
                  <StatusBadge status={selectedApplication.status} />
                </div>
                <DialogDescription>
                  Submitted {formatDate(selectedApplication.submittedAt)} · {selectedApplication.type === 'clinic' ? 'Private clinic' : 'Private hospital'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2 sm:grid-cols-2">
                <Detail label="Registration number" value={selectedApplication.registrationNumber} />
                <Detail label="Primary administrator" value={selectedApplication.primaryAdmin} />
                <Detail label="Email" value={selectedApplication.contactEmail} />
                <Detail label="Phone" value={selectedApplication.phone} />
                <Detail label="Facility" value={selectedApplication.facilityName} />
                <Detail label="Address" value={[selectedApplication.address, selectedApplication.city, selectedApplication.province].filter(Boolean).join(', ')} />
                <Detail label="Departments" value={selectedApplication.departments.join(', ')} />
                <Detail label="Services" value={selectedApplication.services.join(', ')} />
                <Detail label="Practitioners" value={selectedApplication.practitioners.join(', ')} />
                {selectedApplication.reviewNote && (
                  <div className="sm:col-span-2">
                    <Detail label="Review note" value={selectedApplication.reviewNote} />
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => updateApplicationStatus(selectedApplication, 'changes_requested')}>
                  Request changes
                </Button>
                {selectedApplication.status !== 'active' && selectedApplication.status !== 'rejected' && (
                  <Button onClick={() => updateApplicationStatus(selectedApplication, 'active')} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve & make live
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setSelectedApplication(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'blue' | 'amber' | 'violet' | 'teal';
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    teal: 'bg-teal-50 text-teal-700',
  };
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center justify-between gap-2 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-500 sm:text-sm">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + tones[tone]}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold tracking-[0.16em] text-blue-600">{number}</p>
      <p className="mt-2 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-5 text-slate-600">{text}</p>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
      <Building2 className="mx-auto h-8 w-8 text-slate-400" />
      <p className="mt-3 font-medium text-slate-800">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>
    </div>
  );
}

function InvitationStatus({ status }: { status: ClinicInvitation['status'] }) {
  const labels = {
    sent: 'Invite ready',
    started: 'Setup started',
    submitted: 'Application received',
  };
  const styles = {
    sent: 'bg-violet-100 text-violet-800',
    started: 'bg-blue-100 text-blue-800',
    submitted: 'bg-emerald-100 text-emerald-800',
  };
  return <Badge className={styles[status]}>{labels[status]}</Badge>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm text-slate-900">{value || 'Not provided'}</p>
    </div>
  );
}

export default ClinicManagement;
