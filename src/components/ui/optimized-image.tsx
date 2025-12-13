import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  aspectRatio?: 'video' | 'square' | 'auto';
}

export function OptimizedImage({ 
  src, 
  alt, 
  className,
  fallbackClassName,
  aspectRatio = 'video'
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const aspectClasses = {
    video: 'aspect-[16/9]',
    square: 'aspect-square',
    auto: '',
  };

  if (hasError) {
    return (
      <div className={cn(
        "relative bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center",
        aspectClasses[aspectRatio],
        fallbackClassName
      )}>
        <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", aspectClasses[aspectRatio])}>
      {/* Blur placeholder */}
      {isLoading && (
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse",
          "flex items-center justify-center"
        )}>
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
      />
    </div>
  );
}
