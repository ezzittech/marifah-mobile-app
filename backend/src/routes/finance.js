import { HttpError } from '../http.js';
import { audit } from '../db.js';
import { getFinance, createPaymentLink } from '../services/finance.js';

export function registerFinanceRoutes({ router, db, config, odoo }) {
  const requirePartner = (user) => {
    if (!user.odoo_partner_id) throw new HttpError(404, 'no_finance_account', 'No finance account is linked');
    return user.odoo_partner_id;
  };

  // The partner id always comes from the signed-in account, never from the request.
  router.get('/api/finance', async ({ user }) => {
    const data = await getFinance(odoo, requirePartner(user));
    return { success: true, ...data };
  });

  router.post('/api/finance/pay', async ({ user, body, ip }) => {
    const partnerId = requirePartner(user);
    const invoiceName = String(body.invoice_id ?? '').trim();
    if (!invoiceName || invoiceName.length > 64) throw new HttpError(400, 'invalid_input', 'invoice_id is required');
    const [p] = await odoo.searchRead('res.partner', [['id', '=', partnerId]], ['id', 'name', 'email'], { limit: 1 });
    if (!p) throw new HttpError(404, 'no_finance_account', 'No finance account is linked');
    const url = await createPaymentLink({
      odoo,
      partner: p,
      invoiceName,
      publicUrl: config.odoo.publicUrl || config.odoo.url,
    });
    audit(db, user.id, 'payment_link', ip, invoiceName);
    return { success: true, payment_url: url };
  });
}
