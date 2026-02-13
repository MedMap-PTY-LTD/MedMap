import React, { useEffect, useState } from 'react';
import { Storage } from '@/backend/storage';
import { MapPin, Clock, Star, Shield, Calendar, ChevronRight } from 'lucide-react';
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
    <Card className="group border border-slate-200/80 hover:border-slate-300/80 transition-all duration-300 hover:shadow-md bg-white rounded-xl overflow-hidden">
      <CardContent className="p-0">
        {/* Mobile Layout (stacked) */}
        <div className="block sm:hidden">
          {/* Mobile content remains the same */}
          <div className="p-4 pb-2">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
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
                  <p className="text-sm text-blue-600 font-medium">{doctor.specialty}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-lg font-bold text-slate-900">{doctor.price}</div>
                <p className="text-[10px] text-slate-500">consultation</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs">
              <div className="flex items-center gap-1 text-slate-600">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span className="truncate max-w-[140px]">{doctor.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="font-medium text-slate-900">{doctor.rating}</span>
                <span className="text-slate-500">({doctor.reviews})</span>
              </div>
            </div>
          </div>

          <div className="px-4 py-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>{doctor.experience}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 hover:bg-slate-200">
                  {doctor.availability}
                </Badge>
              </div>
              <div className="flex gap-1">
                {doctor.languages.slice(0, 2).map((language) => (
                  <Badge key={language} variant="outline" className="text-[10px] px-2 py-0.5 border-slate-200 text-slate-600">
                    {language}
                  </Badge>
                ))}
                {doctor.languages.length > 2 && (
                  <span className="text-[10px] text-slate-500">+{doctor.languages.length - 2}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 pt-2 border-t border-slate-100">
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium h-10 rounded-lg shadow-sm transition-all active:scale-[0.98]"
              onClick={handleBookNow}
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Book
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium h-10 rounded-lg"
              onClick={handleViewProfile}
            >
              Profile
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>

        {/* Desktop Layout - REDUCED SIZES */}
        <div className="hidden sm:block p-4">
          <div className="flex items-start gap-3">
            {/* Doctor Avatar - Smaller */}
            <div className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 bg-slate-100">
              {doctor.image ? (
                <img 
                  src={imageUrl || doctor.image} 
                  alt={`Dr. ${doctor.name}`} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white text-base font-semibold">
                  {getInitials()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Header Row - More Compact */}
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="text-base font-semibold text-slate-900 truncate">
                      Dr. {doctor.name}
                    </h3>
                    {doctor.verified && (
                      <Shield className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-blue-600 font-medium">{doctor.specialty}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-lg font-bold text-slate-900">{doctor.price}</div>
                  <p className="text-[11px] text-slate-500">/consultation</p>
                </div>
              </div>

              {/* Location & Rating - Smaller */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  <span className="text-xs">{doctor.location}, {doctor.province}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium text-slate-900">{doctor.rating}</span>
                  <span className="text-xs text-slate-500">({doctor.reviews})</span>
                </div>
              </div>

              {/* Experience & Availability - Smaller */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>{doctor.experience} exp.</span>
                </div>
                <Badge variant="secondary" className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700">
                  {doctor.availability}
                </Badge>
              </div>

              {/* Languages - More Compact */}
              <div className="flex flex-wrap gap-1 mb-3">
                {doctor.languages.slice(0, 3).map((language) => (
                  <Badge 
                    key={language} 
                    variant="outline" 
                    className="text-[11px] px-2 py-0.5 border-slate-200 text-slate-600"
                  >
                    {language}
                  </Badge>
                ))}
                {doctor.languages.length > 3 && (
                  <span className="text-[11px] text-slate-500">+{doctor.languages.length - 3}</span>
                )}
              </div>

              {/* Actions - Smaller Buttons */}
              <div className="flex gap-2">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-1.5 h-auto rounded-md shadow-sm hover:shadow transition-all"
                  onClick={handleBookNow}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  Book Now
                </Button>
                <Button 
                  variant="outline" 
                  className="border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium px-4 py-1.5 h-auto rounded-md"
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