import { useEffect, useState, useCallback } from 'react';
import { getSession, onAuthStateChange, signOut } from './auth.js';
import { companiesApi, workersApi, packagesApi, logsApi, paymentsApi, workerCostsApi, adminIncomeApi, adminExpensesApi } from './db.js';
import { isAdminUser } from './config.js';
import { ToastProvider } from './components/Toast.jsx';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import { IconMenu } from './components/Icons.jsx';
import OverviewTab from './components/OverviewTab.jsx';
import LogTab from './components/LogTab.jsx';
import AnalyticsTab from './components/AnalyticsTab.jsx';
import PaymentsTab from './components/PaymentsTab.jsx';
import PeopleTab from './components/PeopleTab.jsx';
import CompaniesTab from './components/CompaniesTab.jsx';
import AdminTab from './components/AdminTab.jsx';

const TAB_TITLES = {
  overview: 'Overview',
  log: 'Log Task',
  analytics: 'Analytics',
  payments: 'Payments',
  people: 'People',
  companies: 'Companies',
  admin: 'Admin Report',
};

function AppShell() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out

  const [data, setData] = useState({
    companies: [], packages: [], logs: [], payments: [], workers: [], workerCosts: [],
    adminIncome: [], adminExpenses: [],
  });
  const [loaded, setLoaded] = useState(false);

  const [tab, setTab] = useState('overview');
  const [year, setYear] = useState(new Date().getFullYear());
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const checkAuthAndLoad = useCallback(async () => {
    const sess = await getSession();
    setSession(sess);
  }, []);

  useEffect(() => {
    checkAuthAndLoad();
    const unsubscribe = onAuthStateChange((s) => setSession(s));
    return unsubscribe;
  }, [checkAuthAndLoad]);

  const loadAll = useCallback(async (currentSession) => {
    const [companies, packages, logs, payments, workers, workerCosts, adminIncome, adminExpenses] = await Promise.all([
      companiesApi.list(),
      packagesApi.list(),
      logsApi.list(),
      paymentsApi.list(),
      workersApi.list(),
      workerCostsApi.list(),
      // Empty for non-admins — RLS restricts these two tables (see supabase/schema.sql).
      adminIncomeApi.list(),
      adminExpensesApi.list(),
    ]);

    // Every login account is its own worker. The DB trigger creates this row
    // automatically for new accounts; this is a fallback for accounts that
    // existed before the trigger was added (or ran before the backfill).
    let allWorkers = workers;
    const uid = currentSession?.user?.id;
    if (uid && !workers.some((w) => w.userId === uid)) {
      const displayName = currentSession.user.user_metadata?.name || (currentSession.user.email || '').split('@')[0];
      const mine = await workersApi.add({ name: displayName, userId: uid });
      allWorkers = [mine, ...workers];
    }

    setData({ companies, packages, logs, payments, workers: allWorkers, workerCosts, adminIncome, adminExpenses });
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (session) loadAll(session);
    if (session === null) setLoaded(false);
  }, [session, loadAll]);

  function makeCrud(key, resource) {
    return {
      add: async (row) => {
        const created = await resource.add(row);
        setData((d) => ({ ...d, [key]: [created, ...d[key]] }));
        return created;
      },
      remove: async (id) => {
        await resource.remove(id);
        setData((d) => ({ ...d, [key]: d[key].filter((x) => x.id !== id) }));
      },
    };
  }

  const companiesCrud = makeCrud('companies', companiesApi);
  const packagesCrud = makeCrud('packages', packagesApi);
  const logsCrud = makeCrud('logs', logsApi);
  const paymentsCrud = makeCrud('payments', paymentsApi);
  const workerCostsCrud = makeCrud('workerCosts', workerCostsApi);
  const adminIncomeCrud = makeCrud('adminIncome', adminIncomeApi);
  const adminExpensesCrud = makeCrud('adminExpenses', adminExpensesApi);

  async function handleLogout() {
    await signOut();
  }

  if (session === undefined) {
    return <div className="boot-loading">Loading…</div>;
  }

  if (session === null) {
    return <Login />;
  }

  if (!loaded) {
    return <div className="boot-loading">Loading…</div>;
  }

  const isAdmin = isAdminUser(session.user);

  return (
    <div className="shell">
      <Sidebar
        active={tab}
        onChange={setTab}
        user={session.user}
        onLogout={handleLogout}
        open={menuOpen}
        onClose={closeMenu}
        isAdmin={isAdmin}
      />
      <div className="main">
        <div className="topbar">
          <button className="topbar-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><IconMenu /></button>
          <div className="topbar-title">{TAB_TITLES[tab]}</div>
        </div>
        <div className="main-inner">
          {tab === 'overview' && <OverviewTab state={data} onNavigate={setTab} />}
          {tab === 'log' && (
            <LogTab
              state={data}
              onAddLog={logsCrud.add}
              onDeleteLog={logsCrud.remove}
              currentWorker={data.workers.find((w) => w.userId === session.user.id) || null}
            />
          )}
          {tab === 'analytics' && (
            <AnalyticsTab
              state={data}
              year={year}
              setYear={setYear}
              expandedCompany={expandedCompany}
              setExpandedCompany={setExpandedCompany}
              onDeleteLog={logsCrud.remove}
            />
          )}
          {tab === 'payments' && (
            <PaymentsTab state={data} onAddPayment={paymentsCrud.add} onDeletePayment={paymentsCrud.remove} />
          )}
          {tab === 'people' && (
            <PeopleTab
              state={data}
              onAddWorkerCost={workerCostsCrud.add}
              onDeleteWorkerCost={workerCostsCrud.remove}
              year={year}
              setYear={setYear}
            />
          )}
          {tab === 'companies' && (
            <CompaniesTab
              state={data}
              onAddCompany={companiesCrud.add}
              onDeleteCompany={companiesCrud.remove}
              onAddPackage={packagesCrud.add}
              onDeletePackage={packagesCrud.remove}
            />
          )}
          {tab === 'admin' && (
            isAdmin ? (
              <AdminTab
                state={data}
                onAddIncome={adminIncomeCrud.add}
                onDeleteIncome={adminIncomeCrud.remove}
                onAddExpense={adminExpensesCrud.add}
                onDeleteExpense={adminExpensesCrud.remove}
              />
            ) : (
              <div className="panel"><p className="empty">Admin access only.</p></div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppShell />
      </ConfirmProvider>
    </ToastProvider>
  );
}
