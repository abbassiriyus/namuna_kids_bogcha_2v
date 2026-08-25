"use client";

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import styles from '../styles/BolaModal.module.css';
import axios from 'axios';
import url from '../host/host';
import { getText } from '../i18n/translations';

export default function TaomModal({ open, setOpen, taom, onSaved }) {
  const [nomi, setNomi] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(taom);

  useEffect(() => {
    setNomi(taom?.nomi || '');
    setError('');
  }, [taom, open]);

  const handleSubmit = async () => {
    if (!nomi.trim()) {
      setError(getText('fillAllFields'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await axios.put(`${url}/taom/${taom.id}`, { nomi: nomi.trim() });
      } else {
        await axios.post(`${url}/taom`, { nomi: nomi.trim() });
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || getText('saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modal__content}>
        <h3 className={styles.modal__title}>{isEdit ? getText('editMeal') : getText('createMenu')}</h3>
        <div className={styles.modal__form}>
          <input
            name="nomi"
            value={nomi}
            onChange={(e) => setNomi(e.target.value)}
            placeholder={getText('mealName')}
            autoFocus
          />
        </div>
        {error && <p style={{ color: '#dc2626', margin: '4px 0' }}>{error}</p>}
        <div className={styles.modal__buttons}>
          <button onClick={handleSubmit} disabled={saving}>
            <Check size={16} /> {saving ? getText('saving') : getText('save')}
          </button>
          <button onClick={() => setOpen(false)}><X size={16} /> {getText('cancel')}</button>
        </div>
      </div>
    </div>
  );
}
