import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIRPORTS } from '../shared/airports.js';
import { useBooking } from '../context/BookingContext.jsx';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const { startSearch } = useBooking();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    tripType: 'one_way',
    origin: 'JFK',
    destination: 'LAX',
    departDate: todayISO(),
    returnDate: '',
    passengers: 1,
  });
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (form.origin === form.destination) return setError('Origin and destination must be different.');
    if (form.tripType === 'round_trip' && (!form.returnDate || form.returnDate < form.departDate)) {
      return setError('Pick a return date on or after the departure date.');
    }
    setError('');
    startSearch({ ...form, passengers: Number(form.passengers) });
    navigate('/results');
  };

  return (
    <div className="search-card">
      <h1>Find your flight</h1>
      <form onSubmit={submit} className="search-form">
        <div className="trip-type">
          <label>
            <input type="radio" name="tripType" value="one_way" checked={form.tripType === 'one_way'} onChange={set('tripType')} />
            One-way
          </label>
          <label>
            <input type="radio" name="tripType" value="round_trip" checked={form.tripType === 'round_trip'} onChange={set('tripType')} />
            Round-trip
          </label>
        </div>
        <div className="row">
          <label>
            From
            <select value={form.origin} onChange={set('origin')}>
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>{a.city} ({a.code})</option>
              ))}
            </select>
          </label>
          <label>
            To
            <select value={form.destination} onChange={set('destination')}>
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>{a.city} ({a.code})</option>
              ))}
            </select>
          </label>
        </div>
        <div className="row">
          <label>
            Depart
            <input type="date" min={todayISO()} value={form.departDate} onChange={set('departDate')} required />
          </label>
          {form.tripType === 'round_trip' && (
            <label>
              Return
              <input type="date" min={form.departDate || todayISO()} value={form.returnDate} onChange={set('returnDate')} required />
            </label>
          )}
          <label>
            Passengers
            <input type="number" min="1" max="9" value={form.passengers} onChange={set('passengers')} required />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Search flights</button>
      </form>
    </div>
  );
}
