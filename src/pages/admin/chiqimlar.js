'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import LayoutComponent from '../../components/LayoutComponent';
import AdminHeader from '../../components/AdminHeader';
import AdminTable from '../../components/AdminTable';
import ChiqimModal from '../../components/ChiqimModal';
import ChiqimFilter from '../../components/ChiqimFilter';
import ErrorModal from '../../components/ErrorModal';
import axios from 'axios';
import url from '../../host/host';
import { getText } from '../../i18n/translations';
import { saveAs } from 'file-saver';
import styles from '../../styles/ChiqimOmbor.module.css'; // Assuming a CSS module for styling
import { exportToExcel } from '../../utils/exportExcel';
import { toLocalDate } from '../../utils/sana';

export default function ChiqimOmborPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    startDate: '',
    endDate: '',
    productId: '',
  });
  const [permissions, setPermissions] = useState({
    view_kitchen_expenses: false,
    create_kitchen_expenses: false,
    edit_kitchen_expenses: false,
    delete_kitchen_expenses: false,
  });
  const [isAggregated, setIsAggregated] = useState(false);
  const [uniqueDates, setUniqueDates] = useState([]);
  const [canView, setCanView] = useState(false); // Handle view permission

  // Consolidated client-side data fetching
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

  const enrichData = (chiqimlar, productsList) => {
    const chiqimMap = {};
    chiqimlar.forEach((item) => {
      const pid = item.sklad_product_id;
      chiqimMap[pid] = (chiqimMap[pid] || 0) + Number(item.hajm || 0);
    });

    const extendedProducts = productsList.map((p) => {
      const chiqilgan = chiqimMap[p.id] || 0;
      const initial = Number(p.hajm || 0);
      const available_hajm = initial - chiqilgan;
      return { ...p, available_hajm: Number(available_hajm.toFixed(3)) };
    });

    const productMap = {};
    extendedProducts.forEach((p) => {
      productMap[p.id] = p.nomi;
    });

    const enrichedChiqimlar = chiqimlar.map((item) => ({
      ...item,
      product_nomi: productMap[item.sklad_product_id] || 'Noma’lum',
      hajm_birlik: extendedProducts.find((p) => p.id === item.sklad_product_id)?.hajm_birlik || '',
      hajm: Number(item.hajm || 0).toFixed(3),
      chiqim_sana: item.chiqim_sana?.slice(0, 10) || '',
    }));

    enrichedChiqimlar.sort((a, b) =>
      (a.product_nomi || '').localeCompare(b.product_nomi || '', 'uz', { sensitivity: 'base' })
    );

    setData(enrichedChiqimlar);
    setProducts(extendedProducts);
    setFilteredData(enrichedChiqimlar);
  };

  const fetchData = async (start = '', end = '', productId = '') => {
    if (!token) {
      router.push('/');
      return;
    }

    setLoading(true);
    try {
      let permissionsData = {
        view_kitchen_expenses: true,
        create_kitchen_expenses: true,
        edit_kitchen_expenses: true,
        delete_kitchen_expenses: true,
      };

      const params = new URLSearchParams();
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      if (productId) params.append('product', productId);

      const apiCalls = [
        axios.get(`${url}/chiqim_ombor?${params.toString()}`, authHeader),
        axios.get(`${url}/sklad_product`, authHeader),
      ];

      if (type === '3' && adminId) {
        apiCalls.push(axios.get(`${url}/permissions/${adminId}`, authHeader));
      }

      const [res, productsRes, permissionsRes] = await Promise.all(apiCalls);

      if (type === '3' && permissionsRes) {
        permissionsData = permissionsRes.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);
      setCanView(type === '1' || permissionsData.view_kitchen_expenses);

      enrichData(res.data, productsRes.data);
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
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const start = toLocalDate(today);
    const end = toLocalDate(tomorrow);

    setFilter({ startDate: start, endDate: end, productId: '' });
    fetchData(start, end);
  }, []);

  // Memoize filtered data
  const filteredDataMemo = useMemo(() => {
    if (searchTerm.trim() === '') {
      return data;
    }
    return data.filter((item) =>
      item.product_nomi?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  useEffect(() => {
    setFilteredData(filteredDataMemo);
  }, [filteredDataMemo]);

  useEffect(() => {
    const dates = [...new Set(filteredDataMemo.map((item) => item.chiqim_sana))].sort();
    setUniqueDates(dates);

    if (isAggregated) {
      const productMap = {};
      filteredDataMemo.forEach((item) => {
        if (!productMap[item.sklad_product_id]) {
          productMap[item.sklad_product_id] = {
            product_nomi: item.product_nomi,
            hajm_birlik: item.hajm_birlik,
            dates: {},
            umumiy: 0,
          };
        }
        const date = item.chiqim_sana;
        productMap[item.sklad_product_id].dates[date] =
          (productMap[item.sklad_product_id].dates[date] || 0) + Number(item.hajm || 0);
        productMap[item.sklad_product_id].umumiy += Number(item.hajm || 0);
      });

      const pivotData = Object.values(productMap).map((product) => {
        const row = {
          product_nomi: product.product_nomi,
          hajm_birlik: product.hajm_birlik,
          umumiy: Number(product.umumiy.toFixed(3)),
        };
        dates.forEach((date) => {
          row[date] = Number((product.dates[date] || 0).toFixed(3));
        });
        return row;
      });

      setDisplayedData(pivotData);
    } else {
      setDisplayedData(filteredDataMemo);
    }
  }, [filteredDataMemo, isAggregated]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = async () => {
    try {
      setLoading(true);
      const { startDate, endDate, productId } = filter;
      await fetchData(startDate, endDate, productId);
    } catch (err) {
      console.error('Filterlashda xatolik:', err.message);
      setErrorMessage('Filterlashda xatolik yuz berdi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleExportToWord = async () => {
    const {
      Document,
      Packer,
      Paragraph,
      Table,
      TableRow,
      TableCell,
      TextRun,
      WidthType,
      AlignmentType,
      ShadingType,
    } = await import('docx');

    if (!displayedData.length) {
      setErrorMessage("Export qilish uchun ma'lumot yo‘q");
      return;
    }

    const headers = isAggregated
      ? ['#', 'Mahsulot', 'Birlik', ...uniqueDates, 'Umumiy']
      : ['#', 'Mahsulot', 'Hajm', 'Birlik', 'Izoh', 'Chiqim sanasi'];
    const columnWidths = isAggregated
      ? [500, 2000, 1000, ...uniqueDates.map(() => 1500), 1500]
      : [500, 2000, 1000, 1000, 4000, 1800];

    const createCell = (text, width, align = AlignmentType.CENTER, bold = false) =>
      new TableCell({
        width: { size: width, type: WidthType.DXA },
        verticalAlign: 'center',
        children: [
          new Paragraph({
            alignment: align,
            children: [new TextRun({ text: text.toString(), bold, color: '000000' })],
          }),
        ],
        shading: {
          fill: 'ffffff',
          type: ShadingType.CLEAR,
          color: '000000',
        },
      });

    const headerRow = new TableRow({
      children: headers.map((text, i) =>
        new TableCell({
          width: { size: columnWidths[i], type: WidthType.DXA },
          verticalAlign: 'center',
          shading: { fill: 'f0f0f0', type: ShadingType.CLEAR, color: '000000' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: text.toUpperCase(), bold: true, color: '000000' })],
            }),
          ],
        })
      ),
    });

    const bodyRows = displayedData.map((item, index) =>
      new TableRow({
        children: isAggregated
          ? [
              createCell((index + 1).toString(), columnWidths[0]),
              createCell(item.product_nomi || '', columnWidths[1]),
              createCell(item.hajm_birlik || '', columnWidths[2]),
              ...uniqueDates.map((date, dIndex) =>
                createCell(item[date]?.toString() || '0', columnWidths[3 + dIndex])
              ),
              createCell(item.umumiy?.toString() || '0', columnWidths[columnWidths.length - 1]),
            ]
          : [
              createCell((index + 1).toString(), columnWidths[0]),
              createCell(item.product_nomi || '', columnWidths[1]),
              createCell(Number(item.hajm || 0).toLocaleString(), columnWidths[2]),
              createCell(item.hajm_birlik || '', columnWidths[3]),
              createCell(item.description || '', columnWidths[4]),
              createCell(item.chiqim_sana || '', columnWidths[5]),
            ],
      })
    );

    const table = new Table({
      rows: [headerRow, ...bodyRows],
      width: { size: 10000, type: WidthType.DXA },
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Chiqimlar ro‘yxati',
              heading: 'Heading1',
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }),
            table,
          ],
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, 'chiqimlar.docx');
    }).catch((err) => {
      console.error('Word eksportida xatolik:', err);
      setErrorMessage('Word hujjatini eksport qilishda xatolik yuz berdi!');
    });
  };

