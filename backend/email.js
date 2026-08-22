import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// SMTP sender — any provider that speaks SMTP over TLS. Zoho Mail is the
// default recommendation for a custom domain (free tier); Gmail via app
// password is the fallback when the SMTP_* vars aren't set.
const GMAIL_EMAIL = process.env.GMAIL_EMAIL || null;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || null;
const SMTP_HOST = process.env.SMTP_HOST || null;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE !== 'false';
const SMTP_USER = process.env.SMTP_USER || GMAIL_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS || GMAIL_APP_PASSWORD;

const LOGO_CID = 'bg-logo';
const LOGO_PATH = fileURLToPath(new URL('../frontend/public/logo.jpg', import.meta.url));
let LOGO_ATTACHMENT = null;
try {
  readFileSync(LOGO_PATH);
  LOGO_ATTACHMENT = { filename: 'logo.jpg', path: LOGO_PATH, cid: LOGO_CID };
} catch {
  LOGO_ATTACHMENT = null;
}

// No SMTP_HOST → classic Gmail transport (service: 'gmail'). SMTP_HOST set →
// explicit host/port/secure (Zoho: smtp.zoho.eu / smtp.zoho.com, 465, true).
const transporter =
  SMTP_USER && SMTP_PASS
    ? SMTP_HOST
      ? nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_SECURE,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        })
      : nodemailer.createTransport({
          service: 'gmail',
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        })
    : null;

// "From" address = the authenticated mailbox, so with Zoho the customer sees
// e.g. orders@elbambygroup.com as the sender.
const SENDER_EMAIL = SMTP_USER || GMAIL_EMAIL;

const BRAND = {
  name: 'El Bamby Group BG',
  shortName: 'BG',
  subtitle: 'بيت الميموري — House of Memory',
  developedBy: 'Youssef Gamal',
  linkedin: 'https://www.linkedin.com/in/yousssefgamal',
};

const FRONTEND_ORIGIN = (process.env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/$/, '');

const STATUS_META = {
  pending: { label: 'Order Received', color: '#B45309' },
  confirmed: { label: 'Order Confirmed', color: '#15803D' },
  processing: { label: 'Order Processing', color: '#15803D' },
  shipped: { label: 'Order Shipped', color: '#0369A1', subject: 'Your order is on its way' },
  delivered: { label: 'Order Delivered', color: '#15803D' },
  cancelled: { label: 'Order Cancelled', color: '#B91C1C' },
  returned: { label: 'Order Returned', color: '#B91C1C' },
};

const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
  );

const egp = (value) =>
  `${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EGP`;

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const INK = '#1B1A18';
const INK_TEXT = '#F4F3F0';
const INK_MUTED = '#B9B5AF';
const SURFACE = '#191715';
const SURFACE_SUNKEN = '#0A0807';
const SURFACE_RAISED = '#100E0C';
const BORDER = '#292624';
const TEXT_PRIMARY = '#F4F3F0';
const TEXT_MUTED = '#A3A09C';
const ACCENT = '#E6007E';
const ACCENT_SOFT = '#F177B4';
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";
const SANS = "Arial,Helvetica,'Segoe UI',sans-serif";

const sectionLabel = (text) => `
  <div style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${TEXT_MUTED};margin-bottom:6px;">${esc(text)}</div>`;

const detailRow = (label, value, { mono = false, strong = false } = {}) => {
  if (!value) return '';
  const vStyle = [
    'font-size:14px',
    'color:' + TEXT_PRIMARY,
    'word-break:break-word',
    strong ? 'font-weight:700' : '',
    mono ? `font-family:${MONO}` : '',
  ]
    .filter(Boolean)
    .join(';');
  return `
  <tr>
    <td style="padding:7px 0;font-size:13px;color:${TEXT_MUTED};vertical-align:top;white-space:nowrap;width:38%;">
      <div style="font-size:13px;color:${TEXT_MUTED};">${esc(label)}</div>
    </td>
    <td style="padding:7px 0;font-size:14px;vertical-align:top;padding-start:16px;">
      <div style="${vStyle}">${esc(value)}</div>
    </td>
  </tr>`;
};

