import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext.jsx';
import { searchFlights } from '../api/flightApi.js';
import FlightCard from '../components/FlightCard.jsx';

// Stage machine driven entirely by what's already in the draft: pick an
// outbound flight, then (for round trips) a return flight, then move on.
function stageOf(draft) {
  if (!draft.outboundFlight) return 'outbound';
  if (draft.tripType === 'round_trip' && !draft.returnFlight) return 'return';
  return 'done';
}

export default function Results() {
  const { draft, selectOutbound, selectReturn } = useBooking();
  const navigate = useNavigate();
  const stage = stageOf(draft);

  const [flights, setFlights] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!draft.origin || !draft.departDate) {
      navigate('/', { replace: true });
      return;
    }
    if (stage === 'done') {
      navigate('/checkout');
      return;
    }
    const params = stage === 'outbound'
      ? { origin: draft.origin, destination: draft.destination, date: draft.departDate, passengers: draft.passengers }
      : { origin: draft.destination, destination: draft.origin, date: draft.returnDate, passengers: draft.passengers };

    setStatus('loading');
    searchFlights(params)
      .then((data) => {
        setFlights(data);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err.message);
        setStatus('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, draft.origin, draft.destination, draft.departDate, draft.returnDate, draft.passengers]);

  if (stage === 'done') return null;

  const pick = (flight) => (stage === 'outbound' ? selectOutbound(flight) : selectReturn(flight));
  const routeFrom = stage === 'outbound' ? draft.origin : draft.destination;
  const routeTo = stage === 'outbound' ? draft.destination : draft.origin;
  const date = stage === 'outbound' ? draft.departDate : draft.returnDate;

  return (
    <div>
      <h1>{stage === 'return' ? 'Choose your return flight' : 'Choose your flight'}</h1>
      <p className="results-sub">{routeFrom} → {routeTo} · {date} · {draft.passengers} passenger(s)</p>
      {status === 'loading' && <p>Searching flights…</p>}
      {status === 'error' && <p className="error">{error}</p>}
      {status === 'ready' && flights.length === 0 && <p>No flights found for this route and date.</p>}
      <div className="flight-list">
        {flights.map((f) => <FlightCard key={f.id} flight={f} onSelect={() => pick(f)} />)}
      </div>
    </div>
  );
}
