import { createContext, useContext, useState } from 'react';

const BookingContext = createContext(null);

const initialDraft = {
  tripType: 'one_way',
  origin: '',
  destination: '',
  departDate: '',
  returnDate: '',
  passengers: 1,
  outboundFlight: null,
  returnFlight: null,
};

// Holds the in-progress search/selection across Home -> Results -> Checkout.
// Nothing here is persisted — a reload starts a fresh search on purpose,
// the same way most airline sites behave.
export function BookingProvider({ children }) {
  const [draft, setDraft] = useState(initialDraft);

  const startSearch = (criteria) => setDraft({ ...initialDraft, ...criteria });
  const selectOutbound = (flight) => setDraft((d) => ({ ...d, outboundFlight: flight }));
  const selectReturn = (flight) => setDraft((d) => ({ ...d, returnFlight: flight }));
  const resetSelection = () => setDraft(initialDraft);

  return (
    <BookingContext.Provider value={{ draft, startSearch, selectOutbound, selectReturn, resetSelection }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
