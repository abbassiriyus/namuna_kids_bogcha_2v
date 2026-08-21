'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import LayoutComponent from '../../components/LayoutComponent';
import AdminTable from '../../components/AdminTable';
import AdminHeader from '../../components/AdminHeader';
import ErrorModal from '../../components/ErrorModal';
import url from '../../host/host';

export default function Lavozimlar() {
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
        setErrorMsg('Ma\'lumotlarni yuklashda xatolik yuz berdi!');
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
      setErrorMsg("Sizda lavozimni yaratish uchun ruxsat yo‘q!");
      return;
    }
    if (!permissions.edit_positions && editId) {
      setErrorMsg("Sizda lavozimni tahrirlash uchun ruxsat yo‘q!");
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
      setErrorMsg('Saqlashda xatolik yuz berdi!');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleEdit = (item) => {
    if (!permissions.edit_positions) {
      setErrorMsg("Sizda lavozimni tahrirlash uchun ruxsat yo‘q!");
      return;
    }
    setForm(item);
    setEditId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!permissions.delete_positions) {
      setErrorMsg("Sizda lavozimni o‘chirish uchun ruxsat yo‘q!");
      return;
    }
    if (confirm("Haqiqatan ham bu tarbiyalanuvchini o‘chirmoqchimisiz? Bu amaliyot yomon oqibatlarga olib kelishi mumkin!")) {
      try {
        await axios.delete(`${url}/lavozim/${id}`, authHeader);
        await fetchData();
      } catch (err) {
        console.error('O‘chirishda xatolik:', err);
        setErrorMsg('Lavozimni o‘chirishda xatolik yuz berdi!');
      }
    }
  };

  const columnTitles = {
    id: 'ID',
    name: 'Lavozim nomi',
    created_at: 'Yaratilgan',
    updated_at: 'Yangilangan',
  };

  return (
    <LayoutComponent>
      {typeof window !== 'undefined' && localStorage.getItem('type') == '1' || permissions.view_positions ? (
        <>
          <AdminHeader
            title="Lavozimlar"
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
            <p style={{ padding: '10px' }}>Yuklanmoqda...</p>
          ) : (
            <AdminTable
              title="Lavozimlar ro'yxati"
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
                <h3>{editId ? 'Tahrirlash' : 'Yangi lavozim'}</h3>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Lavozim nomi"
                  style={{ width: '92%', padding: '8px', marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    onClick={handleSubmit}
                    disabled={btnLoading}
                    style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}
                  >
                    {btnLoading ? 'Saqlanmoqda...' : 'Saqlash'}
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