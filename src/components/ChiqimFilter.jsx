// components/ChiqimFilter.js
import React from 'react';
import { Search, Archive, FileSpreadsheet } from 'lucide-react';
import styles from '../styles/ChiqimFilter.module.css';

export default function ChiqimFilter({ filter, onChange, onSubmit, onExport, onExportExcel, onSearch }) {
  return (
    <div className={styles.filterContainer}>
      <input
        type="date"
        name="startDate"
        value={filter.startDate}
        onChange={onChange}
        className={styles.input}
      />

      <input
        type="date"
        name="endDate"
        value={filter.endDate}
        onChange={onChange}
        className={styles.input}
      />

      <select
        name="productId"
        value={filter.productId}
        onChange={onChange}
        className={styles.input}
      >
        <option value="">Barcha mahsulotlar</option>
        {(filter.products || []).map(p => (
          <option key={p.id} value={p.id}>{p.nomi}</option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Mahsulotni qidiring..."
        className={styles.searchInput}
        onChange={onSearch}  // Search inputga o'zgartirishni yuborish
      />

      <button onClick={onSubmit} className={styles.button}><Search size={16} /> Filterlash</button>
      <button onClick={onExport} className={styles.button} style={{ backgroundColor: '#2ecc71' }}><Archive size={16} /> Filega aylantirish</button>
      {onExportExcel && (
        <button onClick={onExportExcel} className={styles.button} style={{ backgroundColor: '#217346' }}><FileSpreadsheet size={16} /> Excelga aylantirish</button>
      )}
    </div>
  );
}
