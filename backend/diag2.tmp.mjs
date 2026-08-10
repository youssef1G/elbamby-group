import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('C:/Users/Youssef/Desktop/BG/backend/.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const [txs, customers] = await Promise.all([
  supabase.from('points_transactions').select('id,customer_id,order_id,type,points,balance_after,created_by_admin_id,created_at').order('created_at', { ascending: false }).limit(50),
  supabase.from('customers').select('id,name,phone,points_balance,created_at'),
]);

console.log('ALL POINTS TX (up to 50, newest first):');
for (const t of txs.data || []) {
  console.log(`  ${t.created_at} | ${t.type.padEnd(15)} | ${String(t.points).padStart(5)} | after=${t.balance_after} | admin=${t.created_by_admin_id ?? '-'} | order=${t.order_id ?? '-'} | cust=${t.customer_id}`);
}
console.log('\nALL CUSTOMERS:');
for (const c of customers.data || []) {
  console.log(`  ${c.created_at} | bal=${c.points_balance} | ${c.name} (${c.phone}) ${c.id}`);
}
