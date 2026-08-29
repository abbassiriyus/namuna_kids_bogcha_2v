'use client';
// import SinglePage from "./SinglePage"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import url from '../../host/host';
import LayoutComponent from '../../components/LayoutComponent';
import { useLang } from '../../i18n/LanguageContext';
import styles from '../../styles/Dashboard.module.css';
import { bugungiSana, toLocalDate } from '../../utils/sana';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LabelList,
  ComposedChart, Line, Area, Cell
} from 'recharts';
 import UmumiySumma from "../../components/umumiySumma"
export default function Dashboard() {
  const { t } = useLang();
  const [bolaStats, setBolaStats] = useState({ active: 0, inactive: 0 });
  const [xodimStats, setXodimStats] = useState({ xodimlar: 0, guruhlar: 0 });
  const [year, setYear] = useState(() => new Date().getFullYear().toString());
  const [daromadData, setDaromadData] = useState([]);
  const [darslarData, setDarslarData] = useState([]);
  const [davomatData, setDavomatData] = useState([]);
  const [dailyDavomatData, setDailyDavomatData] = useState([]);
  const [groupKPIData, setGroupKPIData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => (new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [todayAttendanceStats, setTodayAttendanceStats] = useState({ kelgan: 0, kelmagan: 0 });
  const [todayXodimStats, setTodayXodimStats] = useState({ kelgan: 0, kelmagan: 0 });
  const [xodimDavomatData, setXodimDavomatData] = useState([]);

  const router = useRouter();
  const token = (typeof window !== "undefined") ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) {
      router.replace('/');
    } else {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token, router]);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchStats = async () => {
    try {
      const [bolaRes, xodimRes, guruhRes] = await Promise.all([
        axios.get(`${url}/bola/all`, authHeader), // /bola o'rniga /bola/all
        axios.get(`${url}/xodim`, authHeader),
        axios.get(`${url}/guruh`, authHeader),
      ]);

      const allBolalar = bolaRes.data;
      const active = allBolalar.filter(b => b.is_active === true).length;
      const inactive = allBolalar.filter(b => b.is_active === false).length;

      setBolaStats({ active, inactive });
      setXodimStats({ xodimlar: xodimRes.data.length, guruhlar: guruhRes.data.length });
    } catch (err) {
      console.error("Statistikani olishda xatolik:", err);
    }
  };

  // Qolgan funksiyalar (fetchTodayAttendance, fetchDaromad, fetchDarslar, fetchDavomatlar, fetchDailyDavomat, fetchGroupKPIData) o'zgarmaydi
  const fetchTodayAttendance = async () => {
    try {
      // Sana bola_kun'da emas, darsda (bola_kuni_all.sana) saqlanadi —
      // shuning uchun bugungi kesim backendda JOIN bilan hisoblanadi.
      const res = await axios.get(`${url}/bola_kun/stats/today`, authHeader);
      setTodayAttendanceStats({
        kelgan: res.data?.kelgan || 0,
        kelmagan: res.data?.kelmagan || 0,
      });
    } catch (err) {
      console.error("Bugungi davomatni olishda xatolik:", err);
    }
  };

  const fetchXodimDavomat = async () => {
    try {
      const [workTodayRes, oneDayRes] = await Promise.all([
        axios.get(`${url}/xodim/work-today`, authHeader),
        axios.get(`${url}/xodim_one_day`, authHeader),
      ]);

      const todayStr = bugungiSana();
      const todayCheckedInIds = new Set(
        oneDayRes.data
          .filter(item => item.start_time && toLocalDate(item.created_at) === todayStr)
          .map(item => item.xodim_id)
      );
      const expectedToday = workTodayRes.data.length;
      const kelgan = workTodayRes.data.filter(x => todayCheckedInIds.has(x.id)).length;
      setTodayXodimStats({ kelgan, kelmagan: Math.max(expectedToday - kelgan, 0) });

      const monthlyCounts = {};
      oneDayRes.data.forEach(item => {
        if (!item.start_time) return;
        const d = new Date(item.created_at);
        if (d.getFullYear().toString() !== year) return;
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
      });

      const months = t('years');
      const data = months.map((oy, idx) => {
        const monthKey = (idx + 1).toString().padStart(2, '0');
        return { oy, soni: monthlyCounts[monthKey] || 0 };
      });
      setXodimDavomatData(data);
    } catch (err) {
      console.error("Xodimlar davomatini olishda xatolik:", err);
    }
  };

  const fetchDaromad = async () => {
    try {
      const res = await axios.get(`${url}/daromat_type`, authHeader);
      const rawData = res.data.filter(item => {
        const sana = new Date(item.sana);
        return sana.getFullYear().toString() === year;
      });

      const monthlyTotals = {};
      rawData.forEach(item => {
        const date = new Date(item.sana);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');

        if (!monthlyTotals[month]) {
          monthlyTotals[month] = {
            naqt: 0,
            karta: 0,
            prichislena: 0,
            naqt_prichislena: 0,
          };
        }

        monthlyTotals[month].naqt += item.naqt || 0;
        monthlyTotals[month].karta += item.karta || 0;
        monthlyTotals[month].prichislena += item.prichislena || 0;
        monthlyTotals[month].naqt_prichislena += item.naqt_prichislena || 0;
      });

      const months = t('years');

      const data = months.map((oy, idx) => {
        const monthKey = (idx + 1).toString().padStart(2, '0');
        const found = monthlyTotals[monthKey] || {
          naqt: 0,
          karta: 0,
          prichislena: 0,
          naqt_prichislena: 0,
        };
        const jami =
          found.naqt +
          found.karta +
          found.prichislena +
          found.naqt_prichislena;

        return { oy, ...found, jami };
      });

      setDaromadData(data);
    } catch (err) {
      console.error("Daromadni olishda xatolik:", err);
    }
  };

  const fetchDarslar = async () => {
    try {
      const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
      const responses = await Promise.all(
        months.map(m => axios.get(`${url}/bola_kun_all?month=${m}&year=${year}`, authHeader))
      );
      const monthNames = t('years');
      const data = responses.map((res, idx) => ({
        oy: monthNames[idx],
        darslar: res.data.length
      }));
      setDarslarData(data);
    } catch (err) {
      console.error("Darslar sonini olishda xatolik:", err);
    }
  };

  const fetchDavomatlar = async () => {
    try {
      // Sana bola_kun'da emas, darsda (bola_kuni_all.sana) saqlanadi — shuning
      // uchun oylik yig'indini backend JOIN bilan hisoblab beradi.
      const res = await axios.get(`${url}/bola_kun/stats?year=${year}`, authHeader);
      setDavomatData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Davomatlarni olishda xatolik:", err);
    }
  };

  const fetchDailyDavomat = async () => {
    try {
      // Tanlangan oy uchun kunlik kesim (backend dars sanasi bo'yicha guruhlaydi).
      const res = await axios.get(
        `${url}/bola_kun/stats/daily?month=${year}-${selectedMonth}`,
        authHeader
      );
      setDailyDavomatData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching daily attendance:", err);
    }
  };

  const fetchGroupKPIData = async () => {
    try {
      // Avval 3 ta so'rov yuborilib, guruhlash clientda qilinardi va oy
      // `created_at` bo'yicha filtrlangani uchun natija noto'g'ri chiqardi.
      // Endi backend dars sanasi bo'yicha bitta so'rovda hisoblab beradi.
      const res = await axios.get(
        `${url}/bola_kun/stats/groups?month=${year}-${selectedMonth}`,
        authHeader
      );
      setGroupKPIData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Guruh KPI'larini olishda xatolik:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchTodayAttendance();
    fetchXodimDavomat();
    fetchDaromad();
    fetchDarslar();
    fetchDavomatlar();
    fetchDailyDavomat();
    fetchGroupKPIData();
  }, [year, selectedMonth]);

  // Validated categorical palette (dataviz skill: CVD-safe adjacent ordering).
  // Payment-method series share this order everywhere it appears in the app.
  const PALETTE = {
    naqt: '#2a78d6',
    karta: '#eb6834',
    prichislena: '#1baf7a',
    naqt_prichislena: '#eda100',
    darslar: '#2a78d6',
    good: '#0ca30c',
    critical: '#d03b3b',
    xodimDavomat: '#7c3aed',
  };

  const formatNumber = (value) =>
    new Intl.NumberFormat('uz-UZ').format(Number(value) || 0);

  // Diagrammalarda 12 oy yonma-yon turadi. Ustun tepasidagi raqam to'liq
  // yozilsa ("1 500 000") qo'shni ustunning raqami bilan ustma-ust tushadi,
  // shuning uchun diagramma ichida qisqartirilgan ko'rinish ishlatiladi.
  // To'liq qiymat tooltip'da baribir ko'rinadi.
  const formatCompact = (value) => {
    const n = Number(value) || 0;
    const abs = Math.abs(n);
    if (abs >= 1000000) {
      const m = n / 1000000;
      return `${(Math.abs(m) >= 10 ? Math.round(m) : Number(m.toFixed(1))).toLocaleString('uz-UZ')} ${t('unitMillionShort')}`;
    }
    if (abs >= 10000) return `${Math.round(n / 1000).toLocaleString('uz-UZ')} ${t('unitThousandShort')}`;
    return formatNumber(n);
  };

  // Oy nomi to'liq yozilganda ("Sentyabr") 12 tasi o'qqa sig'maydi.
  const shortMonth = (name) => (typeof name === 'string' ? name.slice(0, 3) : name);

  // Guruh nomlari uzun bo'lishi mumkin ("Katta guruh «Bilimdon»") — o'qda kesamiz.
  const shortLabel = (name, max = 12) => {
    const s = String(name ?? '');
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
  };

  const chartTooltipStyle = {
    background: '#ffffff',
    border: '1px solid #e5e9f0',
    borderRadius: '12px',
    boxShadow: '0 10px 22px -6px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.06)',
    padding: '12px 14px',
  };

  const axisTick = { fill: '#64748b', fontSize: 11 };

  // Oy nomlari tanlangan tilda ('years' kaliti oy nomlari ro'yxatini saqlaydi).
  const UZ_MONTHS = t('years') || [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
  ];

  // Davomat diagrammasini "chuqurroq" qiladi: har oy uchun jami va kelish
  // foizini ham hisoblaymiz, shunda ustunlar yonida tendensiya chizig'i chiqadi.
  // Backend oy nomlarini o'zbekcha qaytaradi — ko'rsatishda tarjimasiga
  // indeks bo'yicha almashtiramiz (backend doim 12 oyni tartib bilan beradi).
  const davomatEnriched = davomatData.map((d, idx) => {
    const jami = (d.holati1 || 0) + (d.holati2 || 0);
    return {
      ...d,
      oy: UZ_MONTHS[idx] || d.oy,
      jami,
      foiz: jami > 0 ? Math.round((d.holati1 / jami) * 100) : null,
    };
  });

  const yilJami = davomatEnriched.reduce(
    (acc, d) => ({ kelgan: acc.kelgan + d.holati1, kelmagan: acc.kelmagan + d.holati2 }),
    { kelgan: 0, kelmagan: 0 }
  );
  const yilJamiBelgi = yilJami.kelgan + yilJami.kelmagan;
  const yilFoiz = yilJamiBelgi > 0 ? Math.round((yilJami.kelgan / yilJamiBelgi) * 100) : 0;

  const currentMonthIdx = new Date().getMonth();
  const currentMonthName = UZ_MONTHS[currentMonthIdx];
  const currentMonthData = davomatEnriched[currentMonthIdx];

  // Guruhlarni KPI bo'yicha saralaymiz — eng yaxshi va eng past guruh darhol ko'rinadi.
  const groupRanked = [...groupKPIData]
    .map((g) => ({ ...g, kpi: Number(g.kpi) || 0, jami: (g.holati1 || 0) + (g.holati2 || 0) }))
    .sort((a, b) => b.kpi - a.kpi);

  const kpiColor = (kpi) => (kpi >= 8 ? PALETTE.good : kpi >= 6 ? PALETTE.naqt_prichislena : PALETTE.critical);

  // KPI diagrammasi gorizontal: guruh nomlari chapdagi tik o'qda turadi.
  // O'q kengligini eng uzun nomga qarab hisoblaymiz — nomlar qisqa bo'lsa
  // ustunlarga ko'proq joy qoladi, uzun bo'lsa kesilmay sig'adi.
  const kpiNameMax = 22;
  const kpiUzunlik = groupRanked.length
    ? Math.min(kpiNameMax, Math.max(...groupRanked.map((g) => String(g.guruh || '').length)))
    : 10;
  const kpiAxisWidth = Math.min(180, Math.max(80, kpiUzunlik * 7 + 12));

  const bugungiBolaJami = todayAttendanceStats.kelgan + todayAttendanceStats.kelmagan;
  const bugungiBolaFoiz = bugungiBolaJami > 0
    ? Math.round((todayAttendanceStats.kelgan / bugungiBolaJami) * 100) : 0;
  const bugungiXodimJami = todayXodimStats.kelgan + todayXodimStats.kelmagan;
  const bugungiXodimFoiz = bugungiXodimJami > 0
    ? Math.round((todayXodimStats.kelgan / bugungiXodimJami) * 100) : 0;

  return (
    <LayoutComponent>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <div>
            <span className={styles.kicker}>{t('overview')}</span>
            <h1 className={styles.title}>{t('dashboard')}</h1>
          </div>

          <div className={styles.inputRow}>
            <label htmlFor="year">{t('dashYear')}:</label>
            <input
              type="number"
              id="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min="2000"
              max="2100"
              className={styles.yearInput}
            />
            {/* Oy tanlash avval umuman yo'q edi — kunlik va guruh ma'lumotlari
                shu tanlovga bog'liq holda yuklanadi. */}
            <label htmlFor="month">{t('dashMonth')}:</label>
            <select
              id="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={styles.yearInput}
            >
              {UZ_MONTHS.map((m, i) => (
                <option key={m} value={(i + 1).toString().padStart(2, '0')}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ixcham KPI qatori: har bir plitkada asosiy son va uning izohi */}
        <div className={styles.cardGrid}>
          <div className={`${styles.card} ${styles.green}`}>
            <h2>{t('dashActiveChildren')}</h2>
            <p>{bolaStats.active}</p>
            <span className={styles.cardHint}>{t('dashInactiveShort')}: {bolaStats.inactive}</span>
          </div>
          <div className={`${styles.card} ${styles.blue}`}>
            <h2>{t('dashEmployees')}</h2>
            <p>{xodimStats.xodimlar}</p>
            <span className={styles.cardHint}>{xodimStats.guruhlar} {t('dashGroupsCount')}</span>
          </div>
          <div className={`${styles.card} ${styles.green}`}>
            <h2>{t('dashTodayPresentChild')}</h2>
            <p>{todayAttendanceStats.kelgan}</p>
            <span className={styles.cardHint}>
              <span className={styles.spark} style={{ '--v': `${bugungiBolaFoiz}%` }} />
              {bugungiBolaFoiz}% {t('dashAttendanceShort')}
            </span>
          </div>
          <div className={`${styles.card} ${styles.red}`}>
            <h2>{t('dashTodayAbsentChild')}</h2>
            <p>{todayAttendanceStats.kelmagan}</p>
            <span className={styles.cardHint}>{bugungiBolaJami} {t('dashMarksTotal')}</span>
          </div>
          <div className={`${styles.card} ${styles.green}`}>
            <h2>{t('dashTodayPresentStaff')}</h2>
            <p>{todayXodimStats.kelgan}</p>
            <span className={styles.cardHint}>
              <span className={styles.spark} style={{ '--v': `${bugungiXodimFoiz}%` }} />
              {bugungiXodimFoiz}% {t('dashAttendanceShort')}
            </span>
          </div>
          <div className={`${styles.card} ${styles.red}`}>
            <h2>{t('dashTodayAbsentStaff')}</h2>
            <p>{todayXodimStats.kelmagan}</p>
            <span className={styles.cardHint}>{bugungiXodimJami} {t('dashStaffTotal')}</span>
          </div>
          <div className={`${styles.card} ${styles.purple}`}>
            <h2>{year} {t('dashYearAttendance')}</h2>
            <p>{yilFoiz}%</p>
            <span className={styles.cardHint}>{formatNumber(yilJamiBelgi)} {t('dashMarksCount')}</span>
          </div>
          <div className={`${styles.card} ${styles.blue}`}>
            <h2>{t('dashTopGroup')}</h2>
            <p className={styles.cardSmall}>{groupRanked[0]?.guruh || '—'}</p>
            <span className={styles.cardHint}>KPI {groupRanked[0]?.kpi?.toFixed(1) ?? '—'}</span>
          </div>
        </div>

        <div className={styles.chartGrid}>
          <div className={styles.chartSection}>
            <div className={styles.chartHead}>
              <h2>{t('dashRevenue')} ({year})</h2>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={daromadData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e5e9f0" />
                <XAxis dataKey="oy" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={shortMonth} interval={0} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={formatNumber} width={56} />
                <Tooltip
                  cursor={{ fill: 'rgba(37,99,235,0.05)' }}
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}
                  formatter={(value, name) => {
                    const labels = {
                      naqt: t('dashCash'),
                      karta: t('dashCard'),
                      prichislena: t('dashTransfer'),
                      naqt_prichislena: t('dashCashTransfer'),
                    };
                    return [formatNumber(value) + ' ' + t('currencySom'), labels[name] || name];
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 13, color: '#52514e' }}
                  formatter={(value) => {
                    const labels = {
                      naqt: t('dashCash'),
                      karta: t('dashCard'),
                      prichislena: t('dashTransfer'),
                      naqt_prichislena: t('dashCashTransfer')
                    };
                    return labels[value] || value;
                  }}
                />
                <Bar dataKey="naqt" name="naqt" stackId="daromad" fill={PALETTE.naqt} stroke="#fff" strokeWidth={2} barSize={22} />
                <Bar dataKey="karta" name="karta" stackId="daromad" fill={PALETTE.karta} stroke="#fff" strokeWidth={2} barSize={22} />
                <Bar dataKey="prichislena" name="prichislena" stackId="daromad" fill={PALETTE.prichislena} stroke="#fff" strokeWidth={2} barSize={22} />
                <Bar dataKey="naqt_prichislena" name="naqt_prichislena" stackId="daromad" fill={PALETTE.naqt_prichislena} stroke="#fff" strokeWidth={2} barSize={22} radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="jami"
                    position="top"
                    formatter={(value) => (value ? formatCompact(value) : '')}
                    style={{ fill: '#0f172a', fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartSection}>
            <div className={styles.chartHead}>
              <h2>{t('dashLessons')} ({year})</h2>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={darslarData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e5e9f0" />
                <XAxis dataKey="oy" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={shortMonth} interval={0} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} width={40} />
                <Tooltip
                  cursor={{ fill: 'rgba(37,99,235,0.05)' }}
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ fontWeight: 700, color: '#0f172a' }}
                  formatter={(value) => [formatNumber(value), t('lessonsWord')]}
                />
                <Bar dataKey="darslar" name="Darslar" fill={PALETTE.darslar} radius={[4, 4, 0, 0]} barSize={22}>
                  <LabelList
                    dataKey="darslar"
                    position="top"
                    formatter={(value) => (value ? formatNumber(value) : '')}
                    style={{ fill: '#0f172a', fontSize: 11, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tarbiyalanuvchilar davomati: ustunlar + kelish foizi tendensiyasi */}
          <div className={styles.chartSectionFull}>
            <div className={styles.chartHead}>
              <h2>{t('dashChildAttendance')} ({year})</h2>
              <div className={styles.chipRow}>
                {/* Bugungi holat — yillik yig'indidan alohida ajratib ko'rsatiladi */}
                <span className={`${styles.chip} ${styles.chipGood}`}>
                  {t('dashTodayPresent')}: <b>{formatNumber(todayAttendanceStats.kelgan)}</b>
                </span>
                <span className={`${styles.chip} ${styles.chipBad}`}>
                  {t('dashTodayAbsent')}: <b>{formatNumber(todayAttendanceStats.kelmagan)}</b>
                </span>
                <span className={styles.chip}>
                  {t('dashTodayAttendance')}: <b>{bugungiBolaFoiz}%</b>
                </span>
                <span className={styles.chip}>
                  {year} {t('dashYearLabel')}: <b>{formatNumber(yilJami.kelgan)}</b> / {formatNumber(yilJami.kelmagan)} — <b>{yilFoiz}%</b>
                </span>
                {currentMonthData && (
                  <span className={styles.chip}>
                    {currentMonthName}: <b>{currentMonthData.foiz ?? 0}%</b>
                  </span>
                )}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={davomatEnriched} margin={{ top: 22, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="kelganGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.good} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={PALETTE.good} stopOpacity={0.55} />
                  </linearGradient>
                  <linearGradient id="kelmaganGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.critical} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={PALETTE.critical} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e5e9f0" />
                <XAxis dataKey="oy" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={shortMonth} interval={0} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={axisTick} width={40} />
                {/* O'ng o'q — foiz uchun alohida shkala, aks holda ustunlar yonida
                    foiz chizig'i ko'rinmay ketardi. */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={axisTick}
                  width={38}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(37,99,235,0.05)' }}
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ fontWeight: 700, color: '#0f172a' }}
                  formatter={(value, name) => {
                    if (name === 'foiz') return [`${value ?? 0}%`, t('dashAttendancePercent')];
                    return [formatNumber(value), name === 'holati1' ? t('present') : t('absent')];
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: '#52514e' }}
                  formatter={(value) =>
                    value === 'holati1' ? t('present') : value === 'holati2' ? t('absent') : t('dashAttendancePercent')}
                />
                <Bar yAxisId="left" dataKey="holati1" name="holati1" fill="url(#kelganGrad)" radius={[5, 5, 0, 0]} barSize={16}>
                  <LabelList
                    dataKey="holati1"
                    position="top"
                    formatter={(value) => (value ? formatCompact(value) : '')}
                    style={{ fill: '#0f172a', fontSize: 10, fontWeight: 700 }}
                  />
                </Bar>
                <Bar yAxisId="left" dataKey="holati2" name="holati2" fill="url(#kelmaganGrad)" radius={[5, 5, 0, 0]} barSize={16}>
                  <LabelList
                    dataKey="holati2"
                    position="top"
                    formatter={(value) => (value ? formatCompact(value) : '')}
                    style={{ fill: '#0f172a', fontSize: 10, fontWeight: 700 }}
                  />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="foiz"
                  name="foiz"
                  stroke={PALETTE.xodimDavomat}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#fff', stroke: PALETTE.xodimDavomat, strokeWidth: 2 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Tanlangan oy ichidagi kunlik davomat — bu ma'lumot yuklanardi,
              lekin ekranda umuman ko'rsatilmasdi. */}
          <div className={styles.chartSection}>
            <div className={styles.chartHead}>
              <h2>{t('dashDailyAttendance')} — {UZ_MONTHS[Number(selectedMonth) - 1]}</h2>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={dailyDavomatData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="kunlikGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.good} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={PALETTE.good} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e5e9f0" />
                <XAxis dataKey="kun" tickLine={false} axisLine={false} tick={axisTick} interval="preserveStartEnd" minTickGap={14} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} width={36} allowDecimals={false} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ fontWeight: 700, color: '#0f172a' }}
                  labelFormatter={(v) => t('dayOfMonthLabel').replace('{d}', v)}
                  formatter={(value, name) => [formatNumber(value), name === 'holati1' ? t('present') : t('absent')]}
                />
                <Area type="monotone" dataKey="holati1" name="holati1" stroke={PALETTE.good} strokeWidth={2} fill="url(#kunlikGrad)" />
                <Line type="monotone" dataKey="holati2" name="holati2" stroke={PALETTE.critical} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Guruhlar reytingi — bu ham yuklanib, ko'rsatilmay qolgan edi */}
          <div className={styles.chartSection}>
            <div className={styles.chartHead}>
              <h2>{t('dashGroupRating')}</h2>
              <span className={styles.chip}>{UZ_MONTHS[Number(selectedMonth) - 1]}</span>
            </div>
            {groupRanked.length === 0 ? (
              <p className={styles.emptyNote}>{t('noDataFound')}</p>
            ) : (
              /* Gorizontal ustunlar: guruh nomlari uzun bo'lgani uchun ular
                 tik o'qda, chap tomonda to'liq yoziladi. Tik ustunlarda nomlar
                 bir-birining ustiga tushib ketardi, kesib ko'rsatish esa
                 "Kichik guruh ..." bilan boshlanadigan ikki guruhni bir xil
                 qilib qo'yardi. Balandlik guruhlar soniga qarab o'sadi. */
              <ResponsiveContainer width="100%" height={Math.max(200, groupRanked.length * 48 + 40)}>
                <BarChart
                  data={groupRanked}
                  layout="vertical"
                  margin={{ top: 8, right: 56, left: 0, bottom: 8 }}
                >
                  <defs>
                    {groupRanked.map((g) => (
                      <linearGradient key={g.guruh} id={`kpiGrad-${g.guruh}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={kpiColor(g.kpi)} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={kpiColor(g.kpi)} stopOpacity={0.5} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid horizontal={false} stroke="#e5e9f0" />
                  <XAxis
                    type="number"
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                  />
                  <YAxis
                    type="category"
                    dataKey="guruh"
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                    interval={0}
                    width={kpiAxisWidth}
                    tickFormatter={(v) => shortLabel(v, kpiNameMax)}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(37,99,235,0.05)' }}
                    contentStyle={chartTooltipStyle}
                    labelStyle={{ fontWeight: 700, color: '#0f172a' }}
                    formatter={(value, name, item) => {
                      const p = item?.payload || {};
                      const jami = (p.holati1 || 0) + (p.holati2 || 0);
                      const foiz = jami > 0 ? Math.round((p.holati1 / jami) * 100) : 0;
                      return [
                        `${Number(value).toFixed(1)} / 10 · ${foiz}% — ${p.holati1 || 0} ${t('present')}, ${p.holati2 || 0} ${t('absent')}`,
                        'KPI',
                      ];
                    }}
                  />
                  <Bar dataKey="kpi" radius={[0, 6, 6, 0]} barSize={24}>
                    {groupRanked.map((g) => (
                      <Cell key={g.guruh} fill={`url(#kpiGrad-${g.guruh})`} />
                    ))}
                    <LabelList
                      dataKey="kpi"
                      position="right"
                      formatter={(v) => Number(v).toFixed(1)}
                      style={{ fill: '#0f172a', fontSize: 12, fontWeight: 800 }}
                    />
                    {/* Ustun ichida kelgan/kelmagan sonlari — ustun yetarlicha
                        uzun bo'lgandagina, aks holda raqam tashqariga chiqadi. */}
                    <LabelList
                      content={({ x, y, width, height, index }) => {
                        const g = groupRanked[index];
                        if (!g || width < 52) return null;
                        return (
                          <text
                            x={x + 10}
                            y={y + height / 2}
                            dominantBaseline="middle"
                            textAnchor="start"
                            style={{ fontSize: 11, fontWeight: 700, fill: '#fff' }}
                          >
                            {g.holati1}/{g.holati2}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className={styles.chartSectionFull}>
            <div className={styles.chartHead}>
              <h2>{t('dashStaffMonthly')} ({year})</h2>
              <div className={styles.chipRow}>
                <span className={`${styles.chip} ${styles.chipGood}`}>
                  {t('dashTodayPresent')}: <b>{todayXodimStats.kelgan}</b>
                </span>
                <span className={`${styles.chip} ${styles.chipBad}`}>
                  {t('absent')}: <b>{todayXodimStats.kelmagan}</b>
                </span>
                <span className={styles.chip}>{t('dashAttendanceShort')}: <b>{bugungiXodimFoiz}%</b></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={xodimDavomatData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e5e9f0" />
                <XAxis dataKey="oy" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={shortMonth} interval={0} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} width={40} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(124,58,237,0.06)' }}
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ fontWeight: 700, color: '#0f172a' }}
                  formatter={(value) => [formatNumber(value), t('dashCheckedIn')]}
                />
                <Bar dataKey="soni" name="soni" fill={PALETTE.xodimDavomat} radius={[4, 4, 0, 0]} barSize={22}>
                  <LabelList
                    dataKey="soni"
                    position="top"
                    formatter={(value) => (value ? formatNumber(value) : '')}
                    style={{ fill: '#0f172a', fontSize: 11, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Oy yuqoridagi tanlagichdan boshqariladi — alohida "Oy tanlang" inputi kerak emas */}
      {/* <SinglePage
        month={`${year}-${selectedMonth}`}
        onMonthChange={(ym) => {
          const [y, m] = ym.split('-');
          if (y) setYear(y);
          if (m) setSelectedMonth(m);
        }}
      /> */}
      <UmumiySumma/>
    </LayoutComponent>
  );
}