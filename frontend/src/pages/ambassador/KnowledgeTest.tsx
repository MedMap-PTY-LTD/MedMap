// pages/ambassador/KnowledgeTest.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Clock, AlertTriangle, CheckCircle, XCircle, Loader2, 
  Flag, Timer, Award, Target, Brain, BookOpen, GraduationCap
} from 'lucide-react';

// 50 Knowledge Test Questions (based on training modules)
const knowledgeQuestions = [
  // Module 1: Introduction to MedMap (Questions 1-10)
  {
    id: 1,
    module: "Introduction to MedMap",
    question: "What is MedMap's primary mission?",
    options: [
      "To become the largest healthcare booking platform in Africa",
      "To connect patients with quality healthcare providers and improve access to care",
      "To provide free healthcare to all South Africans",
      "To compete with existing healthcare platforms"
    ],
    correct: 1
  },
  {
    id: 2,
    module: "Introduction to MedMap",
    question: "Which of the following is NOT a feature of the MedMap platform?",
    options: [
      "Online booking and scheduling",
      "Telemedicine integration",
      "In-house pharmacy services",
      "Patient medical records management"
    ],
    correct: 2
  },
  {
    id: 3,
    module: "Introduction to MedMap",
    question: "Why do doctors choose MedMap according to the training?",
    options: [
      "Because it's the only platform available",
      "To increase patient volume without marketing costs",
      "Because they are required to by law",
      "To get free marketing materials"
    ],
    correct: 1
  },
  {
    id: 4,
    module: "Introduction to MedMap",
    question: "MedMap's vision is to become:",
    options: [
      "The most profitable healthcare company in Africa",
      "The most trusted healthcare marketplace in Africa",
      "The largest employer of healthcare workers in SA",
      "A government healthcare provider"
    ],
    correct: 1
  },
  {
    id: 5,
    module: "Introduction to MedMap",
    question: "What problem does MedMap solve for patients?",
    options: [
      "Finding affordable medication",
      "Finding the right doctor and booking appointments easily",
      "Getting health insurance",
      "Accessing hospital beds"
    ],
    correct: 1
  },
  {
    id: 6,
    module: "Introduction to MedMap",
    question: "How does MedMap help reduce no-shows for doctors?",
    options: [
      "By charging patients a cancellation fee",
      "Through automated appointment reminders",
      "By requiring prepayment for all visits",
      "By blacklisting patients who miss appointments"
    ],
    correct: 1
  },
  {
    id: 7,
    module: "Introduction to MedMap",
    question: "What type of analytics does MedMap provide to doctors?",
    options: [
      "Patient demographics and booking patterns",
      "Stock market predictions",
      "Competitor pricing data",
      "Weather forecasts"
    ],
    correct: 0
  },
  {
    id: 8,
    module: "Introduction to MedMap",
    question: "MedMap was founded with the goal of serving which market primarily?",
    options: [
      "The United States",
      "South Africa and Africa",
      "Europe",
      "Asia"
    ],
    correct: 1
  },
  {
    id: 9,
    module: "Introduction to MedMap",
    question: "Which of the following best describes MedMap's value proposition for doctors?",
    options: [
      "A free listing service with no benefits",
      "A comprehensive practice growth and management platform",
      "A social network for medical professionals",
      "An inventory management system"
    ],
    correct: 1
  },
  {
    id: 10,
    module: "Introduction to MedMap",
    question: "What makes MedMap different from traditional doctor directories?",
    options: [
      "It only lists specialists",
      "It offers actual booking functionality and payment processing",
      "It charges patients to use the service",
      "It requires monthly subscriptions from patients"
    ],
    correct: 1
  },

  // Module 2: The Ambassador Program Explained (Questions 11-20)
  {
    id: 11,
    module: "Ambassador Program",
    question: "How does the ambassador commission structure work?",
    options: [
      "One-time payment per referred doctor",
      "Monthly commission based on tier and referred doctor performance",
      "Annual bonus based on total referrals",
      "Fixed salary plus commission"
    ],
    correct: 1
  },
  {
    id: 12,
    module: "Ambassador Program",
    question: "What makes a referred doctor 'active' for commission calculation?",
    options: [
      "Being registered on the platform",
      "Having at least 10 patients",
      "Generating minimum 50 completed bookings in a calendar month",
      "Paying their subscription fee"
    ],
    correct: 2
  },
  {
    id: 13,
    module: "Ambassador Program",
    question: "What are the four ambassador tiers?",
    options: [
      "Basic, Premium, Elite, Ultimate",
      "Bronze, Silver, Gold, Platinum",
      "Bronze, Silver, Gold, Diamond",
      "Entry, Intermediate, Advanced, Expert"
    ],
    correct: 2
  },
  {
    id: 14,
    module: "Ambassador Program",
    question: "What commission rate do Diamond tier ambassadors earn?",
    options: ["10%", "15%", "18%", "20%"],
    correct: 3
  },
  {
    id: 15,
    module: "Ambassador Program",
    question: "How are doctors permanently linked to an ambassador?",
    options: [
      "By signing a contract",
      "Through a unique referral code entered at onboarding",
      "By mentioning the ambassador's name",
      "Through a monthly agreement"
    ],
    correct: 1
  },
  {
    id: 16,
    module: "Ambassador Program",
    question: "Who reviews and approves ambassador applications?",
    options: [
      "The automated system",
      "The MedMap COO",
      "Any MedMap employee",
      "Current ambassadors"
    ],
    correct: 1
  },
  {
    id: 17,
    module: "Ambassador Program",
    question: "Once you refer a doctor, how long are they linked to you?",
    options: [
      "6 months",
      "1 year",
      "Permanently",
      "Until they stop using the platform"
    ],
    correct: 2
  },
  {
    id: 18,
    module: "Ambassador Program",
    question: "Can you refer yourself to become a doctor on MedMap?",
    options: [
      "Yes, always allowed",
      "Only if you're also a doctor",
      "Prohibited without prior approval",
      "Only for the first referral"
    ],
    correct: 2
  },
  {
    id: 19,
    module: "Ambassador Program",
    question: "What happens if a doctor you referred leaves the platform?",
    options: [
      "You lose that doctor's contribution to your tier",
      "You continue earning commissions",
      "You can refer them again",
      "You get penalized"
    ],
    correct: 0
  },
  {
    id: 20,
    module: "Ambassador Program",
    question: "How are referrals tracked in the system?",
    options: [
      "By doctor's name",
      "By practice name",
      "By unique referral code",
      "By email address"
    ],
    correct: 2
  },

  // Module 3: Tiers, Commission & Earnings (Questions 21-30)
  {
    id: 21,
    module: "Earnings",
    question: "What is the minimum number of active doctors needed for Silver tier?",
    options: ["5", "10", "11", "15"],
    correct: 2
  },
  {
    id: 22,
    module: "Earnings",
    question: "What commission rate do Bronze tier ambassadors earn?",
    options: ["5%", "8%", "10%", "12%"],
    correct: 2
  },
  {
    id: 23,
    module: "Earnings",
    question: "If a practice generates R50,000 in monthly revenue and you're at Gold tier (18%), how much commission do you earn?",
    options: ["R5,000", "R7,500", "R9,000", "R10,000"],
    correct: 2
  },
  {
    id: 24,
    module: "Earnings",
    question: "When are commissions calculated each month?",
    options: [
      "On the last day of the month",
      "On the 1st of the month for the prior month",
      "On the 15th of each month",
      "Quarterly"
    ],
    correct: 1
  },
  {
    id: 25,
    module: "Earnings",
    question: "When are commission payments made?",
    options: [
      "Immediately after calculation",
      "15 days after calculation",
      "30 days after calculation date",
      "60 days after calculation"
    ],
    correct: 2
  },
  {
    id: 26,
    module: "Earnings",
    question: "What is the purpose of the 30-day payment hold?",
    options: [
      "To earn interest on ambassador commissions",
      "To allow for handling of reversals, refunds, and fraud checks",
      "To discourage ambassadors from working hard",
      "To batch payments for accounting purposes"
    ],
    correct: 1
  },
  {
    id: 27,
    module: "Earnings",
    question: "How many active doctors are needed for Diamond tier?",
    options: ["50+", "75+", "99+", "100+"],
    correct: 3
  },
  {
    id: 28,
    module: "Earnings",
    question: "If you have 75 active doctors at Gold tier (18%), and each generates R10,000 monthly, what is your approximate monthly earnings?",
    options: ["R75,000", "R100,000", "R135,000", "R150,000"],
    correct: 2
  },
  {
    id: 29,
    module: "Earnings",
    question: "Are commissions paid on refunded or reversed bookings?",
    options: [
      "Yes, always",
      "No, refunds and reversals are excluded",
      "Only if the refund is less than R100",
      "It depends on the reason"
    ],
    correct: 1
  },
  {
    id: 30,
    module: "Earnings",
    question: "What is the minimum number of bookings per month for a doctor to be considered 'active'?",
    options: ["25", "50", "75", "100"],
    correct: 1
  },

  // Module 4: Best Practices (Questions 31-40)
  {
    id: 31,
    module: "Best Practices",
    question: "What is the first step when approaching a potential doctor referral?",
    options: [
      "Give them your referral code immediately",
      "Listen to their needs and understand their practice",
      "Tell them about your commission structure",
      "Ask for a commitment"
    ],
    correct: 1
  },
  {
    id: 32,
    module: "Best Practices",
    question: "How should you handle a doctor's objection about being 'too busy'?",
    options: [
      "Insist they make time",
      "Move on to the next doctor",
      "Explain how MedMap saves time with automation",
      "Offer to manage their account for them"
    ],
    correct: 2
  },
  {
    id: 33,
    module: "Best Practices",
    question: "What should you do if a doctor you referred has technical issues?",
    options: [
      "Ignore them - it's MedMap's problem",
      "Direct them to MedMap support and follow up",
      "Try to fix it yourself",
      "Tell them to use a different platform"
    ],
    correct: 1
  },
  {
    id: 34,
    module: "Best Practices",
    question: "Which networking strategy is recommended for ambassadors?",
    options: [
      "Cold calling random numbers",
      "Attending healthcare industry events and conferences",
      "Spamming social media groups",
      "Only contacting friends and family"
    ],
    correct: 1
  },
  {
    id: 35,
    module: "Best Practices",
    question: "How should you follow up with a potential referral after initial contact?",
    options: [
      "Call them every day until they respond",
      "Send a single email and give up",
      "Provide value and check in at reasonable intervals",
      "Only contact them if they reach out first"
    ],
    correct: 2
  },
  {
    id: 36,
    module: "Best Practices",
    question: "What is the most important quality for a successful ambassador?",
    options: [
      "Being aggressive and persistent",
      "Having many doctor friends",
      "Building genuine relationships and providing value",
      "Having sales experience"
    ],
    correct: 2
  },
  {
    id: 37,
    module: "Best Practices",
    question: "When a doctor shows interest in MedMap, what should you do next?",
    options: [
      "Immediately send them the signup link",
      "Schedule a demo or provide more detailed information",
      "Ask them to refer other doctors first",
      "Tell them to figure it out themselves"
    ],
    correct: 1
  },
  {
    id: 38,
    module: "Best Practices",
    question: "How can you build credibility with potential doctor referrals?",
    options: [
      "Exaggerate your experience",
      "Share success stories and case studies",
      "Promise unrealistic results",
      "Focus only on your commission"
    ],
    correct: 1
  },
  {
    id: 39,
    module: "Best Practices",
    question: "What should you do if a doctor is not getting many bookings after joining?",
    options: [
      "Tell them the platform doesn't work",
      "Blame them for not promoting themselves",
      "Reach out to understand their concerns and offer assistance",
      "Ignore them and focus on new referrals"
    ],
    correct: 2
  },
  {
    id: 40,
    module: "Best Practices",
    question: "How often should you check in with your referred doctors?",
    options: [
      "Never - they'll contact you if needed",
      "Every day",
      "Regular intervals without being intrusive",
      "Only when you need something"
    ],
    correct: 2
  },

  // Module 5: Ethics & Compliance (Questions 41-50)
  {
    id: 41,
    module: "Ethics",
    question: "Which of the following is NOT allowed for ambassadors?",
    options: [
      "Sharing your unique referral code on social media",
      "Attending healthcare networking events",
      "Making false medical claims or misrepresenting MedMap",
      "Contacting potential doctor referrals via email"
    ],
    correct: 2
  },
  {
    id: 42,
    module: "Ethics",
    question: "You discover an error that would increase your commission. What should you do?",
    options: [
      "Keep quiet and enjoy the extra money",
      "Report the error to MedMap immediately",
      "Wait to see if anyone notices",
      "Tell your friends to do the same"
    ],
    correct: 1
  },
  {
    id: 43,
    module: "Ethics",
    question: "What is the consequence of fraudulent activity?",
    options: [
      "A warning letter",
      "Reduced commission rate",
      "Immediate termination and forfeiture of commissions",
      "Suspension for 30 days"
    ],
    correct: 2
  },
  {
    id: 44,
    module: "Ethics",
    question: "A competitor offers you a better deal to switch. What should you do?",
    options: [
      "Switch immediately",
      "Use it to negotiate better terms with MedMap",
      "Decline professionally and inform MedMap",
      "Work for both platforms secretly"
    ],
    correct: 2
  },
  {
    id: 45,
    module: "Ethics",
    question: "Is it acceptable to create fake doctor accounts to boost your commission?",
    options: [
      "Yes, if no one finds out",
      "Only for testing purposes",
      "Never - this is fraud and strictly prohibited",
      "With MedMap's permission"
    ],
    correct: 2
  },
  {
    id: 46,
    module: "Ethics",
    question: "A potential referral asks about another doctor's performance. What should you do?",
    options: [
      "Share detailed statistics to impress them",
      "Respect privacy and avoid sharing confidential information",
      "Make up impressive numbers",
      "Only share if they promise to sign up"
    ],
    correct: 1
  },
  {
    id: 47,
    module: "Ethics",
    question: "Can you refer a doctor who is already on MedMap?",
    options: [
      "Yes, you can claim any doctor",
      "Only if they haven't had any bookings",
      "No, each doctor is permanently linked to the first ambassador who referred them",
      "Yes, with the doctor's permission"
    ],
    correct: 2
  },
  {
    id: 48,
    module: "Ethics",
    question: "What should you do if you suspect another ambassador of fraudulent activity?",
    options: [
      "Confront them directly",
      "Ignore it - it's not your business",
      "Report your concerns to MedMap",
      "Copy their methods"
    ],
    correct: 2
  },
  {
    id: 49,
    module: "Ethics",
    question: "Is it acceptable to share MedMap's internal metrics or strategies publicly?",
    options: [
      "Yes, transparency is good",
      "Only with other ambassadors",
      "No, this is confidential information",
      "Only if you don't mention MedMap by name"
    ],
    correct: 2
  },
  {
    id: 50,
    module: "Ethics",
    question: "What is the most important principle for MedMap ambassadors?",
    options: [
      "Maximizing personal earnings at any cost",
      "Acting with integrity and professionalism at all times",
      "Outperforming other ambassadors",
      "Focusing only on high-value referrals"
    ],
    correct: 1
  }
];

