"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import url from '../host/host';
import { Check, X } from 'lucide-react';
import styles from '../styles/BolaModal.module.css';
import { useLang } from '../i18n/LanguageContext';

export default function IngredientModal({ open, setOpen, taomId, onSaved, ingredient }) {
  const { t } = useLang();
  const [formData, setFormData] = useState({ sklad_product_id: '', miqdor: '', miqdor_birlik: '' });
  const [mahsulotlar, setMahsulotlar] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(ingredient);

  useEffect(() => {
    setError('');
    if (ingredient) {
      setFormData({
        sklad_product_id: ingredient.sklad_product_id || '',
        miqdor: ingredient.miqdor || '',
        miqdor_birlik: ingredient.hajm_birlik || '',
      });
    } else {
      setFormData({ sklad_product_id: '', miqdor: '', miqdor_birlik: '' });
    }
  }, [ingredient, open]);

  useEffect(() => {
    if (!open) return;
    axios
      .get(`${url}/sklad_product`)
      .then((res) => setMahsulotlar(res.data))
      .catch(() => setError(t('loadError')));
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Mahsulot tanlanganda birlik avtomatik to'ldiriladi.
    if (name === 'sklad_product_id') {
      const selected = mahsulotlar.find((m) => String(m.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        sklad_product_id: value,
        miqdor_birlik: selected?.hajm_birlik || '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.sklad_product_id || Number(formData.miqdor) <= 0) {
      setError(t('fillAllFields'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        sklad_product_id: Number(formData.sklad_product_id),
        miqdor: Number(formData.miqdor),
      };
      if (isEdit) {
        await axios.put(`${url}/taom_ingredient/${ingredient.id}`, payload);
      } else {
        await axios.post(`${url}/taom/${taomId}/ingredient`, payload);
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modal__content}>
        <h3 className={styles.modal__title}>
          {isEdit ? t('editIngredient') : t('attachProduct')}
        </h3>
        <div className={styles.modal__form}>
          <select name="sklad_product_id" value={formData.sklad_product_id} onChange={handleChange}>
            <option value="">{t('selectProduct')}</option>
            {mahsulotlar.map((m) => (
              <option key={m.id} value={m.id}>{m.nomi}</option>
            ))}
          </select>
          <input
            name="miqdor"
            value={formData.miqdor}
            onChange={handleChange}
            placeholder={t('amountPerChild')}
            type="number"
            min="0"
            step="any"
          />
          <input name="miqdor_birlik" value={formData.miqdor_birlik} readOnly placeholder={t('unitPlaceholder')} />
        </div>
        {error && <p style={{ color: '#dc2626', margin: '4px 0' }}>{error}</p>}
        <div className={styles.modal__buttons}>
          <button onClick={handleSubmit} disabled={saving}>
            <Check size={16} /> {saving ? t('saving') : t('save')}
          </button>
          <button onClick={() => setOpen(false)}><X size={16} /> {t('cancel')}</button>
        </div>
      </div>
    </div>
  );
}
