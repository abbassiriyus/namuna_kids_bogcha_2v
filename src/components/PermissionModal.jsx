'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';
import styles from '../styles/PermissionModal.module.css';
import { getText } from '../i18n/translations';

export default function PermissionModal({ permissions, setPermissions, onSave, onClose }) {
  const groupedPermissions = {
    dashboard: ['view_dashboard'],
    admins: ['view_admins', 'create_admins', 'edit_admins', 'delete_admins'],
    students: ['view_students', 'create_students', 'edit_students', 'delete_students'],
    testStudent: ['view_prp', 'create_prp', 'edit_prp', 'delete_prp'],
    groups: ['view_groups', 'create_groups', 'edit_groups', 'delete_groups'],
    trialAttendance: ['view_sinovdavomat', 'create_sinovdavomat', 'edit_sinovdavomat', 'delete_sinovdavomat'],
    attendance: ['view_attendance', 'create_attendance', 'edit_attendance', 'delete_attendance'],
    childDay: ['view_lessons', 'create_lessons', 'edit_lessons', 'delete_lessons'],
    payments: ['view_payments', 'create_payments', 'edit_payments', 'delete_payments'],
    employees: ['view_employees', 'create_employees', 'edit_employees', 'delete_employees'],
    salaries: ['view_salaries', 'create_salaries', 'edit_salaries', 'delete_salaries'],
    positions: ['view_positions', 'create_positions', 'edit_positions', 'delete_positions'],
    menuMeals: ['view_meals', 'create_meals', 'edit_meals', 'delete_meals'],
    expenses: ['view_extras', 'create_extras', 'edit_extras', 'delete_extras'],
    kitchen: [
      'view_kitchen_incomes', 'create_kitchen_incomes', 'edit_kitchen_incomes', 'delete_kitchen_incomes',
      'view_kitchen_expenses', 'create_kitchen_expenses', 'edit_kitchen_expenses', 'delete_kitchen_expenses',
      'view_kitchen_storage', 'create_kitchen_storage', 'edit_kitchen_storage', 'delete_kitchen_storage',
    ],
    household: [
      'view_household_incomes', 'create_household_incomes', 'edit_household_incomes', 'delete_household_incomes',
      'view_household_expenses', 'create_household_expenses', 'edit_household_expenses', 'delete_household_expenses',
      'view_household_storage', 'create_household_storage', 'edit_household_storage', 'delete_household_storage',
    ]
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{getText('permissionsManageTitle')}</h2>
          <button className={styles.closeBtn} onClick={onClose} title={getText('close')}><X size={18} /></button>
        </div>

        <div className={styles.content}>
          {Object.entries(groupedPermissions).map(([categoryKey, keys]) => (
            <div key={categoryKey} className={styles.category}>
              <h3>{getText(categoryKey)}</h3>
              <div className={styles.permissions}>
                {keys.map(key => (
                  <label key={key} className={styles.switchRow}>
                    <span>{getText(`permission.${key}`) || key}</span>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={permissions[key] || false}
                        onChange={(e) =>
                          setPermissions({
                            ...permissions,
                            [key]: e.target.checked
                          })
                        }
                      />
                      <span className={styles.slider}></span><br />
                    </label>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <button onClick={onSave} className={styles.saveBtn}><Save size={16} /> {getText('save')}</button>
          <button onClick={onClose} className={styles.cancelBtn}><X size={16} /> {getText('cancel')}</button>
        </div>
      </div>
    </div>
  );
}
