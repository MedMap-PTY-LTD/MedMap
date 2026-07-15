// components/HelpWidget.tsx
import { useState } from 'react';
import { HelpCircle, MessageCircle, Phone, AlertTriangle, Heart, Ambulance, Shield } from 'lucide-react';

const EMERGENCY_NUMBERS = [
  { name: 'National Emergency', number: '10111', icon: Shield, description: 'Police, Fire, Medical' },
  { name: 'Ambulance', number: '10177', icon: Ambulance, description: 'Medical Emergency' },
  { name: 'Netcare 911', number: '082 911', icon: Heart, description: 'Private Ambulance' },
  { name: 'ER24', number: '084 124', icon: Heart, description: 'Private Ambulance' },
  { name: 'Poison Control', number: '0861 555 777', icon: AlertTriangle, description: '24/7 Helpline' },
  { name: 'AIDS Helpline', number: '0800 012 322', icon: Phone, description: 'Toll-free' },
];

export const HelpWidget = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

  const handleEmergencyCall = (number: string) => {
    window.location.href = `tel:${number.replace(/\s/g, '')}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Emergency Button */}
      <div className="relative">
        <button
          onClick={() => setIsEmergencyOpen(!isEmergencyOpen)}
          className="w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center animate-pulse"
          aria-label="Emergency numbers"
        >
          <AlertTriangle className="h-6 w-6" />
        </button>

        {isEmergencyOpen && (
          <div className="absolute bottom-14 right-0 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden mb-2">
            <div className="p-4 bg-red-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Emergency Contacts</h3>
                  <p className="text-xs text-white/80">24/7 - Call immediately for help</p>
                </div>
              </div>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              {EMERGENCY_NUMBERS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleEmergencyCall(item.number)}
                    className="w-full flex items-center gap-3 px-3 py-3 text-slate-700 hover:bg-red-50 rounded-lg transition-colors group"
                  >
                    <div className="w-8 h-8 bg-red-100 group-hover:bg-red-200 rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
                      <Icon className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">{item.name}</span>
                        <span className="text-sm font-bold text-red-600">{item.number}</span>
                      </div>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-600 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-slate-500" />
                For medical emergencies, call your local emergency services immediately
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Help & Support Button */}
      <div className="relative">
        <button
          onClick={() => setIsHelpOpen(!isHelpOpen)}
          className="w-12 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          aria-label="Help & Support"
        >
          <HelpCircle className="h-6 w-6" />
        </button>

        {isHelpOpen && (
          <div className="absolute bottom-14 right-0 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden mb-2">
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-medium text-slate-900 text-sm">How can we help?</h3>
            </div>
            <div className="p-2">
              <button
                onClick={() => window.location.href = '/support'}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-slate-500" />
                <span>Live Chat</span>
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Available</span>
              </button>
              <button
                onClick={() => window.location.href = '/contact'}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <HelpCircle className="h-4 w-4 text-slate-500" />
                <span>FAQs & Support</span>
              </button>
              <button
                onClick={() => window.location.href = '/doctor-enrollment'}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Phone className="h-4 w-4 text-slate-500" />
                <span>Join as Doctor</span>
              </button>
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-slate-400" />
                Response time: &lt; 2 hours
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};