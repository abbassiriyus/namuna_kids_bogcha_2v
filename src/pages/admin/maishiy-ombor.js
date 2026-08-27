'use client';

import { useEffect, useState } from 'react';
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
import { useUserType } from '../../utils/useUserType';

export default function SkladProductPage() {
  const { t } = useLang();
  // localStorage render paytida o'qilsa hydration xatosi beradi — hook mount'dan keyin o'qiydi.
  const { isSuperAdmin } = useUserType();
  const router = useRouter();
  const [data, setData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [permissions, setPermissions] = useState({
    view_household_storage: false,
    create_household_storage: false,
    edit_household_storage: false,
    delete_household_storage: false,
  });

  const token = (typeof window !== "undefined")  ? localStorage.getItem('token') : null;
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = async () => {
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const type = localStorage.getItem('type') ? localStorage.getItem('type'): null;
      const adminId = type === '3' && typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('admin'))?.id : null;

      let permissionsData = {
        view_household_storage: true,
        create_household_storage: true,
        edit_household_storage: true,
        delete_household_storage: true,
      };

      const apiCalls = [
        axios.get(`${url}/sklad_maishiy`, authHeader),
        axios.get(`${url}/kirim_maishiy`, authHeader),
        axios.get(`${url}/chiqim_maishiy`, authHeader),
      ];

      if (type === '3') {
        apiCalls.push(
          axios.get(`${url}/permissions/${adminId}`, { headers: { Authorization: `Bearer ${token}` } })
        );
      }

      const [productRes, kirimRes, chiqimRes, permissionsRes] = await Promise.all(apiCalls);

      // Set permissions
      if (type === '3') {
        permissionsData = permissionsRes?.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);

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
        const kirim = kirimMap[p.id] * 1 || 0;
        const chiqim = chiqimMap[p.id] || 0;
        const mavjudHajm = (p.hajm || 0) * 1 + kirim * 1 - chiqim;

        return {
          ...p,
          hajm: parseFloat(p.hajm || 0),
          mavjud_hajm: parseFloat(mavjudHajm.toFixed(3)),
          hajm_birlik: p.hajm_birlik,
        };
      });

      setData(enriched);
    } catch (err) {
      console.error("Ma'lumotlarni olishda xatolik:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.push('/');
      } else {
        setErrorMessage(t('loadError'));
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (!permissions.delete_household_storage) {
      setErrorMessage(t('noDeleteProductPermission'));
      return;
    }
    try {
      await axios.delete(`${url}/sklad_maishiy/${id}`, authHeader);
      await fetchData();
    } catch (err) {
      console.error("O'chirishda xatolik:", err);
      setErrorMessage(t('productDeleteError'));
    }
  };

  const handleEdit = (item) => {
    if (!permissions.edit_household_storage) {
      setErrorMessage(t('noEditProductPermission'));
      return;
    }
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSave = async (form) => {
    if (!permissions.create_household_storage && !editingItem) {
      setErrorMessage(t('noCreateProductPermission'));
      return;
    }
    if (!permissions.edit_household_storage && editingItem) {
      setErrorMessage(t('noEditProductPermission'));
      return;
    }
    try {
      if (editingItem) {
        await axios.put(`${url}/sklad_maishiy/${editingItem.id}`, form, authHeader);
      } else {
        await axios.post(`${url}/sklad_maishiy`, form, authHeader);
      }
      setModalOpen(false);
      setEditingItem(null);
      await fetchData();
    } catch (err) {
      console.error("Saqlashda xatolik:", err);
      setErrorMessage(t('saveError'));
    }
  };

  const filteredData = data.filter((item) =>
    item.nomi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 📄 Word eksport funksiyasi
  const exportToWord = async () => {
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } = await import('docx');

    const availableProducts = data.filter(item => item.mavjud_hajm > 0);

    if (availableProducts.length === 0) {
      setErrorMessage(t('noProductsYet'));
      return;
    }

    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("ID")] }),
          new TableCell({ children: [new Paragraph("Nomi")] }),
          // new TableCell({ children: [new Paragraph("Boshlang‘ich hajm")] }),
          new TableCell({ children: [new Paragraph("Mavjud hajm")] }),
          new TableCell({ children: [new Paragraph("Birlik")] }),
        ],
      }),
      ...availableProducts.map((item,key) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph((key+1).toString())] }),
            new TableCell({ children: [new Paragraph(item.nomi)] }),
            // new TableCell({ children: [new Paragraph(`${item.hajm} ${item.hajm_birlik}`)] }),
            new TableCell({ children: [new Paragraph(`${item.mavjud_hajm}`)] }),
            new TableCell({ children: [new Paragraph(item.hajm_birlik)] }),
          ],
        })
      )
    ];

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: t('storageAvailableProducts'),
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Table({ rows: tableRows }),
          ],
        },
      ],
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, "mavjud_mahsulotlar.docx");
    });
  };

  // 📊 Excel eksport funksiyasi
  const handleExportToExcel = async () => {
    const availableProducts = data.filter(item => item.mavjud_hajm > 0);

    if (availableProducts.length === 0) {
      setErrorMessage(t('noProductsYet'));
      return;
    }

    const headers = ['ID', 'Nomi', 'Mavjud hajm', 'Birlik'];
    const rows = availableProducts.map((item, key) => [
      key + 1,
      item.nomi,
      item.mavjud_hajm,
      item.hajm_birlik,
    ]);

    await exportToExcel({ headers, rows, filename: 'mavjud_mahsulotlar' });
  };

  return (
    <LayoutComponent>
      {isSuperAdmin || permissions.view_household_storage ? (
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

            {permissions.create_household_storage && (
              <button onClick={() => setModalOpen(true)} className={styles.addButton}>
                <Plus size={16} /> Yangi mahsulot
              </button>
            )}

            <button onClick={exportToWord} className={styles.addButton}>
              <FileText size={16} /> Word’ga chiqarish
            </button>

            <button onClick={handleExportToExcel} className={styles.addButton}>
              <FileSpreadsheet size={16} /> Excel’ga chiqarish
            </button>
          </div>

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
              hajm: `${item.hajm} ${item.hajm_birlik}`,
              mavjud_hajm: `${item.mavjud_hajm} ${item.hajm_birlik}`,
            }))}
            onDelete={permissions.delete_household_storage ? (id) => handleDelete(id) : null}
            onEdit={permissions.edit_household_storage ? (item) => handleEdit(item) : null}
            permissions={{
              view1: permissions.view_household_storage,
              edit1: permissions.edit_household_storage,
              delete1: permissions.delete_household_storage,
            }}
          />

          {modalOpen && (permissions.create_household_storage || permissions.edit_household_storage) && (
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
