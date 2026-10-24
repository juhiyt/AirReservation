export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: options.body && JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`, data.fields);
  return data;
}

export const searchFlights = ({ origin, destination, date, passengers }) =>
  request(`/flights/search?${new URLSearchParams({ origin, destination, date, passengers }).toString()}`);

export const createBooking = (body) => request('/bookings', { method: 'POST', body });
export const getMyBookings = () => request('/bookings');
export const getBooking = (id) => request(`/bookings/${id}`);
export const cancelBooking = (id) => request(`/bookings/${id}/cancel`, { method: 'POST' });