const handleExportToExcel = async () => {
    if (!displayedData.length) {
      setErrorMessage("Export qilish uchun ma'lumot yo‘q");
      return;
    }

    const headers = isAggregated
      ? ['#', 'Mahsulot', 'Birlik', ...uniqueDates, 'Umumiy']
      : ['#', 'Mahsulot', 'Hajm', 'Birlik', 'Izoh', 'Chiqim sanasi'];

    const rows = displayedData.map((item, index) =>
      isAggregated
        ? [
            index + 1,
            item.product_nomi || '',
            item.hajm_birlik || '',
            ...uniqueDates.map((date) => item[date]?.toString() || '0'),
            item.umumiy?.toString() || '0',
          ]
        : [
            index + 1,
            item.product_nomi || '',
            Number(item.hajm || 0).toLocaleString(),
            item.hajm_birlik || '',
            item.description || '',
            item.chiqim_sana || '',
          ]
    );

    await exportToExcel({ headers, rows, filename: 'chiqimlar' });
  };

const handleSave = async (form) => {
  console.log(form, ":annas");

  // Form massiv ekanligini tekshirish
  if (!Array.isArray(form)) {
    // Yagona obyekt uchun tekshirish
    if (!form.sklad_product_id || !form.hajm || parseFloat(form.hajm) <= 0) {
      setErrorMessage('Mahsulot va hajm maydonlari to‘ldirilishi shart!');
      return;
    }
  } else {
    // Massiv uchun har bir qatorni tekshirish
    for (let i = 0; i < form.length; i++) {
      const row = form[i];
      if (!row.sklad_product_id || !row.hajm || parseFloat(row.hajm) <= 0) {
        setErrorMessage(`${i + 1}-qator: Mahsulot va hajm maydonlari to‘ldirilishi shart!`);
        return;
      }
    }
  }

  // Ruxsatlarni tekshirish
  if (!Array.isArray(form) && !permissions.create_kitchen_expenses && !form.id) {
    setErrorMessage("Sizda chiqimni yaratish uchun ruxsat yo‘q!");
    return;
  }
  if (!Array.isArray(form) && !permissions.edit_kitchen_expenses && form.id) {
    setErrorMessage("Sizda chiqimni tahrirlash uchun ruxsat yo‘q!");
    return;
  }

  try {
    setLoading(true);
    if (Array.isArray(form)) {
      // Massiv uchun bulk API ga so‘rov
      await axios.post(`${url}/chiqim_ombor/bulk`, form, authHeader);
    } else {
      // Yagona obyekt uchun post yoki put
      await axios[form.id ? "put" : "post"](
        `${url}/chiqim_ombor${form.id ? `/${form.id}` : ""}`,
        form,
        authHeader
      );
    }
    await fetchData(filter.startDate, filter.endDate, filter.productId);
    setModalOpen(false);
    setEditingItem(null);
  } catch (err) {
    console.error('Saqlashda xatolik:', err.response?.data || err.message);
    setErrorMessage(err.response?.data?.error || 'Saqlashda xatolik yuz berdi. Ma\'lumotlarni tekshirib qayta urinib ko\'ring.');
  } finally {
    setLoading(false);
  }
};

  const handleEdit = (item) => {
    if (!permissions.edit_kitchen_expenses) {
      setErrorMessage("Sizda chiqimni tahrirlash uchun ruxsat yo‘q!");
      return;
    }
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!permissions.delete_kitchen_expenses) {
      setErrorMessage("Sizda chiqimni o‘chirish uchun ruxsat yo‘q!");
      return;
    }
    try {
      setLoading(true);
      await axios.delete(`${url}/chiqim_ombor/${id}`, authHeader);
      await fetchData(filter.startDate, filter.endDate, filter.productId);
    } catch (err) {
      console.error('O‘chirishda xatolik:', err.message);
      setErrorMessage('Chiqimni o‘chirishda xatolik yuz berdi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LayoutComponent>
      {canView ? (
        <>
          <AdminHeader
            title="Ishlatilayapgan maxsulotlar"
            onCreate={
              permissions.create_kitchen_expenses
                ? () => {
                    setEditingItem(null);
                    setModalOpen(true);
                  }
                : null
            }
            canCreate={permissions.create_kitchen_expenses}
          />

          <div className={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={isAggregated}
              onChange={(e) => setIsAggregated(e.target.checked)}
              id="aggregateToggle"
            />
            <label htmlFor="aggregateToggle">
              {isAggregated ? 'Umumiy (Sanalar bo‘yicha)' : 'Yakka'}
            </label>
          </div>

          {loading ? (
            <div className={styles.loading}>Yuklanmoqda...</div>
          ) : (
            <>
              <ChiqimFilter
                filter={{ ...filter, products }}
                onChange={handleFilterChange}
                onSubmit={handleFilterSubmit}
                onExport={handleExportToWord}
                onExportExcel={handleExportToExcel}
                onSearch={handleSearch}
              />

              <AdminTable
                title="Chiqimlar ro'yxati"
                columns={
                  isAggregated
                    ? ['product_nomi', 'hajm_birlik', ...uniqueDates, 'umumiy']
                    : ['id', 'product_nomi', 'hajm', 'hajm_birlik', 'description', 'chiqim_sana', 'created_at', 'actions']
                }
                columnTitles={
                  isAggregated
                    ? {
                        product_nomi: getText('colProduct'),
                        hajm_birlik: getText('colUnit'),
                        ...uniqueDates.reduce((acc, date) => ({ ...acc, [date]: date }), {}),
                        umumiy: getText('colTotal'),
                      }
                    : {
                        id: getText('colId'),
                        product_nomi: getText('colProduct'),
                        hajm: getText('colVolume'),
                        hajm_birlik: getText('colUnit'),
                        description: getText('colComment'),
                        chiqim_sana: getText('colExpenseDate'),
                        created_at: getText('colCreatedDate'),
                        actions: getText('colActions'),
                      }
                }
                data={displayedData.map((item) => ({
                  ...item,
                  hajm: item.hajm ? Number(item.hajm).toLocaleString() : '',
                  umumiy: item.umumiy ? Number(item.umumiy).toLocaleString() : '',
                }))}
                onEdit={isAggregated ? null : (permissions.edit_kitchen_expenses ? handleEdit : null)}
                onDelete={isAggregated ? null : (permissions.delete_kitchen_expenses ? handleDelete : null)}
                permissions={{
                  view1: permissions.view_kitchen_expenses,
                  edit1: permissions.edit_kitchen_expenses,
                  delete1: permissions.delete_kitchen_expenses,
                }}
              />
            </>
          )}

          {modalOpen && (permissions.create_kitchen_expenses || permissions.edit_kitchen_expenses) && (
            <ChiqimModal
              isOpen={modalOpen}
              onClose={() => {
                setModalOpen(false);
                setEditingItem(null);
              }}
              onSave={handleSave}
              products={products}
              initialData={editingItem}
            />
          )}

          <ErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />
        </>
      ) : (
        <p className={styles.errorMessage}>
          Sizda chiqimlarni ko‘rish uchun ruxsat yo‘q!
        </p>
      )}
    </LayoutComponent>
  );
}