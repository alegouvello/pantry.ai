import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Sparkles, Check, ChefHat, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/onboarding/hero-welcome.jpg';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } }
};

const videoVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const, delay: 0.3 } }
};

export default function OnboardingWelcome() {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const features = [
    'AI-powered recipe costing & inventory tracking',
    'Smart reorder alerts before you run out',
    'Automatic purchase order generation',
    'POS integration for real-time depletion',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Pantry</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">AI-Powered Inventory</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground px-2 sm:px-3">
                Sign in
              </Button>
            </Link>
            <Link to="/auth?signup=true">
              <Button size="sm" className="gap-1 sm:gap-2 px-3 sm:px-4">
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Start</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Text Content */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-16 pt-24 sm:pt-32 lg:pt-8">
          <motion.div 
            className="max-w-xl w-full"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="space-y-5 sm:space-y-8">
              <motion.div 
                variants={itemVariants}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium"
              >
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                AI does the work. You validate.
              </motion.div>
              
              <motion.h2 
                variants={itemVariants}
                className="text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight"
              >
                Stop guessing.<br />
                <span className="text-primary">Start knowing.</span>
              </motion.h2>
              
              <motion.p 
                variants={itemVariants}
                className="text-base sm:text-xl text-muted-foreground leading-relaxed"
              >
                AI-powered inventory management that learns your restaurant and 
                keeps you ahead of shortages, waste, and ordering headaches.
              </motion.p>
              
              <motion.div variants={itemVariants} className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
                {features.map((feature, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-start sm:items-center gap-2 sm:gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                    </div>
                    <span className="text-sm sm:text-base text-foreground">{feature}</span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
                <Link to="/auth?signup=true" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg">
                    Create Free Account
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </Link>
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg">
                    Sign In
                  </Button>
                </Link>
              </motion.div>

              <motion.div 
                variants={itemVariants}
                className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground pt-2 sm:pt-4"
              >
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span>Setup takes ~15-25 minutes. You'll validate AI drafts.</span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Right side - Vertical Video in Phone Mockup with Background */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center min-h-[50vh] lg:min-h-0 py-8 lg:py-0">
          {/* Background image */}
          <img 
            src={heroImage} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Gradient overlays for blending */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/40" />
          
          {/* Decorative background elements */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 right-1/4 w-32 sm:w-64 h-32 sm:h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 left-1/4 w-24 sm:w-48 h-24 sm:h-48 bg-primary/5 rounded-full blur-2xl" />
          </div>
          
          {/* Phone mockup container */}
          <motion.div 
            className="relative z-10"
            variants={videoVariants}
            initial="hidden"
            animate="visible"
            whileInView={{
              y: [0, -10, 0],
              transition: {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          >
            {/* Phone frame */}
            <div className="relative">
              {/* Phone outer shell */}
              <div 
                className="relative w-[200px] sm:w-[280px] md:w-[320px] lg:w-[360px] rounded-[2rem] sm:rounded-[3rem] p-2 sm:p-3 bg-gradient-to-b from-zinc-800 to-zinc-900 shadow-2xl"
                style={{
                  boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Phone notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 sm:h-7 bg-zinc-900 rounded-b-xl sm:rounded-b-2xl z-20" />
                
                {/* Phone screen - click to toggle sound */}
                <div 
                  className="relative aspect-[9/19.5] rounded-[1.5rem] sm:rounded-[2.25rem] overflow-hidden bg-black cursor-pointer group"
                  onClick={toggleMute}
                >
                  <video 
                    ref={videoRef}
                    src="/videos/onboarding-demo.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Sound indicator overlay */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={false}
                  >
                    <motion.div
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isMuted ? (
                        <VolumeX className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                      ) : (
                        <Volume2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                      )}
                    </motion.div>
                  </motion.div>
                  
                </div>
                
                {/* Home indicator */}
                <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-0.5 sm:h-1 bg-zinc-600 rounded-full" />
              </div>
              
              {/* Glow effect behind phone */}
              <div className="absolute -inset-6 sm:-inset-10 bg-primary/20 blur-3xl rounded-full -z-10" />
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
