import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import styles from '../styles/BolaModal.module.css';

export default function GuruhModal({ guruh, onClose, onSave, xodimlar = [] }) {
  const [formData, setFormData] = useState(guruh || {});

  useEffect(() => {
    setFormData(guruh || {});
  }, [guruh]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const validData = {
      ...formData,
      xodim_id: Number(xodimlar.find(x => x.id === formData.xodim_id)?.id || formData.xodim_id)
    };
    onSave(validData);
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modal__content}>
        <h3 className={styles.modal__title}>
          {formData.id ? "Guruhni tahrirlash" : "Yangi guruh qo‘shish"}
        </h3>

        <div className={styles.modal__form}>
          <input
            className={styles.input}
            name="name"
            placeholder="Guruh nomi"
            value={formData.name || ''}
            onChange={handleChange}
          />

         <select
  className={styles.input}
  name="xodim_id"
  value={formData.xodim_id || ''}
  onChange={handleChange}
>
  <option value="">Tarbiyachi tanlang</option>
  {xodimlar.map((x) => (
    <option key={x.id} value={x.id}>{x.name}</option>
  ))}
</select>

        </div>

        <div className={styles.modal__buttons}>
          <button onClick={handleSubmit}><Check size={16} /> Saqlash</button>
          <button onClick={onClose}><X size={16} /> Bekor</button>
        </div>
      </div>
    </div>
  );
}
