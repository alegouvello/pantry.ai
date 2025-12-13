import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Sparkles, Check, ChefHat, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OnboardingWelcome() {
  const features = [
    'AI-powered recipe costing & inventory tracking',
    'Smart reorder alerts before you run out',
    'Automatic purchase order generation',
    'POS integration for real-time depletion',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <ChefHat className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Pantry</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Inventory</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Button>
            </Link>
            <Link to="/auth?signup=true">
              <Button size="sm" className="gap-2">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Text Content */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16 pt-32 lg:pt-8">
          <div className="max-w-xl">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                AI does the work. You validate.
              </div>
              
              <h2 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Stop guessing.<br />
                <span className="text-primary">Start knowing.</span>
              </h2>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                AI-powered inventory management that learns your restaurant and 
                keeps you ahead of shortages, waste, and ordering headaches.
              </p>
              
              <div className="space-y-4 pt-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/auth?signup=true">
                  <Button size="lg" className="w-full sm:w-auto gap-2 h-14 px-8 text-lg">
                    Create Free Account
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg">
                    Sign In
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground pt-4">
                <Clock className="w-4 h-4" />
                <span>Setup takes ~15-25 minutes. You'll validate AI drafts.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Video */}
        <div className="flex-1 relative overflow-hidden bg-muted/30">
          <div className="absolute inset-0 flex items-center justify-center p-8 lg:p-12">
            <div className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/50">
              <video 
                src="/videos/hero-demo.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-2xl" />
            </div>
          </div>
          
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent lg:hidden" />
        </div>
      </main>
    </div>
  );
}
