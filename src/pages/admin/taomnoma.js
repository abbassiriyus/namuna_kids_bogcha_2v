// TaomnomaPage.jsx
"use client";

import { useEffect, useState } from 'react';
import LayoutComponent from '../../components/LayoutComponent';
import axios from 'axios';
import url from '../../host/host';
import { Plus, Trash2, Pencil } from 'lucide-react';
import TaomModal from '../../components/TaomModal';
import IngredientList from '../../components/IngredientList';
import AdminHeader from '../../components/AdminHeader';
import styles from '../../styles/TaomnomaPage.module.css'
export default function TaomnomaPage() {
  const [taomlar, setTaomlar] = useState([]);
  const [selectedTaom, setSelectedTaom] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  const fetchTaomlar = async () => {
    const res = await axios.get(`${url}/taom`);
    setTaomlar(res.data);
  };

  useEffect(() => {
    fetchTaomlar();
  }, []);

  const handleDelete = async (id) => {
    await axios.delete(`${url}/taom/` + id);
    fetchTaomlar();
  };

return (
  <LayoutComponent>
    <div className="mb-6">
      <AdminHeader title="Taomnoma" onCreate={() => { setSelectedTaom(null); setOpenModal(true); }} />
    </div>

    <div className={styles.gridContainer}>
      {taomlar.map((taom) => (
        <div key={taom.id} className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.taomTitle}>{taom.nomi}</h2>
            <div className={styles.buttonGroup}>
              <button onClick={() => { setSelectedTaom(taom); setOpenModal(true); }}
               className={styles.iconButton}>
                <Pencil size={16} />
                <span>Tahrirlash</span>
              </button>
              <button onClick={() => handleDelete(taom.id)} className={styles.iconButtonDelete}>
                <Trash2 size={16} />
                <span>O‘chirish</span>
              </button>
            </div>
          </div>
          <IngredientList taomId={taom.id} />
        </div>
      ))}
    </div>

    <TaomModal open={openModal} setOpen={setOpenModal} taom={selectedTaom} onSaved={fetchTaomlar} />
  </LayoutComponent>
);
}
