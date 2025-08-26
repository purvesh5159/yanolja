import { useEffect, useState } from 'react';
import api from '../api/client';
import { useForm } from 'react-hook-form';

const Flats = () => {
	const [flats, setFlats] = useState([]);
	const { register, handleSubmit, reset } = useForm();
	const { register: registerAssign, handleSubmit: handleSubmitAssign, reset: resetAssign } = useForm();

	const load = async () => {
		const { data } = await api.get('/flats');
		setFlats(data);
	};

	useEffect(() => { load(); }, []);

	const onCreate = async (values) => {
		await api.post('/flats', { number: values.number, floor: Number(values.floor), towerId: values.towerId });
		reset();
		load();
	};

	const onAssign = async (values) => {
		await api.post('/flats/assign', { userId: values.userId, flatId: values.flatId });
		resetAssign();
		load();
	};

	return (
		<div style={{ padding: 16 }}>
			<h2>Flats</h2>
			<div style={{ display: 'flex', gap: 24 }}>
				<div>
					<h3>Create Flat</h3>
					<form onSubmit={handleSubmit(onCreate)}>
						<input placeholder="Number" {...register('number')} /><br />
						<input placeholder="Floor" type="number" {...register('floor')} /><br />
						<input placeholder="Tower ID" {...register('towerId')} /><br />
						<button type="submit">Create</button>
					</form>
				</div>
				<div>
					<h3>Assign User to Flat</h3>
					<form onSubmit={handleSubmitAssign(onAssign)}>
						<input placeholder="User ID" {...registerAssign('userId')} /><br />
						<input placeholder="Flat ID" {...registerAssign('flatId')} /><br />
						<button type="submit">Assign</button>
					</form>
				</div>
			</div>
			<hr />
			<ul>
				{flats.map(f => (
					<li key={f.id}>{f.tower?.name} - {f.number} (floor {f.floor}) — residents: {f.residents?.map(r => r.name).join(', ')}</li>
				))}
			</ul>
		</div>
	);
};

export default Flats;