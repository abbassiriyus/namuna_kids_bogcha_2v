'use client';

import React from 'react';
import styles from '../styles/AdminHeader.module.css';

export default function AdminHeader({ title, onCreate, canCreate }) {
  return (
    <div className={styles.header}>
      <h2 className={styles.header__title}>{title}</h2>
      {canCreate && onCreate && (
        <button className={styles.header__button} onClick={onCreate}>
          + Yaratish
        </button>
      )}
    </div>
  );
}
