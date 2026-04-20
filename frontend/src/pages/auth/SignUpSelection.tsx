// pages/auth/SignUpSelection.tsx
import { Link } from 'react-router-dom';
import { User, Stethoscope, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SignUpSelection = () => {
  const options = [
    {
      title: 'Patient',
      description: 'Book appointments and manage your healthcare journey',
      icon: User,
      href: '/signup/patient',
      color: 'border-blue-200 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-white',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'Doctor',
      description: 'Join our platform and grow your practice',
      icon: Stethoscope,
      href: '/signup/doctor',
      color: 'border-green-200 hover:border-green-400 bg-gradient-to-br from-green-50 to-white',
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      title: 'Ambassador',
      description: 'Earn monthly commission by referring doctors to MedMap',
      icon: Award,
      href: '/signup/ambassador',
      color: 'border-purple-200 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-white',
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-blue-600 mb-4 inline-block">
            MedMap
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
          <p className="text-lg text-gray-600">Choose how you'd like to join MedMap</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <Link key={option.title} to={option.href}>
                <Card className={`h-full transition-all cursor-pointer border-2 ${option.color} hover:shadow-lg`}>
                  <CardHeader className="text-center pb-2">
                    <div className={`mx-auto w-16 h-16 rounded-full ${option.iconBg} shadow-sm flex items-center justify-center mb-4`}>
                      <Icon className={`w-8 h-8 ${option.iconColor}`} />
                    </div>
                    <CardTitle className="text-xl">{option.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-sm">
                      {option.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <p className="text-center mt-8 text-gray-600">
          Already have an account?{' '}
          <Link to="/signin" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpSelection;