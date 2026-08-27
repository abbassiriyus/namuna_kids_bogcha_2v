'use client';

import React from 'react';
import styles from '../styles/AdminHeader.module.css';
import { useLang } from '../i18n/LanguageContext';

export default function AdminHeader({ title, onCreate, canCreate = true, createLabel }) {
  const { t } = useLang();
  return (
    <div className={styles.header}>
      <h2 className={styles.header__title}>{title}</h2>
      {canCreate && onCreate && (
        <button className={styles.header__button} onClick={onCreate}>
          + {createLabel || t('create')}
        </button>
      )}
    </div>
  );
}
