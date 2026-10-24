import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.js';
import { HttpError } from '../httpError.js';

export async function requireAuth(req, res, next) {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) throw new HttpError(401, 'You must be signed in to do that.');
    req.user = session.user;
    next();
  } catch (err) {
    next(err);
  }
}
