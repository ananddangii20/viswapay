import { useState, useEffect, useCallback } from "react";

interface OfflineState {
  isOnline: boolean;
  wasOffline: boolean;
  justCameOnline: boolean;
}

/**
 * Hook to detect network connectivity
 * Useful for queuing offline payments and retrying when online
 */
export const useOfflineDetection = (
  onOffline?: () => void,
  onOnline?: () => void
): OfflineState => {
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? window.navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    console.log("[Network] Coming online");
    setIsOnline(true);
    setWasOffline(true);
    onOnline?.();
  }, [onOnline]);

  const handleOffline = useCallback(() => {
    console.log("[Network] Going offline");
    setIsOnline(false);
    onOffline?.();
  }, [onOffline]);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline,
    wasOffline,
    justCameOnline: !isOnline && wasOffline
  };
};

export default useOfflineDetection;
