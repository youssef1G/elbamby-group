import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';

const envPath = path.resolve('C:/Users/Youssef/Desktop/BG/backend/.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const CUST = '06f9927e-a0e7-4755-840c-03af418034b4';

const [cust, settings, lastTx, adminTest] = await Promise.all([
  supabase.from('customers').select('id,name,phone,points_balance,created_at').eq('id', CUST).maybeSingle(),
  supabase.from('settings').select('id,points_earn_rate,points_redeem_rate,points_signup_bonus').eq('id', 1).maybeSingle(),
  supabase.from('points_transactions').select('*').eq('customer_id', CUST).order('created_at', { ascending: false }).limit(3),
  supabase.from('admins').select('id,username,is_active').limit(5),
]);

console.log('CUSTOMER:', JSON.stringify(cust, null, 2));
console.log('SETTINGS:', JSON.stringify(settings, null, 2));
console.log('LAST TX (this customer):', JSON.stringify(lastTx, null, 2));
console.log('ADMINS sample:', JSON.stringify(adminTest, null, 2));

const [cols, triggerCheck] = await Promise.all([
  supabase.from('points_transactions').select('id,created_at').limit(1),
  null,
]);
console.log('POINTS_TX table readable:', JSON.stringify(cols, null, 2));

// raw SQL over the REST proxy — only SELECTs
const sqlCheck = async (query) => {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/raw_sql`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return { status: r.status, body: await r.text().catch(() => '') };
};
console.log('TRIGGER via raw_sql:', JSON.stringify(await sqlCheck("select tgname, tgisinternal from pg_trigger where tgrelid = 'points_transactions'::regclass"), null, 2));
