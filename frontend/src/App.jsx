import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import NavBar from './components/NavBar.jsx';
import Flats from './pages/Flats.jsx';
import Bills from './pages/Bills.jsx';
import Complaints from './pages/Complaints.jsx';

const Dashboard = () => (
	<div style={{ padding: 16 }}>
		<h2>Dashboard</h2>
		<p>Welcome to Society Management</p>
	</div>
);

const Shell = ({ children }) => (
	<div>
		<NavBar />
		{children}
	</div>
);

function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route
						path="/"
						element={
							<ProtectedRoute>
								<Shell>
									<Dashboard />
								</Shell>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/flats"
						element={
							<ProtectedRoute>
								<Shell>
									<Flats />
								</Shell>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/bills"
						element={
							<ProtectedRoute>
								<Shell>
									<Bills />
								</Shell>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/complaints"
						element={
							<ProtectedRoute>
								<Shell>
									<Complaints />
								</Shell>
							</ProtectedRoute>
						}
					/>
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	);
}

export default App;
