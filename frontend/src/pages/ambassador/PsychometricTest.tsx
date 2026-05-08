// pages/ambassador/PsychometricTest.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Brain, AlertTriangle, CheckCircle, XCircle, Loader2, Clock, Heart, Users, Shield } from 'lucide-react';

// 15 Psychometric Questions - Personality & Character Assessment
const psychometricQuestions = [
  {
    id: 1,
    category: "Integrity & Ethics",
    question: "You discover a small error in your referral tracking that would increase your commission. What do you do?",
    options: [
      "Report the error to MedMap immediately, even if it reduces your commission",
      "Keep quiet since it's a small amount",
      "Wait to see if anyone notices",
      "Adjust other records to balance it out"
    ],
    trait: "integrity"
  },
  {
    id: 2,
    category: "Resilience",
    question: "How do you typically respond when a doctor rejects your referral attempt?",
    options: [
      "Analyze what went wrong and try a different approach next time",
      "Move on to the next opportunity immediately without dwelling",
      "Take it personally and feel discouraged for a while",
      "Avoid approaching similar doctors in the future"
    ],
    trait: "resilience"
  },
  {
    id: 3,
    category: "Proactiveness",
    question: "When you have free time, how do you typically spend it?",
    options: [
      "Looking for new opportunities to grow my network",
      "Researching industry trends and best practices",
      "Relaxing and waiting for opportunities to come to me",
      "Focusing only on existing relationships"
    ],
    trait: "proactiveness"
  },
  {
    id: 4,
    category: "Empathy",
    question: "A doctor you referred is struggling with the platform. How do you respond?",
    options: [
      "Patiently listen to their concerns and help them find solutions",
      "Direct them to customer support and follow up later",
      "Tell them to read the documentation",
      "Ignore them since you already got the referral"
    ],
    trait: "empathy"
  },
  {
    id: 5,
    category: "Communication",
    question: "How would you describe your communication style?",
    options: [
      "Clear, confident, and persuasive while being respectful",
      "Friendly and approachable but sometimes unclear",
      "Professional and formal, sticking strictly to facts",
      "Reserved and careful, avoiding confrontation"
    ],
    trait: "communication"
  },
  {
    id: 6,
    category: "Goal Orientation",
    question: "When setting goals, you prefer to:",
    options: [
      "Set ambitious but achievable targets with clear action plans",
      "Set stretch goals to push yourself beyond limits",
      "Set conservative goals you know you'll achieve",
      "Go with the flow without specific targets"
    ],
    trait: "goal_oriented"
  },
  {
    id: 7,
    category: "Teamwork",
    question: "How do you prefer to work with other ambassadors?",
    options: [
      "Collaborate and share best practices freely",
      "Compete healthily while maintaining respect",
      "Work independently and focus on my own results",
      "Avoid interaction unless necessary"
    ],
    trait: "teamwork"
  },
  {
    id: 8,
    category: "Adaptability",
    question: "When MedMap introduces a new policy or change, your first reaction is:",
    options: [
      "Embrace the change and figure out how to adapt",
      "Evaluate the impact before deciding",
      "Question why the change is necessary",
      "Resist until forced to comply"
    ],
    trait: "adaptability"
  },
  {
    id: 9,
    category: "Integrity",
    question: "A potential referral asks if you can offer them a 'special deal' not available to others. What do you do?",
    options: [
      "Explain that all referrals receive the same benefits and opportunities",
      "Check with MedMap if exceptions can be made",
      "Create a small unofficial incentive to close the deal",
      "Promise benefits you can't guarantee"
    ],
    trait: "integrity"
  },
  {
    id: 10,
    category: "Self-Motivation",
    question: "What motivates you most in a professional setting?",
    options: [
      "Achieving goals and seeing tangible results",
      "Helping others succeed and grow",
      "Personal development and learning new skills",
      "Recognition and appreciation from others"
    ],
    trait: "motivation"
  },
  {
    id: 11,
    category: "Conflict Resolution",
    question: "Two doctors you referred have a disagreement. How do you handle it?",
    options: [
      "Listen to both sides and help facilitate a constructive resolution",
      "Stay neutral and let them work it out themselves",
      "Take sides based on who generates more commission",
      "Avoid getting involved altogether"
    ],
    trait: "conflict_resolution"
  },
  {
    id: 12,
    category: "Reliability",
    question: "When you commit to something, you:",
    options: [
      "Always follow through, even if inconvenient",
      "Usually follow through unless something better comes up",
      "Try to follow through but don't stress if you can't",
      "Only commit to things that benefit you directly"
    ],
    trait: "reliability"
  },
  {
    id: 13,
    category: "Learning Orientation",
    question: "How do you approach learning about the healthcare industry?",
    options: [
      "Proactively seek out information and training opportunities",
      "Learn when needed for specific situations",
      "Rely on MedMap to provide all necessary information",
      "Only learn what's absolutely required"
    ],
    trait: "learning"
  },
  {
    id: 14,
    category: "Patience",
    question: "A referred doctor's practice is growing slowly. How do you feel?",
    options: [
      "Patient and supportive, understanding that growth takes time",
      "Concerned but willing to wait a reasonable period",
      "Frustrated and ready to focus on other doctors",
      "Ready to give up on that doctor"
    ],
    trait: "patience"
  },
  {
    id: 15,
    category: "Professionalism",
    question: "A competitor contacts you with an attractive offer to switch. What do you do?",
    options: [
      "Decline professionally and inform MedMap of the approach",
      "Consider the offer quietly",
      "Use it to negotiate better terms with MedMap",
      "Switch without notice"
    ],
    trait: "professionalism"
  }
];

