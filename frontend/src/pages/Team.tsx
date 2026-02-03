import { useState } from 'react';
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

// Import local JPEG images
import ofentseImage from '../assets/images/team/ofentse-mashau.jpeg';
import kuhlulaImage from '../assets/images/team/kuhlula-madumo.jpeg';
import selaeloImage from '../assets/images/team/selaelo-langa.jpeg';

const Team = () => {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);
  const [clickedMember, setClickedMember] = useState<string | null>(null);

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
      imageGradient: 'from-orange-600/50 to-red-600/50',
      professionalFact: 'Transformed a bold vision into reality by building a company from the ground up, combining strategic thinking with hands-on execution to disrupt traditional industry models.',
      funFact: 'Can pull an all-nighter debugging code and still show up energized for a 6 AM workout. Believes the best ideas come during late-night brainstorming sessions fueled by good music.',
      expertise: ['Strategic Vision', 'Business Development', 'Innovation', 'Leadership'],
      vibe: '🎯 Visionary go-getter',
      linkedin: 'https://linkedin.com/in/ofentse-mashau',
      email: 'ofentse@medmap.co.za'
    },
    {
      name: 'Kuhlula Madumo',
      role: 'Co-Founder & COO',
      image: kuhlulaImage,
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      imageGradient: 'from-blue-600/50 to-cyan-600/50',
      professionalFact: 'Masters the art of turning chaos into order. Scales operations seamlessly while maintaining quality, ensuring every process runs like a well-oiled machine.',
      funFact: 'Has a playlist for every mood and swears productivity peaks at 2 AM. Weekend warrior who believes in celebrating wins as hard as working for them.',
      expertise: ['Operations Excellence', 'Team Building', 'Process Optimization', 'Execution'],
      vibe: '⚡ The organized rebel',
      linkedin: 'https://linkedin.com/in/kuhlula-madumo',
      email: 'kuhlula@medmap.co.za'
    },
    {
      name: 'Selaelo Langa',
      role: 'Chief Technology Officer',
      image: selaeloImage,
      gradient: 'from-purple-500 via-violet-500 to-indigo-500',
      imageGradient: 'from-purple-600/50 to-indigo-600/50',
      professionalFact: 'Architecting next-gen solutions that don\'t just work, but work smarter. Turns complex technical challenges into elegant, scalable systems that push boundaries.',
      funFact: 'Codes with headphones on, debugging with coffee in hand. Thinks the best way to unwind after shipping features is gaming marathons with the team.',
      expertise: ['Full-Stack Development', 'System Architecture', 'Tech Innovation', 'Problem Solving'],
      vibe: '🚀 Code wizard',
      linkedin: 'https://linkedin.com/in/selaelo-langa',
      email: 'selaelo@medmap.co.za'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 border border-white/20">
              <Users className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white">Meet The Team</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Changing the Game,
              <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                One Innovation at a Time
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              We're not just building products. We're rewriting the rules, making things easier,
              and proving that working hard and playing hard aren't mutually exclusive.
            </p>
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <Zap className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-sm text-slate-400">Driven</div>
            </div>
            <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <Trophy className="h-8 w-8 text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">24/7</div>
              <div className="text-sm text-slate-400">Hustle Mode</div>
            </div>
            <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">∞</div>
              <div className="text-sm text-slate-400">Ideas</div>
            </div>
            <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <Coffee className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">Lots</div>
              <div className="text-sm text-slate-400">Coffee</div>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            The People Behind MedMap
          </h2>

          <p className="text-lg text-slate-600 max-w-4xl mx-auto leading-relaxed">
            Our diverse team of healthcare technology experts, business leaders, and customer advocates
            are united by a common vision: revolutionizing healthcare access across South Africa.
          </p>
        </div>

        {/* Introduction Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 sm:p-12 mb-16 max-w-4xl mx-auto">
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 text-center">
            Driven by Purpose, United by Vision
          </h3>
          <p className="text-lg text-slate-600 leading-relaxed text-center mb-8">
            Each member of our leadership team brings unique expertise and a shared commitment to
            making healthcare more accessible, transparent, and efficient for all South Africans.
            Together, we're building more than just a platform – we're creating a movement.
          </p>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                25+
              </div>
              <div className="text-sm text-slate-600 mt-2 font-medium">Years Combined Experience</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                100%
              </div>
              <div className="text-sm text-slate-600 mt-2 font-medium">South African Leadership</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                1
              </div>
              <div className="text-sm text-slate-600 mt-2 font-medium">Shared Vision</div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className="h-[600px] perspective cursor-pointer"
              onClick={() => handleCardClick(member.name)}
            >
              <div
                className="relative w-full h-full transition-transform duration-500 ease-out"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: clickedMember === member.name ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front of Card - Full Image with Glassy Overlay */}
                <div
                  className="absolute w-full h-full rounded-3xl shadow-xl overflow-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {/* Black & White Image ONLY */}
                  <div className="absolute inset-0">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover grayscale"
                      loading="lazy"
                    />
                  </div>

                  {/* Dark overlay for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                  {/* Glassy Name & Role Overlay - Stretched to sides */}
                  <div className="absolute inset-0 flex flex-col justify-end p-0">
                    <div className="bg-white/10 backdrop-blur-lg rounded-b-3xl p-6 border-t border-x border-white/20 shadow-2xl mx-0">
                      <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        {member.name}
                      </h3>
                      <p className="text-lg font-semibold text-white/90 mb-4">
                        {member.role}
                      </p>
                      
                      {/* Social Icons - Click doesn't flip card */}
                      <div className="flex gap-3" onClick={handleSocialClick}>
                        <a 
                          href={member.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-300 group"
                        >
                          <Linkedin className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
                        </a>
                        <a 
                          href={`mailto:${member.email}`}
                          className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-300 group"
                        >
                          <Mail className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Click Indicator */}
                  <div className="absolute top-6 right-6 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                    <div className="text-white/90 text-xs font-medium flex items-center gap-1">
                      <span>Click for details</span>
                    </div>
                  </div>
                </div>

                {/* Back of Card - Details (NO SCROLLING) */}
                <div
                  className="absolute w-full h-full bg-white rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8 flex flex-col"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  {/* Header with name and role */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 mb-1">
                      {member.name}
                    </h3>
                    <p className="text-base font-semibold bg-gradient-to-r from-slate-600 to-slate-800 bg-clip-text text-transparent">
                      {member.role}
                    </p>
                  </div>

                  <div className="space-y-6 flex-1">
                    {/* Professional Fact */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="h-4 w-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Professional</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {member.professionalFact}
                      </p>
                    </div>

                    {/* Fun Fact */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Gamepad2 className="h-4 w-4 text-slate-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Fun Fact</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {member.funFact}
                      </p>
                    </div>

                    {/* Expertise Tags */}
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Skills</span>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {member.expertise.map((skill) => (
                          <span
                            key={skill}
                            className={`px-3 py-1 text-xs rounded-full font-medium bg-gradient-to-r ${member.gradient} bg-clip-text text-transparent border border-slate-200`}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Social Links on Back */}
                    <div className="pt-4 border-t border-slate-200" onClick={handleSocialClick}>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Connect</span>
                      <div className="flex gap-3 mt-3">
                        <a 
                          href={member.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-300 group"
                        >
                          <Linkedin className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-medium text-blue-700">LinkedIn</span>
                        </a>
                        <a 
                          href={`mailto:${member.email}`}
                          className="flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all duration-300 group"
                        >
                          <Mail className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-medium text-amber-700">Email</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Click Indicator */}
                  <div className="pt-4 border-t border-slate-200 mt-4">
                    <div className="text-slate-500 text-xs font-medium text-center flex items-center justify-center gap-1">
                      <span className="text-sm">👆</span>
                      <span>Click to go back</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Team Culture Section */}
        <div className="mt-20">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />

            <div className="relative">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Our Work Style
                </h2>
                <p className="text-slate-300 text-lg max-w-2xl mx-auto">
                  We're redefining what it means to be a modern team. Fast-paced, ambitious,
                  and never afraid to break the mold.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all">
                  <Mountain className="h-8 w-8 text-cyan-400 mb-4" />
                  <h3 className="text-white font-bold mb-2">Work Hard</h3>
                  <p className="text-slate-400 text-sm">
                    Late nights, early mornings, and everything in between. We put in the work to make magic happen.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all">
                  <Music className="h-8 w-8 text-purple-400 mb-4" />
                  <h3 className="text-white font-bold mb-2">Play Hard</h3>
                  <p className="text-slate-400 text-sm">
                    When we win, we celebrate. Gaming sessions, team outings, and good vibes are part of the culture.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all sm:col-span-2 lg:col-span-1">
                  <Rocket className="h-8 w-8 text-orange-400 mb-4" />
                  <h3 className="text-white font-bold mb-2">Change the Game</h3>
                  <p className="text-slate-400 text-sm">
                    We don't follow trends, we create them. Making things easier and better is what we do.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Team;