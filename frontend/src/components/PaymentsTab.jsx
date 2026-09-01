import { useState } from 'react';
import { fmtMoney, todayISO } from '../utils.js';
import { useToast } from './Toast.jsx';

export default function PaymentsTab({ state, onAddPayment, onDeletePayment }) {
  const toast = useToast();
  const [companyId, setCompanyId] = useState(state.companies[0]?.id || '');
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('paid');
  const [note, setNote] = useState('');

  if (state.companies.length === 0) {
    return (
      <div className="panel">
        <p className="empty">No companies yet. Add one in the Companies tab.</p>
      </div>
    );
  }

  async function submit() {
    if (!companyId || !date || !amount) return;
    await onAddPayment({ companyId, date, amount: Number(amount), status, note: note.trim() });
    toast('Payment recorded');
    setAmount('');
    setNote('');
  }

  async function deletePayment(id) {
    await onDeletePayment(id);
    toast('Payment removed', 'remove');
  }

  const rows = [...state.payments].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <div className="panel">
        <h2>Record a company payment</h2>
        <div className="row">
          <div className="field">
            <label>Company</label>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              {state.companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Amount ($)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Note (optional)</label>
            <input type="text" placeholder="e.g. Extra hours package purchase" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn" onClick={submit}>Save payment</button>
        </div>
      </div>
      <div className="panel">
        <h2>Payment history</h2>
        {rows.length === 0 ? (
          <p className="empty">No payments recorded yet.</p>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Company</th><th>Amount</th><th>Status</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {rows.map((p) => {
                const c = state.companies.find((x) => x.id === p.companyId);
                return (
                  <tr key={p.id}>
                    <td>{p.date}</td>
                    <td>{c ? c.name : '—'}</td>
                    <td>{fmtMoney(p.amount)}</td>
                    <td><span className={'badge ' + p.status}>{p.status}</span></td>
                    <td>{p.note || ''}</td>
                    <td><button className="btn small secondary" onClick={() => deletePayment(p.id)}>Delete</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
