import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import styles from '../styles/BolaModal.module.css';
import { getText } from '../i18n/translations';

export default function QoshimchaModal({ isOpen, onClose, onSave, initialData }) {
  const [form, setForm] = useState({ price: '', description: '' });

  useEffect(() => {
    if (isOpen) {
      setForm(initialData || { price: '', description: '' });
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
        <h3 className={styles.modal__title}>{getText('extraExpense')}</h3>
        <div className={styles.modal__form}>
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            placeholder={getText('price')}
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder={getText('comment')}
          />
        </div>
        <div className={styles.modal__buttons}>
          <button onClick={handleSubmit}><Check size={16} /> {getText('save')}</button>
          <button onClick={onClose}><X size={16} /> {getText('cancel')}</button>
        </div>
      </div>
    </div>
  );
}
