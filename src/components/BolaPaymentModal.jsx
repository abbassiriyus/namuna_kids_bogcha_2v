"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Pencil, Trash2 } from 'lucide-react';
import url from '../host/host';
import styles from '../styles/BolaPaymentModal.module.css';
import { useLang } from '../i18n/LanguageContext';

export default function BolaPaymentModal({ bola, onClose }) {
  const { t } = useLang();
  const [payments, setPayments] = useState([]);
  const [miqdor, setMiqdor] = useState('');
  const [sana, setSana] = useState('');
  const [editing, setEditing] = useState(null);

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${url}/bola-pay-new?bola_id=${bola.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPayments(res.data);
    } catch (err) {
      console.error('To‘lovlar yuklashda xatolik:', err);
    }
  };




  useEffect(() => {
    
    fetchPayments();
  }, []);

  const handleSave = async () => {
    try {
      if (editing) {
        await axios.put(`${url}/bola-pay-new/${editing.id}`, {
          bola_id: bola.id,
          miqdor: parseFloat(miqdor),
          sana,
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post(`${url}/bola-pay-new`, {
          bola_id: bola.id,
          miqdor: parseFloat(miqdor),
          sana
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }

      setMiqdor('');
      setSana('');
      setEditing(null);
      fetchPayments();
    } catch (err) {
      console.error('To‘lov saqlashda xatolik:', err);
    }
  };

  const handleEdit = (p) => {
    setMiqdor(p.miqdor);
    setSana(p.sana);
    setEditing(p);
  };

  const handleDelete = async (id) => {
    if (confirm(t('confirmDeletePayment'))) {
      try {
        await axios.delete(`${url}/bola-pay-new/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchPayments();
      } catch (err) {
        console.error('To‘lovni o‘chirishda xatolik:', err);
      }
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <h2>{bola.username} — {t('payments')}</h2>
          <button onClick={onClose} className={styles.closeBtn} title={t('close')}><X size={18} /></button>
        </div>

        <div className={styles.inputRow}>
          <input
            type="number"
            placeholder={t('amount')}
            value={miqdor}
            onChange={(e) => setMiqdor(e.target.value)}
            className={styles.input}
          />
          <input
            type="date"
            value={sana}
            onChange={(e) => setSana(e.target.value)}
            className={styles.input}
          />
          <button onClick={handleSave} className={styles.addBtn}>
            {editing ? t('update') : t('add')}
          </button>
          {editing && (
            <button onClick={() => {
              setMiqdor('');
              setSana('');
              setEditing(null);
            }} className={styles.cancelBtn}>
              {t('cancel')}
            </button>
          )}
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>{t('amount')}</th>
              <th>{t('date')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
     <tbody>
  {payments.length === 0 ? (
    <tr>
      <td colSpan="4" className={styles.empty}>{t('noData')}</td>
    </tr>
  ) : (
    payments.map((p, idx) => (
      <tr key={p.id}>
        <td>{idx + 1}</td>
        <td>{p.miqdor}</td>
        <td>{p.sana}</td>
        <td>
          {!p.readonly && (
            <>
              <button onClick={() => handleEdit(p)} className={styles.editBtn} title={t('edit')}><Pencil size={16} /></button>
              <button onClick={() => handleDelete(p.id)} className={styles.deleteBtn} title={t('delete')}><Trash2 size={16} /></button>
            </>
          )}
          {p.readonly && (
            <span className="text-gray-400 italic">{t('mainSalary')}</span>
          )}
        </td>
      </tr>
    ))
  )}
</tbody>
        </table>
      </div>
    </div>
  );
}
