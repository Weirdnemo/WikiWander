import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer(isActive: boolean, onTick?: (elapsedTime: number) => void) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  const startTimer = useCallback(() => {
    stopTimer(); // Clear any existing interval
    startTimeRef.current = Date.now() - elapsedTime * 1000;
    
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const currentElapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(currentElapsedTime);
        if (onTick) {
          onTick(currentElapsedTime);
        }
      }
    }, 1000);
  }, [elapsedTime, onTick, stopTimer]);


  const resetTimer = useCallback(() => {
    stopTimer();
    setElapsedTime(0);
    startTimeRef.current = null;
  }, [stopTimer]);

  useEffect(() => {
    if (isActive) {
      startTimer();
    } else {
      stopTimer();
    }
    return () => stopTimer(); // Cleanup on unmount
  }, [isActive, startTimer, stopTimer]);

  return { elapsedTime, resetTimer, startTimer, stopTimer };
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
