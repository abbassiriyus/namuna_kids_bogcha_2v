"use client";

import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import styles from "../styles/BolaModal.module.css";
import axios from "axios";
import url from "../host/host";
import { getText } from '../i18n/translations';

export default function OylikDeleteModal({ open, onClose, xodim, selectedMonth, onSaved }) {
  const [bonus, setBonus] = useState([]);
  const [jarima, setJarima] = useState([]);
  const [kunlik, setKunlik] = useState([]);
  const [oylikType, setOylikType] = useState([]);
  const token = localStorage.getItem("token");

  const fetchData = async () => {
    if (!xodim || !selectedMonth) return;

    try {
      const [bonusRes, jarimaRes, kunlikRes, oylikRes] = await Promise.all([
        axios.get(`${url}/bonus?month=${selectedMonth}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${url}/jarima?month=${selectedMonth}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${url}/kunlik?month=${selectedMonth}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${url}/oylik_type?month=${selectedMonth}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      

      setBonus(bonusRes.data.filter(b => b.xodim_id === xodim));
      setJarima(jarimaRes.data.filter(j => j.xodim_id === xodim));
      setKunlik(kunlikRes.data.filter(k => k.xodim_id === xodim));
      setOylikType(oylikRes.data.filter(o => o.xodim_id === xodim));
    } catch (err) {
      console.error("Ma'lumotlarni olishda xatolik:", err);
      alert(getText('loadError'));
    }
  };

  const handleDelete = async (endpoint, id) => {
    try {
      await axios.delete(`${url}/${endpoint}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
      onSaved();
    } catch (err) {
      console.error(err);
      alert(getText('deleteError'));
    }
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open, xodim, selectedMonth]);

  if (!open) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modal__content}>
        <h3 className={styles.modal__title}>{getText('manageSalary')}: {xodim?.name}</h3>

        <div className={styles.modal__section}>
          <strong>{getText('bonusLabel')}:</strong>
          {bonus.length > 0 ? (
            bonus.map((b) => (
              <div key={b.id} className={styles.modal__row}>
                <span>{b.narx} {getText('currencySom')}</span>
                <button onClick={() => handleDelete("bonus", b.id)} title={getText('delete')}><Trash2 size={16} /></button>
              </div>
            ))
          ) : (
            <p>{getText('noBonus')}</p>
          )}
        </div>

        <div className={styles.modal__section}>
          <strong>{getText('penaltyTitle')}:</strong>
          {jarima.length > 0 ? (
            jarima.map((j) => (
              <div key={j.id} className={styles.modal__row}>
                <span>{j.narx} {getText('currencySom')}</span>
                <button onClick={() => handleDelete("jarima", j.id)} title={getText('delete')}><Trash2 size={16} /></button>
              </div>
            ))
          ) : (
            <p>{getText('noPenalty')}</p>
          )}
        </div>

        <div className={styles.modal__section}>
          <strong>{getText('dailyTitle')}:</strong>
          {kunlik.length > 0 ? (
            kunlik.map((k) => (
              <div key={k.id} className={styles.modal__row}>
                <span>{k.narx} {getText('currencySom')}</span>
                <button onClick={() => handleDelete("kunlik", k.id)} title={getText('delete')}><Trash2 size={16} /></button>
              </div>
            ))
          ) : (
            <p>{getText('noDaily')}</p>
          )}
        </div>

        <div className={styles.modal__section}>
          <strong>{getText('paidSalaries')}:</strong>
          {oylikType.length > 0 ? (
            oylikType.map((o) => (
              <div key={o.id} className={styles.modal__row}>
                <span>{o.narx} {getText('currencySom')}</span>
                <button onClick={() => handleDelete("oylik_type", o.id)} title={getText('delete')}><Trash2 size={16} /></button>
              </div>
            ))
          ) : (
            <p>{getText('noPayment')}</p>
          )}
        </div>

        <div className={styles.modal__buttons}>
          <button onClick={onClose}><X size={16} /> {getText('close')}</button>
        </div>
      </div>
    </div>
  );
}
