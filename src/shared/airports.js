// Static reference data shared by the search dropdowns (client) and route
// generation / search validation (server). Not user data, so it ships as a
// plain module rather than a database table or an API round trip.
export const AIRPORTS = [
  { code: 'JFK', city: 'New York', name: 'John F. Kennedy Intl' },
  { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles Intl' },
  { code: 'ORD', city: 'Chicago', name: "O'Hare Intl" },
  { code: 'SFO', city: 'San Francisco', name: 'San Francisco Intl' },
  { code: 'MIA', city: 'Miami', name: 'Miami Intl' },
  { code: 'SEA', city: 'Seattle', name: 'Seattle-Tacoma Intl' },
  { code: 'DEN', city: 'Denver', name: 'Denver Intl' },
  { code: 'ATL', city: 'Atlanta', name: 'Hartsfield-Jackson Atlanta Intl' },
  { code: 'BOS', city: 'Boston', name: 'Logan Intl' },
  { code: 'DFW', city: 'Dallas', name: 'Dallas/Fort Worth Intl' },
];

export const AIRPORTS_BY_CODE = Object.fromEntries(AIRPORTS.map((a) => [a.code, a]));
