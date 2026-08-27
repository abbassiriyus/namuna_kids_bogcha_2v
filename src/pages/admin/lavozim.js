'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import LayoutComponent from '../../components/LayoutComponent';
import AdminTable from '../../components/AdminTable';
import AdminHeader from '../../components/AdminHeader';
import ErrorModal from '../../components/ErrorModal';
import Loader from '../../components/Loader';
import url from '../../host/host';
import { useLang } from '../../i18n/LanguageContext';
import { useUserType } from '../../utils/useUserType';

export default function Lavozimlar() {
  const { t } = useLang();
  // localStorage render paytida o'qilsa hydration xatosi beradi — hook mount'dan keyin o'qiydi.
  const { isSuperAdmin } = useUserType();
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '' });
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [permissions, setPermissions] = useState({
    view_positions: false,
    create_positions: false,
    edit_positions: false,
    delete_positions: false,
  });

  const token = (typeof window !== "undefined")  ? localStorage.getItem('token') : null;
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = async () => {
    if (!token) {
      router.push('/');
      return;
    }

    setLoading(true);
    try {
      const type = localStorage.getItem('type') ? localStorage.getItem('type'): null;
      const adminId = type === '3' && typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('admin'))?.id : null;

      let permissionsData = {
        view_positions: true,
        create_positions: true,
        edit_positions: true,
        delete_positions: true,
      };

      const apiCalls = [
        axios.get(`${url}/lavozim`, authHeader),
      ];

      if (type == '3') {
        apiCalls.push(
          axios.get(`${url}/permissions/${adminId}`, { headers: { Authorization: `Bearer ${token}` } })
        );
      }

      const [lavozimRes, permissionsRes] = await Promise.all(apiCalls);

      // Set permissions
      if (type === '3') {
        permissionsData = permissionsRes?.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);

      setData(lavozimRes.data);
    } catch (err) {
      console.error('Xatolik:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.push('/');
      } else {
        setErrorMsg(t('loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!permissions.create_positions && !editId) {
      setErrorMsg(t('noCreatePositionPermission'));
      return;
    }
    if (!permissions.edit_positions && editId) {
      setErrorMsg(t('noEditPositionPermission'));
      return;
    }
    setBtnLoading(true);
    try {
      if (editId) {
        await axios.put(`${url}/lavozim/${editId}`, form, authHeader);
      } else {
        await axios.post(`${url}/lavozim`, form, authHeader);
      }
      setForm({ name: '' });
      setEditId(null);
      setShowModal(false);
      await fetchData();
    } catch (err) {
      console.error('Yozishda xatolik:', err);
      setErrorMsg(t('saveError'));
    } finally {
      setBtnLoading(false);
    }
  };

  const handleEdit = (item) => {
    if (!permissions.edit_positions) {
      setErrorMsg(t('noEditPositionPermission'));
      return;
    }
    setForm(item);
    setEditId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!permissions.delete_positions) {
      setErrorMsg(t('noDeletePositionPermission'));
      return;
    }
    if (confirm(t('confirmDeleteGeneric'))) {
      try {
        await axios.delete(`${url}/lavozim/${id}`, authHeader);
        await fetchData();
      } catch (err) {
        console.error('O‘chirishda xatolik:', err);
        setErrorMsg(t('positionDeleteError'));
      }
    }
  };

  const columnTitles = {
    id: t('colId'),
    name: t('colPositionName'),
    created_at: t('colCreatedAt'),
    updated_at: t('colUpdatedAt'),
  };

  return (
    <LayoutComponent>
      {isSuperAdmin || permissions.view_positions ? (
        <>
          <AdminHeader
            title={t('positions')}
            onCreate={
              permissions.create_positions
                ? () => {
                    setForm({ name: '' });
                    setEditId(null);
                    setShowModal(true);
                  }
                : null
            }
            canCreate={permissions.create_positions}
          />

          {loading ? (
            <Loader />
          ) : (
            <AdminTable
              title={t('positionsList')}
              columns={Object.keys(columnTitles)}
              columnTitles={columnTitles}
              data={data}
              onEdit={permissions.edit_positions? handleEdit : null}
              onDelete={permissions.delete_positions ? handleDelete : null}
              permissions={{
                view1: permissions.view_positions,
                edit1: permissions.edit_positions,
                delete1: permissions.delete_positions,
              }}
            />
          )}

          {showModal && (permissions.create_positions || permissions.edit_positions) && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '10px', width: '300px' }}>
                <h3>{editId ? t('edit') : t('newPosition')}</h3>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder={t('positionNamePlaceholder')}
                  style={{ width: '92%', padding: '8px', marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    onClick={handleSubmit}
                    disabled={btnLoading}
                    style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}
                  >
                    {btnLoading ? t('saving') : t('save')}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{ padding: '10px', background: '#f44336', color: 'white', border: 'none', borderRadius: '5px' }}
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            </div>
          )}

          <ErrorModal message={errorMsg} onClose={() => setErrorMsg('')} />
        </>
      ) : (
        <p style={{ padding: '20px', color: 'red' }}>
          Sizda lavozimlarni ko‘rish uchun ruxsat yo‘q!
        </p>
      )}
    </LayoutComponent>
  );
}