// components/DarsModal.jsx
"use client";

import React from 'react';
import styles from '../styles/BolaModal.module.css';

export default function DarsModal({ sana, mavzu, setSana, setMavzu, isEdit, onSave, onClose }) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>{isEdit ? "Darsni tahrirlash" : "Yangi dars qo‘shish"}</h3>

        <label>Sana:</label>
        <input
          type="date"
          value={sana}
          onChange={(e) => setSana(e.target.value)}
          className={styles.input}
        />

        <label>Mavzu:</label>
        <input
          type="text"
          value={mavzu}
          onChange={(e) => setMavzu(e.target.value)}
          className={styles.input}
        />

        <div className={styles.buttonGroup}>
          <button onClick={onSave} className={styles.saveBtn}>Saqlash</button>
          <button onClick={onClose} className={styles.cancelBtn}>Bekor qilish</button>
        </div>
      </div>
    </div>
  );
}
