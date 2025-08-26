import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const Login = () => {
	const { register, handleSubmit } = useForm();
	const { login } = useAuth();
	const navigate = useNavigate();
	const [error, setError] = useState('');

	const onSubmit = async (values) => {
		setError('');
		try {
			await login(values.email, values.password);
			navigate('/');
		} catch (e) {
			setError('Invalid credentials');
		}
	};

	return (
		<div style={{ maxWidth: 360, margin: '80px auto' }}>
			<h2>Login</h2>
			<form onSubmit={handleSubmit(onSubmit)}>
				<input placeholder="Email" {...register('email')} style={{ width: '100%', marginBottom: 8 }} />
				<input placeholder="Password" type="password" {...register('password')} style={{ width: '100%', marginBottom: 8 }} />
				<button type="submit" style={{ width: '100%' }}>Login</button>
				{error && <p style={{ color: 'red' }}>{error}</p>}
			</form>
		</div>
	);
};

export default Login;