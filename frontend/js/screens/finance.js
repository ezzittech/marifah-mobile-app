import { h, icon, ring, countUp, fmtMoney, fmtDate, toast, sk, emptyState, errorState } from '../ui.js';
import { t } from '../i18n.js';
import { api, swr, DEMO, ApiError } from '../api.js';
import { errText } from './login.js';

export function statusOf(inv) {
  if (inv.status === 'paid') return { cls: 'ok', key: 'fin.status.paid' };
  if (inv.overdue) return { cls: 'err', key: 'fin.status.overdue' };
  if (inv.status === 'partial') return { cls: 'warn', key: 'fin.status.partial' };
  return { cls: 'info', key: 'fin.status.unpaid' };
}

export async function startPayment(inv, btn) {
  if (DEMO) { toast(t('fin.demoPay'), 'info'); return; }
  btn.classList.add('loading'); btn.disabled = true;
  try {
    const res = await api.pay(inv.id);
    window.location.assign(res.payment_url);
  } catch (e) {
    toast(errText(e instanceof ApiError ? e : e), 'error');
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

export function render(root, ctx) {
  root.className = 'screen';
  let filter = 'all';
  let data = null;
  const body = h('div');

  root.append(
    h('h1', { class: 'page-title rise' }, t('fin.title')),
    h('p', { class: 'page-sub rise', style: { '--i': 0 } }, t('fin.sub')),
    body);

  function skeleton() {
    body.replaceChildren(
      h('div', { class: 'card' }, h('div', { style: { display: 'flex', gap: '18px', alignItems: 'center' } }, sk('104px', 104), h('div', { style: { flex: 1, display: 'grid', gap: '10px' } }, sk('50%'), sk('80%', 28)))),
      h('div', { style: { height: '14px' } }),
      ...[0, 1].map(() => h('div', { class: 'card', style: { marginBottom: '12px', display: 'grid', gap: '12px' } }, sk('60%'), sk('40%', 24), sk('100%', 40))));
  }

  function paint() {
    if (!data) return;
    const { total_due, total_billed, total_paid, invoices } = data;
    const pct = total_billed ? Math.round((total_paid / total_billed) * 100) : 100;
    const due = h('b', { class: 'num' }, fmtMoney(0));
    countUp(due, total_due, { format: (v) => fmtMoney(v) });
    const r = ring({ value: pct, size: 108, stroke: 11, color: total_due > 0 ? 'var(--p)' : 'var(--ok)', label: `${pct}%`, sub: t('fin.paidPct') });

    const shown = invoices.filter((i) => filter === 'all' || (filter === 'unpaid' ? i.status !== 'paid' : i.status === 'paid'));
    const seg = h('div', { class: 'seg', style: { margin: '16px 0 14px' } },
      [['all', 'fin.all'], ['unpaid', 'fin.unpaid'], ['paid', 'fin.settled']].map(([k, label]) =>
        h('button', { 'aria-pressed': String(filter === k), onclick: () => { filter = k; paint(); } }, t(label))));

    const list = shown.length
      ? h('div', { class: 'stack' }, shown.map((inv, i) => {
        const st = statusOf(inv);
        const payBtn = h('button', { class: 'btn primary sm' }, h('span', { class: 'spin' }), h('span', { class: 'lbl' }, t('fin.pay')));
        payBtn.addEventListener('click', () => startPayment(inv, payBtn));
        return h('div', { class: 'card inv rise', style: { '--i': i } },
          h('div', { class: 'top' }, h('div', {}, h('b', {}, inv.title), h('small', { class: 'num' }, inv.id)), h('span', { class: `chip ${st.cls}` }, t(st.key))),
          h('div', { class: 'mid' },
            h('div', { class: 'amt num' }, h('small', {}, inv.status === 'paid' ? t('fin.amount') : t('fin.remaining')), fmtMoney(inv.status === 'paid' ? inv.amount : inv.residual)),
            inv.status !== 'paid' && payBtn),
          h('div', { class: 'dates' },
            h('span', {}, `${t('fin.issued')}: ${fmtDate(inv.date)}`),
            inv.due_date && h('span', { style: inv.overdue ? { color: 'var(--err)' } : null }, `${t('fin.due')}: ${fmtDate(inv.due_date)}`)));
      }))
      : h('div', { class: 'card' }, emptyState({ title: t('fin.empty'), text: t('fin.emptySub') }));

    body.replaceChildren(
      h('div', { class: 'card rise' },
        h('div', { class: 'fin-hero' }, r.el, h('div', { class: 'amt' }, h('small', {}, t('fin.totalDue')), due,
          total_due <= 0 ? h('span', { class: 'chip ok' }, icon('check'), t('home.allPaid')) : null)),
        h('div', { class: 'fin-split' },
          h('div', {}, h('small', {}, t('fin.billed')), h('b', { class: 'num' }, fmtMoney(total_billed))),
          h('div', {}, h('small', {}, t('fin.paid')), h('b', { class: 'num', style: { color: 'var(--ok)' } }, fmtMoney(total_paid))))),
      seg, list);
  }

  const load = () => {
    if (!data) skeleton();
    swr('finance', api.finance, (d) => { data = d; paint(); })
      .catch((e) => {
        if (e?.code === 'no_finance_account') {
          body.replaceChildren(h('div', { class: 'card' }, emptyState({ ic: 'wallet', title: t('fin.noAccount'), text: t('fin.noAccountSub') })));
        } else body.replaceChildren(errorState(load, e?.code === 'network'));
      });
  };
  load();
}
