"use client";

import { useState } from "react";
import axios from "axios";
import url from "../host/host";
import styles from "../styles/BolaModal.module.css"; // IngredientModal asosidagi style
import { getText } from "../i18n/translations";

export default function UseTaomModal({ open, setOpen, taomId, onSaved }) {
    const [sana, setSana] = useState("");
    const [bolalarSoni, setBolalarSoni] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${url}/taom/ishlatish`, {
                taom_id: taomId,
                sana,
                bolalar_soni: parseInt(bolalarSoni),
            });

            setOpen(false);
            onSaved && onSaved(); // Refresh if needed
        } catch (err) {
            console.error("Xatolik:", err);
            alert("Ishlatishda xatolik yuz berdi.");
        }
    };

    if (!open) return null;

    return (
        <div className={styles.modal}>
            <div className={styles.modal__content}>
                <h3 className={styles.modal__title}>{getText('useMeal')}</h3>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <label className={styles.label}>
                        {getText('date')}:
                        <input
                            type="date"
                            className={styles.input}
                            value={sana}
                            onChange={(e) => setSana(e.target.value)}
                            required
                        />
                    </label>
                    <label className={styles.label}>
                        {getText('childrenCount')}:
                        <input
                            type="number"
                            min="1"
                            className={styles.input}
                            value={bolalarSoni}
                            onChange={(e) => setBolalarSoni(e.target.value)}
                            required
                        />
                    </label>
                    <div className={styles.modal__buttons}>
                        <button type="submit" className={styles.saveButton}>{getText('save')}</button>
                        <button type="button" onClick={() => setOpen(false)} className={styles.cancelButton}>
                            {getText('cancel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
