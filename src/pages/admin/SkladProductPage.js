'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import LayoutComponent from '../../components/LayoutComponent';
import AdminTable from '../../components/AdminTable';
import SkladModal from '../../components/SkladModal';
import ErrorModal from '../../components/ErrorModal';
import axios from 'axios';
import url from '../../host/host';
import { useLang } from '../../i18n/LanguageContext';
import styles from '../../styles/SkladProduct.module.css';
import { saveAs } from 'file-saver';
import { exportToExcel } from '../../utils/exportExcel';
import { Plus, FileText, FileSpreadsheet } from 'lucide-react';

export default function SkladProductPage() {
  const { t } = useLang();
  const router = useRouter();
  const [data, setData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    view_kitchen_storage: false,
    create_kitchen_storage: false,
    edit_kitchen_storage: false,
    delete_kitchen_storage: false,
  });
  const [canView, setCanView] = useState(false);

  const getClientData = () => ({
    token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
    type: typeof window !== 'undefined' ? localStorage.getItem('type') : null,
    adminId:
      typeof window !== 'undefined' && localStorage.getItem('type') === '3'
        ? JSON.parse(localStorage.getItem('admin') || '{}')?.id || null
        : null,
  });

  const { token, type, adminId } = getClientData();
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = async () => {
    if (!token) {
      router.push('/');
      return;
    }

    setLoading(true);
    try {
      let permissionsData = {
        view_kitchen_storage: true,
        create_kitchen_storage: true,
        edit_kitchen_storage: true,
        delete_kitchen_storage: true,
      };

      const apiCalls = [
        axios.get(`${url}/sklad_product`, authHeader),
        axios.get(`${url}/sklad_product_taktic`, authHeader),
        axios.get(`${url}/chiqim_ombor`, authHeader),
      ];

      if (type === '3' && adminId) {
        apiCalls.push(axios.get(`${url}/permissions/${adminId}`, authHeader));
      }

      const [productRes, kirimRes, chiqimRes, permissionsRes] = await Promise.all(apiCalls);

      if (type === '3' && permissionsRes) {
        permissionsData = permissionsRes?.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);
      setCanView(type === '1' || permissionsData.view_kitchen_storage);

      const kirimMap = {};
      kirimRes.data.forEach((item) => {
        const id = item.sklad_product_id;
        kirimMap[id] = (kirimMap[id] || 0) + Number(item.hajm || 0);
      });

      const chiqimMap = {};
      chiqimRes.data.forEach((item) => {
        const id = item.sklad_product_id;
        chiqimMap[id] = (chiqimMap[id] || 0) + Number(item.hajm || 0);
      });

      const enriched = productRes.data.map((p) => {
        const kirim = kirimMap[p.id] || 0;
        const chiqim = chiqimMap[p.id] || 0;
        const mavjudHajm = (Number(p.hajm) || 0) + kirim - chiqim;

        return {
          ...p,
          hajm: Number(p.hajm || 0).toFixed(3),
          mavjud_hajm: Number(mavjudHajm.toFixed(3)),
          hajm_birlik: p.hajm_birlik || '',
        };
      });

      setData(enriched);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        router.push('/');
      } else {
        setErrorMessage(t('loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (!permissions.delete_kitchen_storage) {
      setErrorMessage(t('noActionPermission'));
      return;
    }
    try {
      await axios.delete(`${url}/sklad_product/${id}`, authHeader);
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || t('deleteError'));
    }
  };

  const handleEdit = (item) => {
    if (!permissions.edit_kitchen_storage) {
      setErrorMessage(t('noActionPermission'));
      return;
    }
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSave = async (form) => {
    const allowed = editingItem ? permissions.edit_kitchen_storage : permissions.create_kitchen_storage;
    if (!allowed) {
      setErrorMessage(t('noActionPermission'));
      return;
    }

    try {
      if (editingItem) {
        await axios.put(`${url}/sklad_product/${editingItem.id}`, form, authHeader);
      } else {
        await axios.post(`${url}/sklad_product`, form, authHeader);
      }
      setModalOpen(false);
      setEditingItem(null);
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || t('saveError'));
    }
  };

  const handleExportToWord = async () => {
    const filteredExportData = filteredData.filter(item => Number(item.mavjud_hajm) > 0);

    if (!filteredExportData.length) {
      setErrorMessage(t('exportNothing'));
      return;
    }

    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, ShadingType } = await import('docx');

    const headers = ['#', t('colName'), t('colAvailableInStorage'), t('colUnit')];
    const columnWidths = [500, 2000, 1500, 1500, 1000, 2000];

    const createCell = (text, width, align = AlignmentType.CENTER, bold = false) =>
      new TableCell({
        width: { size: width, type: WidthType.DXA },
        verticalAlign: 'center',
        children: [
          new Paragraph({
            alignment: align,
            children: [new TextRun({ text: text.toString(), bold })],
          }),
        ],
        shading: { fill: 'ffffff', type: ShadingType.CLEAR, color: '000000' },
      });

    const headerRow = new TableRow({
      children: headers.map((text, i) => createCell(text.toUpperCase(), columnWidths[i], AlignmentType.CENTER, true)),
    });

    const bodyRows = filteredExportData.map((item, index) =>
      new TableRow({
        children: [
          createCell((index + 1).toString(), columnWidths[0]),
          createCell(item.nomi || '', columnWidths[1]),
          // createCell(Number(item.hajm || 0).toLocaleString() + ` ${item.hajm_birlik}`, columnWidths[2]),
          createCell(Number(item.mavjud_hajm || 0).toLocaleString() + ` ${item.hajm_birlik}`, columnWidths[3]),
          createCell(item.hajm_birlik || '', columnWidths[4]),
          // createCell(item.created_at?.slice(0, 10) || '', columnWidths[5]),
        ],
      })
    );

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: t('storageListTitle'),
              heading: 'Heading1',
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }),
            new Table({
              rows: [headerRow, ...bodyRows],
              width: { size: 10000, type: WidthType.DXA },
            }),
          ],
        },
      ],
    });

    Packer.toBlob(doc)
      .then((blob) => saveAs(blob, 'sklad_mahsulotlari.docx'))
      .catch(() => setErrorMessage(t('exportWordError')));
  };

  const handleExportToExcel = async () => {
    const filteredExportData = filteredData.filter(item => Number(item.mavjud_hajm) > 0);

    if (!filteredExportData.length) {
      setErrorMessage(t('exportNothing'));
      return;
    }

    const headers = ['#', t('colName'), t('colAvailableInStorage'), t('colUnit')];
    const rows = filteredExportData.map((item, index) => [
      index + 1,
      item.nomi || '',
      `${Number(item.mavjud_hajm || 0).toLocaleString()} ${item.hajm_birlik || ''}`.trim(),
      item.hajm_birlik || '',
    ]);

    try {
      await exportToExcel({ headers, rows, filename: 'sklad_mahsulotlari' });
    } catch {
      setErrorMessage(t('exportExcelError'));
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) =>
      item.nomi?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  return (
    <LayoutComponent>
      {canView ? (
        <>
          <div className={styles.headerWrapper}>
            <h2 className={styles.title}>{t('storageProducts')}</h2>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('searchProduct')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className={styles.buttonGroup}>
              {permissions.create_kitchen_storage && (
                <button onClick={() => setModalOpen(true)} className={styles.addButton}>
                  <Plus size={16} /> {t('newProduct')}
                </button>
              )}
              <button onClick={handleExportToWord} className={styles.exportButton}>
                <FileText size={16} /> {t('exportWord')}
              </button>
              <button onClick={handleExportToExcel} className={styles.exportButton}>
                <FileSpreadsheet size={16} /> {t('exportExcel')}
              </button>
            </div>
          </div>

          {loading ? (
            <p>{t('loadingData')}</p>
          ) : (
            <AdminTable
              title={t('storageTitle')}
              columns={['id', 'nomi', 'hajm', 'mavjud_hajm', 'hajm_birlik', 'created_at', 'actions']}
              columnTitles={{
                id: t('colId'),
                nomi: t('colName'),
                hajm: t('colInitialVolume'),
                mavjud_hajm: t('colAvailableInStorage'),
                hajm_birlik: t('colUnit'),
                created_at: t('colAddedDate'),
                actions: t('colActions'),
              }}
              data={filteredData.map((item) => ({
                ...item,
                hajm: `${Number(item.hajm).toLocaleString()} ${item.hajm_birlik}`,
                mavjud_hajm: `${Number(item.mavjud_hajm).toLocaleString()} ${item.hajm_birlik}`,
              }))}
              onDelete={permissions.delete_kitchen_storage ? (id) => handleDelete(id) : null}
              onEdit={permissions.edit_kitchen_storage ? (item) => handleEdit(item) : null}
              permissions={{
                view1: permissions.view_kitchen_storage,
                edit1: permissions.edit_kitchen_storage,
                delete1: permissions.delete_kitchen_storage,
              }}
            />
          )}

          {modalOpen && (permissions.create_kitchen_storage || permissions.edit_kitchen_storage) && (
            <SkladModal
              isOpen={modalOpen}
              onClose={() => {
                setModalOpen(false);
                setEditingItem(null);
              }}
              onSave={handleSave}
              initialData={editingItem}
            />
          )}

          <ErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />
        </>
      ) : (
        <p style={{ padding: '20px', color: 'red' }}>{t('noPermission')}</p>
      )}
    </LayoutComponent>
  );
}