"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import url from '../host/host';
import { Plus, Trash2 } from 'lucide-react';
import IngredientModal from '../components/IngredientModal';
import styles from '../styles/IngredientList.module.css';
import UseTaomModal from './UseTaomModal';

export default function IngredientList({ taomId }) {
  const [ingredients, setIngredients] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);

const [openUseModal, setOpenUseModal] = useState(false);
  const fetchIngredients = async () => {
    try {
      const res = await axios.get(`${url}/taom/${taomId}/ingredient`);
      setIngredients(res.data);
    } catch (err) {
      console.error("Mahsulotlarni olishda xatolik:", err);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, [taomId]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${url}/taom_ingredient/${id}`);
      fetchIngredients();
    } catch (err) {
      console.error("O‘chirishda xatolik:", err);
    }
  };

 return (
  <div className={styles.container}>
    <div className={styles.header}>
      <h4 className={styles.title}>Kerakli mahsulotlar</h4>
      <div className={styles.buttonGroup}>
        <button className={styles.actionButton} onClick={() => {
          setSelectedIngredient(null);
          setOpen(true);
        }}>
          <Plus size={16} />
          <span>Qo‘shish</span>
        </button>
        <button className={styles.useButton} onClick={() => setOpenUseModal(true)}>
          <span>Ishlatish</span>
        </button>
      </div>
    </div>

    <ul className={styles.list}>
      {ingredients.map((item) => (
        <li key={item.id} className={styles.item}>
          <span className={styles.itemText}>
            {item.nomi} – {item.miqdor} {item.hajm_birlik}
          </span>
          <button className={styles.deleteButton} onClick={() => handleDelete(item.id)}>
            <Trash2 size={16} />
          </button>
        </li>
      ))}
    </ul>

    <UseTaomModal
      open={openUseModal}
      setOpen={setOpenUseModal}
      taomId={taomId}
      onSaved={fetchIngredients}
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
