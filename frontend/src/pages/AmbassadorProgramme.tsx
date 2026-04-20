import { Link } from 'react-router-dom';
import { CheckCircle, TrendingUp, Users, Calendar, Shield, Award, Clock } from 'lucide-react';
import Footer from '@/components/Footer';

const AmbassadorProgramme = () => {
  const tiers = [
    { name: 'Bronze', color: 'bronze', bgColor: 'bg-amber-700', textColor: 'text-amber-700', borderColor: 'border-amber-700', doctors: '1 – 10', commission: '10%', example: 'R1,000', icon: '🟤' },
    { name: 'Silver', color: 'silver', bgColor: 'bg-gray-400', textColor: 'text-gray-500', borderColor: 'border-gray-400', doctors: '11 – 50', commission: '15%', example: 'R7,500', icon: '⚪' },
    { name: 'Gold', color: 'gold', bgColor: 'bg-yellow-500', textColor: 'text-yellow-600', borderColor: 'border-yellow-500', doctors: '51 – 99', commission: '18%', example: 'R13,500', icon: '🟡' },
    { name: 'Diamond', color: 'diamond', bgColor: 'bg-cyan-500', textColor: 'text-cyan-600', borderColor: 'border-cyan-500', doctors: '100+', commission: '20%', example: 'R20,000+', icon: '💎' },
  ];

  const earningsTable = [
    { tier: 'Bronze', doctors: 10, bookings: 100, revenue: 'R10,000', earnings: 'R1,000' },
    { tier: 'Silver', doctors: 50, bookings: 100, revenue: 'R50,000', earnings: 'R7,500' },
    { tier: 'Gold', doctors: 75, bookings: 100, revenue: 'R75,000', earnings: 'R13,500' },
    { tier: 'Diamond', doctors: 100, bookings: 100, revenue: 'R100,000', earnings: 'R20,000' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">MedMap Ambassador Program</h1>
          <p className="text-lg sm:text-xl md:text-2xl text-blue-100 mb-2">Grow With Us. Earn As We Grow.</p>
          <p className="text-xs sm:text-sm text-blue-200">Confidential | Version 1.0 | 2026</p>
        </div>
      </section>

      {/* What Is the Ambassador Program */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">What Is the Ambassador Program?</h2>
          <div className="max-w-4xl mx-auto">
            <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 text-center px-2">
              The MedMap Ambassador Program is a controlled, performance-based growth network. 
              Approved Ambassadors refer doctors to the MedMap platform and earn recurring monthly commission 
              based on the booking revenue those doctors generate.
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6 sm:p-8">
              <p className="text-lg sm:text-xl font-semibold text-blue-800 text-center mb-3 sm:mb-4">
                This is not a once-off referral bonus.
              </p>
              <p className="text-base sm:text-lg text-blue-700 text-center">
                For every active doctor you refer, you earn a percentage of the booking revenue they generate — 
                every single month, as long as they remain active on the platform.
              </p>
            </div>

            <p className="text-base sm:text-lg text-gray-600 mt-6 sm:mt-8 text-center">
              The program is structured around four performance tiers — Bronze, Silver, Gold, and Diamond — 
              with commission rates increasing as you grow your network of referred doctors.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 sm:mb-12 text-center">How It Works</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
            {[
              { step: 1, title: 'Apply', desc: 'Submit your application. All applications are reviewed and approved by the MedMap COO.' },
              { step: 2, title: 'Get Your Unique Code', desc: 'Receive a unique referral code. Doctors using your code are permanently linked to you.' },
              { step: 3, title: 'Build Your Network', desc: 'Refer doctors. More active doctors mean higher tier and greater commission.' },
              { step: 4, title: 'Earn Monthly Commission', desc: 'Automatic calculation at month-end. Paid 30 days in arrears.' },
            ].map((item) => (
              <div key={item.step} className="text-center p-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-xl sm:text-2xl font-bold text-blue-600">{item.step}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm sm:text-base text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Revenue Flow Example */}
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 sm:p-8">
            <h3 className="text-lg sm:text-xl font-semibold text-green-800 mb-3 sm:mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 flex-shrink-0" />
              Revenue Flow Example
            </h3>
            <p className="text-sm sm:text-base text-gray-700 mb-2 sm:mb-3">
              A doctor with 100 bookings in a month generates <span className="font-semibold">R1,000</span> in MedMap platform revenue.
            </p>
            <p className="text-base sm:text-lg font-semibold text-green-700 mb-2 sm:mb-3">
              At Diamond tier (20%), you earn R200 from that one doctor alone.
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              With 100 such doctors, that's <span className="font-semibold text-green-700">R20,000 per month</span>.
            </p>
          </div>
        </div>
      </section>

      {/* Ambassador Tiers */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 text-center">Ambassador Tiers</h2>
          <p className="text-sm sm:text-lg text-gray-600 mb-6 sm:mb-8 text-center px-2">
            Your tier is determined monthly based on your number of active referred doctors. 
            Tiers are recalculated at the start of every month — no lifetime guarantees, performance drives everything.
          </p>

          {/* Tiers Table - Mobile Card View */}
          <div className="block md:hidden space-y-4 mb-6">
            {tiers.map((tier, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-semibold">{tier.icon} {tier.name}</span>
                  <span className="text-lg font-bold text-blue-600">{tier.commission}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Active Doctors</p>
                    <p className="font-semibold">{tier.doctors}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Monthly Example*</p>
                    <p className="font-semibold text-green-600">{tier.example}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tiers Table - Desktop */}
          <div className="hidden md:block overflow-x-auto mb-8">
            <table className="w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="py-4 px-6 text-left">Tier</th>
                  <th className="py-4 px-6 text-left">Active Doctors</th>
                  <th className="py-4 px-6 text-left">Commission</th>
                  <th className="py-4 px-6 text-left">Monthly Example*</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <span className="font-semibold">{tier.icon} {tier.name}</span>
                    </td>
                    <td className="py-4 px-6">{tier.doctors}</td>
                    <td className="py-4 px-6 font-bold text-blue-600">{tier.commission}</td>
                    <td className="py-4 px-6 font-semibold">{tier.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs sm:text-sm text-gray-500 mb-6 text-center">
            * Monthly example based on 100 bookings per doctor per month at R10 per booking.
          </p>

          {/* Active Doctor Definition */}
          <div className="max-w-3xl mx-auto bg-blue-50 border border-blue-200 rounded-xl p-5 sm:p-6">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center text-sm sm:text-base">
              <Users className="w-5 h-5 mr-2 flex-shrink-0" />
              What makes a doctor "active"?
            </h4>
            <p className="text-sm sm:text-base text-blue-700">
              A referred doctor must generate a minimum of <span className="font-semibold">50 completed bookings</span> in that calendar month 
              to count toward your tier and commission calculation.
            </p>
          </div>
        </div>
      </section>

      {/* Earnings Potential */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 text-center">Earnings Potential</h2>
          <p className="text-sm sm:text-lg text-gray-600 mb-6 sm:mb-8 text-center px-2">
            Below is a realistic earnings illustration based on doctors averaging 100 bookings per month. 
            Higher-volume practices will generate more revenue and, consequently, higher commission.
          </p>

          {/* Earnings Table - Mobile Card View */}
          <div className="block md:hidden space-y-4 mb-6">
            {earningsTable.map((row, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-semibold">{row.tier}</span>
                  <span className="text-lg font-bold text-green-600">{row.earnings}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Doctors</p>
                    <p className="font-semibold">{row.doctors}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Bookings/Doc/Month</p>
                    <p className="font-semibold">{row.bookings}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Platform Revenue</p>
                    <p className="font-semibold">{row.revenue}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Earnings Table - Desktop */}
          <div className="hidden md:block overflow-x-auto mb-8">
            <table className="w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="py-4 px-6 text-left">Tier</th>
                  <th className="py-4 px-6 text-left">Doctors</th>
                  <th className="py-4 px-6 text-left">Bookings/Doc/Month</th>
                  <th className="py-4 px-6 text-left">Platform Revenue</th>
                  <th className="py-4 px-6 text-left">Your Earnings</th>
                </tr>
              </thead>
              <tbody>
                {earningsTable.map((row, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-4 px-6 font-semibold">{row.tier}</td>
                    <td className="py-4 px-6">{row.doctors}</td>
                    <td className="py-4 px-6">{row.bookings}</td>
                    <td className="py-4 px-6">{row.revenue}</td>
                    <td className="py-4 px-6 font-bold text-green-600">{row.earnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs sm:text-sm text-gray-500 mb-6 text-center">
            Commission is calculated on completed, paid bookings only. Refunds and reversals are excluded.
          </p>

          {/* Diamond Scenario */}
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-6 sm:p-8">
            <h4 className="text-lg sm:text-xl font-semibold text-cyan-800 mb-3 flex items-center">
              <Award className="w-5 h-5 mr-2 flex-shrink-0" />
              Diamond Scenario
            </h4>
            <p className="text-sm sm:text-base text-gray-700 mb-2">
              100 active doctors × 100 bookings/month × R10 = <span className="font-semibold">R100,000 platform revenue</span>
            </p>
            <p className="text-base sm:text-lg font-bold text-cyan-700 mb-2">
              Your 20% commission = R20,000 per month
            </p>
            <p className="text-sm sm:text-base text-gray-600">
              Paid every month for as long as your doctors remain active.
            </p>
          </div>
        </div>
      </section>

      {/* Payment Terms */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">Payment Terms</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 flex-shrink-0 text-blue-600" />
                Payment Schedule
              </h3>
              <ul className="space-y-3 text-sm sm:text-base text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Revenue calculated on the 1st of every month for prior month
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Commission payments made 30 days after calculation date
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Electronic bank transfer to registered banking details
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Subject to internal verification and COO approval
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 rounded-xl p-5 sm:p-6 border border-blue-200">
              <h3 className="text-lg sm:text-xl font-semibold text-blue-900 mb-3 sm:mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 flex-shrink-0" />
                Example Payment Timeline
              </h3>
              <div className="flex items-center justify-center space-x-2 sm:space-x-4 text-blue-800">
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
                    <span className="font-bold text-xs sm:text-sm md:text-base">Jan</span>
                  </div>
                  <p className="text-[10px] sm:text-xs md:text-sm">Revenue</p>
                </div>
                <span className="text-lg sm:text-xl md:text-2xl">→</span>
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
                    <span className="font-bold text-xs sm:text-sm md:text-base">1 Feb</span>
                  </div>
                  <p className="text-[10px] sm:text-xs md:text-sm">Calculated</p>
                </div>
                <span className="text-lg sm:text-xl md:text-2xl">→</span>
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
                    <span className="font-bold text-xs sm:text-sm md:text-base">1 Mar</span>
                  </div>
                  <p className="text-[10px] sm:text-xs md:text-sm">Paid</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-blue-700 mt-4 text-center px-2">
                This 30-day holding period protects both parties and allows for handling of reversals, refunds, or fraud flags.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ambassador Governance */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 text-center">Ambassador Governance</h2>
          <p className="text-sm sm:text-lg text-gray-600 mb-6 sm:mb-8 text-center px-2">
            MedMap believes in keeping Ambassadors informed, empowered, and engaged. 
            The Ambassador Program operates under the direct oversight of the Chief Operating Officer (COO).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-md border border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Monthly Touchpoints</h3>
              <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Automated commission and performance statement
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Monthly newsletter with platform updates
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Tier status confirmation
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-md border border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Quarterly Engagements</h3>
              <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Virtual performance meeting hosted by COO
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Product roadmap updates and feature previews
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Recognition of top-performing Ambassadors
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-md border border-gray-200 sm:col-span-2 lg:col-span-1">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Ambassador Dashboard</h3>
              <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Total referred doctors
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Active doctor count and current tier
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Pending commission and payment history
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Rules & Safeguards */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">Rules & Safeguards</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            <div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-200">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Doctor Referral Rules</h3>
              </div>
              <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-600">
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  Each doctor permanently linked to one Ambassador
                </li>
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  Code must be entered at onboarding — no retroactive claims
                </li>
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  Self-referrals prohibited without prior approval
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-200">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Fraud & Abuse Prevention</h3>
              </div>
              <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-600">
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  Active monitoring for duplicate registrations
                </li>
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  Suspicious activity results in commission suspension
                </li>
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  Fraudulent earnings may be reversed
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-200 md:col-span-2 lg:col-span-1">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Compliance Standards</h3>
              </div>
              <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-600">
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Act ethically and professionally
                </li>
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  No medical claims or misrepresentation
                </li>
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Ambassadors are independent partners
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Ready to Become a MedMap Ambassador?</h2>
          <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-6 sm:mb-8 px-2">
            Join our growing network and earn monthly commission while helping expand healthcare access across South Africa.
          </p>
          <Link 
            to="/signup/ambassador"
            className="bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold hover:bg-blue-50 transition-colors duration-200 shadow-lg inline-block"
          >
            Apply Now
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default AmbassadorProgramme;