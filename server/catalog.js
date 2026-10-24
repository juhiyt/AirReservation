// Generates the flight schedule seeded into the database (see db.js
// initDatabase). Deterministic, not random, so re-running the generator
// produces the same rows the ON CONFLICT (flight_number, departure_time)
// clause already has — only genuinely new days add new rows.
import { AIRPORTS_BY_CODE } from '../src/shared/airports.js';

const AIRLINES = ['Horizon Airlines', 'Pacific Blue', 'Summit Air', 'Continental Wing', 'SkyWest Air'];

// One directed route per entry; the reverse direction is listed separately so
// its own flight number and departure times can differ, like real schedules.
const ROUTES = [
  { origin: 'JFK', destination: 'LAX', durationMin: 360, price: 320, airlineIdx: 0, numberBase: 100 },
  { origin: 'LAX', destination: 'JFK', durationMin: 330, price: 320, airlineIdx: 0, numberBase: 101 },
  { origin: 'JFK', destination: 'ORD', durationMin: 150, price: 180, airlineIdx: 1, numberBase: 200 },
  { origin: 'ORD', destination: 'JFK', durationMin: 140, price: 180, airlineIdx: 1, numberBase: 201 },
  { origin: 'JFK', destination: 'MIA', durationMin: 190, price: 210, airlineIdx: 2, numberBase: 300 },
  { origin: 'MIA', destination: 'JFK', durationMin: 185, price: 210, airlineIdx: 2, numberBase: 301 },
  { origin: 'LAX', destination: 'SFO', durationMin: 80, price: 120, airlineIdx: 3, numberBase: 400 },
  { origin: 'SFO', destination: 'LAX', durationMin: 80, price: 120, airlineIdx: 3, numberBase: 401 },
  { origin: 'LAX', destination: 'SEA', durationMin: 160, price: 160, airlineIdx: 4, numberBase: 500 },
  { origin: 'SEA', destination: 'LAX', durationMin: 155, price: 160, airlineIdx: 4, numberBase: 501 },
  { origin: 'ORD', destination: 'DEN', durationMin: 130, price: 170, airlineIdx: 0, numberBase: 600 },
  { origin: 'DEN', destination: 'ORD', durationMin: 125, price: 170, airlineIdx: 0, numberBase: 601 },
  { origin: 'ATL', destination: 'JFK', durationMin: 140, price: 190, airlineIdx: 1, numberBase: 700 },
  { origin: 'JFK', destination: 'ATL', durationMin: 145, price: 190, airlineIdx: 1, numberBase: 701 },
  { origin: 'BOS', destination: 'SFO', durationMin: 370, price: 340, airlineIdx: 2, numberBase: 800 },
  { origin: 'SFO', destination: 'BOS', durationMin: 340, price: 340, airlineIdx: 2, numberBase: 801 },
  { origin: 'DFW', destination: 'LAX', durationMin: 190, price: 220, airlineIdx: 3, numberBase: 900 },
  { origin: 'LAX', destination: 'DFW', durationMin: 185, price: 220, airlineIdx: 3, numberBase: 901 },
  { origin: 'MIA', destination: 'ATL', durationMin: 110, price: 150, airlineIdx: 4, numberBase: 1000 },
  { origin: 'ATL', destination: 'MIA', durationMin: 115, price: 150, airlineIdx: 4, numberBase: 1001 },
];

const DEPARTURE_HOURS_UTC = [13, 22]; // two departures/day per route (local-time nuance ignored for this demo)
const DAYS_AHEAD = 21;
const SEATS_PER_FLIGHT = 9; // small on purpose: makes "sold out" easy to hit while testing

function buildFlights() {
  const flights = [];
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  for (const route of ROUTES) {
    const origin = AIRPORTS_BY_CODE[route.origin];
    const destination = AIRPORTS_BY_CODE[route.destination];
    for (let day = 0; day < DAYS_AHEAD; day++) {
      DEPARTURE_HOURS_UTC.forEach((hour, slot) => {
        const departureTime = new Date(todayUTC + day * 86_400_000 + hour * 3_600_000);
        const arrivalTime = new Date(departureTime.getTime() + route.durationMin * 60_000);
        flights.push({
          flightNumber: `${airlineCode(route.airlineIdx)}${route.numberBase + slot}`,
          airline: AIRLINES[route.airlineIdx],
          origin: origin.code,
          originCity: origin.city,
          destination: destination.code,
          destinationCity: destination.city,
          departureTime,
          arrivalTime,
          price: route.price,
          seatsTotal: SEATS_PER_FLIGHT,
        });
      });
    }
  }
  return flights;
}

function airlineCode(idx) {
  return ['HZ', 'PB', 'SU', 'CW', 'SW'][idx];
}

export const FLIGHTS = buildFlights();
