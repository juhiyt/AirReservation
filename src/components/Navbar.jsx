import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '../api/authClient.js';

export default function Navbar() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const signOut = async () => {
    await authClient.signOut();
    navigate('/');
  };

  return (
    <header className="navbar">
      <Link to="/" className="brand">✈ SkyBooker</Link>
      <nav>
        <Link to="/bookings">My bookings</Link>
        {session ? (
          <>
            <span className="navbar-user">{session.user.name}</span>
            <button className="link-button" onClick={signOut}>Sign out</button>
          </>
        ) : (
          <Link to="/login">Sign in</Link>
        )}
      </nav>
    </header>
  );
}
