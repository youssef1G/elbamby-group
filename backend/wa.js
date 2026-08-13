import { sendPointsChangeEmail } from './email.js';

// WhatsApp Business Cloud API (Meta) — free tier: 1,000 service
// conversations per month. Stateless HTTPS calls, safe on serverless.
// Unconfigured (no WA_TOKEN / WA_PHONE_NUMBER_ID) → email fallback.
const WA_TOKEN = process.env.WA_TOKEN || null;
const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID || null;
const WA_TEMPLATE = process.env.WA_TEMPLATE || 'bg_points_update';
const WA_TEMPLATE_LANG = process.env.WA_TEMPLATE_LANG || 'en_US';

const WA_API = 'https://graph.facebook.com/v21.0';

// Egyptian phone normalization for WhatsApp (international format +2).
function toWaPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) return `+2${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith('1')) return `+2${digits}`;
  return `+${digits}`;
}

/**
 * Notify a customer that their points balance changed (manual admin
 * grant/deduct). WhatsApp Cloud API when configured, email otherwise.
 * Never throws — failures are logged so the points ledger is never blocked
 * by a notification problem.
 */
export async function sendPointsChangeNotification({ customer, type, points, note, balanceAfter }) {
  const isGrant = type === 'manual_grant';
  const amount = String(Math.abs(Number(points || 0)));
  const balance = String(Number(balanceAfter || 0));

  if (WA_TOKEN && WA_PHONE_NUMBER_ID) {
    try {
      const res = await fetch(`${WA_API}/${WA_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toWaPhone(customer.phone),
          type: 'template',
          template: {
            name: WA_TEMPLATE,
            language: { code: WA_TEMPLATE_LANG },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: customer.name || 'there' },
                  { type: 'text', text: isGrant ? 'gained' : 'lost' },
                  { type: 'text', text: amount },
                  { type: 'text', text: balance },
                  { type: 'text', text: note || '' },
                ],
              },
            ],
          },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('WhatsApp API error:', res.status, body.slice(0, 300));
      } else {
        console.log(`WhatsApp points notification sent to ${customer.phone}`);
        return;
      }
    } catch (err) {
      console.error('WhatsApp send failed, falling back to email:', err.message);
    }
  }

  if (customer.email) {
    await sendPointsChangeEmail({
      email: customer.email,
      customerName: customer.name,
      type,
      points,
      note,
      balanceAfter,
    });
  } else {
    console.log(
      `No channel for customer ${customer.phone}: WhatsApp unconfigured and no email on file`,
    );
  }
}