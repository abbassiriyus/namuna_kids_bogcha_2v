'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { Gift, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getText } from '../i18n/translations';
import styles from '../styles/AdminTable.module.css';

function AdminTable({
  columns,
  columnTitles = {},
  data,
  onDelete,
  onEdit,
  onCustomAction,
  customRenderers = {},
  customActions = {},
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  permissions = {},
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // localStorage dan type ni olish
  const userType = parseInt(localStorage.getItem('type')) || 0;

  // Agar type === 1 bo‘lsa, barcha ruxsatlarni true qilamiz
  const effectivePermissions = userType === 1 
    ? {
        view_payments: true,
        create_payments: true,
        edit_payments: true,
        delete_payments: true,
      }
    : {
        view_payments: permissions.view_payments || false,
        create_payments: permissions.create_payments || false,
        edit_payments: permissions.edit_payments || false,
        delete_payments: permissions.delete_payments || false,
      };

  // Sana formatlash funksiyasi
  const formatDateTime = (value) => {
    if (!value) return '-';
    return dayjs(value).format('DD MMMM YYYY HH:mm');
  };

  // Sana sifatida formatlanishi kerak bo'lgan ustunlarni aniqlash
  const shouldFormatAsDateTime = (col) =>
    ['created_at', 'updated_at', 'sana', 'chiqim_sana', 'tugilgan_kun'].includes(col);

  // Pul summalarini formatlash (bo'sh joy bilan, so'm sifatida)
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '0 so‘m';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' so‘m';
  };

  // Asosiy jadvalda ko‘rsatiladigan ustunlar
  const mainColumns = [
    'fish',
    'guruh',
    'oylik_tolov',
    'kunlik_tolov',
    'jami',
    'kelgan',
    'hisob',
    'naqt',
    'karta',
    'prichislena',
    'naqt_prichislena',
    'jami_tolangan',
    'bonus_shtraf',
    'qarz_miqdori_otgan',
    'balans',
  ];

  // Modal oynada ko‘rsatiladigan qo‘shimcha ustunlar
  const additionalColumns = columns.filter((col) => !mainColumns.includes(col));

  // Sahifa o‘zgartirish funksiyasi
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // O'chirish tugmasi bosilganda confirm oynasini ko'rsatish
  const handleDeleteClick = (id) => {
    if (confirm(getText('confirmDeleteStudent'))) {
      onDelete(id);
    }
  };

  return (
    <div className={styles['admin-table']}>
      <div className={styles['admin-table__wrapper']}>
        <table className={styles['admin-table__table']}>
          <thead className={styles['admin-table__thead']}>
            <tr>
              {(effectivePermissions.edit_payments || effectivePermissions.delete_payments || effectivePermissions.view_payments) && (
                <th className={`${styles['admin-table__th']} ${styles['sticky-actions']}`}>
                  {getText('colActions')}
                </th>
              )}
              <th className={`${styles['admin-table__th']} ${styles['sticky-index']}`}>
                {getText('colNumber')}
              </th>
              {mainColumns.map((col, idx) => (
                <th
                  key={idx}
                  className={`${styles['admin-table__th']} ${col === 'fish' ? styles['sticky-fish'] : ''}`}
                >
                  {columnTitles[col] || col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={styles['admin-table__tbody']}>
            {data.map((row, i) => (
              <tr key={i} className={styles['admin-table__tr']}>
                {(effectivePermissions.edit_payments || effectivePermissions.delete_payments || effectivePermissions.view_payments) && (
                  <td style={{display:'flex'}} className={`${styles['admin-table__td']} ${styles['sticky-actions']}`}>
                    {effectivePermissions.edit_payments && onCustomAction && (
                      <button
                        className={styles.editBtn}
                        onClick={() => onCustomAction(row, 'bonusShtraf')}
                        title={getText('bonusShtrafAdd')}
                      >
                        <Gift size={16} />
                      </button>
                    )}
                    {effectivePermissions.delete_payments && onDelete && (
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteClick(row.id)}
                        title={getText('delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {effectivePermissions.view_payments &&
                      Object.entries(customActions).map(([icon, handler], idx) => (
                        <button
                          key={idx}
                          onClick={() => handler(row)}
                          className={styles.editBtn}
                          style={{ marginLeft: '4px' }}
                          title={icon}
                        >
                          {icon}
                        </button>
                      ))}
                  </td>
                )}
                <td
                  className={`${styles['admin-table__td']} ${styles['sticky-index']}`}
                  onClick={() => {
                    if ((userType === 1 || effectivePermissions.edit_payments) && onEdit) {
                      onEdit(row);
                    }
                  }}
                >
                  {(currentPage - 1) * itemsPerPage + i + 1}
                </td>
                {mainColumns.map((col, j) => {
                  let value;
                  if (['oylik_tolov', 'kunlik_tolov', 'hisob', 'naqt', 'karta', 'prichislena', 'naqt_prichislena', 'jami_tolangan', 'qarz_miqdori_otgan', 'balans'].includes(col)) {
                    value = formatCurrency(row[col]);
                  } else if (shouldFormatAsDateTime(col)) {
                    value = formatDateTime(row[col]);
                  } else {
                    value = row[col];
                  }
                  return (
                    <td
                      key={j}
                      className={`${styles['admin-table__td']} ${col === 'fish' ? styles['sticky-fish'] : ''}`}
                      onClick={() => {
                        if ((userType === 1 || effectivePermissions.edit_payments) && onEdit) {
                          onEdit(row);
                        }
                      }}
                    >
                      {customRenderers[col] ? customRenderers[col](row) : value || '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sahifalash */}
      <div className={styles['pagination']}>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={styles['pagination__button']}
        >
          <ChevronLeft size={16} /> {getText('pagination.prev')}
        </button>
        <span className={styles['pagination__info']}>
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={styles['pagination__button']}
        >
          {getText('pagination.next')} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default AdminTable;