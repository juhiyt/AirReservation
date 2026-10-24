-- Run on every startup (see server/db.js). Every statement here must be safe
-- to re-run: CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, etc.

-- This must run AFTER `npm run auth:migrate` on a fresh database: bookings.user_id
-- has a foreign key to Better Auth's "user" table, which only that migration creates.

CREATE TABLE IF NOT EXISTS flights (
  id                SERIAL PRIMARY KEY,
  flight_number     TEXT NOT NULL,
  airline           TEXT NOT NULL,
  origin            TEXT NOT NULL,
  origin_city       TEXT NOT NULL,
  destination       TEXT NOT NULL,
  destination_city  TEXT NOT NULL,
  departure_time    TIMESTAMPTZ NOT NULL,
  arrival_time      TIMESTAMPTZ NOT NULL,
  price             NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  seats_total       INTEGER NOT NULL CHECK (seats_total >= 0),
  seats_available   INTEGER NOT NULL CHECK (seats_available >= 0),
  CHECK (arrival_time > departure_time),
  UNIQUE (flight_number, departure_time)
);
CREATE INDEX IF NOT EXISTS flights_route_idx ON flights (origin, destination, departure_time);

CREATE TABLE IF NOT EXISTS bookings (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Cancelled')),
  trip_type        TEXT NOT NULL CHECK (trip_type IN ('one_way', 'round_trip')),
  contact_name     TEXT NOT NULL,
  contact_email    TEXT NOT NULL,
  passenger_count  INTEGER NOT NULL CHECK (passenger_count > 0),
  card_last4       TEXT NOT NULL,
  subtotal         NUMERIC(10, 2) NOT NULL,
  taxes            NUMERIC(10, 2) NOT NULL,
  total            NUMERIC(10, 2) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings (user_id);

CREATE TABLE IF NOT EXISTS booking_passengers (
  booking_id  TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seq         INTEGER NOT NULL,
  full_name   TEXT NOT NULL,
  PRIMARY KEY (booking_id, seq)
);

-- Flight details are copied at booking time so a later schedule change never
-- rewrites booking history.
CREATE TABLE IF NOT EXISTS booking_flights (
  booking_id        TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  direction         TEXT NOT NULL CHECK (direction IN ('outbound', 'return')),
  flight_id         INTEGER NOT NULL REFERENCES flights(id),
  flight_number     TEXT NOT NULL,
  airline           TEXT NOT NULL,
  origin            TEXT NOT NULL,
  origin_city       TEXT NOT NULL,
  destination       TEXT NOT NULL,
  destination_city  TEXT NOT NULL,
  departure_time    TIMESTAMPTZ NOT NULL,
  arrival_time      TIMESTAMPTZ NOT NULL,
  price_per_seat    NUMERIC(10, 2) NOT NULL,
  PRIMARY KEY (booking_id, direction)
);

-- better-auth's core package sometimes expects a column its CLI migration
-- hasn't added yet (version drift between `better-auth` and `@better-auth/cli`).
ALTER TABLE account ADD COLUMN IF NOT EXISTS issuer TEXT;
