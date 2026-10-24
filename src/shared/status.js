// Derives a display status for a booking. Unlike a store order (which needs an
// artificial compressed timer to simulate a shipping carrier), a flight already
// has real departure/arrival timestamps, so "Upcoming" -> "In progress" ->
// "Completed" falls out of those directly with no demo-only clock needed.
export function deriveBookingStatus(booking) {
  if (booking.status === 'Cancelled') return 'Cancelled';
  const now = Date.now();
  const departures = booking.flights.map((f) => new Date(f.departureTime).getTime());
  const arrivals = booking.flights.map((f) => new Date(f.arrivalTime).getTime());
  if (now >= Math.max(...arrivals)) return 'Completed';
  if (now >= Math.min(...departures)) return 'In progress';
  return 'Upcoming';
}

// Only allow cancelling while nothing has departed yet — once a flight in the
// booking is underway or finished, treat it as committed.
export function canCancelBooking(booking) {
  return deriveBookingStatus(booking) === 'Upcoming';
}
