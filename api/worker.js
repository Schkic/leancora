const ALLOWED_EV_ORIGINS = ['https://leanopedija.hr', 'https://www.leanopedija.hr'];

const ALLOWED_EVENTS = [
  'visit',
  'src_google', 'src_bing', 'src_ai', 'src_linkedin', 'src_facebook', 'src_other', 'src_direct',
  'view',
  'pdf',
  'download',
  'share_linkedin', 'share_whatsapp', 'share_facebook', 'share_copy',
  'pro_click',
  'tip_open',
];

const PAGE_RE = /^[a-z0-9-]{1,60}$/;

function todayZagreb() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb' }).format(new Date());
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers - allow leanopedija.opticora.hr
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    // CORS za /ev - samo leanopedija.hr (echo natrag Origin ako je dopusten)
    const origin = request.headers.get('Origin') || '';
    const evCors = {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };
    if (ALLOWED_EV_ORIGINS.includes(origin)) {
      evCors['Access-Control-Allow-Origin'] = origin;
    }

    // Handle preflight
    if (request.method === 'OPTIONS') {
      if (path === '/ev') {
        return new Response(null, { headers: evCors });
      }
      return new Response(null, { headers: cors });
    }

    // POST /ev - anonimna statistika koristenja (D1)
    if (request.method === 'POST' && path === '/ev') {
      let body;
      try {
        body = JSON.parse(await request.text());
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: evCors });
      }

      const p = body && body.p;
      const e = body && body.e;
      const pageOk = typeof p === 'string' && (p === '*' || PAGE_RE.test(p));
      const eventOk = typeof e === 'string' && ALLOWED_EVENTS.includes(e);
      if (!pageOk || !eventOk) {
        return new Response(JSON.stringify({ error: 'Invalid p or e' }), { status: 400, headers: evCors });
      }

      const day = todayZagreb();
      await env.DB
        .prepare('INSERT INTO stats(day,page,ev,n) VALUES(?1,?2,?3,1) ON CONFLICT(day,page,ev) DO UPDATE SET n=n+1')
        .bind(day, p, e)
        .run()
        .catch(() => {});

      return new Response(JSON.stringify({ ok: true }), { headers: evCors });
    }

    // POST /track?method=zaba|keks|revolut|stripe
    if (request.method === 'POST' && path === '/track') {
      const method = url.searchParams.get('method');
      const allowed = ['zaba', 'keks', 'revolut', 'stripe'];
      if (!allowed.includes(method)) {
        return new Response(JSON.stringify({ error: 'Invalid method' }), { status: 400, headers: cors });
      }

      const key = `clicks_${method}`;
      const current = parseInt(await env.clicks.get(key) || '0');
      await env.clicks.put(key, String(current + 1));

      // Also track monthly - key format: clicks_zaba_2025_05
      const now = new Date();
      const monthKey = `clicks_${method}_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currentMonth = parseInt(await env.clicks.get(monthKey) || '0');
      await env.clicks.put(monthKey, String(currentMonth + 1));

      return new Response(JSON.stringify({ ok: true, method, total: current + 1 }), { headers: cors });
    }

    // GET /stats - return all stats
    if (request.method === 'GET' && path === '/stats') {
      const methods = ['zaba', 'keks', 'revolut', 'stripe'];
      const now = new Date();
      const thisMonth = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lastMonth = now.getMonth() === 0
        ? `${now.getFullYear() - 1}_12`
        : `${now.getFullYear()}_${String(now.getMonth()).padStart(2, '0')}`;

      const stats = {};
      for (const m of methods) {
        stats[m] = {
          total: parseInt(await env.clicks.get(`clicks_${m}`) || '0'),
          this_month: parseInt(await env.clicks.get(`clicks_${m}_${thisMonth}`) || '0'),
          last_month: parseInt(await env.clicks.get(`clicks_${m}_${lastMonth}`) || '0'),
        };
      }

      const total = methods.reduce((a, m) => a + stats[m].total, 0);
      const total_month = methods.reduce((a, m) => a + stats[m].this_month, 0);

      // Find top method
      let top = '—';
      let topCount = 0;
      const labels = { zaba: '💳 Zaba', keks: '🟢 KeksPay', revolut: '🔵 Revolut', stripe: '💳 Stripe' };
      for (const m of methods) {
        if (stats[m].total > topCount) { topCount = stats[m].total; top = labels[m]; }
      }

      return new Response(JSON.stringify({
        total,
        total_month,
        top,
        methods: stats,
        labels,
      }), { headers: cors });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors });
  }
};
