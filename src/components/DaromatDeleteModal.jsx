'use client';

import React, { useEffect, useState } from 'react';
import { Save, X, Pencil, Trash2 } from 'lucide-react';
import styles from '../styles/BolaModal.module.css';
import axios from 'axios';
import url from '../host/host';
import { useLang } from '../i18n/LanguageContext';

export default function DaromatDeleteModal({ open, onClose, bolaId, month, onDeleted }) {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ naqt: '', karta: '', prichislena: '', naqt_prichislena: '' });

  useEffect(() => {
    if (!open || !bolaId || !month) return;

    const fetch = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const res = await axios.get(`${url}/daromat_type/bola/${bolaId}/${month}`, { headers });
        setItems(res.data || []);
        setEditItem(null); // reset edit state
      } catch (err) {
        console.error("Yuklashda xatolik:", err);
      }
    };

    fetch();
  }, [open, bolaId, month]);

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.delete(`${url}/daromat_type/${id}`, { headers });
      setItems(items.filter(item => item.id !== id));
      onDeleted?.();
    } catch (err) {
      console.error('O‘chirishda xatolik:', err);
    }
  };

  const startEdit = (item) => {
    setEditItem(item);
    setEditForm({
      naqt: item.naqt || '',
      karta: item.karta || '',
      prichislena: item.prichislena || '',
      naqt_prichislena: item.naqt_prichislena || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        bola_id: bolaId,
        sana: editItem.sana,
        naqt: parseInt(editForm.naqt) || 0,
        karta: parseInt(editForm.karta) || 0,
        prichislena: parseInt(editForm.prichislena) || 0,
        naqt_prichislena: parseInt(editForm.naqt_prichislena) || 0,
      };

      await axios.put(`${url}/daromat_type/${editItem.id}`, payload, { headers });

      const updated = items.map(i => (i.id === editItem.id ? { ...i, ...payload } : i));
      setItems(updated);
      setEditItem(null);
      onDeleted?.();
    } catch (err) {
      console.error('Tahrirlashda xatolik:', err);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>{t('incomeRecords')} ({month})</h3>

        {items.length === 0 ? (
          <p>{t('noData')}</p>
        ) : (
          <ul style={{ maxHeight: '300px', overflowY: 'auto', padding: 0 }}>
            {items.map(item => (
              <li key={item.id} style={{ marginBottom: 10 }}>
                {editItem?.id === item.id ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span>{t('date')}: {item.sana}</span>
                      <input type="number" placeholder={t('payCash')} value={editForm.naqt}
                        onChange={e => setEditForm({ ...editForm, naqt: e.target.value })} />
                      <input type="number" placeholder={t('payCard')} value={editForm.karta}
                        onChange={e => setEditForm({ ...editForm, karta: e.target.value })} />
                      <input type="number" placeholder={t('payBank')} value={editForm.prichislena}
                        onChange={e => setEditForm({ ...editForm, prichislena: e.target.value })} />
                      <input type="number" placeholder={t('payBankCash')} value={editForm.naqt_prichislena}
                        onChange={e => setEditForm({ ...editForm, naqt_prichislena: e.target.value })} />

                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <button onClick={handleSaveEdit} style={{ backgroundColor: '#15803d', color: 'white' }}>
                          <Save size={16} /> {t('save')}
                        </button>
                        <button onClick={() => setEditItem(null)}><X size={16} /> {t('cancel')}</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      {t('date')}: {item.sana} | {t('payCash')}: {item.naqt} | {t('payCard')}: {item.karta} | {t('payBank')}: {item.prichislena} | {t('payBankCash')}: {item.naqt_prichislena}
                    </span>
                    <div style={{ display: 'flex', gap: 8, marginLeft: 10 }}>
                      <button onClick={() => startEdit(item)} style={{ color: '#0c4a6e' }} title={t('edit')}><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(item.id)} style={{ color: 'red' }} title={t('delete')}><Trash2 size={16} /></button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className={styles.modal__buttons} style={{ marginTop: 20 }}>
          <button onClick={onClose}>{t('close')}</button>
        </div>
      </div>
    </div>
  );
}
