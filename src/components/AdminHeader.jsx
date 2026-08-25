'use client';

import React from 'react';
import styles from '../styles/AdminHeader.module.css';
import { getText } from '../i18n/translations';

export default function AdminHeader({ title, onCreate, canCreate = true, createLabel }) {
  return (
    <div className={styles.header}>
      <h2 className={styles.header__title}>{title}</h2>
      {canCreate && onCreate && (
        <button className={styles.header__button} onClick={onCreate}>
          + {createLabel || getText('create')}
        </button>
      )}
    </div>
  );
}
