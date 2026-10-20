import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/lib/firebase';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await authService.resetPassword(email.trim().toLowerCase());
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="text-3xl font-bold text-blue-600 mb-4 inline-block">
            MedMap
          </Link>
          <CardTitle className="text-2xl">
            {submitted ? 'Check your email' : 'Forgot your password?'}
          </CardTitle>
          <CardDescription>
            {submitted
              ? 'If an account exists for that email address, password reset instructions are on their way.'
              : 'Enter the email address associated with your account and we’ll send reset instructions.'}
          </CardDescription>
        </CardHeader>

        {submitted ? (
          <>
            <CardContent>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Reset request received</AlertTitle>
                <AlertDescription>
                  Check your inbox and spam folder. The message may take a few minutes to arrive.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="button" variant="outline" className="w-full" onClick={() => setSubmitted(false)}>
                Try another email
              </Button>
              <Link to="/signin" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </CardFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  className="h-11"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Unable to send reset instructions</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" disabled={loading} className="w-full h-11 bg-blue-600 hover:bg-blue-700">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending instructions...
                  </>
                ) : (
                  'Send reset instructions'
                )}
              </Button>
              <Link to="/signin" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
