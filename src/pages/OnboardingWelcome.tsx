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
          <motion.div 
            className="max-w-xl"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="space-y-8">
              <motion.div 
                variants={itemVariants}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
              >
                <Sparkles className="w-4 h-4" />
                AI does the work. You validate.
              </motion.div>
              
              <motion.h2 
                variants={itemVariants}
                className="text-5xl lg:text-6xl font-bold text-foreground leading-tight"
              >
                Stop guessing.<br />
                <span className="text-primary">Start knowing.</span>
              </motion.h2>
              
              <motion.p 
                variants={itemVariants}
                className="text-xl text-muted-foreground leading-relaxed"
              >
                AI-powered inventory management that learns your restaurant and 
                keeps you ahead of shortages, waste, and ordering headaches.
              </motion.p>
              
              <motion.div variants={itemVariants} className="space-y-4 pt-4">
                {features.map((feature, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-4">
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
              </motion.div>

              <motion.div 
                variants={itemVariants}
                className="flex items-center gap-3 text-sm text-muted-foreground pt-4"
              >
                <Clock className="w-4 h-4" />
                <span>Setup takes ~15-25 minutes. You'll validate AI drafts.</span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Right side - Vertical Video in Phone Mockup with Background */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center">
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
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
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
                className="relative w-[280px] sm:w-[320px] lg:w-[360px] rounded-[3rem] p-3 bg-gradient-to-b from-zinc-800 to-zinc-900 shadow-2xl"
                style={{
                  boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Phone notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-7 bg-zinc-900 rounded-b-2xl z-20" />
                
                {/* Phone screen - click to toggle sound */}
                <div 
                  className="relative aspect-[9/19.5] rounded-[2.25rem] overflow-hidden bg-black cursor-pointer group"
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
                      className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isMuted ? (
                        <VolumeX className="w-8 h-8 text-white" />
                      ) : (
                        <Volume2 className="w-8 h-8 text-white" />
                      )}
                    </motion.div>
                  </motion.div>
                  
                  {/* Initial hint */}
                  {isMuted && (
                    <motion.div
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.5, duration: 0.3 }}
                    >
                      Tap for sound
                    </motion.div>
                  )}
                </div>
                
                {/* Home indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-zinc-600 rounded-full" />
              </div>
              
              {/* Glow effect behind phone */}
              <div className="absolute -inset-10 bg-primary/20 blur-3xl rounded-full -z-10" />
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
