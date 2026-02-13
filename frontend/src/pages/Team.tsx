import { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Coffee, 
  Gamepad2, 
  Linkedin,
  Mail,
  Mountain, 
  Music, 
  Rocket, 
  Sparkles, 
  Trophy, 
  Users, 
  Zap
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '@/components/Footer'; // ✅ Footer import

// Import local JPEG images
import ofentseImage from '../assets/images/team/ofentse-mashau.jpeg';
import kuhlulaImage from '../assets/images/team/kuhlula-madumo.png';
import selaeloImage from '../assets/images/team/selaelo-langa.jpeg';

const Team = () => {
  const [clickedMember, setClickedMember] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const handleCardClick = (memberName: string) => {
    setClickedMember(clickedMember === memberName ? null : memberName);
  };

  const handleSocialClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const teamMembers = [
    {
      name: 'Ofentse Mashau',
      role: 'Founder & CEO',
      image: ofentseImage,
      gradient: 'from-orange-500 via-red-500 to-pink-500',
      professionalFact: 'Transformed a bold vision into reality by building a company from the ground up, combining strategic thinking with hands-on execution.',
      funFact: 'Can pull an all-nighter debugging code and still show up energized for a 6 AM workout.',
      funFactShort: 'Late night coder, early morning gym rat.',
      expertise: ['Strategic Vision', 'Business Development', 'Innovation', 'Leadership'],
      linkedin: 'https://www.linkedin.com/in/ofentse-mashau-0863751b0',
      email: 'Omashau@medmap.co.za'
    },
    {
      name: 'Kuhlula Madumo',
      role: 'Co-Founder & COO',
      image: kuhlulaImage,
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      professionalFact: 'Masters the art of turning chaos into order. Scales operations seamlessly while maintaining quality.',
      funFact: 'Has a playlist for every mood and swears productivity peaks at 2 AM.',
      funFactShort: '2 AM productivity king. 🎧',
      expertise: ['Operations Excellence', 'Team Building', 'Process Optimization', 'Execution'],
      linkedin: 'www.linkedin.com/in/kuhlula-madumo-78b670304',
      email: 'kmadumo@medmap.co.za'
    },
    {
      name: 'Selaelo Langa',
      role: 'Chief Technology Officer',
      image: selaeloImage,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      professionalFact: 'Architecting next-gen solutions that don\'t just work, but work smarter. Turns complex challenges into elegant systems.',
      funFact: 'Codes with headphones on, debugging with coffee in hand.',
      funFactShort: 'Coffee + code = happy dev. ☕',
      expertise: ['Full-Stack Development', 'System Architecture', 'Tech Innovation', 'Problem Solving'],
      linkedin: 'https://linkedin.com/in/selaelo-langa',
      email: 'Selaelo@medmap.co.za'
    }
  ];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:16px_16px] sm:bg-[size:20px_20px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-24">
            <div className="text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full mb-4 sm:mb-6 border border-white/20">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400" />
                <span className="text-xs sm:text-sm font-medium text-white tracking-wide">Meet The Team</span>
              </div>

              {/* Headline */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 lg:mb-6 px-2 leading-tight">
                Changing the Game,
                <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  One Innovation at a Time
                </span>
              </h1>

              {/* Description */}
              <p className="text-sm sm:text-base lg:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed px-4 font-light">
                {isMobile 
                  ? "Rewriting the rules, making things easier. Work hard, play hard."
                  : "We're not just building products. We're rewriting the rules, making things easier, and proving that working hard and playing hard aren't mutually exclusive."
                }
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 md:gap-6 mt-8 sm:mt-12 lg:mt-16 max-w-4xl mx-auto">
              <StatCard icon={Zap} value="100%" label="Driven" color="yellow" />
              <StatCard icon={Trophy} value="24/7" label="Hustle" color="orange" />
              <StatCard icon={Sparkles} value="∞" label="Ideas" color="purple" />
              <StatCard icon={Coffee} value="Lots" label="Coffee" color="amber" />
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 mb-3 sm:mb-4 lg:mb-6 px-2">
              The People Behind MedMap
            </h2>

            <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-4xl mx-auto leading-relaxed px-4">
              {isMobile 
                ? "Healthcare experts, business leaders, and innovators united by one vision."
                : "Our diverse team of healthcare technology experts, business leaders, and customer advocates are united by a common vision: revolutionizing healthcare access across South Africa."
              }
            </p>
          </div>

          {/* Introduction Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200 p-5 sm:p-8 lg:p-10 mb-12 sm:mb-16 max-w-4xl mx-auto">
            <h3 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-slate-900 mb-3 sm:mb-4 lg:mb-6 text-center">
              Driven by Purpose, United by Vision
            </h3>
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed text-center mb-6 sm:mb-8 px-2">
              {isMobile 
                ? "Each leader brings unique expertise and a shared commitment to making healthcare more accessible for all South Africans."
                : "Each member of our leadership team brings unique expertise and a shared commitment to making healthcare more accessible, transparent, and efficient for all South Africans. Together, we're building more than just a platform – we're creating a movement."
              }
            </p>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              <div className="text-center p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl">
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  25+
                </div>
                <div className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">Years Combined</div>
              </div>
              <div className="text-center p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl sm:rounded-2xl">
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  100%
                </div>
                <div className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">SA Leadership</div>
              </div>
              <div className="text-center p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl">
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  1
                </div>
                <div className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">Shared Vision</div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:pb-24">
          {/* Team Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 xl:gap-8">
            {teamMembers.map((member) => (
              <TeamCard 
                key={member.name}
                member={member}
                clickedMember={clickedMember}
                handleCardClick={handleCardClick}
                handleSocialClick={handleSocialClick}
                isMobile={isMobile}
                isTablet={isTablet}
              />
            ))}
          </div>

          {/* Culture Section */}
          <div className="mt-12 sm:mt-16 lg:mt-20">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:16px_16px] sm:bg-[size:20px_20px]" />

              <div className="relative">
                <div className="text-center mb-6 sm:mb-8 lg:mb-10">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-2 sm:mb-3 lg:mb-4">
                    Our Work Style
                  </h2>
                  <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto px-2">
                    Fast-paced, ambitious, and never afraid to break the mold.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                  <CultureCard 
                    icon={Mountain} 
                    title="Work Hard" 
                    description={isMobile 
                      ? "Late nights, early mornings. We put in the work." 
                      : "Late nights, early mornings, and everything in between. We put in the work to make magic happen."
                    } 
                    color="cyan" 
                  />
                  <CultureCard 
                    icon={Music} 
                    title="Play Hard" 
                    description={isMobile 
                      ? "Celebrate wins, team vibes, good energy." 
                      : "When we win, we celebrate. Gaming sessions, team outings, and good vibes are part of the culture."
                    } 
                    color="purple" 
                  />
                  <CultureCard 
                    icon={Rocket} 
                    title="Change the Game" 
                    description={isMobile 
                      ? "We create trends, not follow them." 
                      : "We don't follow trends, we create them. Making things easier and better is what we do."
                    } 
                    color="orange" 
                    className="sm:col-span-2 lg:col-span-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* ✅ FOOTER COMPONENT ADDED HERE - At the bottom of the page */}
      <Footer />
    </>
  );
};

