'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { Settings, ScanFace } from 'lucide-react';
import LayoutComponent from '../../components/LayoutComponent';
import AdminTable from '../../components/AdminTable';
import AdminHeader from '../../components/AdminHeader';
import ErrorModal from '../../components/ErrorModal';
import FaceCaptureModal from '../../components/FaceCaptureModal';
import styles from '../../styles/hodimlar.module.css';
import url from '../../host/host';
import { useLang } from '../../i18n/LanguageContext';
import { toLocalDate } from '../../utils/sana';
import Loader from '../../components/Loader';

function getMonthDays(year, month) {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push({ date: new Date(date), checked: false });
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export default function Hodimlar() {
  const { t } = useLang();
  const router = useRouter();
  const [data, setData] = useState([]);
  const [lavozimlar, setLavozimlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    lavozim_id: '',
    address: '',
    oylik: '',
    ish_tur: '1',
    image: null,
    start_time: '08:00',
    end_time: '16:00',
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [settingsModal, setSettingsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [monthDays, setMonthDays] = useState([]);
  const [activeTab, setActiveTab] = useState('davomat');
  const [searchTerm, setSearchTerm] = useState('');
  const [faceEmployee, setFaceEmployee] = useState(null);
  const [permissions, setPermissions] = useState({
    view_employees: false,
    create_employees: false,
    edit_employees: false,
    delete_employees: false,
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = async () => {
    if (!token) {
      router.push('/');
      return;
    }

    setLoading(true);
    try {
      const type = localStorage.getItem('type') || null;
      const adminId = type === '3' && typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('admin'))?.id : null;

      let permissionsData = {
        view_employees: true,
        create_employees: true,
        edit_employees: true,
        delete_employees: true,
      };

      const apiCalls = [
        axios.get(`${url}/xodim`, authHeader),
        axios.get(`${url}/lavozim`, authHeader),
      ];

      if (type === '3') {
        apiCalls.push(
          axios.get(`${url}/permissions/${adminId}`, { headers: { Authorization: `Bearer ${token}` } })
        );
      }

      const responses = await Promise.all(apiCalls);

      const xodimRes = responses[0];
      const lavozimRes = responses[1];
      const permissionsRes = type === '3' ? responses[2] : null;

      if (type === '3') {
        permissionsData = permissionsRes?.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);

      setData(xodimRes.data);
      setLavozimlar(lavozimRes.data);
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
    const { name, value, type, files } = e.target;

    if (type === 'file' && name === 'image') {
      const file = files && files[0];
      if (file) {
        setForm((prev) => ({ ...prev, image: file }));
        setImagePreview(URL.createObjectURL(file));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!permissions.create_employees && !editId) {
      setErrorMsg(t('noCreateEmployeePermission'));
      return;
    }
    if (!permissions.edit_employees && editId) {
      setErrorMsg(t('noEditEmployeePermission'));
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      for (const key in form) {
        if (key === 'image') {
          if (form.image instanceof File) {
            formData.append('image', form.image);
          }
        } else {
          formData.append(key, form[key]);
        }
      }

      if (editId) {
        await axios.put(`${url}/xodim/${editId}`, formData, authHeader);
      } else {
        await axios.post(`${url}/xodim`, formData, authHeader);
      }

      await fetchData();
      setForm({
        name: '',
        phone: '',
        lavozim_id: '',
        address: '',
        oylik: '',
        ish_tur: '1',
        image: null,
        start_time: '08:00',
        end_time: '16:00',
      });
      setEditId(null);
      setShowModal(false);
      setImagePreview(null);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || t('errorOccurred'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    console.log('handleEdit chaqirildi:', item);
    if (!permissions.edit_employees) {
      setErrorMsg(t('noEditEmployeePermission'));
      return;
    }
    setForm({
      name: item.name || '',
      phone: item.phone || '',
      lavozim_id: item.lavozim_id || '',
      address: item.address || '',
      oylik: item.oylik || '',
      ish_tur: item.ish_tur === 1 ? '1' : '2',
      start_time: item.start_time || '08:00',
      end_time: item.end_time || '16:00',
      image: null,
    });
    setEditId(item.id);
    setImagePreview(item.image ? `${url}/upload/${item.image}` : null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!permissions.delete_employees) {
      setErrorMsg(t('noDeleteEmployeePermission'));
      return;
    }
    try {
      await axios.delete(`${url}/xodim/${id}`, authHeader);
      await fetchData();
    } catch (err) {
      console.error('O‘chirishda xatolik:', err);
      setErrorMsg(t('employeeDeleteError'));
    }
  };

  const loadWorkDays = async (employee, year, month) => {
    const days = getMonthDays(year, month - 1);
    try {
      const res = await axios.get(`${url}/xodim/${employee.id}/workday`, {
        params: { year, month },
        headers: { Authorization: `Bearer ${token}` },
      });

      const selectedDates = res.data;
      const updatedDays = days.map((day) => ({
        ...day,
        checked: selectedDates.includes(toLocalDate(day.date)),
      }));
      setMonthDays(updatedDays);
      setSelectedEmployee({ ...employee, year, month });
      setSettingsModal(true);
    } catch (err) {
      console.error("Ish kunlarini olishda xatolik:", err);
      setErrorMsg("Ish kunlarini olishda xatolik yuz berdi");
    }
  };

  const openSettingsModal = async (employee) => {
    if (employee.ish_tur !== 2) return;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    await loadWorkDays(employee, currentYear, currentMonth + 1);
  };

  const columnTitles = {
    id: t('colId'),
    name: t('colFullName'),
    phone: t('colPhone'),
    lavozim_nomi: t('colPosition'),
    address: t('colAddress'),
    oylik: t('colSalary'),
    ish_tur: t('colWorkType'),
    start_time: t('colStartTime'),
    end_time: t('colEndTime'),
    image: t('colImage'),
    face_action: t('colFace'),
    created_at: t('colCreatedAt'),
  };

  const customRenderers = {
    image: (row) =>
      row.image ? (
        <img
          src={`${url}/upload/${row.image}`}
          alt=""
          className={styles.tableImg}
          onClick={() => setFullscreenImage(`${url}/upload/${row.image}`)}
        />
      ) : '—',
    ish_tur: (row) =>
      row.ish_tur === 1 ? t('workTypeAttendance') : (
        <>
          {t('workTypeFree')}
          <button
            onClick={() => openSettingsModal(row)}
            style={{ marginLeft: '8px', cursor: 'pointer' }}
            title={t('settingsTitle')}
          >
            <Settings size={16} />
          </button>
        </>
      ),
    face_action: (row) => (
      <button
        onClick={() => setFaceEmployee(row)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
        title={t('saveFaceId')}
      >
        <ScanFace size={16} /> {row.face_descriptor ? 'Qayta olish' : 'Saqlash'}
      </button>
    ),
  };

  return (
    <LayoutComponent>
      {permissions.view_employees ? (
        <>
          <AdminHeader
            title={t('employees')}
            onCreate={
              permissions.create_employees
                ? () => {
                    setForm({
                      name: '',
                      phone: '',
                      lavozim_id: '',
                      address: '',
                      oylik: '',
                      ish_tur: '1',
                      image: null,
                      start_time: '08:00',
                      end_time: '16:00',
                    });
                    setEditId(null);
                    setImagePreview(null);
                    setShowModal(true);
                  }
                : null
            }
            canCreate={permissions.create_employees}
          />

          <div className={styles.tabContainer}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                className={activeTab === 'davomat' ? styles.activeTab : ''}
                onClick={() => setActiveTab('davomat')}
              >
                Davomat bilan
              </button>
              <button
                className={activeTab === 'erkin' ? styles.activeTab : ''}
                onClick={() => setActiveTab('erkin')}
              >
                Erkin ish
              </button>
            </div>
            <div className={styles.searchBox}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder={t('searchNameOrPhone')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {showModal && (permissions.create_employees || permissions.edit_employees) && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3>{editId ? t('editEmployee') : t('newEmployee')}</h3>
                <div className={styles.formGroup}>
                  <label>F.I.Sh</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Telefon</label>
                  <input type="text" name="phone" value={form.phone} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Lavozim</label>
                  <select name="lavozim_id" value={form.lavozim_id} onChange={handleChange}>
                    <option value="">{t('selectPlaceholder')}</option>
                    {lavozimlar.map((lavozim) => (
                      <option key={lavozim.id} value={lavozim.id}>{lavozim.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Manzil</label>
                  <input type="text" name="address" value={form.address} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Oylik</label>
                  <input type="number" name="oylik" value={form.oylik} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Ish turi</label>
                  <select name="ish_tur" value={form.ish_tur} onChange={handleChange}>
                    <option value="1">Davomat bilan</option>
                    <option value="2">Erkin ish</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Ish boshlanishi (start_time)</label>
                  <input
                    type="time"
                    name="start_time"
                    value={form.start_time}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Ish tugashi (end_time)</label>
                  <input
                    type="time"
                    name="end_time"
                    value={form.end_time}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Rasm</label>
                  <input type="file" name="image" accept="image/*" onChange={handleChange} />
                  {imagePreview && <img src={imagePreview} alt="Preview" className={styles.previewImg} />}
                </div>

                {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

                <div className={styles.modalButtons}>
                  <button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                  <button onClick={() => setShowModal(false)}>{t('cancel')}</button>
                </div>
              </div>
            </div>
          )}

          {settingsModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3>{selectedEmployee?.name} — ishlaydigan kunlar</h3>
                <div className={styles.monthYearSelector}>
                  <select
                    value={selectedEmployee?.month}
                    onChange={(e) => {
                      const month = parseInt(e.target.value);
                      loadWorkDays(selectedEmployee, selectedEmployee.year, month);
                    }}
                  >
                    {Array.from({ length: 12 }).map((_, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {new Date(0, idx).toLocaleString('uz-UZ', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedEmployee?.year}
                    onChange={(e) => {
                      const year = parseInt(e.target.value);
                      loadWorkDays(selectedEmployee, year, selectedEmployee.month);
                    }}
                  >
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const y = new Date().getFullYear() - 2 + idx;
                      return <option key={y} value={y}>{y}</option>;
                    })}
                  </select>
                </div>
                <div className={styles.calendarGrid}>
                  {monthDays.map((day, idx) => (
                    <label key={idx} className={styles.dayBox}>
                      <input
                        type="checkbox"
                        checked={day.checked}
                        onChange={async () => {
                          const updated = [...monthDays];
                          const newChecked = !day.checked;
                          updated[idx].checked = newChecked;
                          setMonthDays(updated);

                          const dateStr = toLocalDate(day.date);

                          try {
                            if (newChecked) {
                              await axios.post(
                                `${url}/xodim/${selectedEmployee.id}/workday`,
                                { day: dateStr },
                                { headers: { Authorization: `Bearer ${token}` } }
                              );
                            } else {
                              await axios.delete(
                                `${url}/xodim/${selectedEmployee.id}/workday`,
                                { data: { days: [dateStr] }, headers: { Authorization: `Bearer ${token}` } }
                              );
                            }
                          } catch (err) {
                            console.error("Xatolik:", err);
                            setErrorMsg(t('errorOccurred'));
                          }
                        }}
                      />
                      {day.date.getDate()} - {day.date.toLocaleDateString('uz-UZ', { weekday: 'short' })}
                    </label>
                  ))}
                </div>
                <div className={styles.modalButtons}>
                  <button onClick={() => setSettingsModal(false)}>{t('close')}</button>
                </div>
              </div>
            </div>
          )}

          {faceEmployee && (
            <FaceCaptureModal
              employee={faceEmployee}
              onClose={() => setFaceEmployee(null)}
              authHeader={authHeader}
            />
          )}

          {fullscreenImage && (
            <div className={styles.fullscreenImageOverlay} onClick={() => setFullscreenImage(null)}>
              <img src={fullscreenImage} className={styles.fullscreenImage} />
            </div>
          )}

          {loading ? (
            <Loader />
          ) : (
            <AdminTable
              title={activeTab === 'davomat' ? t('employeesWithAttendance') : t('employeesFlexible')}
              columns={Object.keys(columnTitles)}
              columnTitles={columnTitles}
              data={data.filter(
                (d) =>
                  (activeTab === 'davomat' ? d.ish_tur === 1 : d.ish_tur === 2) &&
                  (d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    d.phone.includes(searchTerm))
              )}
              customRenderers={customRenderers}
              onEdit={permissions.edit_employees ? handleEdit : null}
              onDelete={permissions.delete_employees ? handleDelete : null}
              permissions={{
                view1: permissions.view_employees,
                edit1: permissions.edit_employees,
                delete1: permissions.delete_employees,
              }}
            />
          )}

          <ErrorModal message={errorMsg} onClose={() => setErrorMsg('')} />
        </>
      ) : (
        <p style={{ padding: '20px', color: 'red' }}>
          {t('noPermission')}
        </p>
      )}
    </LayoutComponent>
  );
}