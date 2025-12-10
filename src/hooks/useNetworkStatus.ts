/**
 * Network Status Hook
 * 
 * Monitors online/offline status and provides utilities
 * for handling network state changes.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface NetworkStatus {
  /** Whether the browser reports being online */
  isOnline: boolean;
  /** Whether we've detected actual connectivity (not just browser state) */
  hasConnectivity: boolean;
  /** Time since last connectivity check */
  lastChecked: Date | null;
  /** Manually trigger a connectivity check */
  checkConnectivity: () => Promise<boolean>;
}

/**
 * Hook to monitor network status
 * 
 * @example
 * const { isOnline, hasConnectivity } = useNetworkStatus();
 * 
 * if (!isOnline) {
 *   return <OfflineMessage />;
 * }
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasConnectivity, setHasConnectivity] = useState(navigator.onLine);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  // Check actual connectivity by pinging an endpoint
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch a small resource to verify actual connectivity
      // Using a timestamp to prevent caching
      const response = await fetch(`/favicon.ico?_=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      });
      const connected = response.ok;
      setHasConnectivity(connected);
      setLastChecked(new Date());
      return connected;
    } catch {
      setHasConnectivity(false);
      setLastChecked(new Date());
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      // Verify actual connectivity
      checkConnectivity().then((connected) => {
        if (connected) {
          toast.success('Back online', {
            description: 'Your connection has been restored.',
            duration: 3000,
          });
          
          // Invalidate stale queries to refresh data
          queryClient.invalidateQueries();
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setHasConnectivity(false);
      
      toast.warning('You are offline', {
        description: 'Some features may be unavailable.',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connectivity check
    if (navigator.onLine) {
      checkConnectivity();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnectivity, queryClient]);

  return {
    isOnline,
    hasConnectivity,
    lastChecked,
    checkConnectivity,
  };
}

/**
 * Hook to perform actions when coming back online
 * 
 * @example
 * useOnReconnect(() => {
 *   // Sync pending changes
 *   syncPendingChanges();
 * });
 */
export function useOnReconnect(callback: () => void): void {
  const { isOnline } = useNetworkStatus();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      callback();
      setWasOffline(false);
    }
  }, [isOnline, wasOffline, callback]);
}

export default useNetworkStatus;
