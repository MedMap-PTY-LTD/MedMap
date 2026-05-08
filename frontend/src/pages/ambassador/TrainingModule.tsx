// pages/ambassador/TrainingModule.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  BookOpen, Download, FileText, CheckCircle, Clock, Award,
  Users, TrendingUp, Shield, Heart, Target, Video, Mic,
  DownloadCloud, FileCheck, GraduationCap, Sparkles, ChevronRight
} from 'lucide-react';

interface Module {
  id: number;
  title: string;
  description: string;
  duration: string;
  topics: string[];
  content: string;
  downloadable: boolean;
  downloadUrl?: string;
}

const modules: Module[] = [
  {
    id: 1,
    title: "Introduction to MedMap",
    description: "Understanding our mission, vision, and platform",
    duration: "15 min",
    downloadable: true,
    topics: [
      "What is MedMap and why it exists",
      "Our mission to transform healthcare access in South Africa",
      "Key platform features and benefits for doctors and patients",
      "How MedMap differs from competitors",
      "Success stories and platform statistics"
    ],
    content: `
      <h3>Welcome to MedMap</h3>
      <p>MedMap is South Africa's leading healthcare booking platform, connecting patients with quality healthcare providers across the nation.</p>
      
      <h4>Our Mission</h4>
      <p>To make healthcare accessible, transparent, and convenient for all South Africans by providing a trusted platform that connects patients with the right doctors at the right time.</p>
      
      <h4>Our Vision</h4>
      <p>To become the most trusted healthcare marketplace in Africa, improving health outcomes through technology and innovation.</p>
      
      <h4>Platform Features</h4>
      <ul>
        <li>Easy online booking and scheduling</li>
        <li>Doctor profiles with reviews and ratings</li>
        <li>Telemedicine integration</li>
        <li>Secure payment processing</li>
        <li>Patient medical records management</li>
        <li>Prescription management</li>
      </ul>
      
      <h4>Why Doctors Choose MedMap</h4>
      <ul>
        <li>Increase patient volume without marketing costs</li>
        <li>Reduce no-shows with automated reminders</li>
        <li>Streamline practice management</li>
        <li>Accept online payments securely</li>
        <li>Access to patient analytics and insights</li>
      </ul>
    `
  },
  {
    id: 2,
    title: "The Ambassador Program Explained",
    description: "How the program works and how you earn",
    duration: "20 min",
    downloadable: true,
    topics: [
      "What is the Ambassador Program",
      "How commission works",
      "Understanding active doctors",
      "Referral tracking and attribution",
      "Payment schedule and terms"
    ],
    content: `
      <h3>The MedMap Ambassador Program</h3>
      <p>The Ambassador Program is a performance-based growth network. Approved Ambassadors refer doctors to the MedMap platform and earn recurring monthly commission based on the booking revenue those doctors generate.</p>
      
      <h4>How It Works</h4>
      <ol>
        <li><strong>Apply:</strong> Submit your application. All applications are reviewed by the MedMap COO.</li>
        <li><strong>Get Your Unique Code:</strong> Receive a unique referral code. Doctors using your code are permanently linked to you.</li>
        <li><strong>Build Your Network:</strong> Refer doctors. More active doctors mean higher tier and greater commission.</li>
        <li><strong>Earn Monthly Commission:</strong> Automatic calculation at month-end. Paid 30 days in arrears.</li>
      </ol>
      
      <h4>Commission Structure</h4>
      <ul>
        <li><strong>Bronze Tier:</strong> 1-10 active doctors → 10% commission</li>
        <li><strong>Silver Tier:</strong> 11-50 active doctors → 15% commission</li>
        <li><strong>Gold Tier:</strong> 51-99 active doctors → 18% commission</li>
        <li><strong>Diamond Tier:</strong> 100+ active doctors → 20% commission</li>
      </ul>
      
      <h4>What Makes a Doctor "Active"?</h4>
      <p>A referred doctor must generate a minimum of 50 completed bookings in that calendar month to count toward your tier and commission calculation.</p>
    `
  },
  {
    id: 3,
    title: "Tiers, Commission & Earnings Potential",
    description: "Detailed breakdown of earning opportunities",
    duration: "25 min",
    downloadable: true,
    topics: [
      "Tier requirements and benefits",
      "Commission calculation examples",
      "Monthly earning potential",
      "Payment terms and schedule",
      "Tax considerations"
    ],
    content: `
      <h3>Understanding Your Earning Potential</h3>
      
      <h4>Tier Breakdown</h4>
      <table>
        <tr><th>Tier</th><th>Active Doctors</th><th>Commission Rate</th><th>Monthly Example*</th></tr>
        <tr><td>Bronze</td><td>1 - 10</td><td>10%</td><td>R1,000</td></tr>
        <tr><td>Silver</td><td>11 - 50</td><td>15%</td><td>R7,500</td></tr>
        <tr><td>Gold</td><td>51 - 99</td><td>18%</td><td>R13,500</td></tr>
        <tr><td>Diamond</td><td>100+</td><td>20%</td><td>R20,000+</td></tr>
      </table>
      
      <h4>Example Calculation</h4>
      <p>A doctor with 100 bookings in a month generates R1,000 in MedMap platform revenue. At Diamond tier (20%), you earn R200 from that one doctor alone. With 100 such doctors, that's R20,000 per month.</p>
      
      <h4>Payment Terms</h4>
      <ul>
        <li>Revenue calculated on the 1st of every month for prior month</li>
        <li>Commission payments made 30 days after calculation date</li>
        <li>Electronic bank transfer to registered banking details</li>
        <li>Subject to internal verification and COO approval</li>
      </ul>
    `
  },
  {
    id: 4,
    title: "Best Practices for Success",
    description: "Strategies and techniques to maximize referrals",
    duration: "30 min",
    downloadable: true,
    topics: [
      "Building genuine relationships with doctors",
      "Effective communication techniques",
      "Leveraging social media and networking",
      "Handling objections",
      "Follow-up strategies"
    ],
    content: `
      <h3>Becoming a Successful Ambassador</h3>
      
      <h4>Build Genuine Relationships</h4>
      <p>Focus on providing value, not just making a sale. Understand each doctor's unique needs and show how MedMap addresses them.</p>
      
      <h4>Master Your Communication</h4>
      <ul>
        <li>Be clear, confident, and professional</li>
        <li>Listen actively to understand concerns</li>
        <li>Tailor your message to each doctor's situation</li>
        <li>Follow up consistently without being pushy</li>
      </ul>
      
      <h4>Networking Strategies</h4>
      <ul>
        <li>Attend healthcare industry events and conferences</li>
        <li>Join medical professional associations</li>
        <li>Connect with doctors on LinkedIn and other platforms</li>
        <li>Ask satisfied referred doctors for introductions</li>
      </ul>
      
      <h4>Handling Objections</h4>
      <ul>
        <li>"I'm too busy" → Explain how MedMap saves time</li>
        <li>"I already have enough patients" → Discuss practice growth</li>
        <li>"I don't like technology" → Offer hands-on assistance</li>
        <li>"What's in it for me?" → Highlight benefits clearly</li>
      </ul>
    `
  },
  {
    id: 5,
    title: "Ethics, Compliance & Professional Standards",
    description: "Rules, regulations, and expected conduct",
    duration: "20 min",
    downloadable: true,
    topics: [
      "Code of conduct for ambassadors",
      "Ethical marketing practices",
      "Privacy and data protection",
      "Fraud prevention",
      "Consequences of violations"
    ],
    content: `
      <h3>Professional Standards and Compliance</h3>
      
      <h4>Code of Conduct</h4>
      <ul>
        <li>Always act with integrity and honesty</li>
        <li>Represent MedMap accurately and professionally</li>
        <li>Never make false or misleading claims</li>
        <li>Respect doctor and patient privacy</li>
        <li>Report any compliance concerns promptly</li>
      </ul>
      
      <h4>Prohibited Activities</h4>
      <ul>
        <li>Making false medical claims or misrepresenting MedMap</li>
        <li>Self-referrals without prior approval</li>
        <li>Spamming or aggressive marketing tactics</li>
        <li>Promising incentives not authorized by MedMap</li>
        <li>Sharing confidential platform information</li>
      </ul>
      
      <h4>Fraud Prevention</h4>
      <p>MedMap monitors for suspicious activity including duplicate registrations, fake bookings, and gaming the system. Fraudulent activity will result in immediate termination and forfeiture of commissions.</p>
    `
  }
];

