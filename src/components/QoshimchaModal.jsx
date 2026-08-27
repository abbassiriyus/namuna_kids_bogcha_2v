import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import styles from '../styles/BolaModal.module.css';
import { useLang } from '../i18n/LanguageContext';

export default function QoshimchaModal({ isOpen, onClose, onSave, initialData }) {
  const { t } = useLang();
  const [form, setForm] = useState({ price: '', payment_method: 'naqt', description: '' });

  useEffect(() => {
    if (isOpen) {
      setForm(initialData || { price: '', payment_method: 'naqt', description: '' });
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (form.price) {
      onSave(form);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modal__content}>
        <h3 className={styles.modal__title}>{t('extraExpense')}</h3>
        <div className={styles.modal__form}>
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            placeholder={t('price')}
          />
          <select name="payment_method" value={form.payment_method} onChange={handleChange}>
            <option value="naqt">Naqt</option>
            <option value="karta">Karta</option>
            <option value="bank">Bank</option>
            <option value="boshqa">Boshqa</option>
          </select>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder={t('comment')}
          />
        </div>
        <div className={styles.modal__buttons}>
          <button onClick={handleSubmit}><Check size={16} /> {t('save')}</button>
          <button onClick={onClose}><X size={16} /> {t('cancel')}</button>
        </div>
      </div>
    </div>
  );
}
