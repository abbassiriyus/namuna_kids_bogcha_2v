
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { RotateCcw, Clock, Check, X, Save, Loader2 } from 'lucide-react';
import url from '../../host/host';
import LayoutComponent from '../../components/LayoutComponent';
import ErrorModal from '../../components/ErrorModal';
import styles from '../../styles/DavomatPage.module.css';
import { bugungiOy, bugungiSana, toLocalDate } from '../../utils/sana';
import Loader from '../../components/Loader';
import { useLang } from '../../i18n/LanguageContext';

export default function DavomatPage() {
  const { t } = useLang();
  const router = useRouter();
  const [month, setMonth] = useState(() => bugungiOy());
  const [bolalar, setBolalar] = useState([]);
  const [filteredBolalar, setFilteredBolalar] = useState([]);
  const [darsKunlar, setDarsKunlar] = useState([]);
  const [davomatlar, setDavomatlar] = useState([]);
  const [guruhlar, setGuruhlar] = useState([]);
  const [selectedGuruh, setSelectedGuruh] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnmarkedOnly, setFilterUnmarkedOnly] = useState(false);
  const [loading, setLoading] = useState(true); // Added loading state
  // Saqlanmagan belgilashlar: `${bola_id}_${darssana_id}` -> 1 (keldi) | 2 (kelmadi) | 0 (o'chirish)
  const [pending, setPending] = useState({});
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState({
    view_attendance: false,
    create_attendance: false,
    edit_attendance: false,
    delete_attendance: false,
  });

  const token = (typeof window !== "undefined") ? localStorage.getItem('token') : null;
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchGuruhlar = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${url}/guruh`, authHeader);
      setGuruhlar(res.data);
    } catch (err) {
      console.error('Guruhlar olishda xatolik:', err);
      if (err.response?.status === 403) {
        setErrorMessage(t('noGroupsPermission'));
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
      // API sanani UTC satri sifatida qaytaradi ("2026-08-21T19:00:00.000Z"),
      // uni to'g'ridan-to'g'ri kesish bir kun oldingi sanani berardi — shu sababli
      // bugungi dars topilmay qolardi. Mahalliy sanaga o'girib qo'yamiz.
      const sorted = res.data
        .map(d => ({ ...d, sana: toLocalDate(d.sana) }))
        .filter(d => d.sana.startsWith(month))
        .sort((a, b) => new Date(a.sana) - new Date(b.sana));
      setDarsKunlar(sorted);
    } catch (err) {
      console.error('Dars kunlarini olishda xatolik:', err);
      if (err.response?.status === 403) {
        setErrorMessage(t('noLessonsPermission'));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDavomatlar = async () => {
    try {
      // setLoading(true);
      const res = await axios.get(`${url}/bola_kun`, authHeader);
      setDavomatlar(res.data);
    } catch (err) {
      console.error('Davomatlarni olishda xatolik:', err);
      if (err.response?.status === 403 && err.config.url.includes('bola_kun')) {
        setErrorMessage(t('noAttendancePermission'));
      } else {
        setErrorMessage(t('attendanceUnknownError'));
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
        axios.get(`${url}/bola/all`, authHeader),
        axios.get(`${url}/bola_kun`, authHeader),
        axios.get(`${url}/bola_kun_all?year=${year}&month=${monthNum}`, authHeader),
      ]);

      const allBolalar = bolalarRes.data;
      const allDavomat = davomatRes.data;
      const allDarsSana = darsSanaRes.data;

      const thisMonthDarsIds = allDarsSana
        .filter(d => toLocalDate(d.sana).startsWith(selectedMonth))
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
      if (err.response?.status === 403 && err.config.url.includes('bola_kun')) {
        setErrorMessage(t('noChildrenPermission'));
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
        view_attendance: true,
        create_attendance: true,
        edit_attendance: true,
        delete_attendance: true,
      };

      if (type === '3') {
        const res = await axios.get(`${url}/permissions/${adminId}`, authHeader);
        permissionsData = res?.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);
    } catch (err) {
      console.error('Ruxsatlarni olishda xatolik:', err);
      if (err.response?.status === 403) {
        setErrorMessage(t('noPermissionsFetchPermission'));
      }
    } finally {
      setLoading(false);
    }
  };
const [today, setToday] = useState("");

useEffect(() => {
  setToday(bugungiSana());
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
      // const today = bugungiSana();
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

  // Filtrlash quyidagi useEffect orqali (selectedGuruh/searchQuery/filterUnmarkedOnly
  // o'zgarganda) avtomatik ishlaydi — bu yerda qayta chaqirish shart emas.
  const handleGuruhChange = (e) => {
    setSelectedGuruh(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const toggleUnmarkedOnly = () => {
    setFilterUnmarkedOnly((prev) => !prev);
  };

  // ---------------------------------------------------------------------
  // Davomat belgilash. Avval har bir bosishda darhol serverga so'rov ketardi:
  // sekin edi va butun ro'yxat qayta yuklanardi. Endi belgilashlar avval
  // shu yerda (`pending`) to'planadi, foydalanuvchi hammasini belgilab
  // bo'lgach bitta "Saqlash" tugmasi bilan yuboriladi.
  // ---------------------------------------------------------------------

  const kalit = (bolaId, darsId) => `${bolaId}_${darsId}`;
  const pendingCount = Object.keys(pending).length;

  // Katakning ko'rsatiladigan holati: saqlanmagan o'zgarish bo'lsa u ustun,
  // aks holda bazadagi qiymat. 0 — belgilanmagan.
  const katakHolati = (bolaId, darsId) => {
    const k = kalit(bolaId, darsId);
    if (k in pending) return pending[k];
    const entry = davomatlar.find(v => v.bola_id === bolaId && v.darssana_id === darsId);
    return entry?.holati ?? 0;
  };

  // Bosilganda aylanadi: bo'sh -> keldi -> kelmadi -> bo'sh
  const toggleKatak = (bola, dars) => {
    const joriy = katakHolati(bola.id, dars.id);
    const keyingi = joriy === 0 ? 1 : joriy === 1 ? 2 : 0;

    const bazada = davomatlar.find(v => v.bola_id === bola.id && v.darssana_id === dars.id);
    const asl = bazada?.holati ?? 0;

    // Ruxsatlar: yangi yozuv — create, mavjudini o'zgartirish — edit,
    // butunlay olib tashlash — delete.
    const kerak = keyingi === 0 ? permissions.delete_attendance
      : asl === 0 ? permissions.create_attendance
      : permissions.edit_attendance;
    if (!kerak) {
      setErrorMessage(t('noAttendanceEditPermission'));
      return;
    }

    setErrorMessage('');
    setPending((prev) => {
      const yangi = { ...prev };
      const k = kalit(bola.id, dars.id);
      // Asl holatga qaytgan bo'lsa — o'zgarish sifatida saqlamaymiz.
      if (keyingi === asl) delete yangi[k];
      else yangi[k] = keyingi;
      return yangi;
    });
  };

  const handleBekorQilish = () => {
    setPending({});
    setErrorMessage('');
  };

  const handleSaqlash = async () => {
    const ozgarishlar = Object.entries(pending);
    if (ozgarishlar.length === 0 || saving) return;

    setSaving(true);
    try {
      // Hammasi bir vaqtda yuboriladi. allSettled: bittasi rad etilsa ham
      // (masalan "faqat bugungi dars uchun") qolganlari saqlanib qoladi.
      const natijalar = await Promise.allSettled(
        ozgarishlar.map(([k, holati]) => {
          const [bolaId, darsId] = k.split('_').map(Number);
          const bazada = davomatlar.find(v => v.bola_id === bolaId && v.darssana_id === darsId);

          if (holati === 0) {
            return axios.delete(`${url}/bola_kun/${bazada.id}`, authHeader);
          }
          const payload = { bola_id: bolaId, darssana_id: darsId, holati };
          return bazada
            ? axios.put(`${url}/bola_kun/${bazada.id}`, payload, authHeader)
            : axios.post(`${url}/bola_kun`, payload, authHeader);
        })
      );

      // Saqlanmaganlari `pending` da qoladi — foydalanuvchi qayta urinishi mumkin.
      const qolgan = {};
      let birinchiXato = '';
      natijalar.forEach((r, i) => {
        if (r.status === 'rejected') {
          const [k, holati] = ozgarishlar[i];
          qolgan[k] = holati;
          if (!birinchiXato) {
            birinchiXato =
              r.reason?.response?.data?.error ||
              r.reason?.response?.data?.message ||
              t('attendanceSaveUnknownError');
          }
        }
      });

      await fetchDavomatlar();
      setPending(qolgan);

      const xatoSoni = Object.keys(qolgan).length;
      if (xatoSoni > 0) {
        setErrorMessage(`${t('saveFailedCount').replace('{n}', xatoSoni)} — ${birinchiXato}`);
      }
    } catch (err) {
      console.error('Davomatni saqlashda xatolik:', err);
      setErrorMessage(t('attendanceSaveUnknownError'));
    } finally {
      setSaving(false);
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

  return (
    <LayoutComponent>
      {permissions.view_attendance ? (
        <>
          <div className={styles.header}>
            <h2 className={styles.title}>{t('attendanceTitle')}</h2>
            <input
              type="month"
              value={month}
              onChange={(e) => {
                const newMonth = e.target.value;
                setMonth(newMonth);
                fetchBolalar(newMonth);
              }}
              className={styles.monthInput}
            />
            <input
              type="text"
              placeholder={t('nameSurnamePlaceholder')}
              className={styles.searchInput}
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <select
              value={selectedGuruh}
              onChange={handleGuruhChange}
              className={styles.select}
            >
              <option value="">{t('allGroups')}</option>
              {guruhlar.map(guruh => (
                <option key={guruh.id} value={guruh.id}>{guruh.name}</option>
              ))}
            </select>
            <button onClick={toggleUnmarkedOnly} className={styles.filterBtn}>
              {filterUnmarkedOnly ? (<><RotateCcw size={16} /> {t('showAll')}</>) : (<><Clock size={16} /> {t('unmarkedToday')}</>)}
            </button>
          </div>

          {loading ? (
            <Loader />
          ) : (
            <div className={`${styles.tableWrapper} ${pendingCount > 0 ? styles.tableWrapperWithBar : ''}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', position: 'sticky', left: '0px', zIndex: 22, top: '0px' }}>№</th>
                    <th style={{ position: 'sticky', left: '45px', zIndex: 22 }}>{t('nameSurname')}</th>
                    {darsKunlar.map(d => (
                      <th key={d.id}>{d.sana.slice(8, 10)}</th>
                    ))}
                    <th><Check size={14} color="var(--color-success)" /> {t('presentShort')}</th>
                    <th><X size={14} color="var(--color-danger)" /> Yo‘q</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBolalar.map((bola, index) => {
                    // Yig'indilar saqlanmagan belgilashlarni ham hisobga oladi —
                    // shunda son darhol o'zgaradi, saqlashni kutmaydi.
                    const bor = darsKunlar.filter(d => katakHolati(bola.id, d.id) === 1).length;
                    const yoq = darsKunlar.filter(d => katakHolati(bola.id, d.id) === 2).length;

                    return (
                      <tr key={bola.id}>
                        <td className={styles.stickyCol} style={{ textAlign: 'center', left: '0px', zIndex: 22 }}>{index + 1}</td>
                        <td className={styles.stickyCol} style={{ left: '45px', zIndex: 22 }}>{bola.username}</td>
                        {darsKunlar.map(d => {
                          const holati = katakHolati(bola.id, d.id);
                          // Saqlanmagan katak boshqa fonda ko'rinadi; saqlangach
                          // `pending` bo'shaydi va fon odatdagi holatga qaytadi.
                          const saqlanmagan = kalit(bola.id, d.id) in pending;
                          const mark = holati === 1 ? (
                            <Check size={14} color="var(--color-success)" />
                          ) : holati === 2 ? (
                            <X size={14} color="var(--color-danger)" />
                          ) : '';
                          return (
                            <td
                              key={d.id}
                              className={saqlanmagan ? styles.pendingCell : undefined}
                              style={{ cursor: permissions.edit_attendance || permissions.create_attendance || permissions.delete_attendance ? 'pointer' : 'default', textAlign: 'center' }}
                              onClick={() => toggleKatak(bola, d)}
                            >
                              {mark}
                            </td>
                          );
                        })}
                        <td>{bor}</td>
                        <td>{yoq}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className={styles.stickyCol} style={{ fontWeight: 'bold', zIndex: 333, left: '0px' }}></td>
                    <td className={styles.stickyCol} style={{ fontWeight: 'bold', zIndex: 333, left: '40px' }}>{t('byDayLabel')}</td>
                    {darsKunlar.map(d => {
                      const bor = filteredBolalar.filter(b => katakHolati(b.id, d.id) === 1).length;
                      const yoq = filteredBolalar.filter(b => katakHolati(b.id, d.id) === 2).length;

                      return (
                        <td key={d.id} style={{ fontSize: '12px', lineHeight: '14px', textAlign: 'center' }}>
                          <Check size={12} color="var(--color-success)" /> {bor}<br /><X size={12} color="var(--color-danger)" /> {yoq}
                        </td>
                      );
                    })}
                    <td style={{ fontWeight: 'bold', color: '#166534' }}>
                      {filteredBolalar.reduce(
                        (jami, b) => jami + darsKunlar.filter(d => katakHolati(b.id, d.id) === 1).length,
                        0
                      )}
                    </td>
                    <td style={{ fontWeight: 'bold', color: '#991b1b' }}>
                      {filteredBolalar.reduce(
                        (jami, b) => jami + darsKunlar.filter(d => katakHolati(b.id, d.id) === 2).length,
                        0
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Saqlanmagan belgilashlar bo'lgandagina pastda paydo bo'ladigan panel.
              Sahifa uzun bo'lgani uchun u ekranga qadalgan (fixed) — jadvalning
              qayeriga tushib qolgan bo'lsangiz ham tugma qo'l ostida turadi. */}
          {pendingCount > 0 && (
            <div className={styles.saveBar} role="region" aria-live="polite">
              <div className={styles.saveBarInfo}>
                <span className={styles.saveBarBadge}>{pendingCount}</span>
                <div>
                  <strong>{t('unsavedMarks').replace('{n}', pendingCount)}</strong>
                  <p className={styles.saveBarHint}>{t('attendanceCellHint')}</p>
                </div>
              </div>
              <div className={styles.saveBarActions}>
                <button
                  type="button"
                  className={styles.discardBtn}
                  onClick={handleBekorQilish}
                  disabled={saving}
                >
                  <RotateCcw size={16} /> {t('discardChanges')}
                </button>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={handleSaqlash}
                  disabled={saving}
                >
                  {saving ? (
                    <><Loader2 size={16} className={styles.spinner} /> {t('saving')}</>
                  ) : (
                    <><Save size={16} /> {t('save')}</>
                  )}
                </button>
              </div>
            </div>
          )}

          <ErrorModal
            message={errorMessage}
            onClose={() => setErrorMessage('')}
          />
        </>
      ) : (
        <p style={{ padding: '20px', color: 'red' }}>
          Sizda davomatni ko‘rish uchun ruxsat yo‘q!
        </p>
      )}
    </LayoutComponent>
  );
}
