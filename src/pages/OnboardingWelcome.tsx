import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function OnboardingWelcome() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast({
          title: 'Account created',
          description: 'Redirecting to setup...',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      navigate('/onboarding');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Authentication failed',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
      },
    });
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 to-accent/20 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">P</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pantry</h1>
              <p className="text-sm text-muted-foreground">AI-Powered Inventory</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-foreground leading-tight">
              Stop guessing.<br />
              Start knowing.
            </h2>
            <p className="text-lg text-muted-foreground max-w-md">
              AI-powered inventory management that learns your restaurant and 
              keeps you ahead of shortages, waste, and ordering headaches.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Setup takes ~15-25 minutes. You'll validate AI drafts.</span>
        </div>
      </div>

      {/* Right side - Auth */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-xl">P</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Pantry</h1>
            <p className="text-muted-foreground">AI-Powered Inventory</p>
          </div>

          <Card variant="elevated" className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-1">
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isSignUp ? 'Start your free setup' : 'Continue your setup'}
              </p>
            </div>

            <Button 
              variant="outline" 
              className="w-full mb-6"
              onClick={handleGoogleAuth}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required={isSignUp}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@restaurant.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <Button 
                variant="accent" 
                className="w-full" 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Please wait...' : isSignUp ? 'Start Setup' : 'Sign In'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-2">
            <Sparkles className="w-3 h-3" />
            AI does the work. You validate.
          </p>
        </div>
      </div>
    </div>
  );
}
