import { HttpError } from '../http.js';

const today = () => new Date().toISOString().slice(0, 10);

export function mapInvoice(m) {
  const residual = Number(m.amount_residual) || 0;
  const total = Number(m.amount_total) || 0;
  const paidState = m.payment_state === 'paid' || m.payment_state === 'in_payment' || residual <= 0;
  const due = m.invoice_date_due || null;
  let status = 'unpaid';
  if (paidState) status = 'paid';
  else if (residual < total) status = 'partial';
  return {
    id: m.name,
    title: m.ref || m.invoice_origin || 'Tuition Fee',
    date: m.invoice_date || null,
    due_date: due,
    amount: total,
    residual: paidState ? 0 : residual,
    status,
    overdue: !paidState && !!due && due < today(),
  };
}

export async function getFinance(odoo, partnerId) {
  const moves = await odoo.searchRead(
    'account.move',
    [['partner_id', '=', partnerId], ['move_type', '=', 'out_invoice'], ['state', '=', 'posted']],
    ['name', 'ref', 'invoice_origin', 'invoice_date', 'invoice_date_due', 'amount_total', 'amount_residual', 'payment_state'],
    { order: 'invoice_date desc, id desc', limit: 200 }
  );
  const invoices = moves.map(mapInvoice);
  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
  const totalDue = invoices.reduce((s, i) => s + i.residual, 0);
  return {
    currency: 'MYR',
    total_billed: round2(totalBilled),
    total_due: round2(totalDue),
    total_paid: round2(totalBilled - totalDue),
    overdue_count: invoices.filter((i) => i.overdue).length,
    invoices,
  };
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Creates a draft payment.transaction in Odoo and a Billplz bill, returns the payment URL.
 * Mirrors the previously working flow in legacy/api.php (Billplz keys are read from Odoo).
 */
export async function createPaymentLink({ odoo, partner, invoiceName, publicUrl, fetchImpl = fetch }) {
  const moves = await odoo.searchRead(
    'account.move',
    [['name', '=', invoiceName], ['partner_id', '=', partner.id], ['state', '=', 'posted']],
    ['id', 'amount_residual', 'currency_id'],
    { limit: 1 }
  );
  if (!moves.length) throw new HttpError(404, 'invoice_not_found', 'Invoice not found');
  const invoice = moves[0];
  const residual = Number(invoice.amount_residual);
  if (residual <= 0) throw new HttpError(409, 'already_paid', 'This invoice is already paid');

  const providers = await odoo.searchRead(
    'payment.provider',
    [['code', '=', 'billplz'], ['state', 'in', ['enabled', 'test']]],
    ['id', 'billplz_api_key', 'billplz_collection_id', 'billplz_sandbox'],
    { limit: 1 }
  );
  if (!providers.length) throw new HttpError(503, 'payments_unavailable', 'Online payment is not enabled');
  const prov = providers[0];

  const pm = await odoo.searchRead(
    'ir.model.data',
    [['module', '=', 'payment_billplz'], ['name', '=', 'payment_method_billplz']],
    ['res_id'],
    { limit: 1 }
  );
  if (!pm.length) throw new HttpError(503, 'payments_unavailable', 'Payment method is not configured');

  const txRef = `${invoiceName}-${Date.now()}`;
  const txId = await odoo.call('payment.transaction', 'create', [[{
    provider_id: prov.id,
    payment_method_id: pm[0].res_id,
    reference: txRef,
    amount: residual,
    currency_id: invoice.currency_id[0],
    partner_id: partner.id,
    operation: 'online_redirect',
    state: 'draft',
    invoice_ids: [[4, invoice.id]],
  }]]);

  const endpoint = prov.billplz_sandbox
    ? 'https://www.billplz-sandbox.com/api/v3/bills'
    : 'https://www.billplz.com/api/v3/bills';
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${prov.billplz_api_key}:`).toString('base64'),
    },
    body: JSON.stringify({
      collection_id: prov.billplz_collection_id,
      email: partner.email || 'student@marifah.edu.my',
      name: partner.name,
      amount: Math.round(residual * 100),
      callback_url: `${publicUrl}/payment/billplz/webhook`,
      redirect_url: `${publicUrl}/payment/billplz/return?ref=${encodeURIComponent(txRef)}`,
      description: `Payment for ${invoiceName}`,
      reference_1_label: 'Reference',
      reference_1: txRef,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new HttpError(502, 'gateway_error', 'Payment gateway rejected the request');
  const bill = await res.json().catch(() => ({}));
  if (!bill.id || !bill.url) throw new HttpError(502, 'gateway_error', 'Invalid response from payment gateway');

  await odoo.call('payment.transaction', 'write', [[txId], {
    billplz_bill_id: bill.id,
    billplz_url: bill.url,
    billplz_myr_amount: residual,
  }]);
  return bill.url;
}
