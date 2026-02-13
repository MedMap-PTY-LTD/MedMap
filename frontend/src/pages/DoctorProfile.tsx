import React, { useEffect, useState } from 'react';
import { Storage } from '@/backend/storage';
import { MapPin, Clock, Star, Shield, Calendar, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface DoctorCardProps {
  doctor: {
    id?: string;
    name: string;
    specialty: string;
    location: string;
    province: string;
    rating: number;
    reviews: number;
    price: string;
    availability: string;
    image?: string;
    verified: boolean;
    languages: string[];
    experience: string;
  };
}

const DoctorCard = ({ doctor }: DoctorCardProps) => {
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState<string | undefined>(doctor.image && doctor.image.startsWith('http') ? doctor.image : undefined);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!doctor.image) return;
      if (doctor.image.startsWith('http')) {
        setImageUrl(doctor.image);
        return;
      }
      try {
        const url = await Storage.createSignedUrl(doctor.image);
        if (mounted && url) setImageUrl(url);
      } catch (e) {
        console.error('Failed to create signed URL', e);
      }
    };
    load();
    return () => { mounted = false; };
  }, [doctor.image]);

  const handleBookNow = () => {
    if (doctor.id) {
      navigate(`/book/${doctor.id}`);
    } else {
      navigate('/search');
    }
  };

  const handleViewProfile = () => {
    if (doctor.id) {
      navigate(`/doctor/${doctor.id}`);
    } else {
      navigate('/search');
    }
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    return doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <Card className="group border border-slate-200/80 hover:border-slate-300/80 transition-all duration-300 hover:shadow-lg bg-white rounded-xl sm:rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        {/* Mobile Layout - ICONS ONLY */}
        <div className="block sm:hidden">
          {/* Top Section - Doctor Info */}
          <div className="p-4 pb-2">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 bg-slate-100">
                {doctor.image ? (
                  <img 
                    src={imageUrl || doctor.image} 
                    alt={`Dr. ${doctor.name}`} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white text-lg font-semibold">
                    {getInitials()}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className="text-base font-semibold text-slate-900 truncate">
                    Dr. {doctor.name}
                  </h3>
                  {doctor.verified && (
                    <Shield className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-blue-600 font-medium mb-1">{doctor.specialty}</p>
                
                {/* Location & Rating - Compact */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 text-slate-600">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span className="truncate max-w-[120px]">{doctor.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-slate-900">{doctor.rating}</span>
                  </div>
                </div>
              </div>
              
              {/* Price - Vertical on mobile */}
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold text-slate-900">{doctor.price}</div>
                <p className="text-[10px] text-slate-500">consult</p>
              </div>
            </div>
          </div>

          {/* Bottom Bar - Experience, Languages, Actions ALL IN ONE ROW */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            {/* Left: Experience & Availability */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs">{doctor.experience}</span>
              </div>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700">
                {doctor.availability}
              </Badge>
            </div>

            {/* Right: Languages & Actions */}
            <div className="flex items-center gap-2">
              {/* Languages - Show first 2 on mobile */}
              <div className="flex gap-1">
                {doctor.languages.slice(0, 2).map((language) => (
                  <Badge key={language} variant="outline" className="text-[10px] px-1.5 py-0.5 border-slate-200 text-slate-600">
                    {language}
                  </Badge>
                ))}
                {doctor.languages.length > 2 && (
                  <span className="text-[10px] text-slate-500">+{doctor.languages.length - 2}</span>
                )}
              </div>
              
              {/* ICONS ONLY - Clean AF */}
              <div className="flex items-center gap-1.5">
                <Button 
                  size="sm"
                  className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-0 transition-all active:scale-[0.95]"
                  onClick={handleBookNow}
                  title="Book appointment"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm"
                  variant="outline" 
                  className="h-8 w-8 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg p-0 transition-all active:scale-[0.95]"
                  onClick={handleViewProfile}
                  title="View profile"
                >
                  <User className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Hidden on mobile */}
        <div className="hidden sm:block p-5 lg:p-6">
          <div className="flex items-start gap-4 lg:gap-6">
            {/* Doctor Avatar - Desktop size */}
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl lg:rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 bg-slate-100">
              {doctor.image ? (
                <img 
                  src={imageUrl || doctor.image} 
                  alt={`Dr. ${doctor.name}`} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white text-xl lg:text-2xl font-semibold">
                  {getInitials()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Header Row */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg lg:text-xl font-semibold text-slate-900 truncate">
                      Dr. {doctor.name}
                    </h3>
                    {doctor.verified && (
                      <Shield className="h-4 w-4 lg:h-5 lg:w-5 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm lg:text-base text-blue-600 font-medium">{doctor.specialty}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-xl lg:text-2xl font-bold text-slate-900">{doctor.price}</div>
                  <p className="text-xs text-slate-500">per consultation</p>
                </div>
              </div>

              {/* Location & Rating */}
              <div className="flex items-center gap-3 lg:gap-4 mb-3">
                <div className="flex items-center gap-1 text-xs lg:text-sm text-slate-600">
                  <MapPin className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-slate-400" />
                  <span>{doctor.location}, {doctor.province}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 lg:h-4 lg:w-4 fill-amber-400 text-amber-400" />
                  <span className="text-xs lg:text-sm font-medium text-slate-900">{doctor.rating}</span>
                  <span className="text-xs text-slate-500">({doctor.reviews})</span>
                </div>
              </div>

              {/* Experience & Availability */}
              <div className="flex items-center gap-3 lg:gap-4 mb-3">
                <div className="flex items-center gap-1 text-xs lg:text-sm text-slate-600">
                  <Clock className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-slate-400" />
                  <span>{doctor.experience} experience</span>
                </div>
                <Badge variant="secondary" className="text-xs px-2.5 py-0.5 bg-slate-100 text-slate-700">
                  {doctor.availability}
                </Badge>
              </div>

              {/* Languages - All on desktop */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {doctor.languages.map((language) => (
                  <Badge 
                    key={language} 
                    variant="outline" 
                    className="text-xs px-2.5 py-0.5 border-slate-200 text-slate-600"
                  >
                    {language}
                  </Badge>
                ))}
              </div>

              {/* Actions - Desktop with text */}
              <div className="flex gap-2">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm lg:text-base font-medium px-5 lg:px-6 py-2 lg:py-2.5 h-auto rounded-lg shadow-sm hover:shadow-md transition-all"
                  onClick={handleBookNow}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Now
                </Button>
                <Button 
                  variant="outline" 
                  className="border-slate-300 hover:bg-slate-50 text-slate-700 text-sm lg:text-base font-medium px-5 lg:px-6 py-2 lg:py-2.5 h-auto rounded-lg"
                  onClick={handleViewProfile}
                >
                  View Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DoctorCard;