'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import styles from '../styles/Login.module.css';
import url from '../host/host';
import { useLang } from '../i18n/LanguageContext';
import {
  Home, Users, Calendar, DollarSign, FileText, Briefcase,
  PieChart, Utensils, Wallet, ShieldCheck, Loader2
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
  const [isLoading, setIsLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false); // login muvaffaqiyatli, sahifa almashmoqda
  const { t, toggleLang: toggleLanguage } = useLang();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError(t('loginErrorEmpty'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(`${url}/admin/login`, {
        username: trimmedUsername,
        password: trimmedPassword,
      });

      const { token, admin } = response.data ?? {};
      const type = Number(admin?.type ?? 0);

      if (!token) {
        setError(t('loginErrorWrong'));
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        localStorage.setItem('type', String(type));
        localStorage.setItem('admin', JSON.stringify(admin));
      }

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

      // Sahifaga o'tayotganda loading ko'rsatkichini o'chirmaymiz: aks holda
      // tugma bir lahzaga "Kirish" holatiga qaytib, foydalanuvchi qayta bosishi
      // mumkin edi. Navigatsiya tugagach komponent baribir almashadi.
      if (allowedMenu && !allowedMenu.isSubmenu) {
        setRedirecting(true);
        router.replace(allowedMenu.path);
        return;
      }

      if (type === 2) {
        setRedirecting(true);
        router.replace('/tarbiyachi/davomat');
        return;
      }

      setError(t('loginErrorNoAccess'));
      setIsLoading(false);
    } catch (err) {
      const codeKeys = {
        userNotFound: 'loginErrorUserNotFound',
        inactive: 'loginErrorInactive',
        wrongPassword: 'loginErrorWrongPassword',
      };
      const key = codeKeys[err?.response?.data?.code];
      setError(key ? t(key) : t('loginErrorServer'));
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.ornament} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />
      <div className={`${styles.glow} ${styles.glowSecondary}`} aria-hidden="true" />

      <section className={styles.authShell}>
        <div className={styles.brandPanel}>
          <div className={styles.logoBadge}>B</div>
          <span className={styles.kicker}>{t('appTitle')}</span>
          <h1>{t('loginHeroTitle')}</h1>
          <p>{t('loginHeroText')}</p>

          <ul className={styles.features}>
            {t('loginFeatures').map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className={styles.cardWrap}>
          <form onSubmit={handleLogin} className={styles.loginBox}>
            <div className={styles.headerRow}>
              <div className={styles.titleBlock}>
                <span className={styles.label}>{t('loginSubtitle')}</span>
                <h2>{t('loginTitle')}</h2>
              </div>
              <button type="button" className={styles.langButton} onClick={toggleLanguage}>
                {t('toggleLang')}
              </button>
            </div>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <label className={styles.field}>
              <span>{t('username')}</span>
              <input
                type="text"
                placeholder={t('usernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
            </label>

            <label className={styles.field}>
              <span>{t('password')}</span>
              <input
                type="password"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </label>

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
      </section>
    </main>
  );
}