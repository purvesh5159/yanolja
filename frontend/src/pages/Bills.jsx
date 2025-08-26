import { useEffect, useState } from 'react';
import api from '../api/client';
import { useForm } from 'react-hook-form';

const Bills = () => {
	const [bills, setBills] = useState([]);
	const { register, handleSubmit, reset } = useForm();
	const { register: registerPay, handleSubmit: handleSubmitPay, reset: resetPay } = useForm();

	const load = async () => {
		const { data } = await api.get('/bills');
		setBills(data);
	};

	useEffect(() => { load(); }, []);

	const onCreate = async (values) => {
		await api.post('/bills', {
			flatId: values.flatId,
			monthStart: values.monthStart,
			amountCents: Number(values.amountCents),
			dueDate: values.dueDate,
		});
		reset();
		load();
	};

	const onPay = async (values) => {
		await api.post('/bills/pay', { billId: values.billId, amountCents: Number(values.amountCents) });
		resetPay();
		load();
	};

	return (
		<div style={{ padding: 16 }}>
			<h2>Bills</h2>
			<div style={{ display: 'flex', gap: 24 }}>
				<div>
					<h3>Create Bill</h3>
					<form onSubmit={handleSubmit(onCreate)}>
						<input placeholder="Flat ID" {...register('flatId')} /><br />
						<input placeholder="Month Start (YYYY-MM-01)" {...register('monthStart')} /><br />
						<input placeholder="Amount (cents)" type="number" {...register('amountCents')} /><br />
						<input placeholder="Due Date (YYYY-MM-DD)" {...register('dueDate')} /><br />
						<button type="submit">Create</button>
					</form>
				</div>
				<div>
					<h3>Mark Bill Paid</h3>
					<form onSubmit={handleSubmitPay(onPay)}>
						<input placeholder="Bill ID" {...registerPay('billId')} /><br />
						<input placeholder="Amount (cents)" type="number" {...registerPay('amountCents')} /><br />
						<button type="submit">Pay</button>
					</form>
				</div>
			</div>
			<hr />
			<ul>
				{bills.map(b => (
					<li key={b.id}>{b.flat?.number}: {b.amountCents} — {b.status} — {new Date(b.monthStart).toLocaleDateString()}</li>
				))}
			</ul>
		</div>
	);
};

export default Bills;