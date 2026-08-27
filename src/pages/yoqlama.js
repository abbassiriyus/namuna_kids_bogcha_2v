'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import styles from '../styles/Login.module.css';
import url from '../host/host';
import { useLang } from '../i18n/LanguageContext';
import {
  Home, Users, Calendar, DollarSign, FileText, Briefcase,
  PieChart, Utensils, Wallet, ChefHat, Box, ShieldCheck, Loader2
} from 'lucide-react';

const menu = [
  { name: 'Dashboard', icon: <Home size={20} />, path: '/admin/dashboard', key: 'dashboard' },
  { name: 'Adminlar', icon: <ShieldCheck size={20} />, path: '/admin/adminlar', key: 'admins' },
  { name: 'Tarbiyalanuvchi', icon: <Users size={20} />, path: '/admin/tarbiyalanuvchi', key: 'students' },
  { name: 'Sinov bola', icon: <Users size={20} />, path: '/admin/sinov', key: 'prp' },
  { name: 'Guruhlar', icon: <PieChart size={20} />, path: '/admin/guruhlar', key: 'groups' },
  { name: 'Sinov davomat', icon: <Calendar size={20} />, path: '/admin/sinovDavomat', key: 'sinovdavomat' },
  { name: 'Davomat', icon: <Calendar size={20} />, path: '/admin/DavomatPage', key: 'attendance' },
  { name: 'Xodim Davomat', icon: <Calendar size={20} />, path: '/admin/XodimDavomat', key: 'attendance' },
  { name: 'Bola Kuni', icon: <Calendar size={20} />, path: '/admin/DarslarPage', key: 'lessons' },
  { name: 'Tolovlar', icon: <DollarSign size={20} />, path: '/admin/tolovlar', key: 'payments' },
  { name: 'Hodimlar', icon: <Briefcase size={20} />, path: '/admin/hodimlar', key: 'employees' },
  { name: 'Oyliklar', icon: <FileText size={20} />, path: '/admin/oyliklar', key: 'salaries' },
  { name: 'Lavozim', icon: <Briefcase size={20} />, path: '/admin/lavozim', key: 'positions' },
  { name: 'Maxsus taomnoma', icon: <Utensils size={20} />, path: '/admin/taomnoma', key: 'meals' },
  { name: 'Xarajat', icon: <Wallet size={20} />, path: '/admin/qoshimcha', key: 'extras' },
];

const oshxonaMenu = [
  { name: 'Kirimlar', path: '/admin/kirimlar', key: 'kitchen_incomes' },
  { name: 'Chiqimlar', path: '/admin/chiqimlar', key: 'kitchen_expenses' },
  { name: 'Ombor', path: '/admin/SkladProductPage', key: 'kitchen_storage' },
];

const maishiyMenu = [
  { name: 'Kirimlar', path: '/admin/maishiy-kirim', key: 'household_incomes' },
  { name: 'Chiqimlar', path: '/admin/maishiy-chiqim', key: 'household_expenses' },
  { name: 'Ombor', path: '/admin/maishiy-ombor', key: 'household_storage' },
];

export default function Login() {
  const { t } = useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Yuklanish holati
  const [redirecting, setRedirecting] = useState(false); // login o'tdi, sahifa almashmoqda
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Yuklanish boshlandi
    setError(''); // Oldingi xatolarni tozalash

    try {
      const response = await axios.post(`${url}/admin/login`, {
        username,
        password,
      });

      const { token, admin } = response.data;
      const type = admin.type;

      if (!token) {
        setError(t('loginErrorWrong'));
        setIsLoading(false);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('type', type);
      localStorage.setItem('admin', JSON.stringify(admin));

      let permissions = {};
      const isSuperAdmin = type === 1;

      if (!isSuperAdmin) {
        const permissionsRes = await axios.get(`${url}/permissions/${admin.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        permissions = permissionsRes.data.permissions || {};
      }

      const allMenus = [
        ...menu,
        ...oshxonaMenu.map((item) => ({ ...item, isSubmenu: true })),
        ...maishiyMenu.map((item) => ({ ...item, isSubmenu: true })),
      ];

      const allowedMenu = allMenus.find((m) => isSuperAdmin || permissions[`view_${m.key}`]);

      // Sahifa almashayotganda loading holatini saqlab qolamiz, aks holda tugma
      // bir lahzaga "Kirish"ga qaytib, qayta bosilib ketishi mumkin.
      if (allowedMenu && !allowedMenu.isSubmenu) {
        setRedirecting(true);
        router.push("/xodimdavomat/");
        return;
      }
      if (type === 2) {
        setRedirecting(true);
        router.push('/xodimdavomat/');
        return;
      }

      setError(t('loginErrorNoAccess'));
      setIsLoading(false);
    } catch (err) {
      setError(t('loginErrorServer') + ': ' + (err.response?.data?.message || err.message));
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.bg}>
      <div className={styles.ornament} aria-hidden="true"></div>
      <div className={styles.overlay}></div>
      <form onSubmit={handleLogin} className={styles.loginBox}>
        <h2>{t('loginTitle')}</h2>
        {error && <p className={styles.error}>{error}</p>}
        <input
          type="text"
          placeholder={t('username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? (
            <span className={styles.btnLoading}>
              <Loader2 size={16} className={styles.spin} />
              {redirecting ? t('loginRedirecting') : t('loggingIn')}
            </span>
          ) : (
            t('loginButton')
          )}
        </button>
      </form>
    </div>
  );
}