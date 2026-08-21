'use client';
import { Check, X } from 'lucide-react';
import styles from '../styles/Modal.module.css';
import { getText } from '../i18n/translations';

export default function DavomatModal({ onClose, onSelect, bola, sana }) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>{bola.username} — {sana}</h3>
        <div className={styles.buttons}>
          <button className={styles.bor} onClick={() => onSelect(1)}><Check size={16} /> {getText('present')}</button>
          <button className={styles.yoq} onClick={() => onSelect(2)}><X size={16} /> {getText('absent')}</button>
        </div>
        <button className={styles.cancel} onClick={onClose}>{getText('cancel')}</button>
      </div>
    </div>
  );
}
