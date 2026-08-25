"use client";

import { useState } from 'react';
import dayjs from 'dayjs';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from '../styles/AdminTable.module.css';
import { getText } from '../i18n/translations';

export default function AdminTable({
  columns,
  columnTitles = {},
  data,
  onDelete,
  onEdit,
  customRenderers = {},
  customActions = {},
  permissions = {},
}) {
  const itemsPerPage = 100;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = data.slice(startIndex, startIndex + itemsPerPage);

  const formatDateTime = (value) => {
    if (!value) return '';
    return dayjs(value).format('DD.MM.YYYY HH:mm');
  };

  const shouldFormatAsDateTime = (col) =>
    ['created_at', 'updated_at', 'sana', 'chiqim_sana', 'tugilgan_kun'].includes(col);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Filter out 'actions' from columns for display, as it's handled separately
  const displayColumns = columns.filter((col) => col !== 'actions');

  // Check if 'image' column is present
  const hasImageColumn = columns.includes('image');

  const handleDeleteClick = (id) => {
    if (confirm(getText('confirmDelete'))) {
      onDelete(id);
    }
  };

  return (
    <div className={styles.adminTable}>
      {permissions.view1 ? (
        <>
          <div className={styles.adminTable__wrapper}>
            <table className={styles.adminTable__table}>
              <thead className={styles.adminTable__thead}>
                <tr>
                  {(permissions.edit1 || permissions.delete1) && (
                    <th className={styles.adminTable__th}>{getText('colActions')}</th>
                  )}
                  <th className={styles.adminTable__th}>№</th>
                  {displayColumns.map((col, idx) => (
                    <th key={idx} className={styles.adminTable__th}>
                      {columnTitles[col] || col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={styles.adminTable__tbody}>
                {currentData.map((row, i) => (
                  <tr key={i} className={styles.adminTable__tr}>
                    {(permissions.edit1 || permissions.delete1) && (
                      <td
                        className={`${styles.adminTable__td} ${styles.actionsCell}`}
                      >
                        {permissions.delete1 && onDelete && (
                          <button className={styles.deleteBtn} onClick={() => handleDeleteClick(row.id)} title={getText('delete')}>
                            <Trash2 size={16} />
                          </button>
                        )}
                        {permissions.edit1 && !hasImageColumn && customRenderers.actions && (
                          <span>{customRenderers.actions(row)}</span>
                        )}
                        {permissions.edit1 && !hasImageColumn &&
                          Object.entries(customActions).map(([icon, handler], idx) => (
                            <button
                              key={idx}
                              onClick={() => handler(row)}
                              className={styles.editBtn}
                              style={{ marginLeft: '4px' }}
                            >
                              {icon}
                            </button>
                          ))}
                      </td>
                    )}
                    <td
                      onClick={() => {
                        if (permissions.edit1 && onEdit) {
                          onEdit(row);
                        }
                      }}
                      className={`${styles.adminTable__td} ${styles.centerCell}`}
                    >
                      {startIndex + i + 1}
                    </td>
                    {displayColumns.map((col, j) => {
                      if (customRenderers[col]) {
                        return (
                          <td
                            onClick={() => {
                              if (permissions.edit1 && onEdit && !hasImageColumn) {
                                onEdit(row);
                              }
                            }}
                            key={j}
                            className={styles.adminTable__td}
                          >
                            {customRenderers[col](row)}
                          </td>
                        );
                      }
                      let value = row[col];
                      if (shouldFormatAsDateTime(col) && value) {
                        value = formatDateTime(value);
                      }
                      return (
                        <td
                          onClick={() => {
                            if (permissions.edit1 && onEdit) {
                              onEdit(row);
                            }
                          }}
                          key={j}
                          className={styles.adminTable__td}
                        >
                          {value || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
              <ChevronLeft size={16} /> {getText('prev')}
            </button>
            <span>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {getText('next')} <ChevronRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <p style={{ padding: '20px' }}></p>
      )}
    </div>
  );
}