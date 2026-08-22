'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { UserCircle, Save, KeyRound, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import LayoutComponent from '../../components/LayoutComponent';
import styles from '../../styles/Profile.module.css';
import url from '../../host/host';

const TYPE_LABELS = {
  1: 'Super Admin',
  2: 'Tarbiyachi',
  3: "Qo'shimcha Admin",
};

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [form, setForm] = useState({
    username: '',
    phone_number: '',
    description: '',
  });
  const [passwordForm, setPasswordForm] = useState({ password: '', passwordConfirm: '' });
  const [infoMessage, setInfoMessage] = useState(null); // { type: 'success' | 'error', text }
  const [passwordMessage, setPasswordMessage] = useState(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }

    axios
      .get(`${url}/admin/me`, authHeader)
      .then((res) => {
        setAdmin(res.data);
        setForm({
          username: res.data.username || '',
          phone_number: res.data.phone_number || '',
          description: res.data.description || '',
        });
      })
      .catch((err) => {
        console.error('Profilni yuklashda xatolik:', err);
        setInfoMessage({ type: 'error', text: "Profil ma'lumotlarini yuklab bo'lmadi" });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const syncLocalAdmin = (data) => {
    const storedAdmin = JSON.parse(localStorage.getItem('admin') || '{}');
    localStorage.setItem('admin', JSON.stringify({ ...storedAdmin, ...data }));
  };

  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    setInfoMessage(null);
    setSavingInfo(true);
    try {
      const res = await axios.put(
        `${url}/admin/me`,
        { username: form.username, phone_number: form.phone_number, description: form.description },
        authHeader
      );
      setAdmin(res.data);
      syncLocalAdmin(res.data);
      setInfoMessage({ type: 'success', text: "Shaxsiy ma'lumotlar saqlandi" });
    } catch (err) {
      console.error('Profilni saqlashda xatolik:', err);
      setInfoMessage({ type: 'error', text: err.response?.data?.message || 'Saqlashda xatolik yuz berdi' });
    } finally {
      setSavingInfo(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!passwordForm.password) {
      setPasswordMessage({ type: 'error', text: 'Yangi parolni kiriting' });
      return;
    }
    if (passwordForm.password !== passwordForm.passwordConfirm) {
      setPasswordMessage({ type: 'error', text: 'Yangi parollar bir xil emas' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await axios.put(
        `${url}/admin/me`,
        { username: form.username, phone_number: form.phone_number, description: form.description, password: passwordForm.password },
        authHeader
      );
      setAdmin(res.data);
      syncLocalAdmin(res.data);
      setPasswordForm({ password: '', passwordConfirm: '' });
      setPasswordMessage({ type: 'success', text: 'Parol muvaffaqiyatli yangilandi' });
    } catch (err) {
      console.error('Parolni yangilashda xatolik:', err);
      setPasswordMessage({ type: 'error', text: err.response?.data?.message || 'Parolni yangilashda xatolik yuz berdi' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <LayoutComponent>
      <div className={styles.wrapper}>
        <h1 className={styles.title}>
          <UserCircle size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Mening profilim
        </h1>
        <p className={styles.subtitle}>O'zingizning login, telefon va parolingizni shu yerda yangilang</p>

        {loading ? (
          <p>Yuklanmoqda...</p>
        ) : (
          <>
            <div className={styles.card}>
              {admin && (
                <div className={styles.badgeRow}>
                  <span className={styles.badge}>
                    <ShieldCheck size={14} /> {TYPE_LABELS[admin.type] || 'Admin'}
                  </span>
                  {admin.is_active ? (
                    <span className={`${styles.badge} ${styles.badgeActive}`}>
                      <CheckCircle2 size={14} /> Faol
                    </span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgeInactive}`}>
                      <XCircle size={14} /> Nofaol
                    </span>
                  )}
                </div>
              )}

              {infoMessage && (
                <p className={infoMessage.type === 'success' ? styles.successMsg : styles.errorMsg}>
                  {infoMessage.text}
                </p>
              )}

              <form className={styles.form} onSubmit={handleInfoSubmit}>
                <div className={styles.field}>
                  <label>Foydalanuvchi nomi</label>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label>Telefon raqam</label>
                  <input
                    type="text"
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label>Tavsif</label>
                  <input
                    type="text"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Ixtiyoriy"
                  />
                </div>

                <button type="submit" className={styles.saveBtn} disabled={savingInfo}>
                  <Save size={16} /> {savingInfo ? 'Saqlanmoqda...' : "Ma'lumotlarni yangilash"}
                </button>
              </form>
            </div>

            <div className={styles.card} style={{ marginTop: 20 }}>
              <h2 className={styles.cardTitle}>
                <KeyRound size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Parolni yangilash
              </h2>

              {passwordMessage && (
                <p className={passwordMessage.type === 'success' ? styles.successMsg : styles.errorMsg}>
                  {passwordMessage.text}
                </p>
              )}

              <form className={styles.form} onSubmit={handlePasswordSubmit}>
                <div className={styles.field}>
                  <label>Yangi parol</label>
                  <input
                    type="password"
                    name="password"
                    value={passwordForm.password}
                    onChange={handlePasswordChange}
                    placeholder="••••••••"
                  />
                </div>

                <div className={styles.field}>
                  <label>Yangi parolni tasdiqlash</label>
                  <input
                    type="password"
                    name="passwordConfirm"
                    value={passwordForm.passwordConfirm}
                    onChange={handlePasswordChange}
                    placeholder="••••••••"
                  />
                </div>

                <button type="submit" className={styles.saveBtn} disabled={savingPassword}>
                  <KeyRound size={16} /> {savingPassword ? 'Yangilanmoqda...' : 'Parolni yangilash'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </LayoutComponent>
  );
}
