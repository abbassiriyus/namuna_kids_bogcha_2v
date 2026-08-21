
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { Check, X } from 'lucide-react';
import url from '../../host/host';
import LayoutComponent from '../../components/LayoutComponent';
import DavomatModal from '../../components/DavomatModal';
import ErrorModal from '../../components/ErrorModal';
import styles from '../../styles/DavomatPage.module.css';

export default function SinovDavomat() {
  const router = useRouter();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [bolalar, setBolalar] = useState([]);
  const [filteredBolalar, setFilteredBolalar] = useState([]);
  const [darsKunlar, setDarsKunlar] = useState([]);
  const [davomatlar, setDavomatlar] = useState([]);
  const [guruhlar, setGuruhlar] = useState([]);
  const [selectedGuruh, setSelectedGuruh] = useState('');
  const [selected, setSelected] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnmarkedOnly, setFilterUnmarkedOnly] = useState(false);
  const [loading, setLoading] = useState(true); // Added loading state
  const [permissions, setPermissions] = useState({
    view_sinovdavomat: false,
    create_sinovdavomat: false,
    edit_sinovdavomat: false,
    delete_sinovdavomat: false,
  });

  const token = (typeof window !== "undefined")  ? localStorage.getItem('token') : null;
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchGuruhlar = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${url}/guruh`, authHeader);
      setGuruhlar(res.data);
    } catch (err) {
      console.error('Guruhlar olishda xatolik:', err);
      if (err.response?.status === 403) {
        setErrorMessage('Guruhlarni olish uchun ruxsat yo‘q');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDarsKunlar = async () => {
    try {
      setLoading(true);
      const [year, monthNum] = month.split('-');
      const res = await axios.get(`${url}/bola_kun_all?year=${year}&month=${monthNum}`, authHeader);
      const sorted = res.data
        .filter(d => d.sana.startsWith(month))
        .sort((a, b) => new Date(a.sana) - new Date(b.sana));
      setDarsKunlar(sorted);
    } catch (err) {
      console.error('Dars kunlarini olishda xatolik:', err);
      if (err.response?.status === 403) {
        setErrorMessage('Dars kunlarini olish uchun ruxsat yo‘q');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDavomatlar = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${url}/bola_kun_prp`, authHeader);
      setDavomatlar(res.data);
    } catch (err) {
      console.error('Davomatlarni olishda xatolik:', err);
      if (err.response?.status === 403 && err.config.url.includes('bola_kun_prp')) {
        setErrorMessage('Davomatlarni olish uchun ruxsat yo‘q');
      } else {
        setErrorMessage('Davomatlarni olishda noma’lum xatolik yuz berdi');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBolalar = async (selectedMonth) => {
    try {
      setLoading(true);
      const [year, monthNum] = selectedMonth.split('-');
      const [bolalarRes, davomatRes, darsSanaRes] = await Promise.all([
        axios.get(`${url}/bola_prp`, authHeader),
        axios.get(`${url}/bola_kun_prp`, authHeader),
        axios.get(`${url}/bola_kun_all?year=${year}&month=${monthNum}`, authHeader),
      ]);

      const allBolalar = bolalarRes.data;
      const allDavomat = davomatRes.data;
      const allDarsSana = darsSanaRes.data;

      const thisMonthDarsIds = allDarsSana
        .filter(d => d.sana.startsWith(selectedMonth))
        .map(d => d.id);

      const monthBolaIds = allDavomat
        .filter(bk => thisMonthDarsIds.includes(bk.darssana_id))
        .map(bk => bk.bola_id);

      const visibleBolalar = allBolalar.filter(bola =>
        bola.is_active || monthBolaIds.includes(bola.id)
      );

      setBolalar(visibleBolalar);
      filterBolalar(visibleBolalar, selectedGuruh, searchQuery, filterUnmarkedOnly);
    } catch (err) {
      console.error('Xatolik bolalarni olishda:', err);
      if (err.response?.status === 403 && err.config.url.includes('bola_kun_prp')) {
        setErrorMessage('Bolalarni olish uchun ruxsat yo‘q');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const type = localStorage.getItem('type') ? localStorage.getItem('type'): null;
      const adminId = type === '3' && typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('admin'))?.id : null;

      let permissionsData = {
        view_sinovdavomat: true,
        create_sinovdavomat: true,
        edit_sinovdavomat: true,
        delete_sinovdavomat: true,
      };

      if (type === '3') {
        const res = await axios.get(`${url}/permissions/${adminId}`, authHeader);
        permissionsData = res?.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);
    } catch (err) {
      console.error('Ruxsatlarni olishda xatolik:', err);
      if (err.response?.status === 403) {
        setErrorMessage('Ruxsatlarni olish uchun ruxsat yo‘q');
      }
    } finally {
      setLoading(false);
    }
  };
const [today, setToday] = useState("");

useEffect(() => {
  setToday(new Date().toISOString().slice(0, 10));
}, []);
  const filterBolalar = (list, guruhId, search, unmarkedOnly) => {
    let result = list;

    if (guruhId) {
      result = result.filter(bola => bola.guruh_id == guruhId);
    }

    if (search) {
      result = result.filter(bola =>
        bola.username.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (unmarkedOnly) {
      // const today = new Date().toISOString().slice(0, 10);
      const todayLesson = darsKunlar.find(d => d.sana.slice(0, 10) === today);
      if (todayLesson) {
        result = result.filter(bola => {
          return !davomatlar.find(
            d => d.bola_id === bola.id && d.darssana_id === todayLesson.id
          );
        });
      }
    }

    result = result.sort((a, b) =>
      a.username.localeCompare(b.username, 'uz', { sensitivity: 'base' })
    );

    setFilteredBolalar(result);
  };

  const updateBolaStage = async (bolaId, newStage) => {
    if (!permissions.edit_sinovdavomat) {
      setErrorMessage("Sizda bosqichni yangilash uchun ruxsat yo‘q!");
      return;
    }
    try {
      setLoading(true);
      await axios.put(`${url}/bola_prp/${bolaId}/next-stage`, {
        holati: newStage,
      }, authHeader);
      await fetchBolalar(month);
    } catch (err) {
      console.error('Bosqichni yangilashda xatolik:', err);
      if (err.response?.status === 403) {
        setErrorMessage('Bosqichni yangilash uchun ruxsat yo‘q');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }
    fetchPermissions();
    fetchGuruhlar();
    fetchDavomatlar();
  }, []);

  useEffect(() => {
    fetchDarsKunlar();
    fetchBolalar(month);
  }, [month]);

  useEffect(() => {
    filterBolalar(bolalar, selectedGuruh, searchQuery, filterUnmarkedOnly);
  }, [selectedGuruh, searchQuery, filterUnmarkedOnly, bolalar, davomatlar, darsKunlar]);

  useEffect(() => {
    if (errorMessage) {
      setSelected(null); // Close DavomatModal when error occurs
    }
  }, [errorMessage]);

  return (
    <LayoutComponent>
      {permissions.view_sinovdavomat ? (
        <>
          <div className={styles.header}>
            <h2 className={styles.title}>Bog‘cha Dars Kunlari Davomat</h2>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={styles.monthInput}
            />
            <input
              type="text"
              placeholder="Ism yoki familiya..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              value={selectedGuruh}
              onChange={(e) => setSelectedGuruh(e.target.value)}
              className={styles.select}
            >
              <option value="">Barcha guruhlar</option>
              {guruhlar.map(guruh => (
                <option key={guruh.id} value={guruh.id}>{guruh.name}</option>
              ))}
            </select>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={filterUnmarkedOnly}
                onChange={(e) => setFilterUnmarkedOnly(e.target.checked)}
              />
              Faqat belgilanmaganlar
            </label>
          </div>

          {loading ? (
            <p style={{ padding: '10px' }}>Yuklanmoqda...</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', position: 'sticky', left: '0px', zIndex: 222 }}>№</th>
                    <th style={{ position: 'sticky', left: '40px', zIndex: 22222 }}>Ism Familiya</th>
                    <th>Bosqich</th>
                    {darsKunlar.map(d => (
                      <th key={d.id}>{d.sana.slice(8, 10)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBolalar.map((bola, index) => (
                    <tr key={bola.id}>
                      <td className={styles.stickyCol} style={{ textAlign: 'center', left: '0px', zIndex: 222 }}>{index + 1}</td>
                      <td className={styles.stickyCol} style={{ left: '40px', zIndex: 22222 }}>{bola.username}</td>
                      <td>
                        {permissions.edit_sinovdavomat ? (
                          <select
                            className={styles.selectStage}
                            value={bola.holati || ''}
                            onChange={(e) => updateBolaStage(bola.id, e.target.value)}
                          >
                            <option value="">Tanlang</option>
                            <option value="boshlangich">Boshlang‘ich</option>
                            <option value="qabul_qilindi">Qabul qilindi</option>
                            <option value="kelmay_qoydi">Kelmay qo‘ydi</option>
                          </select>
                        ) : (
                          bola.holati || '—'
                        )}
                      </td>
                      {darsKunlar.map(d => {
                        const entry = davomatlar.find(
                          v => v.bola_id === bola.id && v.darssana_id === d.id
                        );
                        const mark = entry?.holati === 1 ? (
                          <Check size={14} color="var(--color-success)" />
                        ) : entry?.holati === 2 ? (
                          <X size={14} color="var(--color-danger)" />
                        ) : '';
                        return (
                          <td
                            key={d.id}
                            style={{ cursor: permissions.edit_sinovdavomat ? 'pointer' : 'default', textAlign: 'center' }}
                            onClick={() => permissions.edit_sinovdavomat && setSelected({ bola, dars: d })}
                          >
                            {mark}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selected && (permissions.create_sinovdavomat || permissions.edit_sinovdavomat || permissions.delete_sinovdavomat) && (
            <DavomatModal
              bola={selected.bola}
              sana={selected.dars.sana}
              onClose={() => setSelected(null)}
              onSelect={async (holati) => {
                if (!permissions.create_sinovdavomat && !permissions.edit_sinovdavomat && !permissions.delete_sinovdavomat) {
                  setErrorMessage("Sizda davomatni o‘zgartirish uchun ruxsat yo‘q!");
                  return;
                }
                const existing = davomatlar.find(d => d.bola_id === selected.bola.id && d.darssana_id === selected.dars.id);
                const endpoint = existing ? `${url}/bola_kun_prp/${existing.id}` : `${url}/bola_kun_prp`;
                const method = existing ? 'put' : 'post';

                try {
                  setLoading(true);
                  await axios[method](endpoint, {
                    bola_id: selected.bola.id,
                    darssana_id: selected.dars.id,
                    holati,
                  }, authHeader);
                  await fetchDavomatlar();
                  setSelected(null);
                } catch (err) {
                  if (err.response?.status === 403 && err.config.url.includes('bola_kun_prp')) {
                    setErrorMessage('Davomatni saqlash uchun ruxsat yo‘q');
                  } else {
                    setErrorMessage('Davomatni saqlashda noma’lum xatolik yuz berdi');
                  }
                } finally {
                  setLoading(false);
                }
              }}
              canEdit={permissions.edit_sinovdavomat}
              canCreate={permissions.create_sinovdavomat}
              canDelete={permissions.delete_sinovdavomat}
            />
          )}

          <ErrorModal
            message={errorMessage}
            onClose={() => setErrorMessage('')}
          />
        </>
      ) : (
        <p style={{ padding: '20px', color: 'red' }}>
          Sizda sinov davomatini ko‘rish uchun ruxsat yo‘q!
        </p>
      )}
    </LayoutComponent>
  );
}
