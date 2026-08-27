'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import LayoutComponent from '../../components/LayoutComponent';
import AdminTable from '../../components/AdminTableTarbiyachi';
import url from '../../host/host';
import { useLang } from '../../i18n/LanguageContext';
import BolaModal from '../../components/BolaModal.jsx';
import AdminHeader from '../../components/AdminHeader.jsx';
import BolaPaymentModal from '../../components/BolaPaymentModal';
import Loader from '../../components/Loader';
import styles from '../../styles/Tarbiyalanuvchilar.module.css'; // Assuming a CSS module

export default function Tarbiyalanuvchilar() {
  const { t } = useLang();
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
      setErrorMessage(t('noTokenError'));
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
        setErrorMessage(t('sessionExpired'));
        router.push('/login');
      } else {
        setErrorMessage(t('loadError') + ': ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id, currentValue) => {
    if (!permissions.edit_students) {
      setErrorMessage(t('noEditStudentPermission'));
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
      setErrorMessage(t('statusUpdateError') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedData) => {
    if (!permissions.edit_students) {
      throw new Error(t('noEditStudentPermission'));
    }
    if (!token) {
      throw new Error(t('tokenNotFound'));
    }
    await axios.put(`${url}/bola/${updatedData.id}`, updatedData, authHeader);
  };

  const handleCreate = async (newData) => {
    if (!permissions.create_students) {
      throw new Error(t('noCreateStudentPermission'));
    }
    if (!token) {
      throw new Error(t('tokenNotFound'));
    }
    await axios.post(`${url}/bola`, newData, authHeader);
  };

  const handleDelete = async (id) => {
    if (!permissions.delete_students) {
      setErrorMessage(t('noDeleteStudentPermission'));
      return;
    }
    if (!confirm(t('confirmDeleteGeneric'))) {
      return;
    }
    try {
      setLoading(true);
      await axios.delete(`${url}/bola/${id}`, authHeader);
      await fetchData(token, adminId, type);
    } catch (err) {
      console.error('O‘chirishda xatolik:', err.message);
      setErrorMessage(t('deleteStudentError') + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData) => {
    if (!formData.username || !formData.guruh_id) {
      setErrorMessage(t('fillNameGroupFields'));
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
      setErrorMessage(t('saveError') + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!token) {
        setErrorMessage(t('noTokenError'));
        router.push('/login');
        return;
      }
      try {
        fetchData(token, adminId, type);
      } catch (error) {
        console.error('Admin data parsing error:', error);
        setErrorMessage(t('loadError') + ': ' + error.message);
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
    username: t('colFullName'),
    metrka: t('colMetrka'),
    is_active: t('colActiveStatus'),
    guruh_id: t('colGroup'),
    tugilgan_kun: t('colBirthDate'),
    oylik_toliv: t('colMonthlyFee'),
    balans: t('colBalance'),
    holati: t('colStatus'),
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
  };

  return (
    <LayoutComponent>
      {loading ? (
        <Loader />
      ) : canView ? (
        <>
          <AdminHeader
            title={t('students')}
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
                <label>{t('filterByGroup')}</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  <option value="">{t('all')}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>{t('filterByStatus')}</label>
                <select
                  value={isActiveFilter}
                  onChange={(e) => setIsActiveFilter(e.target.value)}
                >
                  <option value="">{t('all')}</option>
                  <option value="true">{t('activeLabel')}</option>
                  <option value="false">{t('inactiveLabel')}</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>{t('searchStudentsLabel')}</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('enterTextPlaceholder')}
                />
              </div>
            </div>
          )}

          <div className={styles.resultCount}>
            {t('resultsCountStudents').replace('{count}', filteredData.length)}
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
                : (row) => (row.is_active ? t('activeLabel') : t('inactiveLabel')),
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
          {t('noPermission')}
        </div>
      )}
    </LayoutComponent>
  );
}