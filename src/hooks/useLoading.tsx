import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  message: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Kiss me Store is preparing your experience...");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const MIN_DURATION = 800; // ms

  const showLoading = (msg?: string) => {
    if (msg) setMessage(msg);
    setStartTime(Date.now());
    setIsLoading(true);
    
    // Safety fallback: auto-hide after 15s to prevent stuck screen
    if (timeoutId) window.clearTimeout(timeoutId);
    const id = window.setTimeout(() => {
      setIsLoading(false);
      setStartTime(null);
    }, 15000);
    setTimeoutId(id);
  };

  const hideLoading = () => {
    if (startTime) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_DURATION - elapsed);
      
      setTimeout(() => {
        setIsLoading(false);
        setStartTime(null);
        if (timeoutId) {
          window.clearTimeout(timeoutId);
          setTimeoutId(null);
        }
      }, remaining);
    } else {
      setIsLoading(false);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        setTimeoutId(null);
      }
    }
  };

  return (
    <LoadingContext.Provider value={{ isLoading, message, showLoading, hideLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
