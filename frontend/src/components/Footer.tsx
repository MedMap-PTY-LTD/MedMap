import React from 'react';
import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          {/* Logo & Description - Full width on mobile */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">MedMap</span>
            </div>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-4 max-w-md">
              South Africa's premier healthcare booking platform. Making quality care accessible to everyone.
            </p>
            <div className="text-xs sm:text-sm text-slate-500">
              © 2024 MedMap (Pty) Ltd
            </div>
          </div>
          
          {/* Patients Links */}
          <div>
            <h4 className="text-white font-semibold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wider">
              Patients
            </h4>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <li>
                <Link to="/search" className="text-slate-400 hover:text-white transition-colors">
                  Find a Doctor
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-slate-400 hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/memberships" className="text-slate-400 hover:text-white transition-colors">
                  Premium Membership
                </Link>
              </li>
              <li>
                <Link to="/telemedicine" className="text-slate-400 hover:text-white transition-colors">
                  Telemedicine
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-slate-400 hover:text-white transition-colors">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Professionals Links */}
          <div>
            <h4 className="text-white font-semibold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wider">
              Professionals
            </h4>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <li>
                <Link to="/doctor-enrollment" className="text-slate-400 hover:text-white transition-colors">
                  Join Our Network
                </Link>
              </li>
              <li>
                <Link to="/practice-management" className="text-slate-400 hover:text-white transition-colors">
                  Practice Dashboard
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-slate-400 hover:text-white transition-colors">
                  Pricing & Plans
                </Link>
              </li>
              <li>
                <Link to="/resources" className="text-slate-400 hover:text-white transition-colors">
                  Resources
                </Link>
              </li>
              <li>
                <Link to="/support" className="text-slate-400 hover:text-white transition-colors">
                  Doctor Support
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Company Links */}
          <div>
            <h4 className="text-white font-semibold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <li>
                <Link to="/about" className="text-slate-400 hover:text-white transition-colors">
                  About MedMap
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-slate-400 hover:text-white transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/press" className="text-slate-400 hover:text-white transition-colors">
                  Press
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-400 hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/legal" className="text-slate-400 hover:text-white transition-colors">
                  Legal & Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-slate-800 mt-10 sm:mt-12 pt-6 sm:pt-8 text-xs sm:text-sm text-center text-slate-500">
          <p className="px-4">
            Proudly South African. 🇿🇦 Healthcare for everyone, everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;