const TrainingModule = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentModule, setCurrentModule] = useState(0);
  const [completedModules, setCompletedModules] = useState<number[]>([]);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  const handleCompleteModule = async (moduleId: number) => {
    if (!completedModules.includes(moduleId)) {
      const newCompleted = [...completedModules, moduleId];
      setCompletedModules(newCompleted);
      
      // If all modules completed, update onboarding step
      if (newCompleted.length === modules.length) {
        try {
          await updateDoc(doc(db, 'ambassadors', user!.uid), {
            'trainingModule.completed': true,
            'trainingModule.completedAt': serverTimestamp(),
            onboardingStep: 3,
            updatedAt: serverTimestamp(),
          });
          
          toast({
            title: 'Training Completed!',
            description: 'Congratulations! You can now take the Knowledge Test.',
          });
          
          navigate('/ambassador/portal');
        } catch (error) {
          console.error('Error completing training:', error);
          toast({ title: 'Error', description: 'Failed to save progress.', variant: 'destructive' });
        }
      } else {
        toast({
          title: 'Module Completed!',
          description: `Great job! ${newCompleted.length} of ${modules.length} modules completed.`,
        });
      }
    }
  };

  const handleDownload = (module: Module) => {
    setSelectedModule(module);
    setShowDownloadDialog(true);
  };

  const downloadModule = (module: Module) => {
    // Create PDF content (simplified - in production, use a proper PDF generator)
    const content = `
      ${module.title}
      ${module.description}
      
      ${module.content.replace(/<[^>]*>/g, '')}
      
      MedMap Ambassador Training
      ${new Date().toLocaleDateString()}
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${module.title.toLowerCase().replace(/ /g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: 'Download Started', description: `${module.title} is being downloaded.` });
    setShowDownloadDialog(false);
  };

  const progress = (completedModules.length / modules.length) * 100;
  const currentMod = modules[currentModule];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Ambassador Training Module</h1>
          <p className="text-gray-600 mt-2">Complete all modules to unlock the Knowledge Test</p>
        </div>

        {/* Progress Overview */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Training Progress</span>
              <span className="text-sm font-medium text-blue-600">{completedModules.length}/{modules.length} Modules</span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-gray-500 mt-3">
              {progress === 100 ? (
                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Ready for Knowledge Test!</span>
              ) : (
                <span>Complete {modules.length - completedModules.length} more module(s) to finish training</span>
              )}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Module Navigation Sidebar */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Training Modules</CardTitle>
              <CardDescription>Click any module to start learning</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {modules.map((module, idx) => (
                <div
                  key={module.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    currentModule === idx
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : completedModules.includes(module.id)
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => setCurrentModule(idx)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        completedModules.includes(module.id) ? 'bg-green-500' : 'bg-gray-300'
                      }`}>
                        {completedModules.includes(module.id) ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <span className="text-xs text-white font-bold">{module.id}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{module.title}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {module.duration}
                        </p>
                      </div>
                    </div>
                    {currentModule === idx && <ChevronRight className="w-4 h-4 text-blue-600" />}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Module Content */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{currentMod.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4" /> Estimated reading time: {currentMod.duration}
                  </CardDescription>
                </div>
                {currentMod.downloadable && (
                  <Button variant="outline" onClick={() => handleDownload(currentMod)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Topics List */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  What you'll learn:
                </h3>
                <ul className="space-y-1">
                  {currentMod.topics.map((topic, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Module Content */}
              <div className="prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: currentMod.content }} />
              </div>

              {/* Complete Button */}
              {!completedModules.includes(currentMod.id) && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handleCompleteModule(currentMod.id)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Module as Complete
                </Button>
              )}

              {completedModules.includes(currentMod.id) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-sm text-green-700 font-medium">Module Completed!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Download Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DownloadCloud className="w-5 h-5 text-blue-600" />
              Download Training Module
            </DialogTitle>
            <DialogDescription>
              You are about to download "{selectedModule?.title}" for offline reference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This module contains valuable information about {selectedModule?.title.toLowerCase()}. 
              Keep it for your records and reference.
            </p>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> While you can download modules for reference, you must complete the interactive 
                training in the portal to unlock the Knowledge Test.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDownloadDialog(false)}>Cancel</Button>
            <Button onClick={() => selectedModule && downloadModule(selectedModule)}>
              <Download className="w-4 h-4 mr-2" />
              Download Module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingModule;