import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authClient } from '../api/authClient.js';
import { getMyBookings, cancelBooking } from '../api/flightApi.js';

export default function Bookings() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;
    getMyBookings()
      .then((b) => { setBookings(b); setStatus('ready'); })
      .catch((err) => { setError(err.message); setStatus('error'); });
  }, [session]);

  if (isPending) return <p>Loading…</p>;
  if (!session) return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />;
  if (status === 'loading') return <p>Loading your bookings…</p>;

  const cancel = async (id) => {
    try {
      const updated = await cancelBooking(id);
      setBookings((bs) => bs.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>My bookings</h1>
      {error && <p className="error">{error}</p>}
      {bookings.length === 0 && <p>No bookings yet. Go find a flight!</p>}
      {bookings.map((b) => (
        <div key={b.id} className="booking-card">
          <div className="booking-header">
            <strong>{b.id}</strong>
            <span className={`status status-${b.displayStatus.toLowerCase().replace(' ', '-')}`}>{b.displayStatus}</span>
          </div>
          {b.flights.map((f) => (
            <p key={f.direction}>
              {f.direction === 'outbound' ? 'Outbound' : 'Return'}: {f.airline} {f.flightNumber} · {f.originCity} → {f.destinationCity} ·{' '}
              {new Date(f.departureTime).toLocaleString()}
            </p>
          ))}
          <p>{b.passengers.length} passenger(s) · Total ${b.totals.total.toFixed(2)}</p>
          {b.canCancel && <button onClick={() => cancel(b.id)}>Cancel booking</button>}
        </div>
      ))}
    </div>
  );
}
