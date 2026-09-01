import { useState } from 'react';
import { fmtMoney, todayISO, workerTotalCost } from '../utils.js';
import { useToast } from './Toast.jsx';
import { IconTrash } from './Icons.jsx';

export default function PeopleTab({ state, onAddWorkerCost, onDeleteWorkerCost, year, setYear }) {
  const toast = useToast();
  const [wcWorker, setWcWorker] = useState('');
  const [wcCompany, setWcCompany] = useState('');
  const [wcDate, setWcDate] = useState(todayISO());
  const [wcAmount, setWcAmount] = useState('');
  const [wcNote, setWcNote] = useState('');

  const years = new Set([new Date().getFullYear()]);
  state.workerCosts.forEach((wc) => years.add(new Date(wc.date).getFullYear()));
  const yearList = [...years].sort((a, b) => b - a);

  async function addWorkerCost() {
    if (!wcWorker || !wcDate || !wcAmount) return;
    await onAddWorkerCost({
      workerId: wcWorker,
      companyId: wcCompany || null,
      date: wcDate,
      amount: Number(wcAmount),
      note: wcNote.trim(),
    });
    toast('Payout logged');
    setWcAmount('');
    setWcNote('');
  }

  async function deleteWorkerCost(id) {
    await onDeleteWorkerCost(id);
    toast('Payout entry removed', 'remove');
  }

  const costRows = [...state.workerCosts].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Payout summary — {year}</h2>
          <select className="tag-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearList.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <p className="small-muted" style={{ marginTop: 6 }}>
          Workers are created automatically from login accounts (Supabase Dashboard → Authentication → Users).
        </p>
        <div style={{ marginTop: 14 }}>
          {state.workers.length === 0 ? (
            <p className="empty">No worker accounts yet.</p>
          ) : (
            state.workers.map((w) => {
              const total = workerTotalCost(w, year, state.workerCosts);
              return (
                <div className="worker-card" key={w.id}>
                  <div className="head">
                    <h3>{w.name}</h3>
                    <b>{fmtMoney(total)}</b>
                  </div>
                  <div className="small-muted">total paid out · {year}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Log a personal cost / payout</h2>
        <p className="small-muted">This tracks what each worker is owed or paid for a job — it's separate from what's billed to the company.</p>
        <div className="row">
          <div className="field">
            <label>Worker</label>
            <select value={wcWorker} onChange={(e) => setWcWorker(e.target.value)}>
              {state.workers.length === 0 ? (
                <option disabled>No workers yet</option>
              ) : (
                <>
                  <option value=""></option>
                  {state.workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div className="field">
            <label>Company (optional)</label>
            <select value={wcCompany} onChange={(e) => setWcCompany(e.target.value)}>
              <option value="">—</option>
              {state.companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={wcDate} onChange={(e) => setWcDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Amount ($)</label>
            <input type="number" min="0" step="0.01" value={wcAmount} onChange={(e) => setWcAmount(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Note (optional)</label>
            <input type="text" placeholder="e.g. Payout for weekend job" value={wcNote} onChange={(e) => setWcNote(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn" onClick={addWorkerCost} disabled={state.workers.length === 0}>Save</button>
        </div>
        {costRows.length > 0 && (
          <table style={{ marginTop: 18 }}>
            <thead><tr><th>Date</th><th>Worker</th><th>Company</th><th>Amount</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {costRows.map((wc) => {
                const w = state.workers.find((x) => x.id === wc.workerId);
                const c = state.companies.find((x) => x.id === wc.companyId);
                return (
                  <tr key={wc.id}>
                    <td>{wc.date}</td>
                    <td>{w ? w.name : '—'}</td>
                    <td>{c ? c.name : '—'}</td>
                    <td>{fmtMoney(wc.amount)}</td>
                    <td>{wc.note || ''}</td>
                    <td className="row-actions"><button className="icon-btn danger" title="Delete" onClick={() => deleteWorkerCost(wc.id)}><IconTrash width={15} height={15} /></button></td>
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
