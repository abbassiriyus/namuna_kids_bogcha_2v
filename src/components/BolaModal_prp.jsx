import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import styles from '../styles/BolaModal.module.css';
import { useLang } from '../i18n/LanguageContext';

export default function BolaModal({ bola, onClose, onSave, guruhlar = [] }) {
  const { t } = useLang();
  const [formData, setFormData] = useState(bola || {});
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    for (let j = 0; j < guruhlar.length; j++) {
      if (typeof formData.guruh_id === 'string' && formData.guruh_id.includes(guruhlar[j].name)) {
        formData.guruh_id = guruhlar[j].id;
      }
    }
    const initialForm = bola || {};
    if (!initialForm.holati) {
      initialForm.holati = 'boshlangich'; // 🔸 Default holati
    }
    setFormData(initialForm);
    setErrors({});
    setServerError('');
  }, [bola]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError('');
  };

  const handleSubmit = async () => {
    const requiredFields = [
      'username', 'metrka', 'guruh_id', 'tugilgan_kun',
      'oylik_toliv', 'ota_fish', 'ota_phone',
      'ona_fish', 'ona_phone'
    ];

    const newErrors = {};
    requiredFields.forEach((field) => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        newErrors[field] = t('requiredField');
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || t('saveError');
      setServerError(msg);
    }
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modal__content}>
        <h3 className={styles.modal__title}>{t('editStudent')}</h3>
        <div className={styles.modal__form}>

          {serverError && (
            <div style={{ color: 'red', marginBottom: '10px' }}>
              {serverError}
            </div>
          )}

          <Input name="username" placeholder={t('colFullName')} value={formData.username} onChange={handleChange} error={errors.username} />
          <Input name="metrka" placeholder={t('colMetrka')} value={formData.metrka} onChange={handleChange} error={errors.metrka} />
          <Select name="guruh_id" value={formData.guruh_id} onChange={handleChange} options={guruhlar} error={errors.guruh_id} />
          <Input name="tugilgan_kun" type="date" value={formData.tugilgan_kun?.slice(0, 10)} onChange={handleChange} error={errors.tugilgan_kun} />
          <Input name="oylik_toliv" type="number" placeholder={t('colMonthlyFee')} value={formData.oylik_toliv} onChange={handleChange} error={errors.oylik_toliv} />
          <Input name="balans" type="number" placeholder={t('colBalance')} value={formData.balans} onChange={handleChange} />
          
          {/* 🔽 Yangi holati select */}
          <Select
            name="holati"
            value={formData.holati}
            onChange={handleChange}
            options={[
              { id: 'boshlangich', name: t('statusInitial') },
              { id: 'qabul_qilindi', name: t('statusAccepted') },
              { id: 'kelmay_qoydi', name: t('statusStopped') }
            ]}
            error={errors.holati}
          />

          <h4>{t('fatherInfo')}</h4>
          <Input name="ota_fish" placeholder={t('colFatherName')} value={formData.ota_fish} onChange={handleChange} error={errors.ota_fish} />
          <Input name="ota_phone" placeholder={t('colFatherPhone')} value={formData.ota_phone} onChange={handleChange} error={errors.ota_phone} />
          <Input name="ota_pasport" placeholder={t('colFatherPassport')} value={formData.ota_pasport} onChange={handleChange} />

          <h4>{t('motherInfo')}</h4>
          <Input name="ona_fish" placeholder={t('colMotherName')} value={formData.ona_fish} onChange={handleChange} error={errors.ona_fish} />
          <Input name="ona_phone" placeholder={t('colMotherPhone')} value={formData.ona_phone} onChange={handleChange} error={errors.ona_phone} />
          <Input name="ona_pasport" placeholder={t('colMotherPassport')} value={formData.ona_pasport} onChange={handleChange} />

          <Input name="qoshimcha_phone" placeholder={t('colExtraPhone')} value={formData.qoshimcha_phone} onChange={handleChange} />
          <Input name="address" placeholder={t('colAddress')} value={formData.address} onChange={handleChange} />

          <div>
            <textarea
              name="description"
              placeholder={t('comment')}
              value={formData.description || ''}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </div>
        </div>

        <div className={styles.modal__buttons}>
          <button onClick={handleSubmit}><Check size={16} /> {t('save')}</button>
          <button onClick={onClose}><X size={16} /> {t('cancel')}</button>
        </div>
      </div>
    </div>
  );
}

// 🔸 Input komponenti
function Input({ name, value, onChange, placeholder, error, type = 'text' }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <input
        name={name}
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          border: error ? '1px solid red' : '1px solid #ccc',
          padding: '6px',
          width: '100%'
        }}
      />
      {error && <div style={{ color: 'red', fontSize: '12px', marginTop: '2px' }}>{error}</div>}
    </div>
  );
}

// 🔸 Select komponenti
function Select({ name, value, onChange, options, error }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        style={{
          border: error ? '1px solid red' : '1px solid #ccc',
          padding: '6px',
          width: '100%'
        }}
      >
        <option value="">{t('selectPlaceholder')}</option>
        {options.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
      {error && <div style={{ color: 'red', fontSize: '12px', marginTop: '2px' }}>{error}</div>}
    </div>
  );
}
