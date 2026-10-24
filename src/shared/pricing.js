// Booking total math — imported by both the React app (instant feedback on the
// checkout page) and the server (the number that actually gets charged). Change
// a rule here, never in only one place.
export const TAX_RATE = 0.08;

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function computeBookingTotals({ outboundPrice, returnPrice = 0, passengerCount }) {
  const farePerPassenger = outboundPrice + returnPrice;
  const subtotal = round2(farePerPassenger * passengerCount);
  const taxes = round2(subtotal * TAX_RATE);
  const total = round2(subtotal + taxes);
  return { subtotal, taxes, total };
}
