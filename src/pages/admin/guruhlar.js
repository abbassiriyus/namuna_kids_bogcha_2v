'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import url from '../../host/host';
import LayoutComponent from '../../components/LayoutComponent';
import AdminTable from '../../components/AdminTable';
import GuruhModal from '../../components/GuruhModal';
import AdminHeader from '../../components/AdminHeader';
import ErrorModal from '../../components/ErrorModal';

export default function GuruhlarPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [xodimlar, setXodimlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuruh, setSelectedGuruh] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedXodimId, setSelectedXodimId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [permissions, setPermissions] = useState({
    view_groups: false,
    create_groups: false,
    edit_groups: false,
    delete_groups: false,
  });

  const fetchData = async () => {
    const token = localStorage.getItem('token') ? localStorage.getItem('token') : null;
    const type = localStorage.getItem('type') ? localStorage.getItem('type'): null;
    const adminId = type === '3' && typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('admin'))?.id : null;

    if (!token) {
      router.push('/');
      return;
    }

    try {
      setLoading(true);
      let permissionsData = {
        view_groups: true,
        create_groups: true,
        edit_groups: true,
        delete_groups: true,
      };

      const apiCalls = [
        axios.get(`${url}/guruh`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${url}/xodim`, { headers: { Authorization: `Bearer ${token}` } }),
      ];

      if (type === '3') {
        apiCalls.push(
          axios.get(`${url}/permissions/${adminId}`, { headers: { Authorization: `Bearer ${token}` } })
        );
      }

      const [guruhRes, xodimRes, permissionsRes] = await Promise.all(apiCalls);

      // Set permissions
      if (type === '3') {
        permissionsData = permissionsRes?.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);

      // Xodimlar ro‘yxatini saqlab qo‘yamiz
      setXodimlar(xodimRes.data);

      // Guruhlarni tartiblash va xodim ismini qo‘shish
      const updatedData = guruhRes.data.map((g) => {
        const xodim = xodimRes.data.find((x) => Number(x.id) === Number(g.xodim_id));
        return {
          ...g,
          xodim_id_raw: g.xodim_id,
          xodim_id: xodim ? xodim.name : '',
        };
      });

      updatedData.sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'uz', { sensitivity: 'base' })
      );

      setData(updatedData);
    } catch (err) {
      console.error('Xatolik:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.push('/');
      } else {
        setErrorMessage('Ma\'lumotlarni yuklashda xatolik yuz berdi!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (newData) => {
    if (!permissions.create_groups) {
      setErrorMessage("Sizda guruh yaratish uchun ruxsat yo'q!");
      return;
    }
    try {
      const token = localStorage.getItem('token') ? localStorage.getItem('token') : null;
      if (!token) {
        router.push('/');
        return;
      }
      await axios.post(`${url}/guruh`, newData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      console.error('Yaratishda xatolik:', err);
      setErrorMessage('Guruh yaratishda xatolik yuz berdi!');
    }
  };

  const handleUpdate = async (updatedData) => {
    if (!permissions.edit_groups) {
      setErrorMessage("Sizda guruh ma'lumotlarini yangilash uchun ruxsat yo'q!");
      return;
    }
    try {
      const token = localStorage.getItem('token') ? localStorage.getItem('token') : null;
      if (!token) {
        router.push('/');
        return;
      }
      await axios.put(`${url}/guruh/${updatedData.id}`, updatedData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      console.error('Yangilashda xatolik:', err);
      setErrorMessage('Guruh yangilashda xatolik yuz berdi!');
    }
  };

  const handleDelete = async (id) => {
    if (!permissions.delete_groups) {
      setErrorMessage("Sizda guruh o'chirish uchun ruxsat yo'q!");
      return;
    }
    if (confirm('Haqiqatan ham bu tarbiyalanuvchini o‘chirmoqchimisiz? Bu amaliyot yomon oqibatlarga olib kelishi mumkin!')) {
      try {
        const token = localStorage.getItem('token') ? localStorage.getItem('token') : null;
        if (!token) {
          router.push('/');
          return;
        }
        await axios.delete(`${url}/guruh/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchData();
      } catch (err) {
        console.error('O‘chirishda xatolik:', err);
        setErrorMessage('Guruh o‘chirishda xatolik yuz berdi!');
      }
    }
  };

  const handleSave = (formData) => {
    try {
      if (formData.id) {
        handleUpdate(formData);
      } else {
        handleCreate(formData);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Saqlashda xatolik:', err);
      setErrorMessage(err.message || 'Saqlashda xatolik yuz berdi!');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }
      fetchData();
    }
  }, []);

  const columnTitles = {
    name: 'Guruh nomi',
    xodim_id: 'Tarbiya beruvchi',
    created_at: 'Yaratilgan',
    updated_at: 'Yangilangan',
    actions: 'Amallar',
  };

  const filteredData = data.filter((g) => {
    const textMatch =
      g.name.toLowerCase().includes(searchText.toLowerCase()) ||
      g.xodim_id.toLowerCase().includes(searchText.toLowerCase());

    const xodimMatch = selectedXodimId ? g.xodim_id_raw == selectedXodimId : true;

    return textMatch && xodimMatch;
  });

  return (
    <LayoutComponent>
      {typeof window !== 'undefined' && localStorage.getItem('type') == '1' || permissions.view_groups ? (
        <>
          <AdminHeader
            title="Guruhlar"
            onCreate={
              permissions.create_groups
                ? () => {
                    setSelectedGuruh(null);
                    setShowModal(true);
                  }
                : null
            }
            canCreate={permissions.create_groups}
          />

          {/* Filtr input va select */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', maxWidth: '600px' }}>
            <input
              type="text"
              placeholder="Guruh nomi yoki tarbiya beruvchi bo‘yicha qidiruv..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid #ccc',
                fontSize: '16px',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'border-color 0.3s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#0070f3')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#ccc')}
            />

            <select
              value={selectedXodimId}
              onChange={(e) => setSelectedXodimId(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid #ccc',
                fontSize: '16px',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'border-color 0.3s',
                minWidth: '200px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#0070f3')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#ccc')}
            >
              <option value="">Barchasi (Tarbiya beruvchi)</option>
              {xodimlar.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p style={{ padding: '10px', fontSize: '18px', color: '#555' }}>Yuklanmoqda...</p>
          ) : (
            <>
              <AdminTable
                title="Guruhlar ro‘yxati"
                columns={Object.keys(columnTitles)}
                columnTitles={columnTitles}
                data={filteredData}
                onEdit={
                  permissions.edit_groups
                    ? (row) => {
                        setSelectedGuruh(row);
                        setShowModal(true);
                      }
                    : null
                }
                onDelete={permissions.delete_groups ? (id) => handleDelete(id) : null}
                permissions={{
                  view1: permissions.view_groups,
                  edit1: permissions.edit_groups,
                  delete1: permissions.delete_groups,
                }}
              />
              {filteredData.length === 0 && (
                <p style={{ marginTop: '20px', color: '#999', fontStyle: 'italic' }}>
                  Hech qanday guruh topilmadi.
                </p>
              )}
            </>
          )}

          {showModal && (permissions.create_groups || permissions.edit_groups) && (
            <GuruhModal
              guruh={selectedGuruh}
              onClose={() => setShowModal(false)}
              onSave={handleSave}
              xodimlar={xodimlar}
            />
          )}

          <ErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />
        </>
      ) : (
        <p style={{ padding: '20px', color: 'red' }}>
          Sizda guruhlarni ko‘rish uchun ruxsat yo‘q!
        </p>
      )}
    </LayoutComponent>
  );
}