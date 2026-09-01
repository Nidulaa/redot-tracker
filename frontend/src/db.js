import { supabase } from './supabaseClient.js';

// Every table is shared across all authenticated users (internal tool, no
// per-user data isolation) — see supabase/schema.sql for the RLS policies.
function makeResource(table, orderBy = 'created_at') {
  return {
    async list() {
      const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    async add(row) {
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    async remove(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
  };
}

export const companiesApi = makeResource('companies', 'name');
export const workersApi = makeResource('workers', 'name');
export const packagesApi = makeResource('packages');
export const logsApi = makeResource('logs');
export const paymentsApi = makeResource('payments');
export const workerCostsApi = makeResource('worker_costs');