function invoiceHtml({ order, items = [], status = 'pending' }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const subtotal = Number(order.subtotal || 0);
  const shippingFee = Number(order.shipping_fee || 0);
  const pointsDiscount = Number(order.points_discount_egp || 0);
  const total = Number(order.total || 0);

  const itemRows = (items || [])
    .map((i) => {
      const thumb = i.product_image_snapshot
        ? `<img src="${esc(i.product_image_snapshot)}" width="46" height="46" alt="" style="border-radius:8px;object-fit:cover;margin-inline-end:12px;vertical-align:middle;" />`
        : '';
      const lineTotal =
        i.line_total ?? Number(i.unit_price_snapshot || 0) * Number(i.quantity || 0);
      // Variant snapshot (docs/14 §6): "Victory Medal — Gold" when present.
      const displayName = i.variant_label_en
        ? `${esc(i.product_name_snapshot)} \u2014 ${esc(i.variant_label_en)}`
        : esc(i.product_name_snapshot);
      return `
        <tr style="border-top:1px solid ${BORDER};">
          <td style="padding:14px 14px;vertical-align:middle;">
            ${thumb}<span style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY};line-height:1.35;">${displayName}</span>
            <div style="font-size:12px;color:${TEXT_MUTED};margin-top:2px;">${egp(i.unit_price_snapshot)} each</div>
          </td>
          <td align="center" style="padding:14px 6px;vertical-align:middle;font-size:14px;color:${TEXT_PRIMARY};white-space:nowrap;">× ${Number(i.quantity || 0)}</td>
          <td align="right" style="padding:14px 14px;vertical-align:middle;font-size:14px;font-weight:700;color:${TEXT_PRIMARY};white-space:nowrap;">${egp(lineTotal)}</td>
        </tr>`;
    })
    .join('');

  const address = [order.address_line, order.city].filter(Boolean).join(', ');

  const trackHref = FRONTEND_ORIGIN
    ? `${FRONTEND_ORIGIN}/my-orders?order=${encodeURIComponent(order.order_number || '')}&phone=${encodeURIComponent(order.phone || '')}`
    : null;

  const pendingCallout = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;background-color:${SURFACE_RAISED};border:1px solid ${BORDER};border-inline-start:4px solid ${ACCENT};border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;font-family:${SANS};">
          <div style="font-size:17px;font-weight:800;letter-spacing:-0.01em;color:${TEXT_PRIMARY};">
            ${order.customer_name ? `Thanks, ${esc(order.customer_name)}!` : 'Thanks for your order!'}
          </div>
          <div style="font-size:13px;color:${TEXT_MUTED};margin-top:7px;line-height:1.6;">
            We've received your order and will start preparing it right away. We'll email you again once it ships.
          </div>
        </td>
      </tr>
    </table>`;

  const shippedCallout = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;background-color:${SURFACE_RAISED};border:1px solid ${BORDER};border-inline-start:4px solid #38BDF8;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;font-family:${SANS};">
          <div style="font-size:17px;font-weight:800;letter-spacing:-0.01em;color:#7DD3FC;">Your order is on its way!</div>
          <div style="font-size:13px;color:${TEXT_MUTED};margin-top:7px;line-height:1.6;">
            ${order.estimated_delivery ? `Estimated delivery: <strong>${esc(order.estimated_delivery)}</strong>` : 'It has been handed to the courier and will reach you shortly.'}
          </div>
        </td>
      </tr>
    </table>`;

  const callout =
    status === 'pending' ? pendingCallout : status === 'shipped' ? shippedCallout : '';

  const trackButton = trackHref
    ? `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
    <tr>
      <td align="center" style="background-color:${ACCENT};border-radius:100px;padding:0;">
        <a href="${esc(trackHref)}" style="display:block;padding:17px 24px;color:#FFFFFF;font-size:15px;font-weight:800;text-decoration:none;font-family:${SANS};">Track my order</a>
      </td>
    </tr>
  </table>`
    : '';

  const totals = `
    <tr><td style="padding:5px 0;font-size:14px;color:${TEXT_MUTED};">Subtotal</td><td align="right" style="padding:5px 0;font-size:14px;color:${TEXT_PRIMARY};font-family:${MONO};white-space:nowrap;">${egp(subtotal)}</td></tr>
    <tr><td style="padding:5px 0;font-size:14px;color:${TEXT_MUTED};">Shipping</td><td align="right" style="padding:5px 0;font-size:14px;color:${TEXT_PRIMARY};font-family:${MONO};white-space:nowrap;">${egp(shippingFee)}</td></tr>
    ${
      pointsDiscount > 0
        ? `<tr><td style="padding:5px 0;font-size:14px;color:${ACCENT};font-weight:700;">Points discount</td><td align="right" style="padding:5px 0;font-size:14px;color:${ACCENT};font-family:${MONO};font-weight:700;white-space:nowrap;">− ${egp(pointsDiscount)}</td></tr>`
        : ''
    }
    <tr><td colspan="2" style="padding:0;border-top:1px solid ${BORDER};height:1px;"></td></tr>
    <tr>
      <td style="padding:12px 0 2px;font-size:15px;font-weight:800;color:${TEXT_PRIMARY};">Total (Cash on Delivery)</td>
      <td align="right" style="padding:12px 0 2px;font-size:22px;font-weight:800;color:${ACCENT};font-family:${MONO};white-space:nowrap;">${egp(total)}</td>
    </tr>`;

  const contactLines = `
    ${detailRow('Customer', order.customer_name, { strong: true })}
    ${detailRow('Phone', order.phone, { mono: true })}
    ${detailRow('Alt. phone', order.alt_phone, { mono: true })}
    ${detailRow('Email', order.email)}
    ${detailRow('Address', address, {})}
    ${detailRow('Estimated delivery', order.estimated_delivery)}
    ${detailRow('Notes', order.notes)}`;

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(meta.label)} — ${esc(order.order_number)}</title>
</head>
<body style="margin:0;padding:0;background-color:${SURFACE_SUNKEN};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${SURFACE_SUNKEN};padding:0;">
    <tr>
      <td align="center" style="padding:28px 16px;font-family:${SANS};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">

          <!-- header -->
          <tr>
            <td style="background-color:${INK};padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="color:#FFFFFF;font-family:${SANS};font-size:20px;font-weight:800;letter-spacing:0.02em;">${esc(BRAND.name)}</div>
                    <div style="color:${INK_MUTED};font-family:${SANS};font-size:12px;margin-top:3px;">${esc(BRAND.subtitle)}</div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    ${
                      LOGO_ATTACHMENT
                        ? `<img src="cid:${LOGO_CID}" width="44" height="44" alt="${esc(BRAND.name)}" style="border-radius:12px;object-fit:cover;" />`
                        : FRONTEND_ORIGIN
                          ? `<img src="${esc(FRONTEND_ORIGIN + '/logo.jpg')}" width="44" height="44" alt="${esc(BRAND.name)}" style="border-radius:12px;object-fit:cover;" />`
                          : `<span style="display:inline-block;background-color:${ACCENT};color:#FFFFFF;font-family:${MONO};font-size:13px;font-weight:800;letter-spacing:0.04em;padding:8px 10px;border-radius:10px;">${esc(BRAND.shortName)}</span>`
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- status -->
          <tr>
            <td style="padding:26px 24px 6px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${TEXT_MUTED};">Order status</div>
              <div style="font-size:24px;font-weight:800;color:${TEXT_PRIMARY};margin-top:4px;letter-spacing:-0.02em;">${esc(meta.label)}</div>
              <div style="font-size:13px;color:${TEXT_MUTED};margin-top:6px;font-family:${MONO};">
                #${esc(order.order_number)} · ${esc(formatDate(order.created_at))}
              </div>
              <span style="display:inline-block;margin-top:10px;padding:4px 12px;border-radius:999px;background-color:${meta.color}14;color:${meta.color};font-size:12px;font-weight:700;border:1px solid ${meta.color}30;">${esc(meta.label)}</span>

              ${callout}

              <div style="margin-top:24px;border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${SURFACE};">
                  <tr>
                    <td style="padding:16px 18px 6px;font-size:13px;font-weight:800;color:${TEXT_PRIMARY};">Order summary</td>
                  </tr>
                  <tr>
                    <td style="padding:0 18px 16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        ${contactLines || '<tr><td style="padding:8px 0;font-size:13px;color:' + TEXT_MUTED + ';">We are preparing your order.</td></tr>'}
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- items -->
          <tr>
            <td style="padding:22px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">
                <tr style="background-color:${SURFACE_SUNKEN};">
                  <th align="start" style="padding:12px 14px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${TEXT_MUTED};">Item</th>
                  <th align="center" style="padding:12px 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${TEXT_MUTED};">Qty</th>
                  <th align="right" style="padding:12px 14px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${TEXT_MUTED};">Total</th>
                </tr>
                ${itemRows || '<tr><td colspan="3" style="padding:14px;font-size:13px;color:' + TEXT_MUTED + ';text-align:center;">Order items are shown in your order history.</td></tr>'}
              </table>
            </td>
          </tr>

          <!-- totals -->
          <tr>
            <td style="padding:12px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${totals}
              </table>
              ${trackButton}
            </td>
          </tr>

          <!-- payment note -->
          <tr>
            <td style="padding:22px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${SURFACE_SUNKEN};border-radius:14px;padding:16px 18px;">
                <tr>
                  <td style="font-size:13px;color:${TEXT_MUTED};line-height:1.6;">
                    <strong style="color:${TEXT_PRIMARY};">Cash on Delivery.</strong> Pay ${egp(total)} in person when your order arrives. No online payment needed.
                    ${trackHref ? "Questions? Use the button above or visit your order's tracking page on our website." : `Track it on our website with order number ${esc(order.order_number)} and your phone number.`}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="background-color:${INK};padding:22px 24px;text-align:center;font-family:${SANS};">
              <div style="color:#FFFFFF;font-size:14px;font-weight:800;">${esc(BRAND.name)}</div>
              <div style="color:${INK_MUTED};font-size:12px;margin-top:4px;">${esc(BRAND.subtitle)}</div>
              <div style="color:#8A8680;font-size:11px;margin-top:10px;line-height:1.6;">
                This is an automated order confirmation. Please do not reply to this email.<br />
                Developed by <a href="${esc(BRAND.linkedin)}" style="color:#FFD7EC;text-decoration:none;" target="_blank" rel="noopener noreferrer">${esc(BRAND.developedBy)}</a> · <a href="${esc(BRAND.linkedin)}" style="color:#8A8680;text-decoration:underline;" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </div>
            </td>
          </tr>
        </table>

        <p style="margin:14px 0 0;font-size:11px;color:${TEXT_MUTED};text-align:center;font-family:${SANS};">
          You received this email because you placed an order on ${esc(BRAND.name)} (${esc(BRAND.shortName)}).
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOrderEmail({ email, order, items = [], status = 'pending' }) {
  if (!transporter || !email || !order) return;
  const meta = STATUS_META[status] || STATUS_META.pending;
  try {
    const info = await transporter.sendMail({
      from: `"${BRAND.name}" <${SENDER_EMAIL}>`,
      to: email,
      subject: `${meta.subject || meta.label} — ${order.order_number}`,
      html: invoiceHtml({ order, items, status }),
      attachments: LOGO_ATTACHMENT ? [LOGO_ATTACHMENT] : undefined,
    });
    console.log(`Order email sent to ${email} for ${order.order_number} (messageId: ${info.messageId})`);
  } catch (err) {
    console.error('Failed to send order email:', err.message);
  }
}

/**
 * Points-balance change notification (manual admin grant/deduct) — the
 * email fallback for when WhatsApp isn't configured. Compact branded card.
 */
export async function sendPointsChangeEmail({ email, customerName, type, points, note, balanceAfter }) {
  if (!transporter || !email) return;
  const isGrant = type === 'manual_grant';
  const amount = Math.abs(Number(points || 0));
  const verb = isGrant ? 'added to' : 'deducted from';
  const changeColor = isGrant ? '#15803D' : '#B91C1C';
  const accountHref = FRONTEND_ORIGIN ? `${FRONTEND_ORIGIN}/account` : null;

  const rows = [
    detailRow(isGrant ? 'Points added' : 'Points deducted', `${isGrant ? '+' : '-'}${amount}`, {
      mono: true,
      strong: true,
    }),
    detailRow('New balance', `${Number(balanceAfter || 0)} points`, { mono: true, strong: true }),
    ...(note ? [detailRow('Note', note)] : []),
  ].join('');

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background-color:${SURFACE};font-family:${SANS};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${SURFACE};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:${SURFACE_RAISED};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:26px 24px;border-bottom:1px solid ${BORDER};">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${ACCENT};">${esc(BRAND.shortName)} Points</div>
              <div style="font-size:20px;font-weight:800;color:${TEXT_PRIMARY};margin-top:6px;">
                Your balance changed
              </div>
              <div style="font-size:13px;color:${TEXT_MUTED};margin-top:4px;">
                Hi ${esc(customerName || 'there')}, ${esc(verb)} your BG points account.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:18px 0;border-bottom:1px solid ${BORDER};">
                    <div style="font-size:26px;font-weight:800;font-family:${MONO};color:${changeColor};">
                      ${isGrant ? '+' : '-'}${amount} pts
                    </div>
                  </td>
                </tr>
                ${rows}
              </table>
            </td>
          </tr>
          ${accountHref ? `
          <tr>
            <td style="padding:18px 24px;">
              <a href="${esc(accountHref)}" style="display:inline-block;background-color:${ACCENT};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:8px;">
                View my balance
              </a>
            </td>
          </tr>` : ''}
          <tr>
            <td style="background-color:${INK};padding:22px 24px;text-align:center;">
              <div style="color:#FFFFFF;font-size:14px;font-weight:800;">${esc(BRAND.name)}</div>
              <div style="color:${INK_MUTED};font-size:12px;margin-top:4px;">${esc(BRAND.subtitle)}</div>
              <div style="color:#8A8680;font-size:11px;margin-top:10px;line-height:1.6;">
                This is an automated balance notification. Please do not reply to this email.<br />
                Developed by <a href="${esc(BRAND.linkedin)}" style="color:#FFD7EC;text-decoration:none;" target="_blank" rel="noopener noreferrer">${esc(BRAND.developedBy)}</a> · <a href="${esc(BRAND.linkedin)}" style="color:#8A8680;text-decoration:underline;" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const info = await transporter.sendMail({
      from: `"${BRAND.name}" <${SENDER_EMAIL}>`,
      to: email,
      subject: `Your BG points balance changed (${isGrant ? '+' : '-'}${amount})`,
      html,
    });
    console.log(`Points-change email sent to ${email} (messageId: ${info.messageId})`);
  } catch (err) {
    console.error('Failed to send points-change email:', err.message);
  }
}

