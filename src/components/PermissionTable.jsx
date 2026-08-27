'use client';

import styles from '../styles/Adminlar.module.css';
import { useLang } from '../i18n/LanguageContext';

const MODULES = [
  'admins','students','groups','attendance','childDay','payments','employees','salaries','positions','menuMeals','extras'
];

const VIEW_ONLY_MODULES = [
  'dashboard','kitchen_incomes','kitchen_expenses','kitchen_storage','household_incomes','household_expenses','household_storage'
];

const ACTIONS = ['view', 'create', 'edit', 'delete'];

export default function PermissionTable({ permissions, setPermissions }) {
  const { t } = useLang();
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
          <th>{t('table.module')}</th>
          <th>{t('table.view')}</th>
          <th>{t('table.create')}</th>
          <th>{t('table.edit')}</th>
          <th>{t('table.delete')}</th>
        </tr>
      </thead>
      <tbody>
        {/* 4-action modullar */}
        {MODULES.map((key) => (
          <tr key={key}>
            <td>{t(`module.${key}`) || key}</td>
            {ACTIONS.map((action) => {
              const fullKey = `${action}_${key.replace(/menuMeals/, 'meals')}`;
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
        {VIEW_ONLY_MODULES.map((key) => (
          <tr key={key}>
            <td>{t(`module.${key}`) || key}</td>
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
