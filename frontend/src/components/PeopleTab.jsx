import { useState } from 'react';
import { fmtMoney, todayISO, workerTotalCost } from '../utils.js';
import { useToast } from './Toast.jsx';

export default function PeopleTab({ state, onAddWorker, onDeleteWorker, onAddWorkerCost, onDeleteWorkerCost, year, setYear }) {
  const toast = useToast();
  const [newWorkerName, setNewWorkerName] = useState('');
  const [wcWorker, setWcWorker] = useState('');
  const [wcCompany, setWcCompany] = useState('');
  const [wcDate, setWcDate] = useState(todayISO());
  const [wcAmount, setWcAmount] = useState('');
  const [wcNote, setWcNote] = useState('');

  const years = new Set([new Date().getFullYear()]);
  state.workerCosts.forEach((wc) => years.add(new Date(wc.date).getFullYear()));
  const yearList = [...years].sort((a, b) => b - a);

  async function addWorker() {
    const name = newWorkerName.trim();
    if (!name) return;
    await onAddWorker({ name });
    toast(`Worker "${name}" added`);
    setNewWorkerName('');
  }

  async function deleteWorker(id) {
    const w = state.workers.find((x) => x.id === id);
    if (!confirm('Delete this worker? Their logged cost history stays but becomes orphaned.')) return;
    await onDeleteWorker(id);
    toast(`Worker "${w ? w.name : ''}" removed`, 'remove');
  }

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
        <h2>Workers</h2>
        {state.workers.length === 0 && <p className="empty">No workers added yet.</p>}
        <div className="add-company-row">
          <div className="field">
            <label>New worker name</label>
            <input type="text" placeholder="e.g. Kasun Perera" value={newWorkerName} onChange={(e) => setNewWorkerName(e.target.value)} />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end', flex: 0 }}>
            <button className="btn" onClick={addWorker}>Add worker</button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Payout summary — {year}</h2>
          <select className="tag-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearList.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: 14 }}>
          {state.workers.length === 0 ? (
            <p className="empty">Add a worker above.</p>
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
                <option disabled>Add a worker first</option>
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
                    <td><button className="btn small secondary" onClick={() => deleteWorkerCost(wc.id)}>Delete</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>Manage workers</h2>
        {state.workers.length === 0 ? (
          <p className="empty">No workers yet.</p>
        ) : (
          <table>
            <thead><tr><th>Name</th><th></th></tr></thead>
            <tbody>
              {state.workers.map((w) => (
                <tr key={w.id}>
                  <td>{w.name}</td>
                  <td><button className="btn small secondary" onClick={() => deleteWorker(w.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
