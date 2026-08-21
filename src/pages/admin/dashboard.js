'use client';
import SinglePage from "./SinglePage"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import url from '../../host/host';
import LayoutComponent from '../../components/LayoutComponent';
import styles from '../../styles/Dashboard.module.css';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LabelList
} from 'recharts';
 import UmumiySumma from "../../components/umumiySumma"
export default function Dashboard() {
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
      const res = await axios.get(`${url}/bola_kun`, authHeader);
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayRecords = res.data.filter(item => item.sana?.slice(0, 10) === todayStr);
      const kelgan = todayRecords.filter(item => item.holati === 1).length;
      const kelmagan = todayRecords.filter(item => item.holati === 2).length;

      setTodayAttendanceStats({ kelgan, kelmagan });
    } catch (err) {
      console.error("Bugungi davomatni olishda xatolik:", err);
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

      const months = [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
        'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
      ];

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
      const data = responses.map((res, idx) => ({
        oy: [
          'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
          'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
        ][idx],
        darslar: res.data.length
      }));
      setDarslarData(data);
    } catch (err) {
      console.error("Darslar sonini olishda xatolik:", err);
    }
  };

  const fetchDavomatlar = async () => {
    try {
      const res = await axios.get(`${url}/bola_kun`, authHeader);
      const rawData = res.data.filter(item => {
        const sana = new Date(item.sana);
        return sana.getFullYear().toString() === year;
      });

      const monthlyCounts = {};

      rawData.forEach(item => {
        const sana = new Date(item.sana);
        const month = (sana.getMonth() + 1).toString().padStart(2, '0');

        if (!monthlyCounts[month]) {
          monthlyCounts[month] = { holati1: 0, holati2: 0 };
        }

        if (item.holati === 1) monthlyCounts[month].holati1++;
        if (item.holati === 2) monthlyCounts[month].holati2++;
      });

      const months = [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
        'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
      ];

      const data = months.map((oy, idx) => {
        const monthKey = (idx + 1).toString().padStart(2, '0');
        const found = monthlyCounts[monthKey] || { holati1: 0, holati2: 0 };
        return { oy, ...found };
      });

      setDavomatData(data);
    } catch (err) {
      console.error("Davomatlarni olishda xatolik:", err);
    }
  };

  const fetchDailyDavomat = async () => {
    try {
      const res = await axios.get(`${url}/bola_kun`, authHeader);
      const today = new Date();
      const month = today.getMonth();
      const yearNow = today.getFullYear();

      const rawData = res.data.filter(item => {
        const date = new Date(item.sana);
        return date.getFullYear() === yearNow && date.getMonth() === month;
      });

      const daily = {};

      rawData.forEach(item => {
        const day = new Date(item.sana).getDate().toString().padStart(2, '0');
        if (!daily[day]) daily[day] = { holati1: 0, holati2: 0 };

        if (item.holati === 1) daily[day].holati1++;
        if (item.holati === 2) daily[day].holati2++;
      });

      const daysInMonth = new Date(yearNow, month + 1, 0).getDate();

      const data = Array.from({ length: daysInMonth }, (_, i) => {
        const day = (i + 1).toString().padStart(2, '0');
        return { kun: day, ...daily[day] || { holati1: 0, holati2: 0 } };
      });

      setDailyDavomatData(data);
    } catch (err) {
      console.error("Error fetching daily attendance:", err);
    }
  };

  const fetchGroupKPIData = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const month = Number(selectedMonth);
      const monthParam = `${currentYear}-${String(month).padStart(2, '0')}`;

      const [bolaRes, guruhRes, bolaKunRes] = await Promise.all([
        axios.get(`${url}/bola`, authHeader),
        axios.get(`${url}/guruh`, authHeader),
        axios.get(`${url}/bola_kun`, {
          ...authHeader,
          params: { month: monthParam }
        })
      ]);

      const bolalar = bolaRes.data;
      const guruhlar = guruhRes.data;
      const bolaKunlar = bolaKunRes.data;
      const guruhMap = {};
      bolalar.forEach(bola => {
        if (!guruhMap[bola.guruh_id]) guruhMap[bola.guruh_id] = [];
        guruhMap[bola.guruh_id].push(bola.id);
      });

      const result = guruhlar.map(guruh => {
        const bolalarInGuruh = guruhMap[guruh.id] || [];

        const bolaKuniInMonth = bolaKunlar.filter(bk =>
          bolalarInGuruh.includes(bk.bola_id)
        );

        const holati1 = bolaKuniInMonth.filter(b => b.holati === 1).length;
        const holati2 = bolaKuniInMonth.filter(b => b.holati === 2).length;
        const jami = holati1 + holati2;
        const kpi = jami > 0 ? ((holati1 / jami) * 10).toFixed(2) : 0;

        return {
          guruh: guruh.name,
          holati1,
          holati2,
          kpi
        };
      });

      setGroupKPIData(result);
    } catch (err) {
      console.error("Guruh KPI'larini olishda xatolik:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchTodayAttendance();
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
  };

  const formatNumber = (value) =>
    new Intl.NumberFormat('uz-UZ').format(Number(value) || 0);

  const chartTooltipStyle = {
    background: '#ffffff',
    border: '1px solid #e5e9f0',
    borderRadius: '12px',
    boxShadow: '0 10px 22px -6px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.06)',
    padding: '12px 14px',
  };

  const axisTick = { fill: '#64748b', fontSize: 12 };

  return (
    <LayoutComponent>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <div>
            <span className={styles.kicker}>Overview</span>
            <h1 className={styles.title}>Dashboard</h1>
          </div>

          <div className={styles.inputRow}>
            <label htmlFor="year">Yil tanlang:</label>
            <input
              type="number"
              id="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min="2000"
              max="2100"
              className={styles.yearInput}
            />
          </div>
        </div>

        <div className={styles.cardGrid}>
          <div className={`${styles.card} ${styles.green}`}><h2>Faol bolalar</h2><p>{bolaStats.active} ta</p></div>
          <div className={`${styles.card} ${styles.red}`}><h2>Faol bo‘lmagan bolalar</h2><p>{bolaStats.inactive} ta</p></div>
          <div className={`${styles.card} ${styles.blue}`}><h2>Jami xodimlar</h2><p>{xodimStats.xodimlar} ta</p></div>
          <div className={`${styles.card} ${styles.purple}`}><h2>Jami guruhlar</h2><p>{xodimStats.guruhlar} ta</p></div>
          <div className={`${styles.card} ${styles.green}`}><h2>Bugun kelgan</h2><p>{todayAttendanceStats.kelgan} ta</p></div>
          <div className={`${styles.card} ${styles.red}`}><h2>Bugun kelmagan</h2><p>{todayAttendanceStats.kelmagan} ta</p></div>
        </div>

        <div className={styles.chartGrid}>
          <div className={styles.chartSection}>
            <h2>Oylar bo‘yicha daromadlar statistikasi ({year})</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={daromadData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e5e9f0" />
                <XAxis dataKey="oy" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={formatNumber} width={56} />
                <Tooltip
                  cursor={{ fill: 'rgba(37,99,235,0.05)' }}
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}
                  formatter={(value, name) => {
                    const labels = {
                      naqt: 'Naqd',
                      karta: 'Karta',
                      prichislena: 'O‘tkazma',
                      naqt_prichislena: 'Naqd o‘tkazma',
                    };
                    return [formatNumber(value) + ' so‘m', labels[name] || name];
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 13, color: '#52514e' }}
                  formatter={(value) => {
                    const labels = {
                      naqt: 'Naqd',
                      karta: 'Karta',
                      prichislena: 'O‘tkazma',
                      naqt_prichislena: 'Naqd o‘tkazma'
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
                    formatter={(value) => (value ? formatNumber(value) : '')}
                    style={{ fill: '#0f172a', fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartSection}>
            <h2>Darslar soni</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={darslarData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e5e9f0" />
                <XAxis dataKey="oy" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} width={40} />
                <Tooltip
                  cursor={{ fill: 'rgba(37,99,235,0.05)' }}
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ fontWeight: 700, color: '#0f172a' }}
                  formatter={(value) => [formatNumber(value), 'Darslar']}
                />
                <Bar dataKey="darslar" name="Darslar" fill={PALETTE.darslar} radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartSectionFull}>
            <h2>Davomat statistikasi</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={davomatData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e5e9f0" />
                <XAxis dataKey="oy" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} width={40} />
                <Tooltip
                  cursor={{ fill: 'rgba(37,99,235,0.05)' }}
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ fontWeight: 700, color: '#0f172a' }}
                  formatter={(value, name) => [formatNumber(value), name === 'holati1' ? 'Kelgan' : 'Kelmagan']}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 13, color: '#52514e' }}
                  formatter={(value) => (value === 'holati1' ? 'Kelgan' : 'Kelmagan')}
                />
                <Bar dataKey="holati1" name="holati1" fill={PALETTE.good} radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="holati2" name="holati2" fill={PALETTE.critical} radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
            <div className={styles.monthStatsWrap}>
              {davomatData && davomatData.length > 0 && (
                (() => {
                  const uzbekMonths = [
                    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
                    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
                  ];
                  const currentMonthName = uzbekMonths[new Date().getMonth()];
                  const currentMonthData = davomatData.find(item => item.oy === currentMonthName);

                  if (!currentMonthData) return null;

                  const { holati1, holati2 } = currentMonthData;
                  const jami = holati1 + holati2;

                  return (
                    <div className={styles.monthStats}>
                      <h3>{currentMonthName} oyi statistikasi</h3>
                      <p className={styles.statusGood}>Kelganlar: {holati1} ta</p>
                      <p className={styles.statusBad}>Kelmaganlar: {holati2} ta</p>
                      <p className={styles.statusTotal}>Jami: {jami} ta bola kuni</p>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </div>
      <SinglePage />
      <UmumiySumma/>
    </LayoutComponent>
  );
}