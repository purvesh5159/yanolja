import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavBar = () => {
	const { user, logout } = useAuth();
	return (
		<div style={{ display: 'flex', gap: 12, padding: 12, borderBottom: '1px solid #eee' }}>
			<Link to="/">Dashboard</Link>
			<Link to="/flats">Flats</Link>
			<Link to="/bills">Bills</Link>
			<Link to="/complaints">Complaints</Link>
			<div style={{ marginLeft: 'auto' }}>
				{user && (
					<>
						<span style={{ marginRight: 8 }}>{user.name} ({user.role})</span>
						<button onClick={logout}>Logout</button>
					</>
				)}
			</div>
		</div>
	);
};

export default NavBar;