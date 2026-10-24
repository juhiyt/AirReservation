export default function FlightCard({ flight, onSelect }) {
  const depart = new Date(flight.departureTime);
  const arrive = new Date(flight.arrivalTime);
  const durationMin = Math.round((arrive - depart) / 60_000);
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  const low = flight.seatsAvailable <= 3;

  return (
    <div className="flight-card">
      <div className="flight-main">
        <div className="flight-times">
          <span>{depart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="arrow">→</span>
          <span>{arrive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flight-meta">
          {flight.airline} · {flight.flightNumber} · {hours}h {mins}m nonstop
        </div>
      </div>
      <div className="flight-side">
        <div className="flight-price">${flight.price.toFixed(2)}</div>
        <div className={low ? 'flight-seats flight-seats-low' : 'flight-seats'}>
          {flight.seatsAvailable} seat(s) left
        </div>
        <button onClick={onSelect}>Select</button>
      </div>
    </div>
  );
}
