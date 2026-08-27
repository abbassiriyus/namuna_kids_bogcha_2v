'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import url from '../../host/host';
import styles from '../../styles/Dashboard.module.css';
import { bugungiOy } from '../../utils/sana';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

/**
 * Oy bo'yicha davomat statistikasi.
 *
 * Oy tashqaridan (Dashboard'ning yuqorisidagi yil/oy tanlagichidan) beriladi.
 * `month` prop kelmasa — komponent mustaqil ishlashi uchun — o'z ichki
 * tanlagichi bilan joriy oyni ishlatadi.
 */
export default function Dashboard({ month: monthProp, onMonthChange }) {
  const [innerMonth, setInnerMonth] = useState(() => bugungiOy());
  const isControlled = Boolean(monthProp);
  const month = isControlled ? monthProp : innerMonth;
  const setMonth = isControlled ? (onMonthChange || (() => {})) : setInnerMonth;
  const [bolalar, setBolalar] = useState([]);
  const [davomatlar, setDavomatlar] = useState([]);
  const [darsKunlar, setDarsKunlar] = useState([]);
  const [guruhlar, setGuruhlar] = useState([]);
  const [groupKPIData, setGroupKPIData] = useState([]);
  const [dailyDavomatData, setDailyDavomatData] = useState([]);
  const [topGroups, setTopGroups] = useState([]);
  const [topDays, setTopDays] = useState([]);

  const token = (typeof window !== "undefined") ? localStorage.getItem('token') : null;
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.replace('/');
    } else {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.timeout = 20000;
    }
  }, [token, router]);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const colors = {
    holati1: '#0ca30c',
    holati2: '#d03b3b',
    kpi: '#2a78d6'
  };

  const formatDate = (isoDateStr) => {
    const date = new Date(isoDateStr);
    return date.toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const fetchData = async () => {
    try {
      const [year, monthNum] = month.split('-');

      const [bolalarRes, davomatRes, darsKunlarRes, guruhlarRes] = await Promise.all([
        axios.get(`${url}/bola/all`, authHeader),
        axios.get(`${url}/bola_kun`, authHeader),
        axios.get(`${url}/bola_kun_all?year=${year}&month=${monthNum}`, authHeader),
        axios.get(`${url}/guruh`, authHeader),
      ]);

      // Shu oydagi dars kunlarini olish
      const darsFiltered = darsKunlarRes.data
        .filter(kun => kun.sana.startsWith(month))
        .sort((a, b) => new Date(a.sana) - new Date(b.sana));

      // Shu oydagi dars kunlari IDlari
      const thisMonthDarsIds = darsFiltered.map(d => d.id);

      // Shu oydagi davomat yozuvlari
      const monthDavomatlar = davomatRes.data.filter(d => thisMonthDarsIds.includes(d.darssana_id));

      setBolalar(bolalarRes.data);
      setDavomatlar(monthDavomatlar);
      setDarsKunlar(darsFiltered);
      setGuruhlar(guruhlarRes.data);
    } catch (err) {
      // Better error diagnostics for network/CORS/backend issues
      console.error("FetchData network error:", err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
      } else if (err.request) {
        console.error('No response received. Request info:', err.request);
      } else {
        console.error('Error message:', err.message);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [month]);

  useEffect(() => {
    if (darsKunlar.length && davomatlar.length) {
      generateDailyDavomatData();
    }
  }, [darsKunlar, davomatlar]);

  useEffect(() => {
    if (darsKunlar.length && davomatlar.length && guruhlar.length && bolalar.length) {
      generateGroupKPIData();
    }
  }, [darsKunlar, davomatlar, guruhlar, bolalar, month]);

  const generateDailyDavomatData = () => {
    const data = darsKunlar.map(kun => {
      const kunDavomat = davomatlar.filter(d => d.darssana_id === kun.id);
      const holati1 = kunDavomat.filter(d => d.holati === 1).length;
      const holati2 = kunDavomat.filter(d => d.holati === 2).length;
      const total = holati1 + holati2;
      const kpi = total > 0 ? Math.round((holati1 / total) * 100) : 0;

      return {
        kun: formatDate(kun.sana),
        holati1,
        holati2,
        kpi,
        sana: kun.sana
      };
    });

    const top3Days = [...data].sort((a, b) => b.kpi - a.kpi).slice(0, 3);
    setDailyDavomatData(data);
    setTopDays(top3Days);
  };

  const generateGroupKPIData = () => {
    const result = guruhlar.map(guruh => {
      const groupBolalar = bolalar
        .filter(b => b.guruh_id === guruh.id)
        .map(b => b.id);

      let holati1 = 0;
      let holati2 = 0;

      darsKunlar.forEach(kun => {
        davomatlar.forEach(dav => {
          if (groupBolalar.includes(dav.bola_id) && dav.darssana_id === kun.id) {
            if (dav.holati === 1) holati1++;
            else if (dav.holati === 2) holati2++;
          }
        });
      });

      const total = holati1 + holati2;
      const kpi = total > 0 ? Math.round((holati1 / total) * 100) : 0;

      return {
        guruh: guruh.name,
        holati1,
        holati2,
        kpi,
      };
    });

    const topThree = [...result].sort((a, b) => b.kpi - a.kpi).slice(0, 3);
    setGroupKPIData(result);
    setTopGroups(topThree);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t('monthlyAttendanceStats')}</h2>

      {/* Oy Dashboard'ning yuqorisidagi tanlagichdan boshqarilsa, bu yerda
          takroriy input ko'rsatilmaydi. */}
      {!isControlled && (
        <div className={styles.controls}>
          <label>{t('selectMonthLabel')}: </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={styles.monthInput}
          />
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h2>{t('dailyAttendanceChart')}</h2>
        {dailyDavomatData.length > 0 && (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyDavomatData}>
              <CartesianGrid vertical={false} stroke="#e5e9f0" />
              <XAxis dataKey="kun" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e9f0', borderRadius: 12 }} formatter={(value, name) => [value, name === 'holati1' ? 'Kelgan' : 'Kelmagan']} />
              <Legend iconType="circle" iconSize={8} formatter={(value) => (value === 'holati1' ? 'Kelgan' : 'Kelmagan')} />
              <Bar dataKey="holati1" name="holati1" fill={colors.holati1} radius={[4, 4, 0, 0]} />
              <Bar dataKey="holati2" name="holati2" fill={colors.holati2} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* {topDays.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>{t('top3Days')}</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {topDays.map((day, index) => (
              <div key={index} style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '12px',
                padding: '1rem',
                flex: '1 1 30%',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                <h4>{formatDate(day.sana)}</h4>
                <p><strong>{t('kpiLabel')}</strong> <span style={{ color: '#16a34a' }}>{day.kpi}%</span></p>
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* <div style={{ gridColumn: '1 / -1' }}>
        <h2>{t('groupsKpiStats')}</h2>

        {groupKPIData.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={groupKPIData}>
              <CartesianGrid vertical={false} stroke="#e5e9f0" />
              <XAxis dataKey="guruh" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e9f0', borderRadius: 12 }} formatter={(value, name) => [value, name === 'holati1' ? 'Kelgan' : name === 'holati2' ? 'Kelmagan' : 'KPI (%)']} />
              <Legend iconType="circle" iconSize={8} formatter={(value) => (value === 'holati1' ? 'Kelgan' : value === 'holati2' ? 'Kelmagan' : 'KPI (%)')} />
              <Bar dataKey="holati1" name="holati1" fill={colors.holati1} radius={[4, 4, 0, 0]} />
              <Bar dataKey="holati2" name="holati2" fill={colors.holati2} radius={[4, 4, 0, 0]} />
              <Bar dataKey="kpi" name="kpi" fill={colors.kpi} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {topGroups.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3>{t('top3Groups')}</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {topGroups.map((group, index) => (
                <div key={index} style={{
                  background: '#f0f4ff',
                  border: '1px solid #c7d2fe',
                  borderRadius: '12px',
                  padding: '1rem',
                  flex: '1 1 30%',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <h4 style={{ marginBottom: '4px' }}>{group.guruh}</h4>
                  <p><strong>{t('kpiLabel')}</strong> <span style={{ color: '#2563eb' }}>{group.kpi}%</span></p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div> */}
    </div>
  );
}
