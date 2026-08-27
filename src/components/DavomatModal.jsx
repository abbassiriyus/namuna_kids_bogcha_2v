'use client';
import { Check, X } from 'lucide-react';
import styles from '../styles/Modal.module.css';
import { useLang } from '../i18n/LanguageContext';

export default function DavomatModal({ onClose, onSelect, bola, sana }) {
  const { t } = useLang();
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>{bola.username} — {sana}</h3>
        <div className={styles.buttons}>
          <button className={styles.bor} onClick={() => onSelect(1)}><Check size={16} /> {t('present')}</button>
          <button className={styles.yoq} onClick={() => onSelect(2)}><X size={16} /> {t('absent')}</button>
        </div>
        <button className={styles.cancel} onClick={onClose}>{t('cancel')}</button>
      </div>
    </div>
  );
}