/**
 * Password reset code (customer forgot-password flow) — a compact branded
 * card carrying the 6-digit code. The code itself is only ever stored hashed
 * server-side; this email is its one plaintext copy.
 */
export async function sendPasswordResetEmail({ email, customerName, code }) {
  if (!transporter || !email || !code) return;

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background-color:${SURFACE};font-family:${SANS};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${SURFACE};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:${SURFACE_RAISED};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:26px 24px;border-bottom:1px solid ${BORDER};">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${ACCENT};">${esc(BRAND.shortName)} Account</div>
              <div style="font-size:20px;font-weight:800;color:${TEXT_PRIMARY};margin-top:6px;">
                Reset your password
              </div>
              <div style="font-size:13px;color:${TEXT_MUTED};margin-top:4px;">
                Hi ${esc(customerName || 'there')}, use the code below to set a new password.
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:30px 24px;">
              <div style="font-size:38px;font-weight:800;font-family:${MONO};letter-spacing:0.28em;color:${TEXT_PRIMARY};direction:ltr;">${esc(code)}</div>
              <div style="font-size:12px;color:${TEXT_MUTED};margin-top:14px;">
                This code expires in 10 minutes and can be used once.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${SURFACE_SUNKEN};border-radius:12px;padding:14px 16px;">
                <tr>
                  <td style="font-size:12px;color:${TEXT_MUTED};line-height:1.6;">
                    Didn't request a password reset? You can safely ignore this email — your current password keeps working.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:${INK};padding:22px 24px;text-align:center;">
              <div style="color:#FFFFFF;font-size:14px;font-weight:800;">${esc(BRAND.name)}</div>
              <div style="color:${INK_MUTED};font-size:12px;margin-top:4px;">${esc(BRAND.subtitle)}</div>
              <div style="color:#8A8680;font-size:11px;margin-top:10px;line-height:1.6;">
                This is an automated security message. Please do not reply to this email.<br />
                Developed by <a href="${esc(BRAND.linkedin)}" style="color:#FFD7EC;text-decoration:none;" target="_blank" rel="noopener noreferrer">${esc(BRAND.developedBy)}</a> · <a href="${esc(BRAND.linkedin)}" style="color:#8A8680;text-decoration:none;" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const info = await transporter.sendMail({
      from: `"${BRAND.name}" <${SENDER_EMAIL}>`,
      to: email,
      subject: `Your BG password reset code: ${code}`,
      html,
    });
    console.log(`Password-reset email sent to ${email} (messageId: ${info.messageId})`);
  } catch (err) {
    console.error('Failed to send password-reset email:', err.message);
  }
}