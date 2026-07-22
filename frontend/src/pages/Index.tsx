import React from 'react';
import { Heart, Clock, Shield, MapPin, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import DoctorCard from '@/pages/doctor/components/DoctorCard';
import { useNavigate, Link } from 'react-router-dom';
import Footer from '@/components/Footer';

const Index = () => {
  const navigate = useNavigate();
  // Sample doctor data for demo
  const sampleDoctors = [
    {
      id: '1',
      name: 'Thabo Mthembu',
      specialty: 'Cardiologist',
      location: 'Sandton',
      province: 'Gauteng',
      rating: 4.9,
      reviews: 127,
      price: 'R450',
      availability: 'Available Today',
      verified: true,
      languages: ['English', 'Zulu', 'Afrikaans'],
      experience: '15 years'
    },
    {
      id: '2',
      name: 'Sarah Williams',
      specialty: 'General Practitioner',
      location: 'Cape Town',
      province: 'Western Cape',
      rating: 4.8,
      reviews: 89,
      price: 'R350',
      availability: 'Available Tomorrow',
      verified: true,
      languages: ['English', 'Afrikaans'],
      experience: '12 years'
    },
    {
      id: '3',
      name: 'Nomsa Dlamini',
      specialty: 'Pediatrician',
      location: 'Durban',
      province: 'KwaZulu-Natal',
      rating: 4.9,
      reviews: 156,
      price: 'R400',
      availability: 'Available Today',
      verified: true,
      languages: ['English', 'Zulu', 'Sotho'],
      experience: '18 years'
    }
  ];

  const features = [
    {
      icon: <Shield className="h-6 w-6 sm:h-7 sm:w-7" />,
      title: 'Verified Doctors',
      description: 'All medical professionals are thoroughly vetted and verified for your safety.'
    },
    {
      icon: <Clock className="h-6 w-6 sm:h-7 sm:w-7" />,
      title: 'Instant Booking',
      description: 'Book appointments 24/7 with real-time availability and instant confirmation.'
    },
    {
      icon: <MapPin className="h-6 w-6 sm:h-7 sm:w-7" />,
      title: 'Nationwide Coverage',
      description: 'Access healthcare professionals across all 9 provinces of South Africa.'
    },
    {
      icon: <Heart className="h-6 w-6 sm:h-7 sm:w-7" />,
      title: 'Patient-Centered',
      description: 'Transparent pricing, genuine reviews, and quality care you can trust.'
    }
  ];

  const testimonials = [
    {
      name: 'Lerato Motsumi',
      location: 'Johannesburg',
      text: 'Found a cardiologist and booked within minutes. Same-day appointment saved my health.',
      rating: 5
    },
    {
      name: 'David van der Merwe',
      location: 'Cape Town',
      text: 'Finally, transparent pricing and actual reviews. This is how healthcare should work.',
      rating: 5
    },
    {
      name: 'Nomfundo Mbeki',
      location: 'Durban',
      text: 'Premium membership paid for itself with one urgent booking. Worth every rand.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <HeroSection />

      {/* Featured Doctors Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-slate-50/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <span className="text-blue-600 font-semibold text-xs sm:text-sm uppercase tracking-wider">
              Trusted Care
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mt-2 sm:mt-3 mb-3 sm:mb-4">
              Featured Medical Specialists
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto px-4">
              Connect with South Africa's top-rated doctors, available for immediate booking
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {sampleDoctors.map((doctor, index) => (
              <DoctorCard key={index} doctor={doctor} />
            ))}
          </div>

          <div className="text-center">
            <Button 
              onClick={() => navigate('/search')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 sm:px-8 py-2.5 sm:py-3 h-auto rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base w-full sm:w-auto"
            >
              Browse All 150+ Specialists
              <ArrowRight className="ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <span className="text-blue-600 font-semibold text-xs sm:text-sm uppercase tracking-wider">
              Why MedMap
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mt-2 sm:mt-3 mb-3 sm:mb-4">
              Built for South African Healthcare
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto px-4">
              We're removing barriers to quality care through technology and transparency
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-white h-full"
              >
                <CardContent className="p-6 sm:p-8">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 sm:mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2 sm:mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-slate-50/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <span className="text-blue-600 font-semibold text-xs sm:text-sm uppercase tracking-wider">
              Patient Stories
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mt-2 sm:mt-3 mb-3 sm:mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-base sm:text-lg text-slate-600 px-4">
              Real experiences from patients across South Africa
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index} 
                className="border border-slate-200 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 h-full"
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-1 mb-3 sm:mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 mb-4 sm:mb-6 leading-relaxed">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm sm:text-base mr-3">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm sm:text-base">
                        {testimonial.name}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500">
                        {testimonial.location}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-blue-900 to-blue-800 relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4 px-4">
            Ready to experience better healthcare?
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-blue-100 mb-6 sm:mb-8 lg:mb-10 max-w-3xl mx-auto px-4">
            Join 50,000+ South Africans who've found their perfect doctor on MedMap
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4">
            <Button 
              size="lg" 
              className="bg-white text-blue-900 hover:bg-blue-50 font-semibold px-6 sm:px-8 py-3 sm:py-4 h-auto rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] sm:hover:scale-105 active:scale-[0.98] w-full sm:w-auto min-w-[200px] text-sm sm:text-base border-2 border-white"
              onClick={() => navigate('/search')}
            >
              Find Your Doctor
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="bg-white/10 backdrop-blur-sm text-white border-2 border-white font-semibold px-6 sm:px-8 py-3 sm:py-4 h-auto rounded-lg shadow-lg hover:bg-white hover:text-blue-900 transition-all duration-200 hover:scale-[1.02] sm:hover:scale-105 active:scale-[0.98] w-full sm:w-auto min-w-[200px] text-sm sm:text-base"
              onClick={() => navigate('/doctor-enrollment')}
            >
              Join as Healthcare Provider
            </Button>
          </div>
          
          <p className="text-xs sm:text-sm text-blue-200 mt-4 sm:mt-6 flex items-center justify-center gap-1.5 sm:gap-2 px-4 flex-wrap">
            <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" /> 
            <span>Free to join • 2-minute setup • No monthly fees</span>
          </p>
        </div>
      </section>

      {/* 🎉 Footer Component - Clean and imported */}
      <Footer />
    </div>
  );
};

export default Index;