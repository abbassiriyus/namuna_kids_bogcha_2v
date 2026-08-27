'use client';

import styles from '../styles/Loader.module.css';
import { useLang } from '../i18n/LanguageContext';

// Butun sayt bo'ylab bir xil ko'rinishdagi "yuklanmoqda" holati — sodda matn
// o'rniga aylanuvchi indikator, va joriy tilga mos matn (t('loadingData')).
export default function Loader({ text, inline = false }) {
  const { t } = useLang();
  return (
    <div className={`${styles.wrap} ${inline ? styles.inline : ''}`}>
      <div className={styles.spinner} aria-hidden="true" />
      <span className={styles.text}>{text || t('loadingData')}</span>
    </div>
  );
}
