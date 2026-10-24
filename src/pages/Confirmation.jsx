import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBooking } from '../api/flightApi.js';

export default function Confirmation() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getBooking(id).then(setBooking).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!booking) return <p>Loading…</p>;

  return (
    <div className="confirmation">
      <h1>Booking confirmed! ✈</h1>
      <p>Confirmation number: <strong>{booking.id}</strong></p>
      <p>A copy was "sent" to {booking.contact.email} (demo app — no real email is sent).</p>
      {booking.flights.map((f) => (
        <p key={f.direction}>
          {f.direction === 'outbound' ? 'Outbound' : 'Return'}: {f.airline} {f.flightNumber} · {f.originCity} → {f.destinationCity} ·{' '}
          {new Date(f.departureTime).toLocaleString()}
        </p>
      ))}
      <p>Total paid: ${booking.totals.total.toFixed(2)}</p>
      <Link to="/bookings">View my bookings</Link>
    </div>
  );
}
