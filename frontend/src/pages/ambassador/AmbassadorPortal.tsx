// pages/ambassador/AmbassadorPortal.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAmbassador } from '@/hooks/useAmbassador';
import { TIERS } from '@/lib/types/ambassador';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  RefreshCw, 
  Copy, 
  Users, 
  Heart, 
  Target, 
  Award, 
  TrendingUp, 
  Gift, 
  Stethoscope, 
  Search,
  Info,
  AlertCircle,
  XCircle,
  Clock,
  Video,
  Sparkles,
  UserCheck,
  LogOut,
  Home,
  Menu,
  X,
  Wallet,
  CreditCard,
  User,
  BarChart3,
  Share2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import TrainingModule from './TrainingModule';
import KnowledgeTest from './KnowledgeTest';

// ==================== SIDEBAR COMPONENT ====================
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  userProfile: any;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar = ({ 
  isOpen, 
  onClose, 
  onLogout, 
  userProfile, 
  activeTab, 
  onTabChange 
}: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarVisibilityClass = isOpen ? 'translate-x-0' : '-translate-x-full';
  const sidebarDesktopClass = 'lg:translate-x-0';

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'referrals', label: 'Referrals', icon: Users },
    { id: 'earnings', label: 'Earnings', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'share', label: 'Share & Refer', icon: Share2 },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          fixed top-0 left-0 h-full bg-white shadow-2xl z-50 transition-all duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${isCollapsed ? 'w-20' : 'w-64'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${isCollapsed ? 'justify-center' : ''}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="font-bold text-lg text-gray-800">MedMap</span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <button 
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className={`p-4 border-b ${isCollapsed ? 'text-center' : ''}`}>
          {!isCollapsed ? (
            <div>
              <p className="font-semibold text-gray-800 truncate">
                {userProfile?.firstName || 'Ambassador'} {userProfile?.lastName || ''}
              </p>
              <p className="text-sm text-gray-500 truncate">{userProfile?.email || ''}</p>
              <Badge className="mt-1 bg-purple-100 text-purple-800">
                Ambassador
              </Badge>
            </div>
          ) : (
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-purple-600 font-semibold text-lg">
                {userProfile?.firstName?.[0] || 'A'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${isActive 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t space-y-2">
          {!isCollapsed && (
            <div className="bg-purple-50 p-3 rounded-lg mb-2">
              <p className="text-xs text-purple-600 font-medium">Commission Rate</p>
              <p className="text-sm font-bold text-purple-700">10% of booking fee</p>
            </div>
          )}
          
          {/* Logout Button */}
          <button
            onClick={onLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
              text-red-600 hover:bg-red-50
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? 'Sign Out' : ''}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </div>
    </>
  );
};

// ==================== TOP NAV COMPONENT (Mobile) ====================
const TopNav = ({ 
  title, 
  onMenuClick,
  showReferralCode = true,
  referralCode,
  onCopyCode,
}: any) => {
  const { toast } = useToast();

  return (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 sm:px-6 lg:px-8 lg:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">{title}</h1>
            <p className="text-purple-100 text-xs hidden sm:block">Ambassador Program</p>
          </div>
        </div>
        {showReferralCode && referralCode && (
          <div className="bg-white/20 rounded-lg px-2 py-1 flex items-center gap-1.5">
            <code className="text-xs font-bold tracking-wider font-mono">{referralCode}</code>
            <button onClick={onCopyCode} className="p-0.5 hover:bg-white/20 rounded transition-colors">
              <Copy className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== STATS CARD ====================
const StatsCard = ({ title, value, icon: Icon, color, badge, subtitle }: any) => (
  <Card>
    <CardContent className="pt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600">{title}</p>
          <p className="text-xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          {badge && <div className={`w-3 h-3 rounded-full ${badge} mt-1`} />}
        </div>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
    </CardContent>
  </Card>
);

// ==================== OVERVIEW TAB ====================
const OverviewTab = ({ 
  referralCode,
  referralsCount, 
  stats, 
  tierDisplay, 
  onCopyCode 
}: any) => {
  const { toast } = useToast();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600" />
            Your Referral Link
          </CardTitle>
          <CardDescription>Share this unique link with doctors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Your Referral Code</p>
            <div className="flex items-center justify-between">
              <code className="text-lg font-mono font-bold text-purple-700">{referralCode || 'N/A'}</code>
              <Button size="sm" onClick={onCopyCode}>
                <Copy className="w-4 h-4 mr-2" />Copy
              </Button>
            </div>
          </div>
          <div className="mt-4 bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-800 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              <strong>{referralsCount || 0}</strong> doctor{referralsCount !== 1 ? 's' : ''} referred so far
            </p>
          </div>
          <Button 
            className="w-full bg-purple-600 hover:bg-purple-700 mt-4"
            onClick={() => {
              const link = `${window.location.origin}/doctor-enrollment?ref=${referralCode}`;
              navigator.clipboard.writeText(link);
              toast({ title: 'Copied!', description: 'Referral link copied to clipboard.' });
            }}
          >
            <Copy className="w-4 h-4 mr-2" />Copy Full Referral Link
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Tier Progress & Commission
          </CardTitle>
          <CardDescription>
            Current Tier: <strong className="capitalize">{tierDisplay.label}</strong> ({tierDisplay.rate} of MedMap's R10 booking fee)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Total Referrals: {stats?.totalReferrals || 0}</span>
              <span className="font-semibold">
                {stats?.tierProgress?.next 
                  ? `${stats.totalReferrals}/${stats.tierProgress.next} for next tier`
                  : 'Max Tier Reached!'}
              </span>
            </div>
            <Progress 
              value={Math.min(((stats?.totalReferrals || 0) / (stats?.tierProgress?.next || 10)) * 100, 100)} 
              className="h-2" 
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Bronze</span>
              <span>Silver (11)</span>
              <span>Gold (51)</span>
              <span>Diamond (100+)</span>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{stats?.activeDoctors || 0}</strong> active doctors generating commission
                <span className="block text-xs text-blue-600 mt-1">
                  Active doctors = Verified + Active + 50+ monthly bookings
                </span>
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-600" />
                How It Works:
              </h4>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• <strong>Total Referrals</strong> = All doctors you've referred (pending + verified)</li>
                <li>• <strong>Active Doctors</strong> = Verified + Active + 50+ bookings/month</li>
                <li>• <strong>Tier</strong> = Based on Active Doctors (quality over quantity)</li>
                <li>• <strong>Progress</strong> = Based on Total Referrals (shows your effort)</li>
                <li>• <strong>Commission</strong> = Earned from Active Doctors only</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== REFERRALS TAB ====================
const ReferralsTab = ({ 
  referrals = [], 
  totalReferrals = 0, 
  searchTerm = '', 
  setSearchTerm = () => {}, 
  filterStatus = 'all', 
  setFilterStatus = () => {},
  isLoading = false,
  getStatusBadge = () => 'bg-gray-100 text-gray-800',
  formatDate = () => 'N/A',
  onRefresh = () => {},
  onCopyCode = () => {},
  referralCode = null,
}: any) => {
  const safeReferrals = Array.isArray(referrals) ? referrals : [];
  
  const filteredReferrals = safeReferrals.filter((r: any) => {
    if (filterStatus !== 'all' && r?.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const name = (r?.doctorFullName || '').toLowerCase();
      const email = (r?.doctorEmail || '').toLowerCase();
      const spec = (r?.doctorSpecialization || '').toLowerCase();
      if (!name.includes(term) && !email.includes(term) && !spec.includes(term)) return false;
    }
    return true;
  });

  const verifiedCount = safeReferrals.filter((r: any) => r?.status === 'verified').length;
  const activeCount = safeReferrals.filter((r: any) => r?.status === 'verified' && r?.eligibleForCommission).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-purple-600" />
              Doctors You've Referred
            </CardTitle>
            <CardDescription>Track the doctors who signed up using your referral code</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-purple-100 text-purple-800">Total: {totalReferrals || 0}</Badge>
            <Badge className="bg-green-100 text-green-800">Verified: {verifiedCount}</Badge>
            <Badge className="bg-blue-100 text-blue-800">Active: {activeCount}</Badge>
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : safeReferrals.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-700">No referrals yet</p>
            <p className="text-sm text-gray-500 mb-4">Start sharing your referral code with doctors today!</p>
            <div className="bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
              <p className="text-xs text-gray-500 mb-1">Your Referral Code</p>
              <code className="text-lg font-mono font-bold text-purple-700">{referralCode || 'N/A'}</code>
            </div>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={onCopyCode}
            >
              <Copy className="w-4 h-4 mr-2" />Copy Your Referral Code
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReferrals.map((referral: any, index: number) => {
              const isActive = referral?.status === 'verified' && referral?.eligibleForCommission;
              return (
                <div key={referral?.id || `referral-${index}`} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Stethoscope className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{referral?.doctorFullName || 'Unknown Doctor'}</p>
                          <p className="text-sm text-gray-500">{referral?.doctorEmail || ''}</p>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">Specialization</p>
                          <p className="font-medium">{referral?.doctorSpecialization || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Referred</p>
                          <p className="font-medium">{formatDate(referral?.referredAt)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Status</p>
                          <Badge className={getStatusBadge(referral?.status)}>
                            {referral?.status || 'pending'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-gray-500">Active</p>
                          <Badge className={isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                            {isActive ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                      {referral?.verifiedAt && (
                        <p className="text-xs text-gray-400 mt-2">
                          Verified: {formatDate(referral.verifiedAt)}
                        </p>
                      )}
                      {referral?.rejectionReason && (
                        <p className="text-xs text-red-600 mt-2">
                          Reason: {referral.rejectionReason}
                        </p>
                      )}
                      {referral?.monthlyBookings !== undefined && (
                        <p className="text-xs text-gray-400 mt-1">
                          Monthly Bookings: {referral.monthlyBookings || 0}
                          {referral.eligibleForCommission ? ' ✅ Eligible for commission' : ' ❌ Not eligible (needs 50+ bookings)'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== EARNINGS TAB ====================
const EarningsTab = ({ stats = {}, referrals = [], tierDisplay = { label: 'Bronze', rate: '10%' }, formatDate = () => 'N/A', getStatusBadge = () => 'bg-gray-100 text-gray-800', onCopyCode = () => {} }: any) => {
  const safeReferrals = Array.isArray(referrals) ? referrals : [];
  const eligibleReferrals = safeReferrals.filter((r: any) => r?.status === 'verified' && r?.eligibleForCommission) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission History</CardTitle>
        <CardDescription>
          Current Tier: <strong className="capitalize">{tierDisplay?.label || 'Bronze'}</strong> ({tierDisplay?.rate || '10%'} of R10 booking fee)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600">Total Earned</p>
            <p className="text-2xl font-bold text-green-700">
              R{(stats?.totalCommission || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">From {stats?.activeDoctors || 0} active doctors</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600">Pending Commission</p>
            <p className="text-2xl font-bold text-yellow-700">
              R{(stats?.pendingCommission || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600">Paid Commission</p>
            <p className="text-2xl font-bold text-blue-700">
              R{(stats?.paidCommission || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600">Total Referrals</p>
            <p className="text-2xl font-bold text-purple-700">
              {stats?.totalReferrals || 0}
            </p>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-purple-800">
            <strong>Commission Summary:</strong> {stats?.eligibleDoctors || 0} eligible doctors with 50+ monthly bookings
            {stats?.eligibleBookingFeeRevenue && stats.eligibleBookingFeeRevenue > 0 && (
              <span className="block text-xs text-purple-700 mt-1">
                Total booking fee revenue: R{(stats.eligibleBookingFeeRevenue || 0).toLocaleString()} × {tierDisplay?.rate || '10%'} = 
                R{(stats.totalCommission || 0).toLocaleString()} estimated commission
              </span>
            )}
          </p>
        </div>

        {eligibleReferrals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No eligible earnings yet</p>
            <p className="text-sm">Commission is earned when referred doctors have 50+ monthly bookings</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={onCopyCode}
            >
              <Copy className="w-4 h-4 mr-2" />
              Share Your Referral Code
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {eligibleReferrals.map((referral: any, index: number) => {
              const commissionAmount = ((referral?.monthlyBookingFeeRevenue || 0) * ((stats?.commissionRate || 10) / 100));
              return (
                <div key={referral?.id || `eligible-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{referral?.doctorFullName || 'Unknown Doctor'}</p>
                    <p className="text-sm text-gray-500">{referral?.doctorSpecialization || 'General Practice'}</p>
                    <p className="text-xs text-gray-400">
                      Monthly Bookings: {referral?.monthlyBookings || 0} | Booking Fees: R{((referral?.monthlyBookingFeeRevenue || 0)).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">R{commissionAmount.toLocaleString()}</p>
                    <Badge className={referral?.commissionPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {referral?.commissionPaid ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== PROFILE TAB ====================
const ProfileTab = ({ profile, ambassadorData }: any) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Your ambassador profile details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">First Name</p>
            <p className="font-medium">{profile?.firstName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Name</p>
            <p className="font-medium">{profile?.lastName || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{profile?.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Referral Code</p>
            <p className="font-medium font-mono">{ambassadorData?.referralCode || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Current Tier</p>
            <Badge className="bg-purple-100 text-purple-800">
              {ambassadorData?.currentTier || 'Bronze'}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <Badge className="bg-green-100 text-green-800">
              {ambassadorData?.applicationStatus || 'Active'}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-500">Joined</p>
            <p className="font-medium">
              {ambassadorData?.createdAt 
                ? new Date(ambassadorData.createdAt).toLocaleDateString() 
                : 'N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== SHARE TAB ====================
const ShareTab = ({ referralCode, onCopyCode }: any) => {
  const { toast } = useToast();

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: '💬',
      url: `https://wa.me/?text=${encodeURIComponent(`Join MedMap using my referral code: ${referralCode}! 🏥 https://medmap.co.za/doctor-enrollment?ref=${referralCode}`)}`,
    },
    {
      name: 'Email',
      icon: '📧',
      url: `mailto:?subject=Join MedMap&body=${encodeURIComponent(`Hi! I'm inviting you to join MedMap using my referral code: ${referralCode}\n\nSign up here: https://medmap.co.za/doctor-enrollment?ref=${referralCode}`)}`,
    },
    {
      name: 'Twitter/X',
      icon: '🐦',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join MedMap using my referral code: ${referralCode}! 🏥`)}&url=${encodeURIComponent(`https://medmap.co.za/doctor-enrollment?ref=${referralCode}`)}`,
    },
    {
      name: 'LinkedIn',
      icon: '🔗',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://medmap.co.za/doctor-enrollment?ref=${referralCode}`)}`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share & Refer</CardTitle>
        <CardDescription>Spread the word and earn commissions!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-800 font-medium">Your Referral Code</p>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xl font-mono font-bold text-purple-700">{referralCode || 'N/A'}</code>
            <Button size="sm" variant="outline" onClick={onCopyCode}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {shareLinks.map((link) => (
            <Button
              key={link.name}
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => window.open(link.url, '_blank')}
            >
              <span className="text-2xl">{link.icon}</span>
              <span className="text-sm">{link.name}</span>
            </Button>
          ))}
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            Share your referral link with doctors in your network.<br />
            You earn <strong className="text-purple-600">10% commission</strong> on every booking fee!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== ONBOARDING PENDING SCREEN ====================
const OnboardingPendingScreen = ({ 
  title, 
  description, 
  nextSteps, 
  buttonText, 
  buttonAction,
  onHome,
  onLogout,
}: any) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Top Nav */}
      <TopNav 
        title="Onboarding" 
        onMenuClick={() => {}} 
        showReferralCode={false}
      />
      {/* ✅ Sidebar for onboarding too */}
      <Sidebar
        isOpen={false}
        onClose={() => {}}
        onLogout={onLogout || (() => {})}
        userProfile={{}}
        activeTab="overview"
        onTabChange={() => {}}
      />
      <div className="lg:ml-64 flex items-center justify-center p-4 pt-8">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <CardTitle>{title || 'Application Submitted'}</CardTitle>
            <CardDescription>
              {description || 'Thank you for completing the initial steps!'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Your application is being reviewed by our team. You will receive an email notification when there's an update.
            </p>
            {nextSteps && nextSteps.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg text-left">
                <p className="text-sm font-medium text-blue-800 mb-2">Next Steps:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  {nextSteps.map((step: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="outline" onClick={buttonAction || onHome} className="w-full">
              {buttonText || 'Return to Home'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
const AmbassadorPortal = () => {
  const { user, profile, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  const uid = user?.uid || '';
  
  // Use TanStack Query hook
  const {
    ambassadorData,
    referrals,
    stats,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useAmbassador(uid);

  // ==================== HANDLERS ====================
  const handleCopyReferralCode = () => {
    const code = ambassadorData?.referralCode;
    if (code) {
      navigator.clipboard.writeText(code);
      toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
    } else {
      toast({ title: 'No Code', description: 'No referral code available yet.', variant: 'destructive' });
    }
  };

  const handleRefresh = async () => {
    toast({ title: 'Refreshing...' });
    await refetch();
    toast({ title: 'Refreshed', description: `Found ${referrals?.length || 0} referrals.` });
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      navigate('/signin');
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to log out. Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const getTierDisplay = (tierName: string) => {
    const tier = TIERS.find(t => t.name === tierName);
    if (!tier) return { label: 'Bronze', color: 'bg-amber-600', rate: '10%' };
    return { label: tier.label, color: tier.color, rate: `${tier.commissionRate * 100}%` };
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
      return;
    }
  }, [authLoading, user, navigate]);

  // Close sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ==================== LOADING STATES ====================
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Not Signed In</h2>
            <p className="text-gray-600 mb-4">Please sign in to access your ambassador dashboard.</p>
            <Button onClick={() => navigate('/signin')} className="w-full">Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
          <p className="text-gray-600">Loading your ambassador profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Profile</h2>
            <p className="text-gray-600 mb-4">{error.message || 'Failed to load ambassador profile. Please try again.'}</p>
            <Button onClick={() => refetch()} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ambassadorData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-4">Your ambassador profile could not be found. Please contact support.</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/')} className="w-full">Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== ONBOARDING STEPS ====================
  const step = ambassadorData.onboardingStep ?? 1;
  const psychometricPassed = ambassadorData.psychometricTest?.passed ?? null;
  const psychometricScore = ambassadorData.psychometricTest?.score ?? null;
  const nextAttemptDate = ambassadorData.psychometricTest?.nextAttemptDate?.toDate?.() ?? null;
  const trainingCompleted = ambassadorData.trainingModule?.completed ?? false;
  const interviewStatus = ambassadorData.interviewStatus ?? 'pending';
  const applicationStatus = ambassadorData.applicationStatus ?? 'pending';
  const knowledgeTestPassed = ambassadorData.knowledgeTest?.passed ?? null;
  const knowledgeTestAttempts = ambassadorData.knowledgeTest?.attempts ?? 0;
  const maxAttempts = ambassadorData.knowledgeTest?.maxAttempts ?? 3;
  const referralCode = ambassadorData.referralCode ?? null;

  // ==================== STEP 1: PSYCHOMETRIC TEST ====================
  if (step === 1 && psychometricPassed === null) {
    navigate('/ambassador/psychometric-test');
    return null;
  }

  if (step === 1 && psychometricPassed === false) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNav 
          title="Assessment" 
          onMenuClick={() => setSidebarOpen(true)}
          showReferralCode={false}
        />
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          userProfile={profile}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        <div className="flex items-center justify-center p-4 pt-8 lg:ml-64">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle>Assessment Cooldown Period</CardTitle>
              <CardDescription>Your psychometric assessment did not meet the required threshold.</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {psychometricScore && (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Your Score</p>
                  <p className="text-2xl font-bold text-gray-800">{psychometricScore}%</p>
                  <p className="text-xs text-gray-500 mt-1">Required: 70% to pass</p>
                </div>
              )}
              {nextAttemptDate && nextAttemptDate > new Date() && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">You can retake the assessment on:</p>
                  <p className="text-xl font-bold text-yellow-900 mt-1">
                    {nextAttemptDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-600">
                Please use this time to prepare. You will receive an email notification when you can retake the assessment.
              </p>
              <Button variant="outline" onClick={handleGoHome} className="w-full">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ==================== STEP 2: TRAINING MODULE ====================
  if (step === 2 && psychometricPassed === true && !trainingCompleted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNav 
          title="Training" 
          onMenuClick={() => setSidebarOpen(true)}
          showReferralCode={false}
        />
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          userProfile={profile}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        <div className="lg:ml-64">
          <TrainingModule />
        </div>
      </div>
    );
  }

  // ==================== STEP 3: KNOWLEDGE TEST ====================
  if (step === 3 && trainingCompleted) {
    if (knowledgeTestPassed === true) {
      navigate('/ambassador/portal');
      return null;
    } else if (knowledgeTestAttempts >= maxAttempts && knowledgeTestPassed === false) {
      return (
        <div className="min-h-screen bg-gray-50">
          <TopNav 
            title="Knowledge Test" 
            onMenuClick={() => setSidebarOpen(true)}
            showReferralCode={false}
          />
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onLogout={handleLogout}
            userProfile={profile}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
          <div className="flex items-center justify-center p-4 pt-8 lg:ml-64">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <CardTitle>Knowledge Test Not Passed</CardTitle>
                <CardDescription>You have used all {maxAttempts} attempts.</CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-gray-600">
                  You have completed all {maxAttempts} attempts for the knowledge test. 
                  Your application has been reviewed.
                </p>
                <Button variant="outline" onClick={handleGoHome} className="w-full">
                  Return to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    } else {
      return (
        <div className="min-h-screen bg-gray-50">
          <TopNav 
            title="Knowledge Test" 
            onMenuClick={() => setSidebarOpen(true)}
            showReferralCode={false}
          />
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onLogout={handleLogout}
            userProfile={profile}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
          <div className="lg:ml-64">
            <KnowledgeTest />
          </div>
        </div>
      );
    }
  }

  // ==================== STEP 4: INTERVIEW ====================
  if (step === 4 && interviewStatus === 'pending') {
    return (
      <OnboardingPendingScreen 
        title="Application Under Review"
        description="You have successfully passed the knowledge test!"
        nextSteps={[
          'Wait for application review',
          'Interview scheduling (if selected)',
          'Ambassador approval and onboarding'
        ]}
        buttonText="Return to Home"
        buttonAction={handleGoHome}
        onHome={handleGoHome}
        onLogout={handleLogout}
      />
    );
  }

  if (step === 4 && interviewStatus === 'scheduled') {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNav 
          title="Interview Scheduled" 
          onMenuClick={() => setSidebarOpen(true)}
          showReferralCode={false}
        />
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          userProfile={profile}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        <div className="flex items-center justify-center p-4 pt-8 lg:ml-64">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-purple-600" />
              </div>
              <CardTitle>Interview Scheduled</CardTitle>
              <CardDescription>Your interview has been scheduled with our team.</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                You will receive an email with the interview details and link. Please check your inbox.
              </p>
              <Button variant="outline" onClick={handleGoHome} className="w-full">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 4 && interviewStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNav 
          title="Application Status" 
          onMenuClick={() => setSidebarOpen(true)}
          showReferralCode={false}
        />
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          userProfile={profile}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        <div className="flex items-center justify-center p-4 pt-8 lg:ml-64">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle>Application Not Successful</CardTitle>
              <CardDescription>Thank you for your interest in becoming a MedMap Ambassador.</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                While your application showed promise, we have decided to move forward with other candidates at this time.
              </p>
              <Button variant="outline" onClick={handleGoHome} className="w-full">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 4 && interviewStatus === 'passed' && applicationStatus === 'pending') {
    return (
      <OnboardingPendingScreen 
        title="Interview Passed!"
        description="You have successfully passed the interview."
        nextSteps={[
          'Awaiting final approval from the MedMap team',
          'You will receive an email once approved',
          'Approval typically takes 2-5 business days'
        ]}
        buttonText="Return to Home"
        buttonAction={handleGoHome}
        onHome={handleGoHome}
        onLogout={handleLogout}
      />
    );
  }

  // ==================== STEP 5: APPROVED - DASHBOARD ====================
  // ✅ FIX: Show dashboard if step is 5 OR applicationStatus is 'approved'
  // This handles ambassadors who were verified before the new UI
  if (step === 5 || applicationStatus === 'approved') {
    const tierDisplay = getTierDisplay(stats?.currentTier || 'bronze');
    const safeReferrals = Array.isArray(referrals) ? referrals : [];
    
    let filteredReferrals = safeReferrals;
    if (filterStatus !== 'all') {
      filteredReferrals = filteredReferrals.filter((r: any) => r?.status === filterStatus);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredReferrals = filteredReferrals.filter((r: any) => 
        (r?.doctorFullName || '').toLowerCase().includes(term) ||
        (r?.doctorEmail || '').toLowerCase().includes(term) ||
        (r?.doctorSpecialization || '').toLowerCase().includes(term)
      );
    }

    // Render the main content based on active tab
    const renderContent = () => {
      switch (activeTab) {
        case 'overview':
          return (
            <OverviewTab 
              referralCode={referralCode}
              referralsCount={safeReferrals.length || 0}
              stats={stats}
              tierDisplay={tierDisplay}
              onCopyCode={handleCopyReferralCode}
            />
          );
        case 'referrals':
          return (
            <ReferralsTab 
              referrals={filteredReferrals}
              totalReferrals={safeReferrals.length || 0}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              isLoading={isLoading}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
              onRefresh={handleRefresh}
              onCopyCode={handleCopyReferralCode}
              referralCode={referralCode}
            />
          );
        case 'earnings':
          return (
            <EarningsTab 
              stats={stats}
              referrals={safeReferrals}
              tierDisplay={tierDisplay}
              formatDate={formatDate}
              getStatusBadge={getStatusBadge}
              onCopyCode={handleCopyReferralCode}
            />
          );
        case 'profile':
          return (
            <ProfileTab 
              profile={profile}
              ambassadorData={ambassadorData}
            />
          );
        case 'share':
          return (
            <ShareTab 
              referralCode={referralCode}
              onCopyCode={handleCopyReferralCode}
            />
          );
        default:
          return (
            <OverviewTab 
              referralCode={referralCode}
              referralsCount={safeReferrals.length || 0}
              stats={stats}
              tierDisplay={tierDisplay}
              onCopyCode={handleCopyReferralCode}
            />
          );
      }
    };

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Top Nav */}
        <TopNav 
          title="Dashboard"
          onMenuClick={() => setSidebarOpen(true)}
          showReferralCode={true}
          referralCode={referralCode}
          onCopyCode={handleCopyReferralCode}
        />

        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          userProfile={profile}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Main Content */}
        <div className="lg:ml-64 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
            {/* Welcome Message */}
            <div className="mb-6 hidden lg:block">
              <p className="text-gray-600">
                Welcome back, <strong>{profile?.firstName || 'Ambassador'}</strong>!
                {safeReferrals.length > 0 && (
                  <span className="ml-2 text-purple-600">
                    You've referred {safeReferrals.length} doctor{safeReferrals.length > 1 ? 's' : ''} 🎉
                  </span>
                )}
              </p>
            </div>

            {/* Stats Cards - Only show on overview */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <StatsCard 
                  title="Total Referrals" 
                  value={stats?.totalReferrals || 0} 
                  icon={Users} 
                  color="purple" 
                />
                <StatsCard 
                  title="Active Doctors" 
                  value={stats?.activeDoctors || 0} 
                  icon={Heart} 
                  color="green"
                  subtitle="Verified + 50+ bookings" 
                />
                <StatsCard 
                  title="Eligible for Commission" 
                  value={stats?.eligibleDoctors || 0} 
                  icon={Target} 
                  color="blue"
                  subtitle="Verified & Active" 
                />
                <StatsCard 
                  title="Current Tier" 
                  value={tierDisplay.label} 
                  icon={Award} 
                  color="amber" 
                  badge={tierDisplay.color}
                  subtitle={`${stats?.activeDoctors || 0} active doctors`}
                />
                <StatsCard 
                  title="Total Earnings" 
                  value={`R${(stats?.totalCommission || 0).toLocaleString()}`} 
                  icon={TrendingUp} 
                  color="green"
                  subtitle="From active doctors only" 
                />
              </div>
            )}

            {/* Content */}
            <div>
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== FALLBACK ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome to the Ambassador Program!</h1>
        <p className="text-gray-600 mt-2">Loading your onboarding progress...</p>
        <div className="mt-8 flex justify-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      </div>
    </div>
  );
};

export default AmbassadorPortal;