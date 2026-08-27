import { useEffect, useState } from 'react';
import { Trash2, Plus, Check, X } from 'lucide-react';
import styles from '../styles/BolaModal.module.css';
import axios from 'axios';
import url from '../host/host';
import ErrorModal from './ErrorModal';
import { toLocalDate } from '../utils/sana';
import { useLang } from '../i18n/LanguageContext';

export default function ChiqimModal({ isOpen, onClose, onSave, products = [], initialData = null }) {
  const { t } = useLang();
  const [rows, setRows] = useState([{ sklad_product_id: '', hajm: '', description: '' }]);
  const [chiqimSana, setChiqimSana] = useState('');
  const [availableHajm, setAvailableHajm] = useState({}); // product_id => hajm
  const [modalError, setModalError] = useState('');
const [groupOptions, setGroupOptions] = useState([]);
  const token = localStorage.getItem('token') ? localStorage.getItem('token') : null;
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
useEffect(() => {
  if (!isOpen) return;

  // Guruhlarni yuklash
  axios
    .get(`${url}/guruh`, authHeader)
    .then(res => {
      setGroupOptions(res.data); // ⚠️ res.data massiv bo‘lishi kerak
    })
    .catch(err => {
      console.error("Guruhlar yuklashda xatolik:", err);
    });

  calculateAvailableHajm();
}, [isOpen]);
  useEffect(() => {
    if (initialData) {
      setRows([{ ...initialData }]);
      setChiqimSana(initialData.chiqim_sana?.slice(0, 10) || '');
    } else {
      setRows([{ sklad_product_id: '', hajm: '', description: '' }]);
      setChiqimSana('');
    }
  }, [initialData]);

  useEffect(() => {
    if (isOpen) {
      calculateAvailableHajm(); // Modal ochilganda hisobla
    }
  }, [isOpen]);

  const calculateAvailableHajm = async () => {
    try {
      const [productsRes, kirimRes, chiqimRes] = await Promise.all([
        axios.get(`${url}/sklad_maishiy`, authHeader),
        axios.get(`${url}/kirim_maishiy`, authHeader),
        axios.get(`${url}/chiqim_maishiy`, authHeader),
      ]);

      const productList = productsRes.data;
      const kirimlar = kirimRes.data;
      const chiqimlar = chiqimRes.data;

      const kirimMap = {};
      kirimlar.forEach(k => {
        const id = Number(k.sklad_product_id);
        kirimMap[id] = (kirimMap[id] || 0) + Number(k.hajm || 0);
      });

      const chiqimMap = {};
      chiqimlar.forEach(c => {
        const id = Number(c.sklad_product_id);
        chiqimMap[id] = (chiqimMap[id] || 0) + Number(c.hajm || 0);
      });

      const availableMap = {};
      productList.forEach(p => {
        const id = Number(p.id);
        const boshlangich = Number(p.hajm || 0);
        const kirim = kirimMap[id] || 0;
        const chiqim = chiqimMap[id] || 0;
        availableMap[id] = boshlangich + kirim - chiqim;
      });

      setAvailableHajm(availableMap);
    } catch (err) {
      console.error('Mavjud hajmni hisoblashda xatolik:', err);
    }
  };

  const handleChange = (index, e) => {
    const { name, value } = e.target;
    const updatedRows = [...rows];
    updatedRows[index][name] = value;
    setRows(updatedRows);
  };

  const handleSubmit = () => {
    if (!chiqimSana) return setModalError(t('dateNotSelected'));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const entered = parseFloat(row.hajm || '0');
      const max = availableHajm[row.sklad_product_id] || 0;
      const qator = `${i + 1}-qator: `;

      if (!row.sklad_product_id) return setModalError(qator + t('productNotSelected'));
      if (!row.hajm || entered <= 0 || Number.isNaN(entered)) {
        return setModalError(qator + t('volumeInvalid'));
      }
      if (entered > max) {
        return setModalError(`${qator}${t('onlyAvailableInStorage').replace('{max}', max)}`);
      }
    }

    // ✅ Sana ustiga 1 kun qo‘shamiz
    const sanaWithOffset = new Date(chiqimSana);
    sanaWithOffset.setDate(sanaWithOffset.getDate() + 1);
    const formattedSana = toLocalDate(sanaWithOffset);

    const payload = rows.map(r => ({
      ...r,
      chiqim_sana: formattedSana,
    }));

    onSave(payload.length === 1 && initialData ? payload[0] : payload);
    onClose();
    setRows([{ sklad_product_id: '', hajm: '', description: '' }]);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modal__content}>
        <h3 className={styles.modal__title}>
          {initialData ? t('editExpense') : t('addExpenses')}
        </h3>

        <label>{t('expenseDateLabel')}</label>
        <input
          type="date"
          value={chiqimSana}
          onChange={(e) => setChiqimSana(e.target.value)}
          className={styles.input}
        />

        {rows.map((row, index) => {
          const productId = Number(row.sklad_product_id);
          const product = products.find(p => Number(p.id) === productId);
          const mavjud = availableHajm[productId];

          return (
            <div key={index} className={styles.modal__form} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  name="sklad_product_id"
                  value={row.sklad_product_id}
                  onChange={(e) => handleChange(index, e)}
                  className={styles.input}
                  style={{ flex: 1 }}
                >
                  <option value="">{t('selectProductPlaceholder')}</option>
                  {products.sort((a, b) => a.nomi.localeCompare(b.nomi)).map(p => (
                    <option key={p.id} value={p.id}>{p.nomi}</option>
                  ))}
                </select>

                <input
                  type="number"
                  name="hajm"
                  value={row.hajm}
                  onChange={(e) => handleChange(index, e)}
                  placeholder={t('colVolume')}
                  className={styles.input}
                  style={{ flex: 1 }}
                />

                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRows(rows.filter((_, i) => i !== index))}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '20px',
                      color: 'red',
                      cursor: 'pointer',
                    }}
                    title={t('delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

{/* Izoh / Guruh tanlash */}
<label style={{ marginTop: '8px' }}>{t('commentGroupLabel')}</label>
<select
  name="description"
  value={row.description.startsWith('custom:') ? 'other' : row.description}
  onChange={(e) => {
    const val = e.target.value;
    const updatedRows = [...rows];
    updatedRows[index].description = val === 'other' ? 'B:' : val;
    setRows(updatedRows);
  }}
  className={styles.input}
  style={{ width: '96%' }}
>
  <option value="">{t('selectGroupPlaceholder')}</option>
  {groupOptions.map((group) => (
    <option key={group.id} value={group.name}>{group.name}</option>
  ))}
  <option value="Ko`cha">{t('placeStreet')}</option>
  <option value="Oshxona">{t('placeKitchen')}</option>
  <option value="Karidor">{t('placeCorridor')}</option>

  <option value="other">{t('otherDots')}</option>
</select>

{/* Agar "➕ Boshqa..." tanlansa, input ochiladi */}
{row.description.startsWith('custom:') && (
  <input
    type="text"
    placeholder={t('extraCommentPlaceholder')}
    className={styles.input}
    style={{ width: '96%', marginTop: '5px' }}
    value={row.description.replace('custom:', '')}
    onChange={(e) => {
      const updatedRows = [...rows];
      updatedRows[index].description = 'custom:' + e.target.value;
      setRows(updatedRows);
    }}
  />
)}

              {mavjud !== undefined && (
                <p style={{ marginTop: '4px', color: 'gray' }}>
                  <strong>{t('availableVolumeLabel')}</strong> {mavjud} {product?.hajm_birlik || ''}
                </p>
              )}
            </div>
          );
        })}

        <button
          onClick={() => setRows([...rows, { sklad_product_id: '', hajm: '', description: '' }])}
          className={styles.saveBtn}
          style={{
            marginBottom: '10px',
            padding: '8px 12px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          <Plus size={16} /> Yana qator
        </button>

        <div className={styles.modal__buttons}>
          <button onClick={handleSubmit}><Check size={16} /> {t('save')}</button>
          <button onClick={onClose}><X size={16} /> {t('cancel')}</button>
        </div>
      </div>
      <ErrorModal message={modalError} onClose={() => setModalError('')} />
    </div>
  );
}
