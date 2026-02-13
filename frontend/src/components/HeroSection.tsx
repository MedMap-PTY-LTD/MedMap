import React from 'react';
import { ArrowRight, MapPin, Clock, Shield, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import heroImage from '@/assets/medical-hero.jpg';
import SearchFilters from './SearchFilters';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const stats = [
    { icon: <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />, label: 'Provinces', value: '9' },
    { icon: <Shield className="h-4 w-4 sm:h-5 sm:w-5" />, label: 'Verified Doctors', value: '1,000+' },
    { icon: <Clock className="h-4 w-4 sm:h-5 sm:w-5" />, label: 'Avg. Booking', value: '< 2 min' },
    { icon: <Star className="h-4 w-4 sm:h-5 sm:w-5" />, label: 'Patient Rating', value: '4.9/5' }
  ];

  const handleStartBooking = () => {
    if (user && profile) {
      navigate('/search');
    } else {
      const authEvent = new CustomEvent('openAuthModal');
      window.dispatchEvent(authEvent);
    }
  };

  const handleJoinAsDoctor = () => {
    navigate('/doctor-enrollment');
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with Overlay - Optimized for mobile */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/95 via-slate-900/85 to-slate-900/90 sm:bg-gradient-to-r sm:from-slate-900/95 sm:via-slate-900/80 sm:to-transparent"></div>
      </div>

      {/* Floating Elements - Hidden on mobile, subtle on tablet+ */}
      <div className="hidden sm:block absolute top-20 right-10 w-16 h-16 bg-blue-500/20 rounded-full blur-xl animate-float"></div>
      <div className="hidden md:block absolute top-1/3 right-1/4 w-8 h-8 bg-cyan-400/30 rounded-full blur-lg animate-float" style={{ animationDelay: '1s' }}></div>
      <div className="hidden lg:block absolute bottom-1/3 right-20 w-12 h-12 bg-blue-500/30 rounded-full blur-lg animate-float" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center min-h-screen py-12 sm:py-16 lg:py-20">
            {/* Top Badge - Mobile optimized */}
            <div className="w-full max-w-3xl animate-slide-in-up">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full mb-4 sm:mb-6 border border-white/20">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
                <span className="text-[10px] sm:text-xs md:text-sm font-medium text-white tracking-wide">
                  South Africa's Leading Medical Platform
                </span>
              </div>

              {/* Headline - Responsive typography */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-3 sm:mb-4 md:mb-6 leading-tight">
                Find & Book
                <span className="block text-blue-400 mt-1 sm:mt-2">Doctors</span>
                <span className="block text-white/90">Instantly</span>
              </h1>

              {/* Description - Shorter on mobile */}
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed px-2">
                <span className="sm:hidden">
                  Connect with verified doctors across SA. Book in minutes.
                </span>
                <span className="hidden sm:block">
                  Connect with verified medical professionals across all 9 provinces of South Africa.
                  Book appointments in minutes, not hours.
                </span>
              </p>
            </div>

            {/* Search Filters - Full width on mobile */}
            <div className="w-full mt-6 sm:mt-8 lg:mt-10 animate-fade-in-scale px-0 sm:px-2">
              <SearchFilters />
            </div>

            {/* CTAs - Stack on mobile, row on tablet+ */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 lg:mt-10 w-full sm:w-auto px-4 sm:px-0">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-medium px-6 sm:px-8 py-3 sm:py-4 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                onClick={handleStartBooking}
              >
                <span className="flex items-center justify-center">
                  {user && profile ? 'Start Booking' : 'Log In to Book'}
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-transparent border-2 border-white/30 hover:bg-white/10 text-white text-sm sm:text-base font-medium px-6 sm:px-8 py-3 sm:py-4 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                onClick={handleJoinAsDoctor}
              >
                <span className="flex items-center justify-center">
                  Join as Doctor
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </div>

            {/* Stats - 2x2 grid on mobile, 4x1 on tablet+ */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 md:gap-6 w-full max-w-5xl mt-8 sm:mt-10 lg:mt-12 px-2 sm:px-0">
              {stats.map((stat, index) => (
                <Card 
                  key={index} 
                  className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300"
                >
                  <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                    <div className="flex items-center justify-center text-blue-400 mb-1 sm:mb-2">
                      {stat.icon}
                    </div>
                    <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-white">
                      {stat.value}
                    </div>
                    <div className="text-[10px] sm:text-xs lg:text-sm text-white/70 truncate">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator - Hidden on mobile, subtle on desktop */}
      <div className="hidden sm:block absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-5 h-8 sm:w-6 sm:h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-2 sm:h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;