// TaomModal.jsx
"use client";

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import styles from '../styles/BolaModal.module.css';
import axios from 'axios';
import url from '../host/host';
import { getText } from '../i18n/translations';

export default function TaomModal({ open, setOpen, taom, onSaved }) {
  const [formData, setFormData] = useState(taom || {});

  const isEdit = Boolean(taom);

  useEffect(() => {
    setFormData(taom || {});
  }, [taom]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (isEdit) {
        await axios.put(`${url}/taom/${taom.id}`, formData);
      } else {
        await axios.post(`${url}/taom`, formData);
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      console.error("Saqlashda xatolik:", err);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modal__content}>
        <h3 className={styles.modal__title}>{isEdit ? getText('editMeal') : getText('addMeal')}</h3>
        <div className={styles.modal__form}>
          <input
            name="nomi"
            value={formData.nomi || ''}
            onChange={handleChange}
            placeholder={getText('mealName')}
          />
        </div>
        <div className={styles.modal__buttons}>
          <button onClick={handleSubmit}><Check size={16} /> {getText('save')}</button>
          <button onClick={() => setOpen(false)}><X size={16} /> {getText('cancel')}</button>
        </div>
      </div>
    </div>
  );
}
