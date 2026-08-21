"use client";
import { useState } from "react";
import { Check, X } from "lucide-react";
import styles from "../styles/BolaModal.module.css";
import axios from "axios";
import url from "../host/host";

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
      alert("Saqlandi");
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
    }
  };

const handleOylikTolash = async () => {
  try {
    const summa = parseFloat(oylikNarx);

    if (!oylikNarx || isNaN(summa)) {
      alert("To‘langan summa noto‘g‘ri");
      return;
    }

    if (summa > xodim.total) {
      alert(`To‘langan summa umumiy hisobdan (${xodim.total} so‘m) oshmasligi kerak!`);
      return;
    }

    await axios.post(`${url}/oylik_type`, {
      xodim_id: xodim.id,
      narx: summa,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    onSaved();
    alert("To‘langan summa saqlandi");
  } catch (err) {
    console.error(err);
    alert("Xatolik yuz berdi");
  }
};


  if (!open || !xodim) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modal__content}>
        <h3 className={styles.modal__title}>Oylik amallari: {xodim.name}</h3>

        <div className={styles.modal__form}>
          <label>Bonus qo‘shish:</label>
          <input type="number" value={bonus} onChange={e => setBonus(e.target.value)} />
          <button onClick={() => handlePost('bonus', bonus)}>Qo‘shish</button>
        </div>

        <div className={styles.modal__form}>
          <label>N/B yozish:</label>
          <input type="number" value={jarima} onChange={e => setJarima(e.target.value)} />
          <button onClick={() => handlePost('jarima', jarima)}>Qo‘shish</button>
        </div>

        <div className={styles.modal__form}>
          <label>Kunlik qo‘shish:</label>
          <input type="number" value={kunlik} onChange={e => setKunlik(e.target.value)} />
          <button onClick={() => handlePost('kunlik', kunlik)}>Qo‘shish</button>
        </div>

        <div className={styles.modal__form}>
          <label>To‘langan summa:</label>
          <input
            type="number"
            value={oylikNarx}
            onChange={e => setOylikNarx(e.target.value)}
            placeholder="Masalan: 1500000"
          />
          <button
            onClick={handleOylikTolash}
            style={{ background: '#4caf50', color: '#fff', padding: '8px', marginTop: '0.5rem' }}
          >
            <Check size={16} /> Oylik to‘landi (summani yozib saqlash)
          </button>
        </div>

        <div className={styles.modal__buttons}>
          <button onClick={onClose}><X size={16} /> Yopish</button>
        </div>
      </div>
    </div>
  );
}
