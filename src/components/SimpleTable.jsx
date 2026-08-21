"use client";

import React from 'react';
import styles from '../styles/SimpleTable.module.css';

export default function SimpleTable({
  title,
  columns = [],
  columnTitles = {},
  data = [],
  onAdd,
  onEdit,
  onDelete,
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title || 'Ro‘yxat'}</h3>
        {onAdd && (
          <button className={styles.addBtn} onClick={onAdd} type="button">+ Qo‘shish</button>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              {columns.map((c) => (
                <th key={c}>{columnTitles[c] || c}</th>
              ))}
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className={styles.empty}>Ma'lumot yo‘q</td>
              </tr>
            )}
            {data.map((row, i) => (
              <tr key={row.id || i} className={styles.row}>
                <td>{i + 1}</td>
                {columns.map((c) => (
                  <td key={c}>{String(row[c] ?? '-')}</td>
                ))}
                <td className={styles.actions}>
                  {onEdit && (
                    <button className={styles.actionBtn} onClick={() => onEdit(row)} type="button">Tahrirlash</button>
                  )}
                  {onDelete && (
                    <button className={styles.actionBtn} onClick={() => onDelete(row)} type="button">O'chirish</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
