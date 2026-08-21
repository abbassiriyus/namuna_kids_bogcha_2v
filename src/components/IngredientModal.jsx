"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import url from '../host/host';
import { Check, X } from 'lucide-react';
import styles from '../styles/BolaModal.module.css';
import { getText } from '../i18n/translations';

export default function IngredientModal({ open, setOpen, taomId, onSaved, ingredient }) {
  const [formData, setFormData] = useState({
    sklad_product_id: '',
    miqdor: '',
    miqdor_birlik: ''
  });
  const [mahsulotlar, setMahsulotlar] = useState([]);

  const isEdit = Boolean(ingredient);

  useEffect(() => {
    if (ingredient) {
      setFormData({
        sklad_product_id: ingredient.sklad_product_id || '',
        miqdor: ingredient.miqdor || '',
        miqdor_birlik: ingredient.miqdor_birlik || ''
      });
    } else {
      setFormData({ sklad_product_id: '', miqdor: '', miqdor_birlik: '' });
    }
  }, [ingredient]);

  useEffect(() => {
    const fetchProducts = async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${url}/sklad_product`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMahsulotlar(res.data);
    };
    fetchProducts();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Agar mahsulot tanlansa, birlikni avtomatik to‘ldiramiz
    if (name === 'sklad_product_id') {
      const selected = mahsulotlar.find(m => m.id == value);
      setFormData((prev) => ({
        ...prev,
        sklad_product_id: value,
        miqdor_birlik: selected?.hajm_birlik || ''
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post(`${url}/taom/${taomId}/ingredient`, formData);
      setOpen(false);
      onSaved();
    } catch (err) {
      console.error("Xatolik:", err);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modal__content}>
        <h3 className={styles.modal__title}>{getText('attachProduct')}</h3>
        <div className={styles.modal__form}>
          <select name="sklad_product_id" value={formData.sklad_product_id} onChange={handleChange}>
            <option value="">{getText('selectProduct')}</option>
            {mahsulotlar.map((m) => (
              <option key={m.id} value={m.id}>{m.nomi}</option>
            ))}
          </select>
          <input name="miqdor" value={formData.miqdor} onChange={handleChange} placeholder={getText('amount')} type="number" />
          <input name="miqdor_birlik" value={formData.miqdor_birlik} readOnly placeholder={getText('unitPlaceholder')} />
        </div>
        <div className={styles.modal__buttons}>
          <button onClick={handleSubmit}><Check size={16} /> {getText('save')}</button>
          <button onClick={() => setOpen(false)}><X size={16} /> {getText('cancel')}</button>
        </div>
      </div>
    </div>
  );
}
