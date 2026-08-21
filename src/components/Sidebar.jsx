'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import styles from '../styles/Sidebar.module.css';
import { getLanguage, getText } from '../i18n/translations';
import * as Icons from 'lucide-react';
import url from '../host/host.js';

export default function Sidebar() {
  const router = useRouter();
  const [lang, setLang] = useState(getLanguage());
  const [oshxonaOpen, setOshxonaOpen] = useState(false);
  const [maishiyOpen, setMaishiyOpen] = useState(false);
  const [visiblePermissions, setVisiblePermissions] = useState({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false); // Sidebar uchun mobil toggle

  const toggleLanguage = () => {
    // cycle: uz -> ru -> en -> uz
    const nextLang = lang === 'uz' ? 'ru' : (lang === 'ru' ? 'en' : 'uz');
    setLang(nextLang);
    localStorage.setItem('app_lang', nextLang);
  };

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
    { name: getText('dashboard', lang), icon: (Icons.Home ? <Icons.Home size={20} /> : <span />), path: '/admin/dashboard', key: 'dashboard' },
    { name: getText('admins', lang), icon: (Icons.ShieldCheck ? <Icons.ShieldCheck size={20} /> : <span />), path: '/admin/adminlar', key: 'admins' },
    { name: getText('students', lang), icon: (Icons.Users ? <Icons.Users size={20} /> : <span />), path: '/admin/tarbiyalanuvchi', key: 'students' },
    { name: getText('testStudent', lang), icon: (Icons.Users ? <Icons.Users size={20} /> : <span />), path: '/admin/sinov', key: 'prp' },
    { name: getText('groups', lang), icon: (Icons.PieChart ? <Icons.PieChart size={20} /> : <span />), path: '/admin/guruhlar', key: 'groups' },
    { name: getText('attendance', lang), icon: (Icons.Calendar ? <Icons.Calendar size={20} /> : <span />), path: '/admin/sinovDavomat', key: 'sinovdavomat' },
    { name: getText('attendance', lang), icon: (Icons.Calendar ? <Icons.Calendar size={20} /> : <span />), path: '/admin/DavomatPage', key: 'attendance' },
    { name: getText('employeeAttendance', lang), icon: (Icons.Calendar ? <Icons.Calendar size={20} /> : <span />), path: '/admin/XodimDavomat', key: 'attendance' },
    { name: getText('childDay', lang), icon: (Icons.Calendar ? <Icons.Calendar size={20} /> : <span />), path: '/admin/DarslarPage', key: 'lessons' },
    { name: getText('payments', lang), icon: (Icons.DollarSign ? <Icons.DollarSign size={20} /> : <span />), path: '/admin/tolovlar', key: 'payments' },
    { name: getText('employees', lang), icon: (Icons.Briefcase ? <Icons.Briefcase size={20} /> : <span />), path: '/admin/hodimlar', key: 'employees' },
    { name: getText('salaries', lang), icon: (Icons.FileText ? <Icons.FileText size={20} /> : <span />), path: '/admin/oyliklar', key: 'salaries' },
    { name: getText('positions', lang), icon: (Icons.Briefcase ? <Icons.Briefcase size={20} /> : <span />), path: '/admin/lavozim', key: 'positions' },
    { name: getText('menuMeals', lang), icon: (Icons.Utensils ? <Icons.Utensils size={20} /> : <span />), path: '/admin/taomnoma', key: 'meals' },
    { name: getText('expenses', lang), icon: (Icons.Wallet ? <Icons.Wallet size={20} /> : <span />), path: '/admin/qoshimcha' },
    { name: 'Tarix', icon: (Icons.Clock ? <Icons.Clock size={20} /> : <span />), path: '/admin/tarix', key: 'tarix' },
  ];

  const oshxonaMenu = [
    { name: getText('kitchenIncomes', lang), path: '/admin/kirimlar', key: 'kitchen_incomes' },
    { name: getText('kitchenExpenses', lang), path: '/admin/chiqimlar', key: 'kitchen_expenses' },
    { name: getText('storage', lang), path: '/admin/SkladProductPage', key: 'kitchen_storage' },
  ];

  const maishiyMenu = [
    { name: getText('kitchenIncomes', lang), path: '/admin/maishiy-kirim', key: 'household_incomes' },
    { name: getText('kitchenExpenses', lang), path: '/admin/maishiy-chiqim', key: 'household_expenses' },
    { name: getText('storage', lang), path: '/admin/maishiy-ombor', key: 'household_storage' },
  ];

  const renderSubmenu = (open, menuList) =>
    open && (
      <ul className={styles.submenu}>
        {menuList.filter((m) => hasPermission(m.key)).map((sub, idx) => {
          const isSubActive = router.pathname === sub.path;
          return (
            <li
              key={idx}
              onClick={() => {
                router.push(sub.path);
                setIsOpen(false);
              }}
              className={`${styles.subitem} ${isSubActive ? styles.active : ''}`}
            >
              {sub.name}
            </li>
          );
        })}
      </ul>
    );

  if (loading) {
    return (
      <div className={styles.sidebar}>
        <div className={styles.loading}>⏳ Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <>
      <button className={styles.toggleBtn} onClick={() => setIsOpen(!isOpen)}>
        {Icons.Menu ? <Icons.Menu size={24} /> : <span />}
      </button>

      <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.brandWrap}>
          <div className={styles.logo}>B</div>
          <div>
            <h2 className={styles.title}>{getText('appTitle', lang)}</h2>
            <span className={styles.subtitle}>{getText('panel', lang)}</span>
          </div>
        </div>

        <div className={styles.userCardRow}>
          <div className={styles.userCard}>
            <span className={styles.userDot} />
            <span>{getText('online', lang)}</span>
          </div>
          <button type="button" className={styles.langToggle} onClick={toggleLanguage}>
            {getText('toggleLang', lang)}
          </button>
        </div>

        <ul className={styles.menu}>
          {menu.filter((m) => hasPermission(m.key)).map((item, i) => {
            const isActive = router.pathname === item.path;
            return (
              <li
                key={i}
                onClick={() => {
                  router.push(item.path);
                  setIsOpen(false);
                }}
                className={`${styles.item} ${isActive ? styles.active : ''}`}
              >
                <span className={styles.iconWrap}>{item.icon}</span>
                <span>{item.name}</span>
              </li>
            );
          })}

          {oshxonaMenu.some((m) => hasPermission(m.key)) && (
                    <>
                      <li onClick={() => setOshxonaOpen(!oshxonaOpen)} className={styles.item}>
                        <span className={styles.iconWrap}>{Icons.ChefHat ? <Icons.ChefHat size={20} /> : <span />}</span>
                        <span>{getText('kitchen', lang)}</span>
                        {oshxonaOpen ? (Icons.ChevronDown ? <Icons.ChevronDown size={16} className={styles.arrow} /> : <span />) : (Icons.ChevronRight ? <Icons.ChevronRight size={16} className={styles.arrow} /> : <span />)}
                      </li>
              {renderSubmenu(oshxonaOpen, oshxonaMenu)}
            </>
          )}

          {maishiyMenu.some((m) => hasPermission(m.key)) && (
            <>
              <li onClick={() => setMaishiyOpen(!maishiyOpen)} className={styles.item}>
                <span className={styles.iconWrap}>{Icons.Box ? <Icons.Box size={20} /> : <span />}</span>
                <span>{getText('household', lang)}</span>
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