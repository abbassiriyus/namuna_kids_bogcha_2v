"use client";
import { useState } from "react";
import { Check, X } from "lucide-react";
import styles from "../styles/BolaModal.module.css";
import axios from "axios";
import url from "../host/host";
import { getText } from '../i18n/translations';

export default function OylikEditModal({ open, onClose, xodim, onSaved }) {
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
      alert(getText('oylik.saved'));
    } catch (err) {
      console.error(err);
      alert(getText('oylik.error'));
    }
  };

const handleOylikTolash = async () => {
  try {
    const summa = parseFloat(oylikNarx);

    if (!oylikNarx || isNaN(summa)) {
      alert(getText('oylik.invalidPaidAmount'));
      return;
    }

    if (summa > xodim.total) {
      alert(getText('oylik.exceedsTotal').replace('{total}', xodim.total));
      return;
    }

    await axios.post(`${url}/oylik_type`, {
      xodim_id: xodim.id,
      narx: summa,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    onSaved();
    alert(getText('oylik.paidSaved'));
  } catch (err) {
    console.error(err);
    alert(getText('oylik.error'));
  }
};


  if (!open || !xodim) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modal__content}>
        <h3 className={styles.modal__title}>{getText('oylik.actionsTitle')} {xodim.name}</h3>

        <div className={styles.modal__form}>
          <label>{getText('oylik.addBonusLabel')}</label>
          <input type="number" value={bonus} onChange={e => setBonus(e.target.value)} />
          <button onClick={() => handlePost('bonus', bonus)}>{getText('add')}</button>
        </div>

        <div className={styles.modal__form}>
          <label>{getText('oylik.addPenaltyLabel')}</label>
          <input type="number" value={jarima} onChange={e => setJarima(e.target.value)} />
          <button onClick={() => handlePost('jarima', jarima)}>{getText('add')}</button>
        </div>

        <div className={styles.modal__form}>
          <label>{getText('oylik.addDailyLabel')}</label>
          <input type="number" value={kunlik} onChange={e => setKunlik(e.target.value)} />
          <button onClick={() => handlePost('kunlik', kunlik)}>{getText('add')}</button>
        </div>

        <div className={styles.modal__form}>
          <label>{getText('oylik.paidAmountLabel')}</label>
          <input
            type="number"
            value={oylikNarx}
            onChange={e => setOylikNarx(e.target.value)}
            placeholder={getText('oylik.paidAmountPlaceholder')}
          />
          <button
            onClick={handleOylikTolash}
            style={{ background: '#4caf50', color: '#fff', padding: '8px', marginTop: '0.5rem' }}
          >
            <Check size={16} /> {getText('oylik.payButton')}
          </button>
        </div>

        <div className={styles.modal__buttons}>
          <button onClick={onClose}><X size={16} /> {getText('close')}</button>
        </div>
      </div>
    </div>
  );
}
