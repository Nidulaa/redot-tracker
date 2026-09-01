import { useState } from 'react';
import { fmtMoney, todayISO } from '../utils.js';
import { useToast } from './Toast.jsx';

export default function CompaniesTab({ state, onAddCompany, onDeleteCompany, onAddPackage, onDeletePackage }) {
  const toast = useToast();
  const [newCoName, setNewCoName] = useState('');
  const [newCoHours, setNewCoHours] = useState(12);
  const [pkgCompany, setPkgCompany] = useState(state.companies[0]?.id || '');
  const [pkgDate, setPkgDate] = useState(todayISO());
  const [pkgHours, setPkgHours] = useState('');
  const [pkgCost, setPkgCost] = useState('');

  async function addCompany() {
    const name = newCoName.trim();
    const hours = Number(newCoHours || 12);
    if (!name) return;
    await onAddCompany({ name, annualHours: hours });
    toast(`Company "${name}" added`);
    setNewCoName('');
    setNewCoHours(12);
  }

  async function deleteCompany(id) {
    const c = state.companies.find((x) => x.id === id);
    if (!confirm('Delete this company? Its logs, packages and payments will stay but be orphaned.')) return;
    await onDeleteCompany(id);
    toast(`Company "${c ? c.name : ''}" removed`, 'remove');
  }

  async function addPackage() {
    if (!pkgCompany || !pkgDate || !pkgHours) return;
    await onAddPackage({ companyId: pkgCompany, date: pkgDate, hours: Number(pkgHours), cost: Number(pkgCost || 0) });
    toast('Hours package added');
    setPkgHours('');
    setPkgCost('');
  }

  async function deletePackage(id) {
    await onDeletePackage(id);
    toast('Package removed', 'remove');
  }

  const sortedPackages = [...state.packages].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <div className="panel">
        <h2>Companies</h2>
        {state.companies.length === 0 ? (
          <p className="empty">No companies added yet.</p>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Default annual hours</th><th></th></tr></thead>
            <tbody>
              {state.companies.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.annualHours}h / yr</td>
                  <td><button className="btn small secondary" onClick={() => deleteCompany(c.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="add-company-row">
          <div className="field">
            <label>New company name</label>
            <input type="text" placeholder="e.g. Acme Ltd" value={newCoName} onChange={(e) => setNewCoName(e.target.value)} />
          </div>
          <div className="field" style={{ maxWidth: 160 }}>
            <label>Annual hours</label>
            <input type="number" min="0" value={newCoHours} onChange={(e) => setNewCoHours(e.target.value)} />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end', flex: 0 }}>
            <button className="btn" onClick={addCompany}>Add company</button>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Add a purchased hours package</h2>
        <p className="small-muted">Use this when a customer buys extra maintenance hours separately from their free annual allowance. It adds on top of the base allotment for that year.</p>
        <div className="row">
          <div className="field">
            <label>Company</label>
            <select value={pkgCompany} onChange={(e) => setPkgCompany(e.target.value)}>
              {state.companies.length === 0 ? (
                <option disabled>Add a company first</option>
              ) : (
                state.companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              )}
            </select>
          </div>
          <div className="field">
            <label>Date purchased</label>
            <input type="date" value={pkgDate} onChange={(e) => setPkgDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Hours purchased</label>
            <input type="number" min="0" step="0.5" value={pkgHours} onChange={(e) => setPkgHours(e.target.value)} />
          </div>
          <div className="field">
            <label>Cost ($)</label>
            <input type="number" min="0" step="0.01" value={pkgCost} onChange={(e) => setPkgCost(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="btn" onClick={addPackage} disabled={state.companies.length === 0}>Add package</button>
        </div>
        {state.packages.length > 0 && (
          <table style={{ marginTop: 18 }}>
            <thead><tr><th>Date</th><th>Company</th><th>Hours</th><th>Cost</th><th></th></tr></thead>
            <tbody>
              {sortedPackages.map((p) => {
                const c = state.companies.find((x) => x.id === p.companyId);
                return (
                  <tr key={p.id}>
                    <td>{p.date}</td>
                    <td>{c ? c.name : '—'}</td>
                    <td>{p.hours}h</td>
                    <td>{fmtMoney(p.cost)}</td>
                    <td><button className="btn small secondary" onClick={() => deletePackage(p.id)}>Delete</button></td>
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
