import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, User, LogOut, LayoutDashboard, Calendar } from 'lucide-react';
import { AuthModal } from './auth/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOpenAuthModal = (e: any) => {
      const requestedTab = e?.detail?.tab as 'login' | 'signup' | undefined;
      setAuthTab(requestedTab || 'login');
      setAuthModalOpen(true);
    };

    window.addEventListener('openAuthModal', handleOpenAuthModal as EventListener);
    return () => window.removeEventListener('openAuthModal', handleOpenAuthModal as EventListener);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = [
    { name: 'Home', path: '/' },
    { name: 'Find Doctors', path: '/search' },
    { name: 'Memberships', path: '/memberships' },
    { name: 'About', path: '/about' },
    { name: 'Team', path: '/team' },
    { name: 'Legal', path: '/legal' },
  ];

  // Admin link - separate, not in main nav
  const isAdmin = profile?.role === 'admin';

  const getUserDashboardLink = () => {
    if (!profile) return '/';
    switch (profile.role) {
      case 'admin':
        return '/admin';
      case 'doctor':
        return '/doctor';
      default:
        return '/dashboard';
    }
  };

  return (
    <>
      <header 
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${isScrolled 
            ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm' 
            : 'bg-white border-b border-slate-200'
          }
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-20">
            {/* Logo - Smaller on mobile */}
            <Link 
              to="/" 
              className="flex items-center gap-2 flex-shrink-0 group"
            >
              <div className="relative">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-sm border border-slate-200">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets%2Faf68e484decf46379ccbfc0f4be45e74%2F35b00f08674a45308869d5f3a08c0ee7?format=webp&width=200"
                    alt="MedMap"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-blue-600 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900 text-sm lg:text-lg tracking-tight">MedMap</span>
                <span className="hidden lg:block text-[10px] lg:text-xs text-slate-500 font-medium -mt-0.5">Find. Book. Heal.</span>
              </div>
            </Link>

            {/* Desktop Navigation - Hidden on mobile */}
            <nav className="hidden md:flex items-center absolute left-1/2 transform -translate-x-1/2">
              <div className="flex items-center gap-1 bg-slate-50/80 backdrop-blur-sm px-1.5 py-1 rounded-xl border border-slate-200/60">
                {navigationItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      relative px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200
                      ${isActive(item.path)
                        ? 'text-blue-700 bg-blue-50/80 border border-blue-200/50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                      }
                    `}
                  >
                    {item.name}
                    {isActive(item.path) && (
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></span>
                    )}
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    to="/admin-mashau-permits"
                    className={`
                      relative px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200
                      ${isActive('/admin-mashau-permits')
                        ? 'text-blue-700 bg-blue-50/80 border border-blue-200/50'
                        : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50/80'
                      }
                    `}
                  >
                    Admin
                    {isActive('/admin-mashau-permits') && (
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></span>
                    )}
                  </Link>
                )}
              </div>
            </nav>

            {/* Desktop Right Side - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              {user && profile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="flex items-center gap-2 px-3 py-2 h-9 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-700">
                          {profile.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium max-w-[120px] truncate">
                        {profile.full_name || user.email?.split('@')[0]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-1">
                    <DropdownMenuItem asChild className="rounded-md">
                      <Link to="/profile" className="flex items-center gap-2 py-2">
                        <User className="h-4 w-4 text-slate-500" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-md">
                      <Link to={getUserDashboardLink()} className="flex items-center gap-2 py-2">
                        <LayoutDashboard className="h-4 w-4 text-slate-500" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    {profile.role === 'patient' && (
                      <DropdownMenuItem asChild className="rounded-md">
                        <Link to="/bookings" className="flex items-center gap-2 py-2">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          <span>Bookings</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={signOut} 
                      className="flex items-center gap-2 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="px-4 py-2 h-9 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                    onClick={() => { setAuthTab('login'); setAuthModalOpen(true); }}
                  >
                    Sign in
                  </Button>
                  <Button
                    className="px-4 py-2 h-9 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg shadow-sm transition-all hover:shadow-md"
                    onClick={() => { setAuthTab('signup'); setAuthModalOpen(true); }}
                  >
                    Get started
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button - Properly visible now */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 text-slate-700" />
              ) : (
                <Menu className="h-5 w-5 text-slate-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu - Full width, no overlap */}
        <div 
          className={`
            md:hidden fixed left-0 right-0 bg-white border-b border-slate-200 shadow-lg
            transition-all duration-300 ease-in-out overflow-hidden
            ${isMobileMenuOpen ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0 border-none shadow-none'}
          `}
          style={{ top: '3.5rem' }} // Matches h-14 exactly
        >
          <div className="px-4 py-4 space-y-4">
            {/* User Section - Mobile First */}
            {user && profile ? (
              <div className="px-3 py-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-blue-700">
                      {profile.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {profile.full_name || 'User'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 px-3">
                <Button
                  variant="outline"
                  className="flex-1 h-9 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs"
                  onClick={() => { setAuthTab('login'); setAuthModalOpen(true); }}
                >
                  Sign in
                </Button>
                <Button
                  className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs"
                  onClick={() => { setAuthTab('signup'); setAuthModalOpen(true); }}
                >
                  Sign up
                </Button>
              </div>
            )}

            {/* Mobile Navigation */}
            <nav className="space-y-0.5 px-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive(item.path)
                      ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  {item.name}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin-mashau-permits"
                  className={`
                    flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive('/admin-mashau-permits')
                      ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-600'
                      : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                    }
                  `}
                >
                  Admin Panel
                </Link>
              )}
            </nav>

            {/* Mobile Sign Out */}
            {user && profile && (
              <div className="px-2 pt-2 border-t border-slate-200">
                <Link
                  to={getUserDashboardLink()}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Spacer - Matches header height exactly */}
      <div className="h-14 lg:h-20"></div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialTab={authTab} />
    </>
  );
};

export default Header;