'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Save, X } from 'lucide-react';
import styles from '../styles/BolaModal.module.css';
import axios from 'axios';
import url from '../host/host';
import { useLang } from '../i18n/LanguageContext';

export default function DaromatModal({ open, onClose, bola, month, onSaved }) {
  const { t } = useLang();
  const [formData, setFormData] = useState({
    naqt: 0,
    karta: 0,
    prichislena: 0,
    naqt_prichislena: 0,
  });

  const [loading, setLoading] = useState(false); // Ma'lumotlarni yuklash holati
  const [saving, setSaving] = useState(false); // Saqlash holati

  // Inputlar uchun ref'lar
  const naqtRef = useRef(null);
  const kartaRef = useRef(null);
  const prichislenaRef = useRef(null);
  const naqtPrichislenaRef = useRef(null);

  // To'lov tanlangan oyning 1-sanasiga yoziladi (masalan "2024-06" -> "2024-06-01"),
  // shu bilan Tolovlar sahifasidagi hisob-kitob va DaromatDeleteModal bir xil oyni ko'radi.
  // Date obyekti ishlatilmaydi — mahalliy vaqt zonasi UTC ga aylantirishda
  // kunni bir kecha-kunduzga siljitib yuborishi mumkin edi.
  const getMonthStartDate = (monthStr) => `${monthStr}-01`;

  const sana = getMonthStartDate(month);

  useEffect(() => {
    if (bola && open) {
      const fetch = async () => {
        setLoading(true);
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${url}/daromat_type/bola/${bola.id}/${month}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.data.length > 0) {
            const { naqt, karta, prichislena, naqt_prichislena } = res.data[0];
            setFormData({
              naqt:  0,
              karta:  0,
              prichislena:  0,
              naqt_prichislena: 0,
            });
          } else {
            setFormData({
              naqt: 0,
              karta: 0,
              prichislena: 0,
              naqt_prichislena: 0,
            });
          }
        } catch (err) {
          console.error('Ma\'lumotlarni yuklashda xatolik:', err);
          setFormData({
            naqt: 0,
            karta: 0,
            prichislena: 0,
            naqt_prichislena: 0,
          }); // Xatolik yuz bersa ham inputlar 0 bo‘ladi
        } finally {
          setLoading(false);
        }
      };

      fetch();
      // Modal ochilganda birinchi inputga fokus qo‘yish
      naqtRef.current?.focus();
    }
  }, [open, bola, month]);

  const handleSave = async () => {
    if (saving) return; // Agar saqlash jarayoni davom etayotgan bo‘lsa, qayta saqlashni oldini olamiz
    const token = localStorage.getItem('token');
    setSaving(true);

    try {
      const payload = {
        bola_id: bola.id,
        sana,
        naqt: parseInt(formData.naqt) || 0,
        karta: parseInt(formData.karta) || 0,
        prichislena: parseInt(formData.prichislena) || 0,
        naqt_prichislena: parseInt(formData.naqt_prichislena) || 0,
      };

      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${url}/daromat_type`, payload, { headers });

      onSaved();
      onClose();
    } catch (error) {
      console.error('Saqlashda xatolik:', error);
    } finally {
      setSaving(false);
    }
  };

  // Enter tugmasi bilan inputlar orasida navigatsiya
  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Enter' && !loading && !saving) {
      e.preventDefault();
      if (nextRef) {
        nextRef.current.focus();
      } else {
        // Oxirgi inputda Enter bosilganda saqlash
        handleSave();
      }
    }
  };

  if (!open || !bola) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>{bola.fish} — {month} oyi uchun to‘lov</h3>

        {loading ? (
          <p style={{ padding: '10px 0', color: '#555' }}>{t('loadingData')}</p>
        ) : (
          <>
            <label>{t('autoDate')}:</label>
            <input
              type="text"
              defaultValue={sana}
              readOnly
              className={styles.disabledInput}
              style={{ backgroundColor: '#eee', marginBottom: '12px' }}
            />

            <label>{t('cashPayment')}:</label>
            <input
              type="number"
              placeholder={t('cashPayment')}
              defaultValue={formData.naqt || 0}
              onChange={(e) => setFormData({ ...formData, naqt: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, kartaRef)}
              ref={naqtRef}
            />

            <label>{t('cardPayment')}:</label>
            <input
              type="number"
              placeholder={t('cardPayment')}
              defaultValue={formData.karta || 0}
              onChange={(e) => setFormData({ ...formData, karta: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, prichislenaRef)}
              ref={kartaRef}
            />

            <label>{t('bankPayment')}:</label>
            <input
              type="number"
              placeholder={t('bankPayment')}
              defaultValue={formData.prichislena || 0}
              onChange={(e) => setFormData({ ...formData, prichislena: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, naqtPrichislenaRef)}
              ref={prichislenaRef}
            />

            <label>{t('bankCashPayment')}:</label>
            <input
              type="number"
              placeholder={t('bankCashPayment')}
              defaultValue={formData.naqt_prichislena || 0}
              onChange={(e) => setFormData({ ...formData, naqt_prichislena: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, null)}
              ref={naqtPrichislenaRef}
            />

            <div className={styles.modal__buttons}>
              {saving ? (
                <button disabled><Save size={16} /> {t('saving')}</button>
              ) : (
                <button onClick={handleSave}><Save size={16} /> {t('save')}</button>
              )}
              <button onClick={onClose}><X size={16} /> {t('close')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}