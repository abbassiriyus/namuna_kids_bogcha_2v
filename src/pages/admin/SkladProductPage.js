'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import LayoutComponent from '../../components/LayoutComponent';
import AdminTable from '../../components/AdminTable';
import SkladModal from '../../components/SkladModal';
import ErrorModal from '../../components/ErrorModal';
import axios from 'axios';
import url from '../../host/host';
import { getText } from '../../i18n/translations';
import styles from '../../styles/SkladProduct.module.css';
import { saveAs } from 'file-saver';
import { exportToExcel } from '../../utils/exportExcel';
import { Plus, FileText, FileSpreadsheet } from 'lucide-react';

export default function SkladProductPage() {
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
      console.error('Ma\'lumotlarni olishda xatolik:', {
        message: err.message,
        status: err.response?.status,
      });
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        router.push('/');
      } else {
        setErrorMessage('Ma\'lumotlarni yuklashda xatolik yuz berdi: ' + err.message);
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
      setErrorMessage("Sizda sklad mahsulotini o‘chirish uchun ruxsat yo‘q!");
      return;
    }
    try {
      await axios.delete(`${url}/sklad_product/${id}`, authHeader);
      await fetchData();
    } catch (err) {
      console.error('O‘chirishda xatolik:', err.message);
      setErrorMessage('Sklad mahsulotini o‘chirishda xatolik yuz berdi: ' + err.message);
    }
  };

  const handleEdit = (item) => {
    if (!permissions.edit_kitchen_storage) {
      setErrorMessage("Sizda sklad mahsulotini tahrirlash uchun ruxsat yo‘q!");
      return;
    }
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSave = async (form) => {
    try {
      if (editingItem) {
        if (!permissions.edit_kitchen_storage) {
          setErrorMessage("Sizda sklad mahsulotini tahrirlash uchun ruxsat yo‘q!");
          return;
        }
        await axios.put(`${url}/sklad_product/${editingItem.id}`, form, authHeader);
      } else {
        if (!permissions.create_kitchen_storage) {
          setErrorMessage("Sizda sklad mahsulotini yaratish uchun ruxsat yo‘q!");
          return;
        }
        await axios.post(`${url}/sklad_product`, form, authHeader);
      }
      setModalOpen(false);
      setEditingItem(null);
      await fetchData();
    } catch (err) {
      console.error('Saqlashda xatolik:', err.message);
      setErrorMessage('Saqlashda xatolik yuz berdi: ' + err.message);
    }
  };

  const handleExportToWord = async () => {
    const filteredExportData = filteredData.filter(item => Number(item.mavjud_hajm) > 0);

    if (!filteredExportData.length) {
      setErrorMessage("Eksport qilish uchun mavjud hajmi 0 dan katta mahsulot yo‘q!");
      return;
    }

    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, ShadingType } = await import('docx');

    const headers = ['#', 'Nomi',  'Omborda mavjud', 'Birlik']
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
              text: 'Sklad mahsulotlari ro‘yxati (Mavjud hajm > 0)',
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
      .catch((err) => {
        console.error('Word eksportida xatolik:', err);
        setErrorMessage('Word hujjatini eksport qilishda xatolik yuz berdi: ' + err.message);
      });
  };

  const handleExportToExcel = async () => {
    const filteredExportData = filteredData.filter(item => Number(item.mavjud_hajm) > 0);

    if (!filteredExportData.length) {
      setErrorMessage("Eksport qilish uchun mavjud hajmi 0 dan katta mahsulot yo‘q!");
      return;
    }

    const headers = ['#', 'Nomi', 'Omborda mavjud', 'Birlik'];
    const rows = filteredExportData.map((item, index) => [
      index + 1,
      item.nomi || '',
      `${Number(item.mavjud_hajm || 0).toLocaleString()} ${item.hajm_birlik || ''}`.trim(),
      item.hajm_birlik || '',
    ]);

    try {
      await exportToExcel({ headers, rows, filename: 'sklad_mahsulotlari' });
    } catch (err) {
      console.error('Excel eksportida xatolik:', err);
      setErrorMessage('Excel faylini eksport qilishda xatolik yuz berdi: ' + err.message);
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
            <h2 className={styles.title}>Ombordagi maxsulotlar</h2>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Mahsulotni qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className={styles.buttonGroup}>
              {permissions.create_kitchen_storage && (
                <button onClick={() => setModalOpen(true)} className={styles.addButton}>
                  <Plus size={16} /> Yangi mahsulot
                </button>
              )}
              <button onClick={handleExportToWord} className={styles.exportButton}>
                <FileText size={16} /> Word'ga eksport
              </button>
              <button onClick={handleExportToExcel} className={styles.exportButton}>
                <FileSpreadsheet size={16} /> Excel'ga eksport
              </button>
            </div>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <AdminTable
              title="Sklad"
              columns={['id', 'nomi', 'hajm', 'mavjud_hajm', 'hajm_birlik', 'created_at', 'actions']}
              columnTitles={{
                id: getText('colId'),
                nomi: getText('colName'),
                hajm: getText('colInitialVolume'),
                mavjud_hajm: getText('colAvailableInStorage'),
                hajm_birlik: getText('colUnit'),
                created_at: getText('colAddedDate'),
                actions: getText('colActions'),
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
        <p style={{ padding: '20px', color: 'red' }}>
          Sizda sklad mahsulotlarini ko‘rish uchun ruxsat yo‘q!
        </p>
      )}
    </LayoutComponent>
  );
}