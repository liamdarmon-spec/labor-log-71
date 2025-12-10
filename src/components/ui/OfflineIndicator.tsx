/**
 * Offline Indicator Component
 * 
 * Shows a small badge when the user is offline.
 */

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineIndicator() {
  const { isOnline } = useNetworkStatus();
  
  if (isOnline) return null;
  
  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-orange-100 border border-orange-200 rounded-lg shadow-lg">
      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
      <span className="text-sm font-medium text-orange-800">
        You're offline
      </span>
    </div>
  );
}

export default OfflineIndicator;
