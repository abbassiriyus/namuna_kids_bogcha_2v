import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

function monthRange(startYearMonth, endYearMonth) {
  const months = [];
  let [y, m] = startYearMonth.split('-').map(Number);
  const [endY, endM] = endYearMonth.split('-').map(Number);
  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return months;
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { oy } = req.query;
  if (!oy || !/^\d{4}-\d{2}$/.test(oy)) {
    return res.status(400).json({ error: "Oy parametri noto'g'ri (YYYY-MM kutiladi)" });
  }

  try {
    const bolalarRes = await pool.query('SELECT * FROM bola ORDER BY username');
    const bolalar = bolalarRes.rows;
    if (bolalar.length === 0) return res.json([]);

    const darsKunlariRes = await pool.query(
      `SELECT TO_CHAR(sana, 'YYYY-MM') AS oy, COUNT(*)::int AS soni
       FROM bola_kuni_all
       WHERE TO_CHAR(sana, 'YYYY-MM') <= $1
       GROUP BY TO_CHAR(sana, 'YYYY-MM')`,
      [oy]
    );
    const jamiDarsKunMap = {};
    darsKunlariRes.rows.forEach((r) => { jamiDarsKunMap[r.oy] = r.soni; });

    const keldiRes = await pool.query(
      `SELECT bk.bola_id, TO_CHAR(a.sana, 'YYYY-MM') AS oy, COUNT(*)::int AS soni
       FROM bola_kun bk
       JOIN bola_kuni_all a ON a.id = bk.darssana_id
       WHERE bk.holati = 1 AND TO_CHAR(a.sana, 'YYYY-MM') <= $1
       GROUP BY bk.bola_id, TO_CHAR(a.sana, 'YYYY-MM')`,
      [oy]
    );
    const keldiMap = {};
    keldiRes.rows.forEach((r) => { keldiMap[`${r.bola_id}_${r.oy}`] = r.soni; });

    const daromadRes = await pool.query(
      `SELECT bola_id, TO_CHAR(sana, 'YYYY-MM') AS oy,
              COALESCE(SUM(naqt), 0)::numeric AS naqt,
              COALESCE(SUM(karta), 0)::numeric AS karta,
              COALESCE(SUM(prichislena), 0)::numeric AS prichislena,
              COALESCE(SUM(naqt_prichislena), 0)::numeric AS naqt_prichislena
       FROM daromat_type
       WHERE TO_CHAR(sana, 'YYYY-MM') <= $1
       GROUP BY bola_id, TO_CHAR(sana, 'YYYY-MM')`,
      [oy]
    );
    const daromadMap = {};
    daromadRes.rows.forEach((r) => {
      daromadMap[`${r.bola_id}_${r.oy}`] = {
        naqt: Number(r.naqt),
        karta: Number(r.karta),
        prichislena: Number(r.prichislena),
        naqt_prichislena: Number(r.naqt_prichislena),
      };
    });

    const bonusRes = await pool.query(
      `SELECT id, bola_id, miqdor, sana, izoh, TO_CHAR(sana, 'YYYY-MM') AS oy
       FROM bola_pay_control
       WHERE TO_CHAR(sana, 'YYYY-MM') <= $1
       ORDER BY sana DESC`,
      [oy]
    );
    const bonusSumMap = {};
    const bonusListMap = {};
    bonusRes.rows.forEach((r) => {
      const key = `${r.bola_id}_${r.oy}`;
      bonusSumMap[key] = (bonusSumMap[key] || 0) + Number(r.miqdor);
      if (r.oy === oy) {
        if (!bonusListMap[r.bola_id]) bonusListMap[r.bola_id] = [];
        bonusListMap[r.bola_id].push(r);
      }
    });

    const tolovOzgarishRes = await pool.query(
      `SELECT bola_id, miqdor, TO_CHAR(sana, 'YYYY-MM') AS oy
       FROM bola_pay_new
       WHERE TO_CHAR(sana, 'YYYY-MM') <= $1
       ORDER BY sana ASC`,
      [oy]
    );
    const tolovOzgarishMap = {};
    tolovOzgarishRes.rows.forEach((r) => {
      if (!tolovOzgarishMap[r.bola_id]) tolovOzgarishMap[r.bola_id] = [];
      tolovOzgarishMap[r.bola_id].push({ oy: r.oy, miqdor: Number(r.miqdor) });
    });

    const earliestEnroll = bolalar.reduce((min, b) => {
      const ym = new Date(b.created_at).toISOString().slice(0, 7);
      return !min || ym < min ? ym : min;
    }, null) || oy;
    const allMonths = monthRange(earliestEnroll <= oy ? earliestEnroll : oy, oy);

    const data = bolalar.map((bola) => {
      const enrollMonth = new Date(bola.created_at).toISOString().slice(0, 7);
      const monthsForChild = allMonths.filter((m) => m >= enrollMonth);

      let runningBalans = Number(bola.balans) || 0;
      const asosiyOylik = Number(bola.oylik_toliv) || 0;
      const ozgarishlar = tolovOzgarishMap[bola.id] || [];
      const oylar = [];

      for (const m of monthsForChild) {
        const amaldagi = ozgarishlar.filter((o) => o.oy <= m).pop();
        const oylikToliv = amaldagi ? amaldagi.miqdor : asosiyOylik;

        const jamiDarsKun = jamiDarsKunMap[m] || 0;
        const keldi = keldiMap[`${bola.id}_${m}`] || 0;
        const kelmadi = Math.max(jamiDarsKun - keldi, 0);
        const kunlikTolov = jamiDarsKun > 0 ? oylikToliv / jamiDarsKun : 0;
        const hisoblanganTolov = Math.round(kunlikTolov * keldi);
        const daromad = daromadMap[`${bola.id}_${m}`] || { naqt: 0, karta: 0, prichislena: 0, naqt_prichislena: 0 };
        const faktTolov = daromad.naqt + daromad.karta + daromad.prichislena + daromad.naqt_prichislena;
        const bonusShtraf = bonusSumMap[`${bola.id}_${m}`] || 0;
        const farq = faktTolov - hisoblanganTolov - bonusShtraf;
        const oldingiBalans = runningBalans;
        runningBalans += farq;

        const prognozTolaKelsa = Math.round(oylikToliv) + bonusShtraf - oldingiBalans - faktTolov;
        const prognozKelmasa = hisoblanganTolov + bonusShtraf - oldingiBalans - faktTolov;

        oylar.push({
          oy: m,
          keldi,
          kelmadi,
          tolov_miqdori: oylikToliv,
          kunlik_tolov: Math.round(kunlikTolov),
          hisoblangan_tolov: hisoblanganTolov,
          fakt_tolov: faktTolov,
          farq,
          balans: runningBalans,
          daromad,
          bonus_shtraf: bonusShtraf,
          jami_dars_kun: jamiDarsKun,
          bola_dars_kunlari: [],
          prognoz_tola_kelsa: prognozTolaKelsa,
          prognoz_kelmasa: prognozKelmasa,
        });
      }

      return {
        bola,
        oylar,
        shtraf_bonuslar: bonusListMap[bola.id] || [],
      };
    });

    return res.json(data);
  } catch (err) {
    console.error('GET /bola_kun/bola xatolik:', err);
    return res.status(500).json({ error: "Ma'lumotlarni hisoblashda xatolik yuz berdi" });
  }
}

export default requireAuth(handler);
