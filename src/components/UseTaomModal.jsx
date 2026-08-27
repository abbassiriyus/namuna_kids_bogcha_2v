"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import url from "../host/host";
import styles from "../styles/BolaModal.module.css";
import { useLang } from "../i18n/LanguageContext";

const bugun = () => new Date().toISOString().slice(0, 10);

export default function UseTaomModal({ open, setOpen, taomId, onSaved }) {
  const { t } = useLang();
    const [sana, setSana] = useState(bugun);
    const [bolalarSoni, setBolalarSoni] = useState("");
    const [ingredients, setIngredients] = useState([]);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setSana(bugun());
        setBolalarSoni("");
        setError("");
        axios
            .get(`${url}/taom/${taomId}/ingredient`)
            .then((res) => setIngredients(res.data))
            .catch(() => setError(t('loadError')));
    }, [open, taomId]);

    const soni = Number(bolalarSoni) || 0;

    // Retseptdagi miqdor 1 bolaga — bolalar soniga ko'paytirib, ombordagi qoldiq bilan solishtiramiz.
    const hisob = useMemo(
        () =>
            ingredients.map((item) => {
                const kerak = Number(item.miqdor) * soni;
                return { ...item, kerak, yetadi: kerak <= Number(item.mavjud) };
            }),
        [ingredients, soni]
    );

    const yetmaydi = soni > 0 && hisob.some((r) => !r.yetadi);
    const saqlashMumkin = soni > 0 && ingredients.length > 0 && !yetmaydi && !saving;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!saqlashMumkin) return;

        setSaving(true);
        setError("");
        try {
            await axios.post(`${url}/taom/ishlatish`, {
                taom_id: taomId,
                sana,
                bolalar_soni: soni,
            });
            setOpen(false);
            onSaved && onSaved();
        } catch (err) {
            setError(err.response?.data?.error || t('saveError'));
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className={styles.modal}>
            <div className={styles.modal__content}>
                <h3 className={styles.modal__title}>{t('useMeal')}</h3>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <label className={styles.label}>
                        {t('date')}:
                        <input
                            type="date"
                            className={styles.input}
                            value={sana}
                            onChange={(e) => setSana(e.target.value)}
                            required
                        />
                    </label>
                    <label className={styles.label}>
                        {t('todayChildrenQuestion')}
                        <input
                            type="number"
                            min="1"
                            step="1"
                            className={styles.input}
                            value={bolalarSoni}
                            onChange={(e) => setBolalarSoni(e.target.value)}
                            required
                        />
                    </label>

                    {ingredients.length === 0 ? (
                        <p style={{ color: '#b45309', margin: '8px 0' }}>{t('addIngredientFirst')}</p>
                    ) : (
                        <div style={{ margin: '8px 0', maxHeight: 220, overflowY: 'auto' }}>
                            <strong style={{ display: 'block', marginBottom: 6 }}>{t('calculation')}</strong>
                            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: '#64748b' }}>
                                        <th style={{ padding: '4px 6px' }}>{t('colName')}</th>
                                        <th style={{ padding: '4px 6px' }}>{t('totalNeeded')}</th>
                                        <th style={{ padding: '4px 6px' }}>{t('availableInStorage')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hisob.map((row) => (
                                        <tr key={row.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '4px 6px' }}>{row.nomi}</td>
                                            <td style={{ padding: '4px 6px', color: row.yetadi ? '#15803d' : '#dc2626' }}>
                                                {row.kerak} {row.hajm_birlik}
                                            </td>
                                            <td style={{ padding: '4px 6px' }}>
                                                {row.mavjud} {row.hajm_birlik}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {yetmaydi && <p style={{ color: '#dc2626', margin: '4px 0' }}>{t('notEnoughStock')}</p>}
                    {error && <p style={{ color: '#dc2626', margin: '4px 0' }}>{error}</p>}

                    <div className={styles.modal__buttons}>
                        <button type="submit" className={styles.saveButton} disabled={!saqlashMumkin}>
                            {saving ? t('saving') : t('save')}
                        </button>
                        <button type="button" onClick={() => setOpen(false)} className={styles.cancelButton}>
                            {t('cancel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