const KnowledgeTest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(60 * 60); // 60 minutes in seconds
  const [submitting, setSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(3);

  useEffect(() => {
    checkExistingAttempts();
  }, [user]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (testStarted && timeRemaining > 0 && !submitting) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [testStarted, timeRemaining, submitting]);

  const checkExistingAttempts = async () => {
    if (!user) return;
    
    try {
      const ambassadorDoc = await getDoc(doc(db, 'ambassadors', user.uid));
      if (ambassadorDoc.exists()) {
        const data = ambassadorDoc.data();
        const existingAttempts = data.knowledgeTest?.attempts || 0;
        setAttempts(existingAttempts);
        
        if (existingAttempts >= maxAttempts && data.knowledgeTest?.passed !== true) {
          toast({
            title: 'Maximum Attempts Reached',
            description: 'You have used all 3 attempts. Your application has been reviewed.',
            variant: 'destructive',
          });
          navigate('/ambassador/portal');
        }
      }
    } catch (error) {
      console.error('Error checking attempts:', error);
    }
  };

  const handleTimeUp = async () => {
    toast({
      title: 'Time\'s Up!',
      description: 'Your time has expired. The test will be submitted with your current answers.',
      variant: 'destructive',
    });
    
    await submitTest(true);
  };

  const submitTest = async (isTimeout = false) => {
    setSubmitting(true);
    
    // Calculate score
    let correctCount = 0;
    knowledgeQuestions.forEach((q, idx) => {
      if (answers[idx] === q.options[q.correct]) {
        correctCount++;
      }
    });
    
    const score = Math.round((correctCount / knowledgeQuestions.length) * 100);
    const passed = score >= 75;
    const newAttempts = attempts + 1;
    
    try {
      const updateData: any = {
        'knowledgeTest.attempts': newAttempts,
        'knowledgeTest.lastAttemptDate': serverTimestamp(),
        'knowledgeTest.score': score,
        'knowledgeTest.passed': passed,
        updatedAt: serverTimestamp(),
      };
      
      if (passed) {
        updateData.onboardingStep = 4;
        updateData.interviewStatus = 'pending';
        updateData.applicationStatus = 'pending';
      }
      
      if (!passed && newAttempts >= maxAttempts) {
        updateData.applicationStatus = 'rejected';
        updateData.isActive = false;
      }
      
      await updateDoc(doc(db, 'ambassadors', user!.uid), updateData);
      
      if (passed) {
        toast({ 
          title: 'Congratulations!', 
          description: `You passed with ${score}%! Your application is now under review for an interview.`,
          duration: 8000,
        });
        navigate('/ambassador/portal');
      } else if (newAttempts >= maxAttempts) {
        toast({ 
          title: 'Application Not Successful', 
          description: `You scored ${score}%. You have used all ${maxAttempts} attempts. Thank you for your interest.`,
          variant: 'destructive',
          duration: 8000,
        });
        navigate('/ambassador/portal');
      } else {
        toast({ 
          title: 'Test Not Passed', 
          description: `You scored ${score}%. You have ${maxAttempts - newAttempts} attempt(s) remaining. 75% is required to pass.`,
          variant: 'destructive',
        });
        navigate('/ambassador/portal');
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      toast({ title: 'Error', description: 'Failed to submit test. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length !== knowledgeQuestions.length) {
      toast({ 
        title: 'Incomplete Test', 
        description: `Please answer all ${knowledgeQuestions.length} questions before submitting. You have answered ${Object.keys(answers).length}.`,
        variant: 'destructive' 
      });
      return;
    }
    setShowWarning(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining < 300) return 'text-red-600';
    if (timeRemaining < 600) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Show start screen if test not started
  if (!testStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Award className="w-8 h-8 text-purple-600" />
            </div>
            <CardTitle className="text-2xl">Knowledge Test</CardTitle>
            <CardDescription>
              Test your understanding of the MedMap Ambassador Program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Test Information</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-center gap-2">• <Timer className="w-4 h-4" /> 50 questions</li>
                <li className="flex items-center gap-2">• <Clock className="w-4 h-4" /> 60 minutes time limit</li>
                <li className="flex items-center gap-2">• <Target className="w-4 h-4" /> 75% passing score required</li>
                <li className="flex items-center gap-2">• <Award className="w-4 h-4" /> Maximum 3 attempts</li>
                <li className="flex items-center gap-2">• <Badge className="bg-purple-100 text-purple-800">Attempt {attempts + 1} of {maxAttempts}</Badge></li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Important Rules</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    • The timer starts as soon as you begin the test<br />
                    • You cannot pause the test once started<br />
                    • Make sure you have a stable internet connection<br />
                    • Do not refresh the page during the test<br />
                    • All questions must be answered before submitting
                  </p>
                </div>
              </div>
            </div>
            
            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg"
              onClick={() => setTestStarted(true)}
            >
              Start Test
              <Timer className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = knowledgeQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / knowledgeQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Timer and Progress Bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className={`w-5 h-5 ${getTimerColor()}`} />
              <span className={`font-mono text-xl font-bold ${getTimerColor()}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Question {currentQuestion + 1} of {knowledgeQuestions.length}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {Object.keys(answers).length} of {knowledgeQuestions.length} answered
            </div>
          </div>
          <Progress value={progress} className="h-1 mt-2" />
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <Badge className="w-fit bg-purple-100 text-purple-800 mb-2">
              {currentQ.module}
            </Badge>
            <CardTitle className="text-xl leading-relaxed">
              {currentQ.question}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <RadioGroup
              value={answers[currentQuestion] || ''}
              onValueChange={(value) => setAnswers({ ...answers, [currentQuestion]: value })}
              className="space-y-3"
            >
              {currentQ.options.map((option, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    answers[currentQuestion] === option
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                  onClick={() => setAnswers({ ...answers, [currentQuestion]: option })}
                >
                  <RadioGroupItem value={option} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="cursor-pointer flex-1 text-gray-700">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(prev => prev - 1)}
                disabled={currentQuestion === 0}
                className="px-6"
              >
                Previous
              </Button>
              
              {currentQuestion < knowledgeQuestions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestion(prev => prev + 1)}
                  disabled={!answers[currentQuestion]}
                  className="bg-purple-600 hover:bg-purple-700 px-8"
                >
                  Next Question
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 px-8"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Test'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Submit Test?
            </DialogTitle>
            <DialogDescription>
              You are about to submit your Knowledge Test. Please confirm:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm">• Questions answered: {Object.keys(answers).length}/{knowledgeQuestions.length}</p>
              <p className="text-sm">• Time remaining: {formatTime(timeRemaining)}</p>
              <p className="text-sm">• You need 75% to pass (38/50 correct)</p>
              <p className="text-sm">• This is attempt {attempts + 1} of {maxAttempts}</p>
            </div>
            <p className="text-sm text-gray-600">
              Once submitted, you cannot change your answers.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarning(false)}>Cancel</Button>
            <Button onClick={() => { setShowWarning(false); submitTest(); }} className="bg-green-600 hover:bg-green-700">
              Confirm Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeTest;