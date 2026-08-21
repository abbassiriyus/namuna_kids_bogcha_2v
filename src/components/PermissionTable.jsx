'use client';

import styles from '../styles/Adminlar.module.css';

const MODULES = {
  admins: 'Adminlar',
  students: 'Tarbiyalanuvchi',
  groups: 'Guruhlar',
  attendance: 'Davomat',
  lessons: 'Bola Kuni',
  payments: 'Tolovlar',
  employees: 'Hodimlar',
  salaries: 'Oyliklar',
  positions: 'Lavozim',
  meals: 'Taomnoma',
  extras: 'Qo‘shimcha',
};

const VIEW_ONLY_MODULES = {
  dashboard: 'Dashboard',
  kitchen_incomes: 'Oshxona Kirim',
  kitchen_expenses: 'Oshxona Chiqim',
  kitchen_storage: 'Oshxona Ombor',
  household_incomes: 'Maishiy Kirim',
  household_expenses: 'Maishiy Chiqim',
  household_storage: 'Maishiy Ombor',
};

const ACTIONS = ['view', 'create', 'edit', 'delete'];

export default function PermissionTable({ permissions, setPermissions }) {
  const handleToggle = (key) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Modul</th>
          <th>Ko‘rish</th>
          <th>Qo‘shish</th>
          <th>Tahrirlash</th>
          <th>O‘chirish</th>
        </tr>
      </thead>
      <tbody>
        {/* 4-action modullar */}
        {Object.entries(MODULES).map(([key, label]) => (
          <tr key={key}>
            <td>{label}</td>
            {ACTIONS.map((action) => {
              const fullKey = `${action}_${key}`;
              return (
                <td key={fullKey}>
                  <input
                    type="checkbox"
                    checked={permissions?.[fullKey] || false}
                    onChange={() => handleToggle(fullKey)}
                  />
                </td>
              );
            })}
          </tr>
        ))}

        {/* faqat view modullar */}
        {Object.entries(VIEW_ONLY_MODULES).map(([key, label]) => (
          <tr key={key}>
            <td>{label}</td>
            <td>
              <input
                type="checkbox"
                checked={permissions?.[`view_${key}`] || false}
                onChange={() => handleToggle(`view_${key}`)}
              />
            </td>
            <td colSpan={3}></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
