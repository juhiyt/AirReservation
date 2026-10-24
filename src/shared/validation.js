// Checkout field rules — used by both the Checkout page (instant feedback) and
// the server (enforcement). The server never trusts that the client ran these.
export function validatePassengerName(fullName) {
  return !fullName || fullName.trim().length < 2 ? "Enter the passenger's full name." : null;
}

export function validateContact(contact) {
  const fields = {};
  if (!contact?.name || contact.name.trim().length < 2) fields.name = 'Enter a contact name.';
  if (!contact?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    fields.email = 'Enter a valid email address.';
  }
  return fields;
}

export function validateCard(card) {
  const fields = {};
  const digits = (card?.number ?? '').replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(digits)) fields.number = 'Enter a valid card number.';
  if (!/^\d{2}\/\d{2}$/.test(card?.expiry ?? '')) fields.expiry = 'Use MM/YY.';
  if (!/^\d{3,4}$/.test(card?.cvc ?? '')) fields.cvc = 'Enter the 3 or 4 digit security code.';
  return fields;
}

// Returns a flat { fieldName: message } map — passenger errors are keyed
// `passenger_<index>` so the Checkout form can point at the right input.
export function validateBookingRequest({ passengers, contact, card, passengerCount }) {
  const fields = {};
  if (!Array.isArray(passengers) || passengers.length !== passengerCount) {
    fields.passengers = 'Enter a name for every passenger.';
  } else {
    passengers.forEach((p, i) => {
      const err = validatePassengerName(p?.fullName);
      if (err) fields[`passenger_${i}`] = err;
    });
  }
  Object.assign(fields, validateContact(contact));
  Object.assign(fields, validateCard(card));
  return fields;
}
