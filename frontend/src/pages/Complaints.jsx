import { useEffect, useState } from 'react';
import api from '../api/client';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';

const Complaints = () => {
	const [items, setItems] = useState([]);
	const { register, handleSubmit, reset } = useForm();
	const { register: registerStatus, handleSubmit: handleSubmitStatus, reset: resetStatus } = useForm();
	const { user } = useAuth();

	const load = async () => {
		const { data } = await api.get('/complaints');
		setItems(data);
	};

	useEffect(() => { load(); }, []);

	const onCreate = async (values) => {
		await api.post('/complaints', { flatId: values.flatId, category: values.category, description: values.description });
		reset();
		load();
	};

	const onStatus = async (values) => {
		await api.post('/complaints/status', { complaintId: values.complaintId, status: values.status });
		resetStatus();
		load();
	};

	return (
		<div style={{ padding: 16 }}>
			<h2>Complaints</h2>
			<div style={{ display: 'flex', gap: 24 }}>
				<div>
					<h3>Create Complaint</h3>
					<form onSubmit={handleSubmit(onCreate)}>
						<input placeholder="Flat ID" {...register('flatId')} /><br />
						<input placeholder="Category" {...register('category')} /><br />
						<textarea placeholder="Description" {...register('description')} />
						<br />
						<button type="submit">Submit</button>
					</form>
				</div>
				{user?.role === 'ADMIN' && (
					<div>
						<h3>Update Status</h3>
						<form onSubmit={handleSubmitStatus(onStatus)}>
							<input placeholder="Complaint ID" {...registerStatus('complaintId')} /><br />
							<select {...registerStatus('status')}>
								<option value="OPEN">OPEN</option>
								<option value="IN_PROGRESS">IN_PROGRESS</option>
								<option value="CLOSED">CLOSED</option>
							</select>
							<br />
							<button type="submit">Update</button>
						</form>
					</div>
				)}
			</div>
			<hr />
			<ul>
				{items.map(c => (
					<li key={c.id}>{c.flat?.number} — [{c.status}] {c.category}: {c.description} (by {c.raisedBy?.name})</li>
				))}
			</ul>
		</div>
	);
};

export default Complaints;