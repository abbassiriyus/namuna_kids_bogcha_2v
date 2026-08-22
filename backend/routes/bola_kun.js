const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

router.post('/', verifyToken, async (req, res) => {
  const { holati, bola_id, darssana_id } = req.body;

  try {
    // Dars mavjudligini tekshiramiz
    const check = await pool.query(
      `SELECT sana, (sana = CURRENT_DATE) AS bugunmi FROM bola_kuni_all WHERE id = $1`,
      [darssana_id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Dars topilmadi' });
    }

    // Superadmin (type = 1) istalgan kunga davomat qo'ya oladi, qolganlar
    // faqat bugungi darsga. Sana taqqoslash bazada bajariladi — server va
    // brauzer vaqt mintaqasi farqi natijani buzmasligi uchun.
    if (Number(req.user?.type) !== 1 && !check.rows[0].bugunmi) {
      return res.status(403).json({ error: 'Faqat bugungi dars uchun davomat kiritish mumkin' });
    }

    // 3. Kiritish
    const result = await pool.query(
      `INSERT INTO bola_kun (holati, bola_id, darssana_id) VALUES ($1, $2, $3) RETURNING *`,
      [holati, bola_id, darssana_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create bola_kun error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET ALL (with optional month filter) - GET /bola_kun?month=YYYY-MM
router.get('/', verifyToken, async (req, res) => {
  const { month } = req.query;
  try {
    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = `${month}-01`;

      // JS: yangi oy 0-indeksli, shuning uchun (monthNum) emas (monthNum - 1)
      const endDateObj = new Date(year, parseInt(monthNum), 0); // 0 => oldingi oyning oxirgi kuni
      const endDate = endDateObj.toISOString().slice(0, 10);

      const result = await pool.query(
        `SELECT * FROM bola_kun WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at DESC`,
        [startDate, endDate]
      );
      return res.json(result.rows);
    }

    const result = await pool.query(`SELECT * FROM bola_kun ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch bola_kun error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// Dars kuni — bola_kuni_all.sana ustuni. Sana bola_kun jadvalida saqlanmaydi,
// shuning uchun barcha hisob-kitoblar shu JOIN orqali oladi.
const KUN = `a.sana`;

// GET /bola_kun/stats?year=YYYY — tarbiyalanuvchilarning kelgan/kelmagan
// belgilanishlari oylar kesimida. Sana bola_kun'da saqlanmaydi, u darsga
// (bola_kuni_all.sana) tegishli — shuning uchun JOIN orqali olinadi.
router.get('/stats', verifyToken, async (req, res) => {
  const year = req.query.year || String(new Date().getFullYear());
  if (!/^\d{4}$/.test(String(year))) {
    return res.status(400).json({ error: 'Yil noto‘g‘ri (YYYY kutiladi)' });
  }

  try {
    const result = await pool.query(
      `SELECT EXTRACT(MONTH FROM ${KUN})::int AS oy_raqami,
              COUNT(*) FILTER (WHERE bk.holati = 1)::int AS holati1,
              COUNT(*) FILTER (WHERE bk.holati = 2)::int AS holati2
       FROM bola_kun bk
       JOIN bola_kuni_all a ON a.id = bk.darssana_id
       WHERE EXTRACT(YEAR FROM ${KUN}) = $1
       GROUP BY EXTRACT(MONTH FROM ${KUN})
       ORDER BY oy_raqami`,
      [Number(year)]
    );

    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
    ];
    const byMonth = {};
    result.rows.forEach((r) => { byMonth[r.oy_raqami] = r; });

    // Barcha 12 oy qaytariladi — ma'lumot yo'q oylar 0 bilan ko'rinadi.
    const data = months.map((oy, idx) => {
      const row = byMonth[idx + 1];
      return {
        oy,
        holati1: row ? row.holati1 : 0,
        holati2: row ? row.holati2 : 0,
      };
    });

    res.json(data);
  } catch (err) {
    console.error('GET /bola_kun/stats xatolik:', err.message);
    res.status(500).json({ error: 'Davomat statistikasini olishda xatolik' });
  }
});

// GET /bola_kun/stats/today — bugungi tarbiyalanuvchilar davomati.
// Sana darsga (bola_kuni_all.sana) tegishli, bola_kun'da sana ustuni yo'q.
router.get('/stats/today', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE bk.holati = 1)::int AS kelgan,
              COUNT(*) FILTER (WHERE bk.holati = 2)::int AS kelmagan
       FROM bola_kun bk
       JOIN bola_kuni_all a ON a.id = bk.darssana_id
       WHERE ${KUN}::date = CURRENT_DATE`
    );
    res.json(result.rows[0] || { kelgan: 0, kelmagan: 0 });
  } catch (err) {
    console.error('GET /bola_kun/stats/today xatolik:', err.message);
    res.status(500).json({ error: 'Bugungi davomatni olishda xatolik' });
  }
});

// GET /bola_kun/stats/daily?month=YYYY-MM — oy ichidagi kunlik davomat.
router.get('/stats/daily', verifyToken, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month noto‘g‘ri (YYYY-MM kutiladi)' });
  }

  try {
    const result = await pool.query(
      `SELECT EXTRACT(DAY FROM ${KUN})::int AS kun,
              COUNT(*) FILTER (WHERE bk.holati = 1)::int AS holati1,
              COUNT(*) FILTER (WHERE bk.holati = 2)::int AS holati2
       FROM bola_kun bk
       JOIN bola_kuni_all a ON a.id = bk.darssana_id
       WHERE TO_CHAR(${KUN}, 'YYYY-MM') = $1
       GROUP BY EXTRACT(DAY FROM ${KUN})
       ORDER BY kun`,
      [month]
    );

    const byDay = {};
    result.rows.forEach((r) => { byDay[r.kun] = r; });

    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const data = Array.from({ length: daysInMonth }, (_, i) => {
      const row = byDay[i + 1];
      return {
        kun: String(i + 1).padStart(2, '0'),
        holati1: row ? row.holati1 : 0,
        holati2: row ? row.holati2 : 0,
      };
    });

    res.json(data);
  } catch (err) {
    console.error('GET /bola_kun/stats/daily xatolik:', err.message);
    res.status(500).json({ error: 'Kunlik davomatni olishda xatolik' });
  }
});

// GET /bola_kun/stats/groups?month=YYYY-MM — guruhlar kesimida davomat va KPI.
router.get('/stats/groups', verifyToken, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month noto‘g‘ri (YYYY-MM kutiladi)' });
  }

  try {
    // Barcha guruhlar chiqadi (davomati yo'q bo'lsa ham 0 bilan).
    const result = await pool.query(
      `SELECT g.name AS guruh,
              COUNT(bk.id) FILTER (WHERE bk.holati = 1)::int AS holati1,
              COUNT(bk.id) FILTER (WHERE bk.holati = 2)::int AS holati2
       FROM guruh g
       LEFT JOIN bola b ON b.guruh_id = g.id
       LEFT JOIN bola_kun bk ON bk.bola_id = b.id
       LEFT JOIN bola_kuni_all a
              ON a.id = bk.darssana_id AND TO_CHAR(${KUN}, 'YYYY-MM') = $1
       WHERE bk.id IS NULL OR a.id IS NOT NULL
       GROUP BY g.id, g.name
       ORDER BY g.name`,
      [month]
    );

    const data = result.rows.map((r) => {
      const jami = r.holati1 + r.holati2;
      return {
        guruh: r.guruh,
        holati1: r.holati1,
        holati2: r.holati2,
        // KPI: kelgan ulushi 10 ballik shkalada
        kpi: jami > 0 ? Number(((r.holati1 / jami) * 10).toFixed(2)) : 0,
      };
    });

    res.json(data);
  } catch (err) {
    console.error('GET /bola_kun/stats/groups xatolik:', err.message);
    res.status(500).json({ error: 'Guruhlar statistikasini olishda xatolik' });
  }
});

// Oy ketma-ketligini "YYYY-MM" satrlar ro'yxati sifatida quradi (ikkala chegara ham kiradi).
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

// GET /bola_kun/bola?oy=YYYY-MM — Tolovlar sahifasi uchun: har bir bolaning
// so'ralgan oygacha bo'lgan davomati, hisoblangan to'lovi, haqiqiy to'lovi,
// bonus/shtrafi va oydan-oyga o'tuvchi balansini hisoblab qaytaradi.
router.get('/bola', verifyToken, async (req, res) => {
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

    // Oylik to'lov summasining o'zgarishlari: har bir yozuv "shu oydan boshlab
    // oylik to'lov shuncha" degani (tarbiyalanuvchilar oynasidagi to'lov modali).
    // Oy bo'yicha o'sib boruvchi tartibda saqlaymiz — pastda har oy uchun eng
    // so'nggi amaldagi summa tanlanadi.
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
        // Shu oyga amal qiladigan oylik to'lov: eng so'nggi (sanasi shu oydan
        // katta bo'lmagan) o'zgarish, bo'lmasa bolaning asosiy oylik to'lovi.
        const amaldagi = ozgarishlar.filter((o) => o.oy <= m).pop();
        const oylikToliv = amaldagi ? amaldagi.miqdor : asosiyOylik;

        const jamiDarsKun = jamiDarsKunMap[m] || 0;
        const keldi = keldiMap[`${bola.id}_${m}`] || 0;
        const kelmadi = Math.max(jamiDarsKun - keldi, 0);
        const kunlikTolov = jamiDarsKun > 0 ? oylikToliv / jamiDarsKun : 0;
        // Kelmagan kunlar oylik to'lovdan avtomatik ayiriladi: faqat kelgan kunlar uchun hisoblanadi.
        const hisoblanganTolov = Math.round(kunlikTolov * keldi);
        const daromad = daromadMap[`${bola.id}_${m}`] || { naqt: 0, karta: 0, prichislena: 0, naqt_prichislena: 0 };
        const faktTolov = daromad.naqt + daromad.karta + daromad.prichislena + daromad.naqt_prichislena;
        const bonusShtraf = bonusSumMap[`${bola.id}_${m}`] || 0;
        const farq = faktTolov - hisoblanganTolov - bonusShtraf;
        const oldingiBalans = runningBalans;
        runningBalans += farq;

        // Oy oxirigacha ikki chegaraviy holat uchun prognoz. Bular faqat
        // ma'lumot uchun: balansga ta'sir qilmaydi.
        // 1) Qolgan kunlarning hammasiga keladi -> to'liq oylik to'lov;
        // 2) Oy oxirigacha umuman kelmaydi -> faqat hozirgacha kelgan kunlari.
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
          // Oy oxirigacha to'lanishi kutilayotgan summa (musbat = to'lash kerak,
          // manfiy = ortiqcha to'langan).
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

    res.json(data);
  } catch (err) {
    console.error('GET /bola_kun/bola xatolik:', err);
    res.status(500).json({ error: "Ma'lumotlarni hisoblashda xatolik yuz berdi" });
  }
});

// GET ONE - GET /bola_kun/:id
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM bola_kun WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch bola_kun by id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { holati, bola_id, darssana_id } = req.body;

  try {
    // Dars mavjudligini tekshiramiz
    const check = await pool.query(
      `SELECT sana, (sana = CURRENT_DATE) AS bugunmi FROM bola_kuni_all WHERE id = $1`,
      [darssana_id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Dars topilmadi' });
    }

    // Superadmin (type = 1) istalgan kundagi davomatni tahrirlay oladi.
    if (Number(req.user?.type) !== 1 && !check.rows[0].bugunmi) {
      return res.status(403).json({ error: 'Faqat bugungi dars uchun davomat yangilanishi mumkin' });
    }

    // Yangilash
    const result = await pool.query(
      `UPDATE bola_kun SET holati = $1, bola_id = $2, darssana_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [holati, bola_id, darssana_id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update bola_kun error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// DELETE - DELETE /bola_kun/:id
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM bola_kun WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Delete bola_kun error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
