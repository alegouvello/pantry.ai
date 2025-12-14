import { useRef, useCallback, TouchEvent } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  enableHaptics?: boolean;
}

// Trigger haptic feedback using Vibration API
const triggerHapticFeedback = (pattern: number | number[] = 10) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Silently fail if vibration not supported
    }
  }
};

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  minSwipeDistance = 50,
  maxSwipeTime = 300,
  enableHaptics = true,
}: SwipeConfig) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (
      touchStartX.current === null ||
      touchStartY.current === null ||
      touchStartTime.current === null
    ) {
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndTime = Date.now();

    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    const deltaTime = touchEndTime - touchStartTime.current;

    // Check if swipe was fast enough
    if (deltaTime > maxSwipeTime) {
      return;
    }

    // Check if horizontal swipe is dominant (not scrolling vertically)
    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.5) {
      return;
    }

    // Check minimum distance
    if (Math.abs(deltaX) < minSwipeDistance) {
      return;
    }

    // Trigger haptic feedback before action
    if (enableHaptics) {
      triggerHapticFeedback(15);
    }

    if (deltaX > 0 && onSwipeRight) {
      onSwipeRight();
    } else if (deltaX < 0 && onSwipeLeft) {
      onSwipeLeft();
    }

    // Reset
    touchStartX.current = null;
    touchStartY.current = null;
    touchStartTime.current = null;
  }, [onSwipeLeft, onSwipeRight, minSwipeDistance, maxSwipeTime, enableHaptics]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}
