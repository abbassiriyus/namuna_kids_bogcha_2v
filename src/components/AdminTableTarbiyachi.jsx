'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getText } from '../i18n/translations';
import styles from '../styles/AdminTable.module.css';

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
  const [selectedRow, setSelectedRow] = useState(null);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = data.slice(startIndex, startIndex + itemsPerPage);

  const formatDateTime = (value) => {
    if (!value) return '';
    return dayjs(value).format('DD MMMM YYYY HH:mm');
  };

  const shouldFormatAsDateTime = (col) =>
    ['created_at', 'updated_at', 'sana', 'chiqim_sana', 'tugilgan_kun'].includes(col);

  const mainColumns = ['username', 'guruh_id', 'is_active'];
  const additionalColumns = columns.filter((col) => !mainColumns.includes(col));

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className={styles['admin-table']}>
      {permissions.view_students ? (
        <>
          <div className={styles['admin-table__wrapper']}>
            <table className={styles['admin-table__table']}>
              <thead className={styles['admin-table__thead']}>
                <tr>
                  {(permissions.delete_students || permissions.view_payments) && (
                    <th className={styles['admin-table__th']}>{getText('colActions')}</th>
                  )}
                  <th className={styles['admin-table__th']}>{getText('colNumber')}</th>
                  {mainColumns.map((col, idx) => (
                    <th key={idx} className={styles['admin-table__th']}>
                      {columnTitles[col] || col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={styles['admin-table__tbody']}>
                {currentData.map((row, i) => (
                  <tr key={i} className={styles['admin-table__tr']}>
                    {(permissions.delete_students || permissions.view_payments) && (
                      <td
                        className={`${styles['admin-table__td']} ${styles['sticky-actions']}`}
                      >
                        {permissions.delete_students && onDelete && (
                          <button className={styles.deleteBtn} onClick={() => onDelete(row.id)} title="O'chirish">
                            <Trash2 size={16} />
                          </button>
                        )}
                        {permissions.view_payments &&
                          customActions &&
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
                      style={{ cursor: 'pointer' }}
                      onClick={() => onEdit(row)}
                      className={styles['admin-table__td']}
                    >
                      {startIndex + i + 1}
                    </td>
                    {mainColumns.map((col, j) => {
                      const value = shouldFormatAsDateTime(col) ? formatDateTime(row[col]) : row[col];
                      return (
                        <td
                          key={j}
                          style={{ cursor: col === 'is_active' ? 'default' : 'pointer' }}
                          onClick={col !== 'is_active' ? () => onEdit(row) : undefined}
                          className={styles['admin-table__td']}
                        >
                          {customRenderers[col] ? customRenderers[col](row) : value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {permissions.view_students && (
            <div className={styles['pagination']}>
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                <ChevronLeft size={16} /> {getText('pagination.prev')}
              </button>
              <span>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                {getText('pagination.next')} <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Modal for additional details */}
          {selectedRow && permissions.view_students && (
            <div className={styles.modal}>
              <div className={styles['modal__content']}>
                <div className={styles['modal__header']}>{getText('detailsTitle')}</div>
                <table className={styles['modal__table']}>
                  <tbody>
                    {additionalColumns.map((col, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: '600' }}>{columnTitles[col] || col}</td>
                        <td>
                          {shouldFormatAsDateTime(col)
                            ? formatDateTime(selectedRow[col])
                            : selectedRow[col] || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className={styles['modal__close-btn']} onClick={() => setSelectedRow(null)}>
                  {getText('close')}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.errorMessage}>
          {getText('noPermission')}
        </div>
      )}
    </div>
  );
}