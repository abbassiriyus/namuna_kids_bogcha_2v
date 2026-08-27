'use client';

import styles from '../styles/Adminlar.module.css';
import { getText } from '../i18n/translations';

const MODULES = [
  'admins','students','groups','attendance','childDay','payments','employees','salaries','positions','menuMeals','extras'
];

const VIEW_ONLY_MODULES = [
  'dashboard','kitchen_incomes','kitchen_expenses','kitchen_storage','household_incomes','household_expenses','household_storage'
];

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
          <th>{getText('table.module')}</th>
          <th>{getText('table.view')}</th>
          <th>{getText('table.create')}</th>
          <th>{getText('table.edit')}</th>
          <th>{getText('table.delete')}</th>
        </tr>
      </thead>
      <tbody>
        {/* 4-action modullar */}
        {MODULES.map((key) => (
          <tr key={key}>
            <td>{getText(`module.${key}`) || key}</td>
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
            <td>{getText(`module.${key}`) || key}</td>
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
