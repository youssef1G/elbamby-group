/**
 * generate-sitemap.js — builds `frontend/public/sitemap.xml` from the live DB.
 *
 * Run after product/category changes (or on a schedule / pre-deploy):
 *   node scripts/generate-sitemap.js
 *
 * Queries only active products + active categories, writes rouble text/plain
 * XML sitemap listing static pages (/, /shop, /about, /contact, /my-orders)
 * + product pages (/product/<slug>) + category pages (/shop?category=<slug>).
 *
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (from backend/.env);
 *      optional SITE_URL (defaults to https://bg.example.com).
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SITE_URL = process.env.SITE_URL || 'https://www.bgshop.eg';
const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../frontend/public/sitemap.xml'
);

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function urlRow(loc, priority = '0.5', changefreq = 'weekly') {
  return `  <url><loc>${esc(loc)}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const staticPages = [
  urlRow(`${SITE_URL}/`, '1.0', 'daily'),
  urlRow(`${SITE_URL}/shop`, '0.9', 'daily'),
  urlRow(`${SITE_URL}/about`, '0.5', 'monthly'),
  urlRow(`${SITE_URL}/contact`, '0.5', 'monthly'),
  urlRow(`${SITE_URL}/my-orders`, '0.4', 'weekly'),
];

const [productsRes, categoriesRes] = await Promise.all([
  supabase.from('products').select('slug').eq('is_active', true),
  supabase.from('categories').select('slug').eq('is_active', true),
]);

if (productsRes.error) throw productsRes.error;
if (categoriesRes.error) throw categoriesRes.error;

const productRows = (productsRes.data || []).map((p) =>
  urlRow(`${SITE_URL}/product/${p.slug}`, '0.9', 'daily'),
);
const categoryRows = (categoriesRes.data || []).map((c) =>
  urlRow(`${SITE_URL}/shop?category=${c.slug}`, '0.6', 'weekly'),
);

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...staticPages,
  ...productRows,
  ...categoryRows,
  '</urlset>',
  '',
].join('\n');

writeFileSync(OUT, xml, 'utf8');
console.log(`sitemap.xml written with ${staticPages.length + productRows.length + categoryRows.length} URLs → ${OUT}`);