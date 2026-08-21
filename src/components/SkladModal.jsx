import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import styles from '../styles/BolaModal.module.css'; // qayta ishlatamiz

export default function SkladModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    nomi: '',
    hajm: '',
    hajm_birlik: 'kg'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        nomi: initialData.nomi || '',
        hajm: initialData.hajm || '',
        hajm_birlik: initialData.hajm_birlik || 'kg',
      });
    } else {
      setFormData({ nomi: '', hajm: '', hajm_birlik: 'kg' });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modal__content}>
        <h3 className={styles.modal__title}>
          {initialData ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
        </h3>

        <div className={styles.modal__form}>
          <input
            name="nomi"
            value={formData.nomi}
            onChange={handleChange}
            placeholder="Mahsulot nomi (masalan, Kartoshka)"
          />
          <input
            name="hajm"
            type="number"
            value={formData.hajm}
            onChange={handleChange}
            placeholder="Hajmi (masalan, 100)"
          />
          <select name="hajm_birlik" value={formData.hajm_birlik} onChange={handleChange}>
            <option value="kg">kg</option>
            <option value="litr">litr</option>
            <option value="dona">dona</option>
            <option value="metr">metr</option>
            <option value="bog'">bog'</option>
            <option value="gramm">gramm</option>


          </select>
        </div>

        <div className={styles.modal__buttons}>
          <button onClick={handleSubmit}><Check size={16} /> Saqlash</button>
          <button onClick={onClose}><X size={16} /> Bekor qilish</button>
        </div>
      </div>
    </div>
  );
}
