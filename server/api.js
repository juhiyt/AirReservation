import express from 'express';
import { pool, transaction } from './db.js';
import { requireAuth } from './middleware/requireAuth.js';
import { HttpError } from './httpError.js';
import { computeBookingTotals } from '../src/shared/pricing.js';
import { validateBookingRequest } from '../src/shared/validation.js';
import { deriveBookingStatus, canCancelBooking } from '../src/shared/status.js';

export const api = express.Router();
api.use(express.json({ limit: '20kb' }));

api.get('/health', (req, res) => res.json({ ok: true }));

// pg returns NUMERIC columns as strings (to avoid float precision loss), so every
// money value is converted explicitly before it reaches the client.
const toFlight = (r) => ({
  id: r.id,
  flightNumber: r.flight_number,
  airline: r.airline,
  origin: r.origin,
  originCity: r.origin_city,
  destination: r.destination,
  destinationCity: r.destination_city,
  departureTime: r.departure_time.toISOString(),
  arrivalTime: r.arrival_time.toISOString(),
  price: Number(r.price),
  seatsAvailable: r.seats_available,
  seatsTotal: r.seats_total,
});

// --- Flights ----------------------------------------------------------------

api.get('/flights/search', async (req, res) => {
  const { origin, destination, date, passengers } = req.query;
  if (!origin || !destination || !date) throw new HttpError(400, 'origin, destination and date are required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, 'Invalid date.');
  const qty = Math.max(1, Math.min(9, Number(passengers) || 1));

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const { rows } = await pool.query(
    `SELECT * FROM flights
     WHERE origin = $1 AND destination = $2
       AND departure_time >= $3 AND departure_time < $4
       AND seats_available >= $5
     ORDER BY departure_time`,
    [origin, destination, dayStart, dayEnd, qty],
  );
  res.json(rows.map(toFlight));
});

// --- Bookings -----------------------------------------------------------------

// Loads bookings either by owning user (list) or by id (single, ownership
// checked by the caller), each with its flight legs and passenger names.
async function loadBookings(db, { userId, id } = {}) {
  const { rows } = id
    ? await db.query('SELECT * FROM bookings WHERE id = $1', [id])
    : await db.query('SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  if (rows.length === 0) return [];

  const bookingIds = rows.map((r) => r.id);
  const [{ rows: flightRows }, { rows: passengerRows }] = await Promise.all([
    db.query('SELECT * FROM booking_flights WHERE booking_id = ANY($1) ORDER BY direction DESC', [bookingIds]),
    db.query('SELECT * FROM booking_passengers WHERE booking_id = ANY($1) ORDER BY seq', [bookingIds]),
  ]);

  return rows.map((r) => {
    const flights = flightRows
      .filter((f) => f.booking_id === r.id)
      .map((f) => ({
        direction: f.direction,
        flightNumber: f.flight_number,
        airline: f.airline,
        origin: f.origin,
        originCity: f.origin_city,
        destination: f.destination,
        destinationCity: f.destination_city,
        departureTime: f.departure_time.toISOString(),
        arrivalTime: f.arrival_time.toISOString(),
        pricePerSeat: Number(f.price_per_seat),
      }));
    const booking = {
      id: r.id,
      userId: r.user_id,
      status: r.status,
      tripType: r.trip_type,
      contact: { name: r.contact_name, email: r.contact_email },
      passengers: passengerRows.filter((p) => p.booking_id === r.id).map((p) => p.full_name),
      cardLast4: r.card_last4,
      totals: { subtotal: Number(r.subtotal), taxes: Number(r.taxes), total: Number(r.total) },
      createdAt: r.created_at.toISOString(),
      flights,
    };
    return { ...booking, displayStatus: deriveBookingStatus(booking), canCancel: canCancelBooking(booking) };
  });
}

api.get('/bookings', requireAuth, async (req, res) => {
  res.json(await loadBookings(pool, { userId: req.user.id }));
});

api.get('/bookings/:id', requireAuth, async (req, res) => {
  const [booking] = await loadBookings(pool, { id: req.params.id });
  if (!booking || booking.userId !== req.user.id) throw new HttpError(404, 'Booking not found');
  delete booking.userId;
  res.json(booking);
});

// Body: { tripType, outboundFlightId, returnFlightId?, passengers: [{fullName}],
//         contact: {name, email}, card: {number, expiry, cvc} }
// Prices and seat availability come from the database; the client's numbers are
// never trusted.
api.post('/bookings', requireAuth, async (req, res) => {
  const { tripType, outboundFlightId, returnFlightId, passengers, contact, card } = req.body ?? {};

  if (tripType !== 'one_way' && tripType !== 'round_trip') throw new HttpError(400, 'Invalid trip type.');
  if (!Number.isInteger(outboundFlightId)) throw new HttpError(400, 'Invalid outbound flight.');
  if (tripType === 'round_trip' && !Number.isInteger(returnFlightId)) throw new HttpError(400, 'Invalid return flight.');

  const passengerCount = Array.isArray(passengers) ? passengers.length : 0;
  if (passengerCount < 1 || passengerCount > 9) throw new HttpError(400, 'Choose between 1 and 9 passengers.');

  const fields = validateBookingRequest({ passengers, contact, card, passengerCount });
  if (Object.keys(fields).length) throw new HttpError(400, 'Please fix the highlighted fields.', fields);

  const flightIds = tripType === 'round_trip'
    ? [...new Set([outboundFlightId, returnFlightId])].sort((a, b) => a - b)
    : [outboundFlightId];
  if (tripType === 'round_trip' && flightIds.length !== 2) {
    throw new HttpError(400, 'Outbound and return flights must be different.');
  }

  const bookingId = await transaction(async (db) => {
    // Sorted ids give a consistent lock order, so concurrent bookings on the
    // same pair of flights can't deadlock against each other.
    const flightById = new Map();
    for (const flightId of flightIds) {
      // Atomic check-and-decrement: no row is returned if there aren't enough seats.
      const { rows } = await db.query(
        'UPDATE flights SET seats_available = seats_available - $2 WHERE id = $1 AND seats_available >= $2 RETURNING *',
        [flightId, passengerCount],
      );
      if (rows.length === 0) {
        const { rows: found } = await db.query('SELECT seats_available FROM flights WHERE id = $1', [flightId]);
        if (found.length === 0) throw new HttpError(400, `Unknown flight: ${flightId}`);
        throw new HttpError(
          409,
          `Sorry, only ${found[0].seats_available} seat(s) left on that flight. Please search again.`,
        );
      }
      flightById.set(flightId, rows[0]);
    }

    const outbound = flightById.get(outboundFlightId);
    const ret = tripType === 'round_trip' ? flightById.get(returnFlightId) : null;
    const totals = computeBookingTotals({
      outboundPrice: Number(outbound.price),
      returnPrice: ret ? Number(ret.price) : 0,
      passengerCount,
    });

    const id = 'AR-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
    await db.query(
      `INSERT INTO bookings (id, user_id, trip_type, contact_name, contact_email, passenger_count, card_last4, subtotal, taxes, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id, req.user.id, tripType, contact.name.trim(), contact.email.trim(), passengerCount,
        // Only the last 4 card digits are kept; this is a demo with no payment processor.
        card.number.replace(/\s/g, '').slice(-4),
        totals.subtotal, totals.taxes, totals.total,
      ],
    );
    for (const [i, p] of passengers.entries()) {
      await db.query(
        'INSERT INTO booking_passengers (booking_id, seq, full_name) VALUES ($1, $2, $3)',
        [id, i, p.fullName.trim()],
      );
    }
    const legs = ret ? [['outbound', outbound], ['return', ret]] : [['outbound', outbound]];
    for (const [direction, f] of legs) {
      await db.query(
        `INSERT INTO booking_flights
           (booking_id, direction, flight_id, flight_number, airline, origin, origin_city, destination, destination_city, departure_time, arrival_time, price_per_seat)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [id, direction, f.id, f.flight_number, f.airline, f.origin, f.origin_city, f.destination, f.destination_city, f.departure_time, f.arrival_time, f.price],
      );
    }
    return id;
  });

  const [booking] = await loadBookings(pool, { id: bookingId });
  delete booking.userId;
  res.status(201).json(booking);
});

api.post('/bookings/:id/cancel', requireAuth, async (req, res) => {
  await transaction(async (db) => {
    // Lock the booking row first so two cancel requests on it can't both restore seats.
    const { rows } = await db.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (rows.length === 0 || rows[0].user_id !== req.user.id) throw new HttpError(404, 'Booking not found');

    const [existing] = await loadBookings(db, { id: req.params.id });
    if (!existing.canCancel) throw new HttpError(409, 'This booking can no longer be cancelled.');

    // Lock flight rows in id order, matching the order used when creating bookings.
    await db.query(
      `SELECT f.id FROM flights f JOIN booking_flights bf ON bf.flight_id = f.id
       WHERE bf.booking_id = $1 ORDER BY f.id FOR UPDATE OF f`,
      [req.params.id],
    );
    await db.query(
      `UPDATE flights f SET seats_available = f.seats_available + $2
       FROM booking_flights bf WHERE bf.booking_id = $1 AND bf.flight_id = f.id`,
      [req.params.id, rows[0].passenger_count],
    );
    await db.query("UPDATE bookings SET status = 'Cancelled' WHERE id = $1", [req.params.id]);
  });

  const [booking] = await loadBookings(pool, { id: req.params.id });
  delete booking.userId;
  res.json(booking);
});

// --- Errors -------------------------------------------------------------------

api.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
api.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, fields: err.fields });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});
