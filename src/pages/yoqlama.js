'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import styles from '../styles/Login.module.css';
import url from '../host/host';
import {
  Home, Users, Calendar, DollarSign, FileText, Briefcase,
  PieChart, Utensils, Wallet, ChefHat, Box, ShieldCheck
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Yuklanish holati
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
        setError("Login yoki parol noto‘g‘ri");
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

      if (allowedMenu && !allowedMenu.isSubmenu) {
        router.push("/xodimdavomat/");
      } else if (type === 2) {
        router.push('/xodimdavomat/');
      } else {
        setError("Sizda hech qanday sahifaga kirish ruxsati yo‘q");
      }
    } catch (err) {
      setError("Server bilan bog‘lanishda xatolik: " + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false); // Yuklanish tugadi
    }
  };

  return (
    <div className={styles.bg}>
      <div className={styles.ornament} aria-hidden="true"></div>
      <div className={styles.overlay}></div>
      <form onSubmit={handleLogin} className={styles.loginBox}>
        <h2>Admin Login</h2>
        {error && <p className={styles.error}>{error}</p>}
        <input
          type="text"
          placeholder="Foydalanuvchi nomi"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder="Parol"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Yuborilmoqda...' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}