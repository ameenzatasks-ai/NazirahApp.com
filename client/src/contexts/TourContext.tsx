import { createContext, useContext } from 'react';

export interface TourContextValue {
  open: () => void;
}

export const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within a TourContext.Provider');
  return ctx;
}
