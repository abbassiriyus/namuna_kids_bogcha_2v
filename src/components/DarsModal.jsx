// components/DarsModal.jsx
"use client";

import React from 'react';
import styles from '../styles/BolaModal.module.css';
import { getText } from '../i18n/translations';

export default function DarsModal({ sana, mavzu, setSana, setMavzu, isEdit, onSave, onClose }) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>{isEdit ? getText('editLesson') : getText('addLesson')}</h3>

        <label>{getText('date')}:</label>
        <input
          type="date"
          value={sana}
          onChange={(e) => setSana(e.target.value)}
          className={styles.input}
        />

        <label>{getText('topic')}:</label>
        <input
          type="text"
          value={mavzu}
          onChange={(e) => setMavzu(e.target.value)}
          className={styles.input}
        />

        <div className={styles.buttonGroup}>
          <button onClick={onSave} className={styles.saveBtn}>{getText('save')}</button>
          <button onClick={onClose} className={styles.cancelBtn}>{getText('cancel')}</button>
        </div>
      </div>
    </div>
  );
}
