import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext.jsx';
import { authClient } from '../api/authClient.js';
import { createBooking, ApiError } from '../api/flightApi.js';
import { computeBookingTotals } from '../shared/pricing.js';
import { validateBookingRequest } from '../shared/validation.js';

export default function Checkout() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const { draft, resetSelection } = useBooking();

  const [passengers, setPassengers] = useState(
    Array.from({ length: draft.passengers || 1 }, () => ({ fullName: '' })),
  );
  const [contact, setContact] = useState({ name: '', email: '' });
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isPending) return <p>Loading…</p>;
  if (!session) return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />;
  if (!draft.outboundFlight) return <Navigate to="/" replace />;
  if (draft.tripType === 'round_trip' && !draft.returnFlight) return <Navigate to="/" replace />;

  const totals = computeBookingTotals({
    outboundPrice: draft.outboundFlight.price,
    returnPrice: draft.returnFlight?.price ?? 0,
    passengerCount: draft.passengers,
  });

  const updatePassenger = (i, value) =>
    setPassengers((ps) => ps.map((p, j) => (j === i ? { ...p, fullName: value } : p)));

  const submit = async (e) => {
    e.preventDefault();
    const localFields = validateBookingRequest({ passengers, contact, card, passengerCount: draft.passengers });
    if (Object.keys(localFields).length) return setFields(localFields);

    setFields({});
    setError('');
    setSubmitting(true);
    try {
      const booking = await createBooking({
        tripType: draft.tripType,
        outboundFlightId: draft.outboundFlight.id,
        returnFlightId: draft.returnFlight?.id,
        passengers,
        contact,
        card,
      });
      resetSelection();
      navigate(`/confirmation/${booking.id}`);
    } catch (err) {
      setError(err.message);
      if (err instanceof ApiError && err.fields) setFields(err.fields);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout">
      <h1>Review & pay</h1>
      <section className="summary">
        <FlightSummary flight={draft.outboundFlight} label="Outbound" />
        {draft.returnFlight && <FlightSummary flight={draft.returnFlight} label="Return" />}
        <p>{draft.passengers} passenger(s)</p>
        <dl className="totals">
          <div><dt>Subtotal</dt><dd>${totals.subtotal.toFixed(2)}</dd></div>
          <div><dt>Taxes &amp; fees</dt><dd>${totals.taxes.toFixed(2)}</dd></div>
          <div className="grand-total"><dt>Total</dt><dd>${totals.total.toFixed(2)}</dd></div>
        </dl>
      </section>

      <form onSubmit={submit} className="checkout-form">
        <h2>Passengers</h2>
        {passengers.map((p, i) => (
          <label key={i}>
            Passenger {i + 1} full name
            <input value={p.fullName} onChange={(e) => updatePassenger(i, e.target.value)} />
            {fields[`passenger_${i}`] && <span className="error">{fields[`passenger_${i}`]}</span>}
          </label>
        ))}

        <h2>Contact</h2>
        <label>
          Name
          <input value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} />
          {fields.name && <span className="error">{fields.name}</span>}
        </label>
        <label>
          Email
          <input value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} />
          {fields.email && <span className="error">{fields.email}</span>}
        </label>

        <h2>Payment (demo — no real charge)</h2>
        <label>
          Card number
          <input value={card.number} onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))} placeholder="4242 4242 4242 4242" />
          {fields.number && <span className="error">{fields.number}</span>}
        </label>
        <div className="row">
          <label>
            Expiry
            <input value={card.expiry} onChange={(e) => setCard((c) => ({ ...c, expiry: e.target.value }))} placeholder="MM/YY" />
            {fields.expiry && <span className="error">{fields.expiry}</span>}
          </label>
          <label>
            CVC
            <input value={card.cvc} onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value }))} placeholder="123" />
            {fields.cvc && <span className="error">{fields.cvc}</span>}
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Booking…' : `Pay $${totals.total.toFixed(2)}`}
        </button>
      </form>
    </div>
  );
}

function FlightSummary({ flight, label }) {
  return (
    <div className="flight-summary">
      <strong>{label}:</strong> {flight.airline} {flight.flightNumber} — {flight.originCity} → {flight.destinationCity}
      <br />
      {new Date(flight.departureTime).toLocaleString()} → {new Date(flight.arrivalTime).toLocaleString()}
    </div>
  );
}
