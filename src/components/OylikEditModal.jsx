"use client";
import { useState } from "react";
import { Check, X } from "lucide-react";
import styles from "../styles/BolaModal.module.css";
import axios from "axios";
import url from "../host/host";
import { useLang } from '../i18n/LanguageContext';

export default function OylikEditModal({ open, onClose, xodim, onSaved }) {
  const { t } = useLang();
  const [bonus, setBonus] = useState('');
  const [jarima, setJarima] = useState('');
  const [kunlik, setKunlik] = useState('');
  const [oylikNarx, setOylikNarx] = useState('');

  const token = localStorage.getItem('token');

  const handlePost = async (endpoint, narx) => {
    try {
      await axios.post(`${url}/${endpoint}`, {
        xodim_id: xodim.id,
        narx: parseFloat(narx),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onSaved();
      alert(t('oylik.saved'));
    } catch (err) {
      console.error(err);
      alert(t('oylik.error'));
    }
  };

const handleOylikTolash = async () => {
  try {
    const summa = parseFloat(oylikNarx);

    if (!oylikNarx || isNaN(summa)) {
      alert(t('oylik.invalidPaidAmount'));
      return;
    }

    if (summa > xodim.total) {
      alert(t('oylik.exceedsTotal').replace('{total}', xodim.total));
      return;
    }

    await axios.post(`${url}/oylik_type`, {
      xodim_id: xodim.id,
      narx: summa,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    onSaved();
    alert(t('oylik.paidSaved'));
  } catch (err) {
    console.error(err);
    alert(t('oylik.error'));
  }
};


  if (!open || !xodim) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modal__content}>
        <h3 className={styles.modal__title}>{t('oylik.actionsTitle')} {xodim.name}</h3>

        <div className={styles.modal__form}>
          <label>{t('oylik.addBonusLabel')}</label>
          <input type="number" value={bonus} onChange={e => setBonus(e.target.value)} />
          <button onClick={() => handlePost('bonus', bonus)}>{t('add')}</button>
        </div>

        <div className={styles.modal__form}>
          <label>{t('oylik.addPenaltyLabel')}</label>
          <input type="number" value={jarima} onChange={e => setJarima(e.target.value)} />
          <button onClick={() => handlePost('jarima', jarima)}>{t('add')}</button>
        </div>

        <div className={styles.modal__form}>
          <label>{t('oylik.addDailyLabel')}</label>
          <input type="number" value={kunlik} onChange={e => setKunlik(e.target.value)} />
          <button onClick={() => handlePost('kunlik', kunlik)}>{t('add')}</button>
        </div>

        <div className={styles.modal__form}>
          <label>{t('oylik.paidAmountLabel')}</label>
          <input
            type="number"
            value={oylikNarx}
            onChange={e => setOylikNarx(e.target.value)}
            placeholder={t('oylik.paidAmountPlaceholder')}
          />
          <button
            onClick={handleOylikTolash}
            style={{ background: '#4caf50', color: '#fff', padding: '8px', marginTop: '0.5rem' }}
          >
            <Check size={16} /> {t('oylik.payButton')}
          </button>
        </div>

        <div className={styles.modal__buttons}>
          <button onClick={onClose}><X size={16} /> {t('close')}</button>
        </div>
      </div>
    </div>
  );
}
