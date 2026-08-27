import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import styles from '../styles/BolaModal.module.css'; // qayta ishlatamiz
import { useLang } from '../i18n/LanguageContext';

export default function SkladModal({ isOpen, onClose, onSave, initialData }) {
  const { t } = useLang();
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
          {initialData ? t('editProduct') : t('newProduct')}
        </h3>

        <div className={styles.modal__form}>
          <input
            name="nomi"
            value={formData.nomi}
            onChange={handleChange}
            placeholder={t('productNamePlaceholder')}
          />
          <input
            name="hajm"
            type="number"
            value={formData.hajm}
            onChange={handleChange}
            placeholder={t('volumePlaceholder')}
          />
          {/* value — bazadagi qiymat, o'zgarmaydi; faqat ko'rinadigan nomi tarjima qilinadi. */}
          <select name="hajm_birlik" value={formData.hajm_birlik} onChange={handleChange}>
            <option value="kg">{t('unitKg')}</option>
            <option value="litr">{t('unitLitr')}</option>
            <option value="dona">{t('unitDona')}</option>
            <option value="metr">{t('unitMetr')}</option>
            <option value={"bog'"}>{t('unitBogh')}</option>
            <option value="gramm">{t('unitGramm')}</option>
          </select>
        </div>

        <div className={styles.modal__buttons}>
          <button onClick={handleSubmit}><Check size={16} /> {t('save')}</button>
          <button onClick={onClose}><X size={16} /> {t('cancel')}</button>
        </div>
      </div>
    </div>
  );
}
