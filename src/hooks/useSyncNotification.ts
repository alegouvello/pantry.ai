import { useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SyncNotificationOptions {
  debounceMs?: number;
}

export function useSyncNotification(options: SyncNotificationOptions = {}) {
  const { debounceMs = 2000 } = options;
  const { toast } = useToast();
  const lastNotificationRef = useRef<number>(0);
  const pendingNotificationRef = useRef<NodeJS.Timeout | null>(null);

  const notify = useCallback((description: string) => {
    const now = Date.now();
    
    // Clear any pending notification
    if (pendingNotificationRef.current) {
      clearTimeout(pendingNotificationRef.current);
      pendingNotificationRef.current = null;
    }

    // If we recently showed a notification, debounce it
    if (now - lastNotificationRef.current < debounceMs) {
      pendingNotificationRef.current = setTimeout(() => {
        lastNotificationRef.current = Date.now();
        toast({
          title: 'Synced from another tab',
          description,
        });
        pendingNotificationRef.current = null;
      }, debounceMs - (now - lastNotificationRef.current));
      return;
    }

    // Show notification immediately
    lastNotificationRef.current = now;
    toast({
      title: 'Synced from another tab',
      description,
    });
  }, [toast, debounceMs]);

  return { notify };
}