const PsychometricTest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canTakeTest, setCanTakeTest] = useState(true);
  const [cooldownDate, setCooldownDate] = useState<Date | null>(null);
  const [existingScore, setExistingScore] = useState<number | null>(null);

  useEffect(() => {
    checkTestEligibility();
  }, [user]);

  const checkTestEligibility = async () => {
    if (!user) return;
    
    try {
      const ambassadorDoc = await getDoc(doc(db, 'ambassadors', user.uid));
      
      if (ambassadorDoc.exists()) {
        const data = ambassadorDoc.data();
        const psychometric = data.psychometricTest;
        
        if (psychometric?.passed === true) {
          toast({
            title: 'Test Already Completed',
            description: 'You have already passed the psychometric assessment.',
          });
          navigate('/ambassador/portal');
          return;
        }
        
        if (psychometric?.passed === false) {
          const nextAttempt = psychometric.nextAttemptDate?.toDate();
          if (nextAttempt && nextAttempt > new Date()) {
            setCanTakeTest(false);
            setCooldownDate(nextAttempt);
            setExistingScore(psychometric.score);
          }
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking test eligibility:', error);
      setLoading(false);
    }
  };

  const calculateScore = () => {
    // Scoring system based on traits
    let totalScore = 0;
    let maxScore = psychometricQuestions.length * 4;
    
    Object.keys(answers).forEach((qIndex) => {
      const answerIndex = psychometricQuestions[parseInt(qIndex)].options.findIndex(
        opt => opt === answers[parseInt(qIndex)]
      );
      // Score: first option (best response) = 4 points, second = 3, third = 2, fourth = 1
      totalScore += 4 - answerIndex;
    });
    
    return Math.round((totalScore / maxScore) * 100);
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== psychometricQuestions.length) {
      toast({ 
        title: 'Incomplete Test', 
        description: `Please answer all ${psychometricQuestions.length} questions before submitting.`,
        variant: 'destructive' 
      });
      return;
    }
    
    setSubmitting(true);
    
    const score = calculateScore();
    const passed = score >= 70;
    
    try {
      let nextAttemptDate = null;
      if (!passed) {
        nextAttemptDate = new Date();
        nextAttemptDate.setMonth(nextAttemptDate.getMonth() + 3);
      }
      
      await updateDoc(doc(db, 'ambassadors', user!.uid), {
        'psychometricTest.passed': passed,
        'psychometricTest.attemptDate': serverTimestamp(),
        'psychometricTest.score': score,
        'psychometricTest.nextAttemptDate': nextAttemptDate,
        onboardingStep: passed ? 2 : 2,
        updatedAt: serverTimestamp(),
      });
      
      if (passed) {
        toast({ 
          title: 'Congratulations!', 
          description: `You passed with ${score}%! Proceed to the training module.`,
          duration: 5000,
        });
        navigate('/ambassador/portal');
      } else {
        toast({ 
          title: 'Assessment Not Passed', 
          description: `You scored ${score}%. You can retake the assessment after ${nextAttemptDate?.toLocaleDateString()}.`,
          variant: 'destructive',
          duration: 8000,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!canTakeTest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle>Assessment Cooldown Period</CardTitle>
            <CardDescription>
              You cannot retake the psychometric assessment at this time.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {existingScore !== null && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Your Previous Score</p>
                <p className="text-2xl font-bold text-gray-800">{existingScore}%</p>
                <p className="text-xs text-gray-500 mt-1">Required: 70% to pass</p>
              </div>
            )}
            {cooldownDate && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  You can retake the assessment on:
                </p>
                <p className="text-xl font-bold text-yellow-900 mt-1">
                  {cooldownDate.toLocaleDateString('en-ZA', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            )}
            <p className="text-sm text-gray-600">
              Please use this time to prepare. You will receive an email notification when you can retake the assessment.
            </p>
            <Button variant="outline" onClick={() => navigate('/ambassador/portal')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = psychometricQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / psychometricQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-xl border-0">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">Psychometric Assessment</CardTitle>
                <CardDescription>
                  Question {currentQuestion + 1} of {psychometricQuestions.length}
                </CardDescription>
              </div>
            </div>
            <Progress value={progress} className="h-2 bg-gray-100" />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Category: {currentQ.category}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Important Information</p>
                  <p className="text-sm text-amber-700 mt-1">
                    This assessment evaluates your personality and character traits. Answer honestly - there are no "right" or "wrong" answers.
                    You need a score of 70% or higher to pass. If you don't pass, you'll need to wait 3 months before retaking it.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                {currentQ.question}
              </h3>
              
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
            </div>
            
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(prev => prev - 1)}
                disabled={currentQuestion === 0}
                className="px-6"
              >
                Previous
              </Button>
              
              {currentQuestion < psychometricQuestions.length - 1 ? (
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
                  disabled={!answers[currentQuestion] || submitting}
                  className="bg-green-600 hover:bg-green-700 px-8"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Assessment'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PsychometricTest;