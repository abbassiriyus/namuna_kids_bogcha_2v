"use client";

import { useCallback, useEffect, useState } from 'react';
import LayoutComponent from '../../components/LayoutComponent';
import axios from 'axios';
import url from '../../host/host';
import { Trash2, Pencil } from 'lucide-react';
import TaomModal from '../../components/TaomModal';
import IngredientList from '../../components/IngredientList';
import AdminHeader from '../../components/AdminHeader';
import ErrorModal from '../../components/ErrorModal';
import { useLang } from '../../i18n/LanguageContext';
import styles from '../../styles/TaomnomaPage.module.css';

export default function TaomnomaPage() {
  const { t } = useLang();
  const [taomlar, setTaomlar] = useState([]);
  const [tarix, setTarix] = useState([]);
  const [selectedTaom, setSelectedTaom] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [error, setError] = useState('');

  const fetchTaomlar = useCallback(async () => {
    try {
      const res = await axios.get(`${url}/taom`);
      setTaomlar(res.data);
    } catch {
      setError(t('loadError'));
    }
  }, []);

  const fetchTarix = useCallback(async () => {
    try {
      const res = await axios.get(`${url}/taom/ishlatish`);
      setTarix(res.data);
    } catch {
      setError(t('loadError'));
    }
  }, []);

  useEffect(() => {
    fetchTaomlar();
    fetchTarix();
  }, [fetchTaomlar, fetchTarix]);

  const handleDelete = async (id) => {
    if (!window.confirm(t('deleteMealConfirm'))) return;
    try {
      await axios.delete(`${url}/taom/${id}`);
      await Promise.all([fetchTaomlar(), fetchTarix()]);
    } catch {
      setError(t('deleteError'));
    }
  };

  return (
    <LayoutComponent>
      <div className="mb-6">
        <AdminHeader
          title={t('menuTitle')}
          createLabel={t('createMenu')}
          onCreate={() => { setSelectedTaom(null); setOpenModal(true); }}
        />
      </div>

      {taomlar.length === 0 ? (
        <p className={styles.emptyState}>{t('noMealsYet')}</p>
      ) : (
        <div className={styles.gridContainer}>
          {taomlar.map((taom) => (
            <div key={taom.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.taomTitle}>{taom.nomi}</h2>
                <div className={styles.buttonGroup}>
                  <button
                    onClick={() => { setSelectedTaom(taom); setOpenModal(true); }}
                    className={styles.iconButton}
                  >
                    <Pencil size={16} />
                    <span>{t('edit')}</span>
                  </button>
                  <button onClick={() => handleDelete(taom.id)} className={styles.iconButtonDelete}>
                    <Trash2 size={16} />
                    <span>{t('delete')}</span>
                  </button>
                </div>
              </div>
              <IngredientList taomId={taom.id} onUsed={fetchTarix} />
            </div>
          ))}
        </div>
      )}

      <section className={styles.historySection}>
        <h3 className={styles.historyTitle}>{t('usageHistory')}</h3>
        {tarix.length === 0 ? (
          <p className={styles.emptyState}>{t('noUsageYet')}</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  <th>{t('colMeal')}</th>
                  <th>{t('childrenCount')}</th>
                </tr>
              </thead>
              <tbody>
                {tarix.map((row) => (
                  <tr key={row.id}>
                    <td>{String(row.sana).slice(0, 10)}</td>
                    <td>{row.taom_nomi}</td>
                    <td>{row.bolalar_soni}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TaomModal open={openModal} setOpen={setOpenModal} taom={selectedTaom} onSaved={fetchTaomlar} />
      <ErrorModal message={error} onClose={() => setError('')} />
    </LayoutComponent>
  );
}
