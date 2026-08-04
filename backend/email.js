import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const BRAND = {
  name: 'El Bamb Group BG',
  phone: '01012822589',
  phoneIntl: '+201012822589',
  linkedin: 'https://www.linkedin.com/in/yousssefgamal',
  developedBy: 'Youssef Gamal',
};

const STATUS_META = {
  pending: { label: 'Order Received', color: '#B45309' },
  confirmed: { label: 'Order Confirmed', color: '#15803D' },
  processing: { label: 'Order Processing', color: '#15803D' },
  shipped: { label: 'Order Shipped', color: '#0369A1' },
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

function invoiceHtml({ order, items = [], status = 'pending' }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const subtotal = Number(order.subtotal || 0);
  const shippingFee = Number(order.shipping_fee || 0);
  const pointsDiscount = Number(order.points_discount_egp || 0);
  const total = Number(order.total || 0);

  const itemRows = (items || [])
    .map((i) => {
      const thumb = i.product_image_snapshot
        ? `<img src="${esc(i.product_image_snapshot)}" width="44" height="44" alt="" style="border-radius:8px;object-fit:cover;margin-inline-end:10px;vertical-align:middle;" />`
        : '';
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #E5E3DF;vertical-align:middle;">
            ${thumb}<span style="font-size:14px;color:#1A1816;">${esc(i.product_name_snapshot)}</span>
          </td>
          <td align="center" style="padding:10px 12px;border-bottom:1px solid #E5E3DF;vertical-align:middle;font-size:14px;color:#1A1816;">${Number(i.quantity || 0)}</td>
          <td align="right" style="padding:10px 12px;border-bottom:1px solid #E5E3DF;vertical-align:middle;font-size:14px;color:#1A1816;white-space:nowrap;">${egp(i.unit_price_snapshot)}</td>
          <td align="right" style="padding:10px 12px;border-bottom:1px solid #E5E3DF;vertical-align:middle;font-size:14px;color:#1A1816;white-space:nowrap;font-weight:600;">${egp(i.line_total ?? Number(i.unit_price_snapshot || 0) * Number(i.quantity || 0))}</td>
        </tr>`;
    })
    .join('');

  const totals = `
    <tr><td style="padding:6px 12px;text-align:right;font-size:14px;color:#5C5751;">Subtotal</td><td style="padding:6px 12px;text-align:right;font-size:14px;color:#1A1816;white-space:nowrap;">${egp(subtotal)}</td></tr>
    <tr><td style="padding:6px 12px;text-align:right;font-size:14px;color:#5C5751;">Shipping</td><td style="padding:6px 12px;text-align:right;font-size:14px;color:#1A1816;white-space:nowrap;">${egp(shippingFee)}</td></tr>
    ${
      pointsDiscount > 0
        ? `<tr><td style="padding:6px 12px;text-align:right;font-size:14px;color:#15803D;">Points discount</td><td style="padding:6px 12px;text-align:right;font-size:14px;color:#15803D;white-space:nowrap;">− ${egp(pointsDiscount)}</td></tr>`
        : ''
    }
    <tr><td style="padding:8px 12px 10px;text-align:right;font-size:15px;font-weight:700;color:#1A1816;">Total due (Cash on Delivery)</td><td style="padding:8px 12px 10px;text-align:right;font-size:15px;font-weight:700;color:#E6007E;white-space:nowrap;">${egp(total)}</td></tr>`;

  const address = [order.address_line, order.city, order.governorate].filter(Boolean).join(', ');
  const customerLines = `
    <tr>
      <td style="padding:14px 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8A8680;">Customer</td>
      <td style="padding:14px 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8A8680;">Delivery</td>
    </tr>
    <tr>
      <td style="padding:0 12px 0 0;font-size:14px;color:#1A1816;vertical-align:top;">
        <div><strong>${esc(order.customer_name)}</strong></div>
        <div style="color:#5C5751;margin-top:4px;">${esc(order.phone)}${order.alt_phone ? `<br />${esc(order.alt_phone)}` : ''}</div>
        ${order.email ? `<div style="color:#5C5751;margin-top:4px;">${esc(order.email)}</div>` : ''}
      </td>
      <td style="padding:0;font-size:14px;color:#1A1816;vertical-align:top;">
        <div>${esc(address) || '—'}</div>
        ${order.estimated_delivery ? `<div style="color:#5C5751;margin-top:4px;">Estimated delivery: ${esc(order.estimated_delivery)}</div>` : ''}
      </td>
    </tr>
    ${
      order.notes
        ? `<tr><td colspan="2" style="padding:10px 0 0;font-size:14px;color:#5C5751;">Notes: ${esc(order.notes)}</td></tr>`
        : ''
    }`;

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background-color:#F4F3F0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F3F0;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E5E3DF;">
          <tr>
            <td style="background-color:#E6007E;padding:22px 28px;">
              <div style="color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:0.02em;">${esc(BRAND.name)}</div>
              <div style="color:#FFD7EC;font-family:Arial,Helvetica,sans-serif;font-size:12px;margin-top:4px;">Phone accessories store — Cash on Delivery</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:18px;font-weight:800;color:#1A1816;">${esc(meta.label)}</div>
                    <div style="font-size:13px;color:#8A8680;margin-top:3px;">Invoice #${esc(order.order_number)} · ${esc(formatDate(order.created_at))}</div>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:5px 12px;border-radius:999px;background-color:${meta.color}18;color:${meta.color};font-size:12px;font-weight:700;">${esc(meta.label)}</span>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
                ${customerLines}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;border:1px solid #E5E3DF;border-radius:10px;overflow:hidden;">
                <tr style="background-color:#FBFBF9;">
                  <th align="start" style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8A8680;">Item</th>
                  <th align="center" style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8A8680;">Qty</th>
                  <th align="right" style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8A8680;">Unit</th>
                  <th align="right" style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8A8680;">Total</th>
                </tr>
                ${itemRows || '<tr><td colspan="4" style="padding:12px;font-size:13px;color:#8A8680;text-align:center;">Order items are shown in your account order history.</td></tr>'}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;width:280px;margin-inline-start:auto;margin-right:0;">
                ${totals}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background-color:#FBFBF9;border-radius:10px;padding:14px 16px;">
                <tr>
                  <td style="font-size:13px;color:#5C5751;">
                    Pay <strong style="color:#1A1816;">${egp(total)}</strong> in cash upon delivery. Track your order anytime on the store — thank you for shopping with ${esc(BRAND.name)}!
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#1A1816;padding:20px 28px;font-family:Arial,Helvetica,sans-serif;">
              <div style="color:#FFFFFF;font-size:14px;font-weight:700;text-align:center;">${esc(BRAND.name)}</div>
              <div style="color:#A8A29E;font-size:12px;text-align:center;margin-top:6px;">
                Call us: <a href="tel:${BRAND.phoneIntl}" style="color:#FFFFFF;text-decoration:none;">${esc(BRAND.phone)}</a>
                &nbsp;·&nbsp; Built by <a href="${BRAND.linkedin}" style="color:#FFD7EC;text-decoration:none;" target="_blank" rel="noopener noreferrer">${esc(BRAND.developedBy)}</a>
                &nbsp;·&nbsp; <a href="${BRAND.linkedin}" style="color:#A8A29E;text-decoration:underline;" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </div>
              <div style="color:#8A8680;font-size:11px;text-align:center;margin-top:6px;">
                The entire El Bamb Group BG store system was developed by ${esc(BRAND.developedBy)}.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOrderEmail({ email, order, items = [], status = 'pending' }) {
  if (!resend || !email || !order) return;
  const meta = STATUS_META[status] || STATUS_META.pending;
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'orders@bg-store.com',
      to: email,
      subject: `${meta.label} — ${order.order_number}`,
      html: invoiceHtml({ order, items, status }),
    });
  } catch (err) {
    console.error('Failed to send order email:', err.message);
  }
}
