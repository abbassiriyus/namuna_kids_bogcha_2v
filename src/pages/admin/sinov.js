'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import LayoutComponent from '../../components/LayoutComponent';
import AdminTable from '../../components/AdminTable';
import ErrorModal from '../../components/ErrorModal';
import url from '../../host/host';
import { useLang } from '../../i18n/LanguageContext';
import BolaModal from '../../components/BolaModal_prp.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import styles from '../../styles/DavomatPage.module.css';
import { useUserType } from '../../utils/useUserType';
import Loader from '../../components/Loader';

export default function Sinov() {
  const { t } = useLang();
  // localStorage render paytida o'qilsa hydration xatosi beradi — hook mount'dan keyin o'qiydi.
  const { isSuperAdmin } = useUserType();
  const router = useRouter();
  const [data, setData] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBola, setSelectedBola] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHolati, setSelectedHolati] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [permissions, setPermissions] = useState({
    view_prp: false,
    create_prp: false,
    edit_prp: false,
    delete_prp: false,
  });

  const fetchData = async (token, adminId, type) => {
    if (!token) {
      router.push('/');
      return;
    }



    try {
      setLoading(true);
      let permissionsData = {
        view_prp: true,
        create_prp: true,
        edit_prp: true,
        delete_prp: true,
      };

      const apiCalls = [
        axios.get(`${url}/bola_prp`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${url}/guruh`, { headers: { Authorization: `Bearer ${token}` } }),
      ];

      if (type === '3') {
        apiCalls.push(
          axios.get(`${url}/permissions/${adminId}`, { headers: { Authorization: `Bearer ${token}` } })
        );
      }

      const [bolaRes, guruhRes, permissionsRes] = await Promise.all(apiCalls);

      // Set permissions
      if (type === '3') {
        permissionsData = permissionsRes?.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);

      // Process groups
      const guruhMap = {};
      guruhRes.data.forEach((g) => {
        guruhMap[g.id] = g.name;
      });

      // Process students
      const updatedData = bolaRes.data.map((b) => ({
        ...b,
        guruh_id_raw: b.guruh_id,
        guruh_id: guruhMap[b.guruh_id] || b.guruh_id,
      }));

      updatedData.sort((a, b) =>
        (a.username || '').localeCompare(b.username || '', 'uz', { sensitivity: 'base' })
      );

      setGroups(guruhRes.data);
      setData(updatedData);
    } catch (error) {
      console.error('Xatolik yuz berdi:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.push('/');
      } else if (error.response?.status === 403 && error.config.url.includes('bola_kun_prp')) {
        setErrorMessage('Bunday amalni bajarib bo‘lmaydi');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendToBola = async (bolaData) => {
    if (!permissions.edit_prp) {
      setErrorMessage("Sizda tarbiyalanuvchi ma'lumotlarini yuborish uchun ruxsat yo'q!");
      return;
    }
    try {
      const token = localStorage.getItem('token') ? localStorage.getItem('token') : null;
      if (!token) {
        router.push('/');
        return;
      }

      const sendData = {
        username: bolaData.username,
        metrka: bolaData.metrka,
        guruh_id: bolaData.guruh_id_raw,
        holati: bolaData.holati,
        tugilgan_kun: bolaData.tugilgan_kun,
        oylik_toliv: bolaData.oylik_toliv,
        balans: bolaData.balans,
        ota_fish: bolaData.ota_fish,
        ota_phone: bolaData.ota_phone,
        ota_pasport: bolaData.ota_pasport,
        ona_fish: bolaData.ona_fish,
        ona_phone: bolaData.ona_phone,
        ona_pasport: bolaData.ona_pasport,
        qoshimcha_phone: bolaData.qoshimcha_phone,
        address: bolaData.address,
        description: bolaData.description,
      };

      await axios.post(`${url}/bola`, sendData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await axios.put(
        `${url}/bola_prp/${bolaData.id}`,
        {
          username: bolaData.username,
          metrka: bolaData.metrka,
          guruh_id: bolaData.guruh_id_raw,
          holati: 'qabul_qilindi',
          tugilgan_kun: bolaData.tugilgan_kun,
          oylik_toliv: bolaData.oylik_toliv,
          balans: bolaData.balans,
          ota_fish: bolaData.ota_fish,
          ota_phone: bolaData.ota_phone,
          ota_pasport: bolaData.ota_pasport,
          ona_fish: bolaData.ona_fish,
          ona_phone: bolaData.ona_phone,
          ona_pasport: bolaData.ona_pasport,
          qoshimcha_phone: bolaData.qoshimcha_phone,
          address: bolaData.address,
          description: bolaData.description,
          is_active: false,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Ma'lumot muvaffaqiyatli /bola API'siga yuborildi va holat yangilandi!");
      fetchData(token, type === '3' ? JSON.parse(localStorage.getItem('admin'))?.id : null, localStorage.getItem('type'));
    } catch (error) {
      console.error('Bola APIga yuborishda xatolik:', error);
      if (error.response?.status === 403 && error.config?.url.includes('bola_kun_prp')) {
        setErrorMessage('Bunday amalni bajarib bo‘lmaydi');
      } else {
        setErrorMessage("Xatolik yuz berdi: Ma'lumotni yuborishda muammo!");
      }
    }
  };

  const handleToggleActive = async (id, currentValue) => {
    if (!permissions.edit_prp) {
      setErrorMessage(t('noEditStudentPermission'));
      return;
    }
    try {
      const token = localStorage.getItem('token') ? localStorage.getItem('token') : null;
      if (!token) {
        router.push('/');
        return;
      }
      await axios.put(
        `${url}/bola_prp/${id}/toggle-active`,
        { is_active: !currentValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData(token, type === '3' ? JSON.parse(localStorage.getItem('admin'))?.id : null, localStorage.getItem('type'));
    } catch (error) {
      console.error('is_active yangilashda xatolik:', error);
      if (error.response?.status === 403 && error.config?.url.includes('bola_kun_prp')) {
        setErrorMessage('Bunday amalni bajarib bo‘lmaydi');
      } else {
        setErrorMessage(t('statusUpdateError'));
      }
    }
  };

  const handleUpdate = async (updatedData) => {
    if (!permissions.edit_prp) {
      throw new Error(t('noEditStudentPermission'));
    }
    const token = localStorage.getItem('token') ? localStorage.getItem('token') : null;
    if (!token) {
      throw new Error(t('tokenNotFound'));
    }
    await axios.put(`${url}/bola_prp/${updatedData.id}`, updatedData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const handleCreate = async (newData) => {
    if (!permissions.create_prp) {
      throw new Error(t('noCreateStudentPermission'));
    }
    const token = localStorage.getItem('token') ? localStorage.getItem('token') : null;
    if (!token) {
      throw new Error(t('tokenNotFound'));
    }
    await axios.post(`${url}/bola_prp`, newData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const handleDelete = async (id) => {
    if (!permissions.delete_prp) {
      setErrorMessage(t('noDeleteStudentPermission'));
      return;
    }
    if (confirm(t('confirmDeleteGeneric'))) {
      try {
        const token = localStorage.getItem('token') ? localStorage.getItem('token') : null;
        const type = localStorage.getItem('type') ? localStorage.getItem('type'): null;
        if (!token) {
          router.push('/');


          return;
        }
        await axios.delete(`${url}/bola_prp/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchData(token, type === '3' ? JSON.parse(localStorage.getItem('admin'))?.id : null, type);
      } catch (err) {
        console.error('O‘chirishda xatolik:', err);
        if (err.response?.status === 403 && err.config?.url.includes('bola_kun_prp')) {
          setErrorMessage('Bunday amalni bajarib bo‘lmaydi');
        } else {
          setErrorMessage("O‘chirishda xatolik yuz berdi!");
        }
      }
    }
  };

  const handleSave = async (formData) => {
    try {
      if (formData.id) {
        await handleUpdate(formData);
      } else {
        await handleCreate(formData);
      }
      const token = localStorage.getItem('token') ? localStorage.getItem('token') : null;
      const type = localStorage.getItem('type') ? localStorage.getItem('type'): null;
      const adminId = type === '3' && typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('admin'))?.id : null;
      if (token) {
        fetchData(token, adminId, type);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Saqlashda xatolik:', err);
      setErrorMessage(err.message || t('saveError'));
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const type = localStorage.getItem('type');
      const adminStr = localStorage.getItem('admin');
      if (!token || !adminStr) {
        router.push('/');
        return;
      }
      try {
        const admin = JSON.parse(adminStr);
        const adminId = type === '3' ? admin.id : null;
        fetchData(token, adminId, type);
      } catch (error) {
        console.error('Admin data parsing error:', error);
        router.push('/');
      }
    }
  }, []);

  const filteredData = data.filter((b) => {
    const groupMatch = selectedGroup ? b.guruh_id_raw === Number(selectedGroup) : true;
    const holatiMatch = selectedHolati ? b.holati === selectedHolati : true;
    const date = new Date(b.created_at);
    const monthMatch = selectedMonth ? date.getMonth() + 1 === Number(selectedMonth) : true;
    const yearMatch = selectedYear ? date.getFullYear() === Number(selectedYear) : true;
    const term = searchTerm.toLowerCase();
    const searchMatch = [
      b.username,
      b.metrka,
      b.holati,
      b.ota_fish,
      b.ota_pasport,
      b.ota_phone,
      b.ona_fish,
      b.ona_pasport,
      b.ona_phone,
      b.qoshimcha_phone,
      b.address,
    ].some((field) => field?.toLowerCase().includes(term));

    return groupMatch && holatiMatch && searchMatch && monthMatch && yearMatch;
  });

  const holatStats = {
    boshlangich: data.filter((b) => b.holati === 'boshlangich').length,
    qabul_qilindi: data.filter((b) => b.holati === 'qabul_qilindi').length,
    kelmay_qoydi: data.filter((b) => b.holati === 'kelmay_qoydi').length,
  };

  const columnTitles = {
    username: t('colFullName'),
    metrka: t('colMetrka'),
    is_active: t('colActiveStatus'),
    holati: t('colStatus'),
    guruh_id: t('colGroup'),
    tugilgan_kun: t('colBirthDate'),
    oylik_toliv: t('colMonthlyFee'),
    balans: t('colBalance'),
    ota_fish: t('colFatherName'),
    ota_phone: t('colFatherPhone'),
    ota_pasport: t('colFatherPassport'),
    ona_fish: t('colMotherName'),
    ona_phone: t('colMotherPhone'),
    ona_pasport: t('colMotherPassport'),
    qoshimcha_phone: t('colExtraPhone'),
    address: t('colAddress'),
    description: t('colComment'),
    created_at: t('colCreatedDate'),
    updated_at: t('colUpdatedDate'),
    actions: t('colActions'),
  };

  return (
    <LayoutComponent>
      {isSuperAdmin || permissions.view_prp ? (
        <>
          <AdminHeader
            title={t('students')}
            onCreate={
              permissions.create_prp
                ? () => {
                    setShowModal(true);
                    setSelectedBola(null);
                  }
                : null
            }
            canCreate={permissions.create_prp}
          />

          {/* FILTERLAR */}
          {permissions.view_prp && (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
                <label style={{ marginBottom: '6px', fontWeight: '600', color: '#555' }}>
                  Oy bo‘yicha filter:
                </label>
                <input
                  type="month"
                  onChange={(e) => {
                    const [y, m] = e.target.value.split('-');
                    setSelectedMonth(m);
                    setSelectedYear(y);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #ccc',
                    fontSize: '16px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
                <label style={{ marginBottom: '6px', fontWeight: '600', color: '#555' }}>
                  Holat bo‘yicha filter:
                </label>
                <select
                  value={selectedHolati}
                  onChange={(e) => setSelectedHolati(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #ccc',
                    fontSize: '16px',
                  }}
                >
                  <option value="">{t('all')}</option>
                  <option value="boshlangich">Boshlang‘ich</option>
                  <option value="qabul_qilindi">Qabul qilindi</option>
                  <option value="kelmay_qoydi">Kelmay qo‘ydi</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
                <label style={{ marginBottom: '6px', fontWeight: '600', color: '#555' }}>
                  Guruh bo‘yicha filter:
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #ccc',
                    fontSize: '16px',
                  }}
                >
                  <option value="">{t('all')}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: '250px' }}>
                <label style={{ marginBottom: '6px', fontWeight: '600', color: '#555' }}>
                  Qidiruv (F.I.Sh, metirka, ota/ona ismi, manzil...)
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('enterTextPlaceholder')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #ccc',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.3s',
                  }}
                />
              </div>
            </div>
          )}

          {/* STATISTIKA */}
          {permissions.view_prp && (
            <div style={{ marginBottom: '15px', fontWeight: '600' }}>
              Statistika:
              <span style={{ marginLeft: '15px' }}>Boshlang‘ich: {holatStats.boshlangich}</span>
              <span style={{ marginLeft: '15px' }}>Qabul qilindi: {holatStats.qabul_qilindi}</span>
              <span style={{ marginLeft: '15px' }}>Kelmay qo‘ydi: {holatStats.kelmay_qoydi}</span>
            </div>
          )}

          {permissions.view_prp && (
            <div style={{ paddingBottom: '10px', fontWeight: '600', color: '#444' }}>
              Natijada: <span style={{ color: '#0070f3' }}>{filteredData.length}</span> ta tarbiyalanuvchi
              ko‘rsatildi.
            </div>
          )}

          {loading ? (
            <Loader />
          ) : permissions.view_prp ? (
            <AdminTable
              title=""
              columns={[...Object.keys(columnTitles)]}
              columnTitles={columnTitles}
              data={filteredData}
              onEdit={
                permissions.edit_prp
                  ? (row) => {
                      setSelectedBola(row);
                      setShowModal(true);
                    }
                  : null
              }
              onDelete={permissions.delete_prp ? (id) => handleDelete(id) : null}
              customRenderers={{
                is_active: permissions.edit_prp
                  ? (row) => (
                      <input
                        type="checkbox"
                        checked={row.is_active}
                        onChange={() => handleToggleActive(row.id, row.is_active)}
                      />
                    )
                  : (row) => (row.is_active ? t('activeLabel') : t('inactiveLabel')),
                actions: permissions.edit_prp
                  ? (row) => (
                      <button
                        onClick={() => handleSendToBola(row)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Bola APIga yuborish
                      </button>
                    )
                  : null,
              }}
              permissions={{
                view1: permissions.view_prp,
                edit1: permissions.edit_prp,
                delete1: permissions.delete_prp,
              }}
            />
          ) : (
            <p style={{ padding: '20px', color: 'red' }}>
              Sizda tarbiyalanuvchilarni ko‘rish uchun ruxsat yo‘q!
            </p>
          )}

          {showModal && (permissions.create_prp || permissions.edit_prp) && (
            <BolaModal
              bola={selectedBola}
              onClose={() => setShowModal(false)}
              onSave={handleSave}
              guruhlar={groups}
            />
          )}

          <ErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />
        </>
      ) : (
        <p style={{ padding: '20px', color: 'red' }}>
          Sizda tarbiyalanuvchilarni ko‘rish uchun ruxsat yo‘q!
        </p>
      )}
    </LayoutComponent>
  );
}