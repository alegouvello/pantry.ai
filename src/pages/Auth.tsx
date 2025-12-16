import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Package, Mail, Lock, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export default function Auth() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(!searchParams.get('signup'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in - check onboarding status
  useEffect(() => {
    if (user && !authLoading) {
      // Check if user has completed onboarding
      const checkOnboardingStatus = async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error } = await supabase
            .from('onboarding_progress')
            .select('current_step')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (error) {
            console.error('Error checking onboarding status:', error);
            // Default to dashboard if we can't check
            navigate('/');
            return;
          }
          
          // If no progress or not completed (step 8), go to onboarding
          if (!data || (data.current_step !== null && data.current_step < 8)) {
            navigate('/onboarding');
          } else {
            navigate('/');
          }
        } catch (err) {
          console.error('Error in onboarding check:', err);
          navigate('/');
        }
      };
      checkOnboardingStatus();
    }
  }, [user, authLoading, navigate]);

  // Show loading spinner while auth state is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('auth.loading')}</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError(t('auth.errors.invalidCredentials'));
          } else {
            setError(error.message);
          }
        } else {
          toast({
            title: t('auth.welcomeBack'),
            description: t('auth.signInSuccess'),
          });
          // Navigate handled by useEffect after user state updates
        }
      } else {
        if (password.length < 6) {
          setError(t('auth.errors.passwordTooShort'));
          setLoading(false);
          return;
        }
        
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            setError(t('auth.errors.emailAlreadyRegistered'));
          } else {
            setError(error.message);
          }
        } else {
          toast({
            title: t('auth.accountCreated'),
            description: t('auth.accountCreatedDesc'),
          });
          // Navigate handled by useEffect after user state updates
        }
      }
    } catch (err) {
      setError(t('auth.errors.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
              <Package className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-foreground">{t('app.name')}</h1>
              <p className="text-xs text-muted-foreground">{t('app.tagline')}</p>
            </div>
          </Link>
        </div>

        {/* Auth Card */}
        <Card variant="elevated" className="p-2">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {isLogin ? t('auth.welcomeBack') : t('auth.createYourAccount')}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? t('auth.signInDescription')
                : t('auth.signUpDescription')}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder={t('auth.fullNamePlaceholder')}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9 bg-muted/50"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-muted/50"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-muted/50"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="accent"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  t('auth.pleaseWait')
                ) : (
                  <>
                    {isLogin ? t('auth.signIn') : t('auth.createAccount')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {isLogin ? t('auth.newToPantry') : t('auth.alreadyHaveAccount')}
                </span>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
            >
              {isLogin ? t('auth.createAnAccount') : t('auth.signInInstead')}
            </Button>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {t('auth.termsAgreement')}
        </p>
      </div>
    </div>
  );
}
