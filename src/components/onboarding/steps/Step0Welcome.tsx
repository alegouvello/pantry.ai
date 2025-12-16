import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Clock, Check, ChefHat, Utensils, TrendingUp, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

import conceptFineDining from '@/assets/onboarding/concept-fine-dining.jpg';
import conceptCasual from '@/assets/onboarding/concept-casual.jpg';
import conceptCoffee from '@/assets/onboarding/concept-coffee.jpg';
import conceptBar from '@/assets/onboarding/concept-bar.jpg';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: "easeOut" as const } 
  }
};

const floatVariants = {
  animate: {
    y: [-8, 8, -8],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }
};

interface Step0WelcomeProps {
  onNext: () => void;
}

export function Step0Welcome({ onNext }: Step0WelcomeProps) {
  const { t } = useTranslation();

  const features = [
    {
      icon: Utensils,
      title: t('step0Welcome.features.recipeCosting'),
      description: t('step0Welcome.features.recipeCostingDesc')
    },
    {
      icon: TrendingUp,
      title: t('step0Welcome.features.forecasting'),
      description: t('step0Welcome.features.forecastingDesc')
    },
    {
      icon: ShoppingCart,
      title: t('step0Welcome.features.autoOrdering'),
      description: t('step0Welcome.features.autoOrderingDesc')
    }
  ];

  const images = [
    { src: conceptFineDining, alt: t('step0Welcome.images.fineDining'), delay: 0 },
    { src: conceptCasual, alt: t('step0Welcome.images.casualDining'), delay: 0.1 },
    { src: conceptCoffee, alt: t('step0Welcome.images.coffeeShop'), delay: 0.2 },
    { src: conceptBar, alt: t('step0Welcome.images.bar'), delay: 0.3 },
  ];

  const needsItems = [
    t('step0Welcome.needs.menu'),
    t('step0Welcome.needs.vendors'),
    t('step0Welcome.needs.pos'),
    t('step0Welcome.needs.storage')
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Content */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
          <motion.div 
            className="max-w-xl w-full"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Logo */}
            <motion.div 
              variants={itemVariants}
              className="flex items-center gap-3 mb-8"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <ChefHat className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t('app.name')}</h1>
                <p className="text-sm text-muted-foreground">{t('step0Welcome.tagline')}</p>
              </div>
            </motion.div>

            {/* Badge */}
            <motion.div 
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              {t('step0Welcome.badge')}
            </motion.div>

            {/* Headline */}
            <motion.h2 
              variants={itemVariants}
              className="text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6"
            >
              {t('step0Welcome.headline1')}<br />
              <span className="text-primary">{t('step0Welcome.headline2')}</span>
            </motion.h2>

            {/* Description */}
            <motion.p 
              variants={itemVariants}
              className="text-lg text-muted-foreground leading-relaxed mb-8"
            >
              {t('step0Welcome.description')}
            </motion.p>

            {/* Features Grid */}
            <motion.div 
              variants={itemVariants}
              className="grid gap-4 mb-8"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.02, backgroundColor: 'hsl(var(--card))' }}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div variants={itemVariants} className="space-y-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  size="lg" 
                  onClick={onNext}
                  className="w-full sm:w-auto gap-3 h-14 px-8 text-lg shadow-lg shadow-primary/25"
                >
                  {t('step0Welcome.startSetup')}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{t('step0Welcome.setupTime')}</span>
              </div>
            </motion.div>

            {/* Checklist */}
            <motion.div 
              variants={itemVariants}
              className="mt-10 pt-8 border-t border-border/50"
            >
              <p className="text-sm font-medium text-foreground mb-4">{t('step0Welcome.whatYouNeed')}</p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                {needsItems.map((item, i) => (
                  <motion.div 
                    key={item}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 + i * 0.1 }}
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    {item}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Right side - Images Grid */}
        <div className="flex-1 relative hidden lg:flex items-center justify-center p-8 lg:p-16">
          <div className="relative w-full max-w-lg">
            {/* Image grid with staggered animation */}
            <motion.div 
              className="grid grid-cols-2 gap-4"
              variants={floatVariants}
              animate="animate"
            >
              {images.map((image, index) => (
                <motion.div
                  key={image.alt}
                  className={`relative overflow-hidden rounded-2xl shadow-2xl ${
                    index % 2 === 0 ? 'mt-8' : '-mt-8'
                  }`}
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    delay: 0.4 + image.delay, 
                    duration: 0.7, 
                    ease: "easeOut" 
                  }}
                  whileHover={{ scale: 1.05, zIndex: 10 }}
                >
                  <img 
                    src={image.src} 
                    alt={image.alt}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </motion.div>
              ))}
            </motion.div>

            {/* Decorative elements */}
            <motion.div 
              className="absolute -top-8 -right-8 w-24 h-24 bg-primary/20 rounded-full blur-2xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div 
              className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/15 rounded-full blur-2xl"
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
