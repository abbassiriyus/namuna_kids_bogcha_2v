'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import styles from '../styles/Sidebar.module.css';
import { useLang } from '../i18n/LanguageContext';
import * as Icons from 'lucide-react';
import url from '../host/host.js';

export default function Sidebar() {
  const router = useRouter();
  // Til butun ilova bo'ylab bitta joydan boshqariladi, shuning uchun bu yerda
  // almashtirilganda barcha sahifalar va modallar ham darhol tarjima bo'ladi.
  const { t, toggleLang } = useLang();
  const [oshxonaOpen, setOshxonaOpen] = useState(false);
  const [maishiyOpen, setMaishiyOpen] = useState(false);
  const [visiblePermissions, setVisiblePermissions] = useState({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false); // Sidebar uchun mobil toggle
  const [collapsed, setCollapsed] = useState(false); // Desktop uchun: faqat ikonka rejimi
  const [navigatingTo, setNavigatingTo] = useState(null); // qaysi sahifaga o'tilmoqda

  // Sahifalar orasida o'tishda kichik yuklanish ko'rsatkichi. Router hodisalari
  // orqali kuzatamiz — shunda sekin ochiladigan sahifada ham foydalanuvchi
  // bosgani ishlayotganini ko'radi va tugmani qayta bosavermaydi.
  useEffect(() => {
    const handleStart = (targetPath) => setNavigatingTo(targetPath);
    const handleDone = () => setNavigatingTo(null);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
    };
  }, [router]);

  // Bir sahifaga ikki marta bosilmasligi uchun umumiy navigatsiya funksiyasi.
  const goTo = (path) => {
    if (navigatingTo || router.pathname === path) return;
    router.push(path);
    setIsOpen(false);
  };

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('sidebar_collapsed') : null;
    if (saved === '1') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar_collapsed', next ? '1' : '0');
      }
      return next;
    });
  };

  // uz -> ru -> en -> uz (LanguageContext ichida)
  const toggleLanguage = toggleLang;

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const adminStr = localStorage.getItem('admin');
        if (!adminStr) {
          setLoading(false);
          return;
        }

        const admin = JSON.parse(adminStr);
        setIsSuperAdmin(admin?.type === 1);

        let permissionsData = {};
        if (admin?.type !== 1) {
          const token = localStorage.getItem('token');
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const res = await axios.get(`${url}/permissions/${admin.id}`);
          permissionsData = res.data.permissions || {};
          setVisiblePermissions(permissionsData);
        }

        setLoading(false);

        // Birinchi ruxsatli sahifaga yo‘naltirish
        const allMenus = [
          ...menu,
          ...oshxonaMenu.map((item) => ({ ...item, isSubmenu: true })),
          ...maishiyMenu.map((item) => ({ ...item, isSubmenu: true })),
        ];

        const allowedMenu = allMenus.find((m) => isSuperAdmin || permissionsData[`view_${m.key}`]);
        const currentPath = router.pathname;

        if (allowedMenu && currentPath === '/' && !allowedMenu.isSubmenu) {
          router.push(allowedMenu.path);
        }
      } catch (err) {
        console.error('Ruxsatlarni yuklashda xatolik:', err);
        setLoading(false);
      }
    };

    loadPermissions();
  }, [router]);

  // faqat superadmin yoki permissioni bor foydalanuvchi ko'radi
  const hasPermission = (key) => isSuperAdmin || !!visiblePermissions[`view_${key}`];

  const menu = [
    { name: t('dashboard'), icon: (Icons.Home ? <Icons.Home size={20} /> : <span />), path: '/admin/dashboard', key: 'dashboard' },
    { name: t('admins'), icon: (Icons.ShieldCheck ? <Icons.ShieldCheck size={20} /> : <span />), path: '/admin/adminlar', key: 'admins' },
    { name: t('students'), icon: (Icons.Users ? <Icons.Users size={20} /> : <span />), path: '/admin/tarbiyalanuvchi', key: 'students' },
    { name: t('testStudent'), icon: (Icons.UserPlus ? <Icons.UserPlus size={20} /> : <span />), path: '/admin/sinov', key: 'prp' },
    { name: t('groups'), icon: (Icons.PieChart ? <Icons.PieChart size={20} /> : <span />), path: '/admin/guruhlar', key: 'groups' },
    { name: t('trialAttendance'), icon: (Icons.ClipboardCheck ? <Icons.ClipboardCheck size={20} /> : <span />), path: '/admin/sinovDavomat', key: 'sinovdavomat' },
    { name: t('attendance'), icon: (Icons.CalendarCheck ? <Icons.CalendarCheck size={20} /> : <span />), path: '/admin/DavomatPage', key: 'attendance' },
    { name: t('employeeAttendance'), icon: (Icons.Fingerprint ? <Icons.Fingerprint size={20} /> : <span />), path: '/admin/XodimDavomat', key: 'employees' },
    { name: t('childDay'), icon: (Icons.Calendar ? <Icons.Calendar size={20} /> : <span />), path: '/admin/DarslarPage', key: 'lessons' },
    { name: t('payments'), icon: (Icons.DollarSign ? <Icons.DollarSign size={20} /> : <span />), path: '/admin/tolovlar', key: 'payments' },
    { name: t('employees'), icon: (Icons.Briefcase ? <Icons.Briefcase size={20} /> : <span />), path: '/admin/hodimlar', key: 'employees' },
    { name: t('salaries'), icon: (Icons.FileText ? <Icons.FileText size={20} /> : <span />), path: '/admin/oyliklar', key: 'salaries' },
    { name: t('positions'), icon: (Icons.IdCard ? <Icons.IdCard size={20} /> : <span />), path: '/admin/lavozim', key: 'positions' },
    { name: t('menuMeals'), icon: (Icons.Utensils ? <Icons.Utensils size={20} /> : <span />), path: '/admin/taomnoma', key: 'meals' },
    { name: t('expenses'), icon: (Icons.Wallet ? <Icons.Wallet size={20} /> : <span />), path: '/admin/qoshimcha' },
    { name: t('historyTitle'), icon: (Icons.Clock ? <Icons.Clock size={20} /> : <span />), path: '/admin/tarix', key: 'tarix' },
  ];

  const oshxonaMenu = [
    { name: t('kitchenIncomes'), path: '/admin/kirimlar', key: 'kitchen_incomes' },
    { name: t('kitchenExpenses'), path: '/admin/chiqimlar', key: 'kitchen_expenses' },
    { name: t('storage'), path: '/admin/SkladProductPage', key: 'kitchen_storage' },
  ];

  const maishiyMenu = [
    { name: t('kitchenIncomes'), path: '/admin/maishiy-kirim', key: 'household_incomes' },
    { name: t('kitchenExpenses'), path: '/admin/maishiy-chiqim', key: 'household_expenses' },
    { name: t('storage'), path: '/admin/maishiy-ombor', key: 'household_storage' },
  ];

  const renderSubmenu = (open, menuList) =>
    open && !collapsed && (
      <ul className={styles.submenu}>
        {menuList.filter((m) => hasPermission(m.key)).map((sub, idx) => {
          const isSubActive = router.pathname === sub.path;
          const isNavigating = navigatingTo === sub.path;
          return (
            <li
              key={idx}
              onClick={() => goTo(sub.path)}
              className={`${styles.subitem} ${isSubActive ? styles.active : ''} ${isNavigating ? styles.navigating : ''}`}
            >
              {sub.name}
              {isNavigating && Icons.Loader2 && (
                <Icons.Loader2 size={13} className={styles.navSpinner} />
              )}
            </li>
          );
        })}
      </ul>
    );

  if (loading) {
    return (
      <div className={styles.sidebar}>
        <div className={styles.loading}>⏳ {t('loadingShort')}</div>
      </div>
    );
  }

  return (
    <>
      <button className={styles.toggleBtn} onClick={() => setIsOpen(!isOpen)}>
        {Icons.Menu ? <Icons.Menu size={24} /> : <span />}
      </button>

      <div className={`${styles.sidebar} ${isOpen ? styles.open : ''} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.brandWrap}>
          <div className={styles.logo}>B</div>
          <div className={styles.brandText}>
            <h2 className={styles.title}>{t('appTitle')}</h2>
            <span className={styles.subtitle}>{t('panel')}</span>
          </div>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={toggleCollapsed}
            title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
          >
            {Icons.ChevronLeft ? <Icons.ChevronLeft size={16} className={collapsed ? styles.rotated : ''} /> : <span />}
          </button>
        </div>

        <div className={styles.userCardRow}>
          <div className={styles.userCard}>
            <span className={styles.userDot} />
            <span className={styles.label}>{t('online')}</span>
          </div>
          <button type="button" className={styles.langToggle} onClick={toggleLanguage}>
            {t('toggleLang')}
          </button>
        </div>

        <ul className={styles.menu}>
          <li
            onClick={() => goTo('/admin/profile')}
            className={`${styles.item} ${router.pathname === '/admin/profile' ? styles.active : ''} ${navigatingTo === '/admin/profile' ? styles.navigating : ''}`}
          >
            <span className={styles.iconWrap}>
              {navigatingTo === '/admin/profile' && Icons.Loader2
                ? <Icons.Loader2 size={20} className={styles.navSpinner} />
                : (Icons.UserCircle ? <Icons.UserCircle size={20} /> : <span />)}
            </span>
            <span className={styles.label}>{t('profile')}</span>
            <span className={styles.tooltip}>{t('profile')}</span>
          </li>

          {menu.filter((m) => hasPermission(m.key)).map((item, i) => {
            const isActive = router.pathname === item.path;
            const isNavigating = navigatingTo === item.path;
            return (
              <li
                key={i}
                onClick={() => goTo(item.path)}
                className={`${styles.item} ${isActive ? styles.active : ''} ${isNavigating ? styles.navigating : ''}`}
              >
                {/* Yuklanayotganda ikonka o'rniga spinner ko'rsatiladi —
                    collapsed rejimda ham ko'rinadi, chunki matn yashiringan. */}
                <span className={styles.iconWrap}>
                  {isNavigating && Icons.Loader2
                    ? <Icons.Loader2 size={20} className={styles.navSpinner} />
                    : item.icon}
                </span>
                <span className={styles.label}>{item.name}</span>
                <span className={styles.tooltip}>{item.name}</span>
              </li>
            );
          })}

          {oshxonaMenu.some((m) => hasPermission(m.key)) && (
                    <>
                      <li onClick={() => !collapsed && setOshxonaOpen(!oshxonaOpen)} className={styles.item}>
                        <span className={styles.iconWrap}>{Icons.ChefHat ? <Icons.ChefHat size={20} /> : <span />}</span>
                        <span className={styles.label}>{t('kitchen')}</span>
                        <span className={styles.tooltip}>{t('kitchen')}</span>
                        {oshxonaOpen ? (Icons.ChevronDown ? <Icons.ChevronDown size={16} className={styles.arrow} /> : <span />) : (Icons.ChevronRight ? <Icons.ChevronRight size={16} className={styles.arrow} /> : <span />)}
                      </li>
              {renderSubmenu(oshxonaOpen, oshxonaMenu)}
            </>
          )}

          {maishiyMenu.some((m) => hasPermission(m.key)) && (
            <>
              <li onClick={() => !collapsed && setMaishiyOpen(!maishiyOpen)} className={styles.item}>
                <span className={styles.iconWrap}>{Icons.Box ? <Icons.Box size={20} /> : <span />}</span>
                <span className={styles.label}>{t('household')}</span>
                <span className={styles.tooltip}>{t('household')}</span>
                {maishiyOpen ? (Icons.ChevronDown ? <Icons.ChevronDown size={16} className={styles.arrow} /> : <span />) : (Icons.ChevronRight ? <Icons.ChevronRight size={16} className={styles.arrow} /> : <span />)}
              </li>
              {renderSubmenu(maishiyOpen, maishiyMenu)}
            </>
          )}

        </ul>
      </div>
    </>
  );
}