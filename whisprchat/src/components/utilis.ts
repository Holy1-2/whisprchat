// utils.ts
import { useEffect, useCallback, useRef } from 'react';

/**
 * Formats time for display in chat interface
 * @param input Can be Date object (message timestamp) or number (recording time in seconds)
 * @returns Formatted time string
 */
export function formatTime(input: Date | number): string {
  try {
    if (input instanceof Date) {
      // Format message timestamp (e.g., "3:45 PM")
      return input.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (typeof input === 'number') {
      // Format recording duration (e.g., "1:05")
      const minutes = Math.floor(input / 60);
      const seconds = input % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    throw new Error('Invalid input type for formatTime');
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
}

/**
 * Custom hook for debouncing functions
 * @param callback Function to debounce
 * @param delay Debounce delay in milliseconds
 * @returns Debounced version of the function
 */
export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  // Use browser-compatible timeout type
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const savedCallback = useRef(callback);

  // Update saved callback if callback changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // schedule new callback
      timeoutRef.current = setTimeout(() => {
        savedCallback.current(...args);
      }, delay);
    },
    [delay]
  ) as T;
}

/**
 * Additional utility for formatting message dates (e.g., "Today", "Yesterday")
 */
export function formatMessageDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Audio duration formatter (HH:MM:SS)
 */
export function formatAudioDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map(unit => unit.toString().padStart(2, '0'))
    .join(':')
    .replace(/^00:/, '');
}