// Extracted Stat Card Component
const StatCard = ({ icon: Icon, value, label, color }) => {
  const colorClasses = {
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400'
  };

  return (
    <div className="text-center p-3 sm:p-4 md:p-5 lg:p-6 bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10">
      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 ${colorClasses[color]} mx-auto mb-1 sm:mb-2`} />
      <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">{value}</div>
      <div className="text-[10px] sm:text-xs md:text-sm text-slate-400">{label}</div>
    </div>
  );
};

// Extracted Culture Card Component
const CultureCard = ({ icon: Icon, title, description, color, className = '' }) => {
  const colorClasses = {
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400'
  };

  return (
    <div className={`bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border border-white/10 hover:bg-white/10 transition-all ${className}`}>
      <Icon className={`h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 ${colorClasses[color]} mb-2 sm:mb-3 lg:mb-4`} />
      <h3 className="text-white font-bold mb-1 text-sm sm:text-base lg:text-lg">{title}</h3>
      <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{description}</p>
    </div>
  );
};

// Extracted Team Card Component
const TeamCard = ({ member, clickedMember, handleCardClick, handleSocialClick, isMobile, isTablet }) => {
  // Responsive card height
  const getCardHeight = () => {
    if (isMobile) return 'h-[420px]';
    if (isTablet) return 'h-[480px]';
    return 'h-[550px] lg:h-[600px]';
  };

  return (
    <div
      className={`${getCardHeight()} w-full perspective cursor-pointer touch-manipulation`}
      onClick={() => handleCardClick(member.name)}
    >
      <div
        className="relative w-full h-full transition-transform duration-500 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: clickedMember === member.name ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT */}
        <div
          className="absolute w-full h-full rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="absolute inset-0">
            <img
              src={member.image}
              alt={member.name}
              className="w-full h-full object-cover grayscale"
              loading="lazy"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-end p-0">
            <div className="bg-white/10 backdrop-blur-md rounded-b-xl sm:rounded-b-2xl lg:rounded-b-3xl p-4 sm:p-5 lg:p-6 border-t border-white/20">
              <h3 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-0.5 sm:mb-1 lg:mb-2">
                {member.name}
              </h3>
              <p className="text-sm sm:text-base lg:text-lg font-semibold text-white/90 mb-2 sm:mb-3 lg:mb-4">
                {member.role}
              </p>
              
              <div className="flex gap-2" onClick={handleSocialClick}>
                <a 
                  href={member.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 sm:p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all active:scale-95"
                >
                  <Linkedin className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </a>
                <a 
                  href={`mailto:${member.email}`}
                  className="p-1.5 sm:p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all active:scale-95"
                >
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </a>
              </div>
            </div>
          </div>

          <div className="absolute top-3 sm:top-4 lg:top-6 right-3 sm:right-4 lg:right-6 bg-black/60 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1">
            <span className="text-white/90 text-[10px] sm:text-xs font-medium">
              {isMobile ? 'Tap' : 'Click'} for details
            </span>
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute w-full h-full bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-xl overflow-y-auto p-4 sm:p-5 lg:p-6"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Header */}
          <div className="mb-3 sm:mb-4 lg:mb-5">
            <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-slate-900 mb-0.5">
              {member.name}
            </h3>
            <p className="text-xs sm:text-sm lg:text-base font-semibold bg-gradient-to-r from-slate-600 to-slate-800 bg-clip-text text-transparent">
              {member.role}
            </p>
          </div>

          {/* Content */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-5">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
                <span className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase">Professional</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isMobile ? member.professionalFact.split('.')[0] + '.' : member.professionalFact}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Gamepad2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
                <span className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase">Fun Fact</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isMobile ? member.funFactShort : member.funFact}
              </p>
            </div>

            <div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase block mb-1.5 sm:mb-2">Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {member.expertise.slice(0, isMobile ? 3 : 4).map((skill) => (
                  <span
                    key={skill}
                    className={`px-2 py-1 text-[10px] sm:text-xs rounded-full font-medium bg-gradient-to-r ${member.gradient} bg-clip-text text-transparent border border-slate-200`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200" onClick={handleSocialClick}>
              <span className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase block mb-1.5 sm:mb-2">Connect</span>
              <div className="flex gap-2">
                <a 
                  href={member.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg active:scale-95 transition-all"
                >
                  <Linkedin className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-[10px] sm:text-xs font-medium text-blue-700">LinkedIn</span>
                </a>
                <a 
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg active:scale-95 transition-all"
                >
                  <Mail className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-[10px] sm:text-xs font-medium text-amber-700">Email</span>
                </a>
              </div>
            </div>
          </div>

          {/* Back button */}
          <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-200">
            <div className="text-slate-500 text-[10px] sm:text-xs font-medium text-center flex items-center justify-center gap-1">
              <span className="text-xs">👆</span>
              <span>Tap to go back</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Team;