"use client";

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import url from '../host/host';
import { Plus, Trash2, Pencil } from 'lucide-react';
import IngredientModal from '../components/IngredientModal';
import styles from '../styles/IngredientList.module.css';
import UseTaomModal from './UseTaomModal';
import { useLang } from '../i18n/LanguageContext';

export default function IngredientList({ taomId, onUsed }) {
  const { t } = useLang();
  const [ingredients, setIngredients] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [openUseModal, setOpenUseModal] = useState(false);

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await axios.get(`${url}/taom/${taomId}/ingredient`);
      setIngredients(res.data);
    } catch (err) {
      console.error('Mahsulotlarni olishda xatolik:', err);
    }
  }, [taomId]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${url}/taom_ingredient/${id}`);
      fetchIngredients();
    } catch (err) {
      console.error('O‘chirishda xatolik:', err);
    }
  };

  const handleUsed = () => {
    fetchIngredients();
    onUsed && onUsed();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>{t('requiredProducts')}</h4>
        <div className={styles.buttonGroup}>
          <button
            className={styles.actionButton}
            onClick={() => { setSelectedIngredient(null); setOpen(true); }}
          >
            <Plus size={16} />
            <span>{t('add')}</span>
          </button>
          <button
            className={styles.useButton}
            onClick={() => setOpenUseModal(true)}
            disabled={ingredients.length === 0}
            title={ingredients.length === 0 ? t('addIngredientFirst') : undefined}
          >
            <span>{t('useToday')}</span>
          </button>
        </div>
      </div>

      {ingredients.length === 0 ? (
        <p className={styles.empty}>{t('noIngredients')}</p>
      ) : (
        <ul className={styles.list}>
          {ingredients.map((item) => (
            <li key={item.id} className={styles.item}>
              <span className={styles.itemText}>
                {item.nomi} – {item.miqdor} {item.hajm_birlik}
                <small className={styles.stock}>
                  {' '}({t('availableInStorage')}: {item.mavjud} {item.hajm_birlik})
                </small>
              </span>
              <span className={styles.itemActions}>
                <button
                  className={styles.editButton}
                  onClick={() => { setSelectedIngredient(item); setOpen(true); }}
                  aria-label={t('edit')}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(item.id)}
                  aria-label={t('delete')}
                >
                  <Trash2 size={16} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <UseTaomModal
        open={openUseModal}
        setOpen={setOpenUseModal}
        taomId={taomId}
        onSaved={handleUsed}
      />

      <IngredientModal
        open={open}
        setOpen={setOpen}
        taomId={taomId}
        onSaved={fetchIngredients}
        ingredient={selectedIngredient}
      />
    </div>
  );
}
