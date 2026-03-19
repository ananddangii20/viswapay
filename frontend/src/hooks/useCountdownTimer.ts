import { useState, useEffect } from "react";

interface CountdownResult {
  isExpired: boolean;
  timeRemaining: number;
  minutes: number;
  seconds: number;
  displayText: string;
  progressPercent: number;
}

/**
 * Hook to countdown to a target time
 * Returns formatted time display and expiry status
 */
export const useCountdownTimer = (
  expiryTime: Date | string,
  totalSeconds?: number
): CountdownResult => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const expiry = new Date(expiryTime);
      const now = new Date();
      const diff = Math.max(0, expiry.getTime() - now.getTime());

      if (diff === 0) {
        setIsExpired(true);
        setTimeRemaining(0);
      } else {
        setIsExpired(false);
        setTimeRemaining(diff);
      }
    };

    // Calculate immediately
    calculateTime();

    // Update every 100ms for smooth display
    const interval = setInterval(calculateTime, 100);

    return () => clearInterval(interval);
  }, [expiryTime]);

  // Calculate minutes and seconds
  const totalSeconds_ = Math.round(timeRemaining / 1000);
  const minutes = Math.floor(totalSeconds_ / 60);
  const seconds = totalSeconds_ % 60;

  // Format display text
  const displayText = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Calculate progress percentage (for visual indicators)
  const progressPercent = totalSeconds
    ? Math.round((totalSeconds_ / totalSeconds) * 100)
    : 0;

  return {
    isExpired,
    timeRemaining,
    minutes,
    seconds,
    displayText,
    progressPercent
  };
};

export default useCountdownTimer;
