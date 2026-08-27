import { useEffect, useState } from "react";
import axios from "axios";
import url from "../../host/host";
import { useLang } from '../../i18n/LanguageContext';

export default function XodimOneDayManager() {
  const { t } = useLang();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [loading, setLoading] = useState(false);
  const [xodimlar, setXodimlar] = useState([]);
  const [selectedXodim, setSelectedXodim] = useState("");
  const [latest, setLatest] = useState(null);
  const [hover, setHover] = useState({ nullBtn: false, delBtn: false });

  // Styles
  const styles = {
    wrap: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
    select: {
      padding: "6px 10px",
      borderRadius: 8,
      border: "1px solid #d1d5db",
      fontSize: 14,
    },
    btnBase: {
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(0,0,0,0.1)",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 600,
      transition: "all 0.2s ease",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      userSelect: "none",
    },
    btnDisabled: { opacity: 0.6, cursor: "not-allowed", boxShadow: "none" },
    btnYellow: (isHover) => ({ background: isHover ? "#f8d574" : "#facc15", color: "#1f2937" }),
    btnRed: (isHover) => ({ background: isHover ? "#ef4444" : "#dc2626", color: "#fff" }),
    tag: {
      fontSize: 12,
      padding: "2px 8px",
      borderRadius: 999,
      background: "#eef2ff",
      color: "#4338ca",
      border: "1px solid #e0e7ff",
    },
    info: { fontSize: 12, color: "#374151" },
    latestBox: {
      padding: 8,
      borderRadius: 12,
      background: "#f9fafb",
      border: "1px solid #e5e7eb",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
  };

  // API’dan xodimlar olish
  const getXodimlar = async () => {
    try {
      const res = await axios.get(`${url}/xodim`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setXodimlar(res.data || []);
    } catch (e) {
      console.error(e);
      alert(t('employeesLoadError'));
    }
  };

  // Tanlangan xodim uchun oxirgi yozuv
  const getLatest = async (id) => {
    if (!id) {
      setLatest(null);
      return;
    }
    try {
      const res = await axios.get(`${url}/xodim_one_day/latest/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLatest(res.data);
    } catch (e) {
      console.error(e);
      setLatest(null);
    }
  };

  useEffect(() => {
    getXodimlar();
  }, []);

  useEffect(() => {
    if (selectedXodim) {
      getLatest(selectedXodim);
    }
  }, [selectedXodim]);

  // EndTime → NULL
  const handleNullEndTime = async () => {
    if (!latest) return alert(t('recordNotFound'));
    if (!confirm(`Oxirgi yozuv (id=${latest.id}) end_time ni NULL qilinsinmi?`)) return;
    try {
      setLoading(true);
      const res = await axios.put(
        `${url}/xodim_one_day/latest/${selectedXodim}/endtime-null`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("End_time NULL qilindi");
      setLatest(res.data.data);
    } catch (e) {
      console.error(e);
      alert("Xatolik (end_time -> NULL)");
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!latest) return alert(t('recordNotFound'));
    if (!confirm(`Oxirgi yozuv (id=${latest.id}) o‘chirilsinmi?`)) return;
    try {
      setLoading(true);
      await axios.delete(`${url}/xodim_one_day/latest/${selectedXodim}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Oxirgi yozuv o‘chirildi");
      setLatest(null);
    } catch (e) {
      console.error(e);
      alert("Xatolik (delete)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 500 }}>
      {/* Select xodim */}
      <select
        style={styles.select}
        value={selectedXodim}
        onChange={(e) => setSelectedXodim(e.target.value)}
      >
        <option value="">{t('selectEmployeePlaceholder')}</option>
        {xodimlar.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name} (id: {x.id})
          </option>
        ))}
      </select>

      {/* Tanlangan xodim oxirgi yozuv */}
      {selectedXodim && (
        <>
          {latest ? (
            <div style={styles.latestBox}>
              <span style={styles.tag}>xodim_id: {selectedXodim}</span>
              <span style={styles.info}>
                <b>id:</b> {latest.id} | <b>start:</b> {latest.start_time} |{" "}
                <b>end:</b> {latest.end_time ?? <i>null</i>}
              </span>
            </div>
          ) : (
            <div style={styles.latestBox}>
              <span style={styles.info}>{t('noRecordForEmployee')}</span>
            </div>
          )}

          {latest && (
            <div style={styles.wrap}>
              <button
                onClick={handleNullEndTime}
                disabled={loading}
                onMouseEnter={() => setHover((p) => ({ ...p, nullBtn: true }))}
                onMouseLeave={() => setHover((p) => ({ ...p, nullBtn: false }))}
                style={{
                  ...styles.btnBase,
                  ...(loading ? styles.btnDisabled : {}),
                  ...styles.btnYellow(hover.nullBtn),
                }}
              >
                EndTime → NULL
              </button>

              <button
                onClick={handleDelete}
                disabled={loading}
                onMouseEnter={() => setHover((p) => ({ ...p, delBtn: true }))}
                onMouseLeave={() => setHover((p) => ({ ...p, delBtn: false }))}
                style={{
                  ...styles.btnBase,
                  ...(loading ? styles.btnDisabled : {}),
                  ...styles.btnRed(hover.delBtn),
                }}
              >
                Delete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
