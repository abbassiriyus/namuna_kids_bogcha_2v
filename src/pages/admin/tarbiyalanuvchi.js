'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import LayoutComponent from '../../components/LayoutComponent';
import AdminTable from '../../components/AdminTableTarbiyachi';
import url from '../../host/host';
import BolaModal from '../../components/BolaModal.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import BolaPaymentModal from '../../components/BolaPaymentModal';
import styles from '../../styles/Tarbiyalanuvchilar.module.css'; // Assuming a CSS module

export default function Tarbiyalanuvchilar() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBola, setSelectedBola] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentBola, setSelectedPaymentBola] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [permissions, setPermissions] = useState({
    view_students: false,
    create_students: false,
    edit_students: false,
    delete_students: false,
    view_groups: false,
    view_payments: false,
    create_payments: false,
    edit_payments: false,
    delete_payments: false,
  });
  const [canView, setCanView] = useState(false);

  // Consolidated client-side data fetching
  const getClientData = () => ({
    token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
    type: typeof window !== 'undefined' ? localStorage.getItem('type') : null,
    adminId:
      typeof window !== 'undefined' && localStorage.getItem('type') === '3'
        ? JSON.parse(localStorage.getItem('admin') || '{}')?.id || null
        : null,
  });

  const { token, type, adminId } = getClientData();
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = async (token, adminId, type) => {
    if (!token) {
      setErrorMessage('Tizimga kirish uchun token topilmadi!');
      router.push('/login');
      return;
    }

    try {
      setLoading(true);
      let permissionsData = {
        view_students: true,
        create_students: true,
        edit_students: true,
        delete_students: true,
        view_groups: true,
        view_payments: true,
        create_payments: true,
        edit_payments: true,
        delete_payments: true,
      };

      const apiCalls = [
        axios.get(`${url}/bola/all/`, authHeader),
        axios.get(`${url}/guruh`, authHeader),
      ];

      if (type === '3' && adminId) {
        apiCalls.push(axios.get(`${url}/permissions/${adminId}`, authHeader));
      }

      const [bolaRes, guruhRes, permissionsRes] = await Promise.all(apiCalls);

      if (type === '3' && permissionsRes) {
        permissionsData = permissionsRes.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);
      setCanView(type === '1' || permissionsData.view_students);

      const guruhMap = {};
      guruhRes.data.forEach((g) => {
        guruhMap[g.id] = g.name;
      });

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
      console.error('Ma\'lumotlarni olishda xatolik:', {
        message: error.message,
        status: error.response?.status,
      });
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        setErrorMessage('Sessiya tugadi. Iltimos, qayta kiring.');
        router.push('/login');
      } else {
        setErrorMessage('Ma\'lumotlarni yuklashda xatolik yuz berdi: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id, currentValue) => {
    if (!permissions.edit_students) {
      setErrorMessage("Sizda tarbiyalanuvchi holatini o'zgartirish uchun ruxsat yo'q!");
      return;
    }
    try {
      setLoading(true);
      await axios.put(
        `${url}/bola/${id}/toggle-active`,
        { is_active: !currentValue },
        authHeader
      );
      await fetchData(token, adminId, type);
    } catch (error) {
      console.error('is_active yangilashda xatolik:', error.message);
      setErrorMessage('Holatni yangilashda xatolik yuz berdi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedData) => {
    if (!permissions.edit_students) {
      throw new Error("Sizda tarbiyalanuvchi ma'lumotlarini yangilash uchun ruxsat yo'q!");
    }
    if (!token) {
      throw new Error('Token topilmadi!');
    }
    await axios.put(`${url}/bola/${updatedData.id}`, updatedData, authHeader);
  };

  const handleCreate = async (newData) => {
    if (!permissions.create_students) {
      throw new Error("Sizda tarbiyalanuvchi yaratish uchun ruxsat yo'q!");
    }
    if (!token) {
      throw new Error('Token topilmadi!');
    }
    await axios.post(`${url}/bola`, newData, authHeader);
  };

  const handleDelete = async (id) => {
    if (!permissions.delete_students) {
      setErrorMessage("Sizda tarbiyalanuvchi o'chirish uchun ruxsat yo'q!");
      return;
    }
    if (!confirm("Haqiqatan ham bu tarbiyalanuvchini o‘chirmoqchimisiz? Bu amaliyot yomon oqibatlarga olib kelishi mumkin!")) {
      return;
    }
    try {
      setLoading(true);
      await axios.delete(`${url}/bola/${id}`, authHeader);
      await fetchData(token, adminId, type);
    } catch (err) {
      console.error('O‘chirishda xatolik:', err.message);
      setErrorMessage('Tarbiyalanuvchini o‘chirishda xatolik yuz berdi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData) => {
    if (!formData.username || !formData.guruh_id) {
      setErrorMessage('F.I.Sh va guruh maydonlari to‘ldirilishi shart!');
      return;
    }
    try {
      setLoading(true);
      if (formData.id) {
        await handleUpdate(formData);
      } else {
        await handleCreate(formData);
      }
      await fetchData(token, adminId, type);
      setShowModal(false);
    } catch (err) {
      console.error('Saqlashda xatolik:', err.message);
      setErrorMessage('Saqlashda xatolik yuz berdi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!token) {
        setErrorMessage('Tizimga kirish uchun token topilmadi!');
        router.push('/login');
        return;
      }
      try {
        fetchData(token, adminId, type);
      } catch (error) {
        console.error('Admin data parsing error:', error);
        setErrorMessage('Ma\'lumotlarni yuklashda xatolik: ' + error.message);
        router.push('/login');
      }
    }
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((b) => {
      const groupMatch = selectedGroup ? b.guruh_id_raw === Number(selectedGroup) : true;
      const activeMatch = isActiveFilter !== '' ? String(b.is_active) === isActiveFilter : true;
      const term = searchTerm.toLowerCase();

      const searchMatch = [
        b.username,
        b.metrka,
        b.ota_fish,
        b.ota_pasport,
        b.ota_phone,
        b.ona_fish,
        b.ona_pasport,
        b.ona_phone,
        b.qoshimcha_phone,
        b.address,
      ].some((field) => field?.toLowerCase().includes(term));

      return groupMatch && searchMatch && activeMatch;
    });
  }, [data, selectedGroup, isActiveFilter, searchTerm]);

  const columnTitles = {
    username: 'F.I.Sh',
    metrka: 'Metirka raqami',
    is_active: 'Holati (aktiv)',
    guruh_id: 'Guruh',
    tugilgan_kun: 'Tug‘ilgan sanasi',
    oylik_toliv: 'Oylik to‘lov',
    balans: 'Balans',
    holati: 'Holati',
    ota_fish: 'Ota F.I.Sh',
    ota_phone: 'Ota tel',
    ota_pasport: 'Ota pasport',
    ona_fish: 'Ona F.I.Sh',
    ona_phone: 'Ona tel',
    ona_pasport: 'Ona pasport',
    qoshimcha_phone: 'Qo‘shimcha tel',
    address: 'Manzil',
    description: 'Izoh',
    created_at: 'Yaratilgan vaqti',
    updated_at: 'Yangilangan vaqti',
  };

  return (
    <LayoutComponent>
      {loading ? (
        <div className={styles.loading}>Yuklanmoqda...</div>
      ) : canView ? (
        <>
          <AdminHeader
            title="Tarbiyalanuvchilar"
            onCreate={
              permissions.create_students
                ? () => {
                    setSelectedBola(null);
                    setShowModal(true);
                  }
                : null
            }
            canCreate={permissions.create_students}
          />

          {permissions.view_students && (
            <div className={styles.filterContainer}>
              <div className={styles.filterGroup}>
                <label>Guruh bo‘yicha filter:</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  <option value="">Barchasi</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Holat bo‘yicha filter:</label>
                <select
                  value={isActiveFilter}
                  onChange={(e) => setIsActiveFilter(e.target.value)}
                >
                  <option value="">Barchasi</option>
                  <option value="true">Aktiv</option>
                  <option value="false">Faol emas</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Qidiruv (F.I.Sh, metirka, ota/ona ismi, manzil...)</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Matn kiriting..."
                />
              </div>
            </div>
          )}

          <div className={styles.resultCount}>
            Natijada: <span>{filteredData.length}</span> ta tarbiyalanuvchi ko‘rsatildi.
          </div>

          <AdminTable
            title=""
            columns={Object.keys(columnTitles)}
            columnTitles={columnTitles}
            data={filteredData}
            onEdit={
              permissions.edit_students
                ? (row) => {
                    setSelectedBola(row);
                    setShowModal(true);
                  }
                : null
            }
            onDelete={permissions.delete_students ? handleDelete : null}
            customRenderers={{
              is_active: permissions.edit_students
                ? (row) => (
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={() => handleToggleActive(row.id, row.is_active)}
                    />
                  )
                : (row) => (row.is_active ? 'Aktiv' : 'Faol emas'),
            }}
            customActions={{
              '💰': permissions.view_payments
                ? (row) => {
                    setSelectedPaymentBola(row);
                    setPaymentModalOpen(true);
                  }
                : null,
            }}
            permissions={permissions}
          />

          {showModal && (permissions.create_students || permissions.edit_students) && (
            <BolaModal
              bola={selectedBola}
              onClose={() => setShowModal(false)}
              onSave={handleSave}
              guruhlar={groups}
            />
          )}

          {paymentModalOpen && selectedPaymentBola && permissions.view_payments && (
            <BolaPaymentModal
              bola={selectedPaymentBola}
              onClose={() => {
                setSelectedPaymentBola(null);
                setPaymentModalOpen(false);
              }}
            />
          )}

          {errorMessage && (
            <div className={styles.errorMessage}>{errorMessage}</div>
          )}
        </>
      ) : (
        <div className={styles.errorMessage}>
          Sizda tarbiyalanuvchilarni ko‘rish uchun ruxsat yo‘q!
        </div>
      )}
    </LayoutComponent>
  );
}