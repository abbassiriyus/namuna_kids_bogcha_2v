'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LayoutComponent from '../../components/LayoutComponent';
import AdminHeader from '../../components/AdminHeader';
import AdminTable from '../../components/AdminTable';
import ChiqimModal from '../../components/MaishiyChiqimModal';
import ChiqimFilter from '../../components/ChiqimFilter';
import ErrorModal from '../../components/ErrorModal';
import axios from 'axios';
import url from '../../host/host';
import { useLang } from '../../i18n/LanguageContext';
import { saveAs } from 'file-saver';
import { exportToExcel } from '../../utils/exportExcel';
import { toLocalDate } from '../../utils/sana';
import { useUserType } from '../../utils/useUserType';

export default function ChiqimOmborPage() {
  const { t } = useLang();
  // localStorage render paytida o'qilsa hydration xatosi beradi — hook mount'dan keyin o'qiydi.
  const { isSuperAdmin } = useUserType();
  const router = useRouter();
  const [data, setData] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]);
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [descriptionOptions, setDescriptionOptions] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAggregated, setIsAggregated] = useState(false);
  const [uniqueDates, setUniqueDates] = useState([]);
  const [filter, setFilter] = useState({
    startDate: '',
    endDate: '',
    productId: '',
  });
  const [permissions, setPermissions] = useState({
    view_household_expenses: false,
    create_household_expenses: false,
    edit_household_expenses: false,
    delete_household_expenses: false,
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // 🔹 Ma'lumotlarni pivot jadval formatida guruhlash uchun funksiya
  const createPivotTable = (data, groupByKey, dateKey, volumeKey, priceKey, nameKey, unitKey) => {
    // Unikal sanalarni aniqlash va tartiblash
    const uniqueDates = [...new Set(data.map((item) => item[dateKey]?.slice(0, 10)))].sort();

    // Ma'lumotlarni guruhlash
    const groupedMap = {};
    data.forEach((item) => {
      const groupId = item[groupByKey];
      if (!groupedMap[groupId]) {
        groupedMap[groupId] = {
          [nameKey]: item[nameKey],
          [unitKey]: item[unitKey],
          dates: {},
          umumiy_hajm: 0,
          umumiy_narx: 0,
        };
      }
      const date = item[dateKey]?.slice(0, 10);
      groupedMap[groupId].dates[date] = groupedMap[groupId].dates[date] || { hajm: 0, narx: 0 };
      groupedMap[groupId].dates[date].hajm += Number(item[volumeKey] || 0);
      groupedMap[groupId].dates[date].narx += Number(item[priceKey] || 0) * Number(item[volumeKey] || 0);
      groupedMap[groupId].umumiy_hajm += Number(item[volumeKey] || 0);
      groupedMap[groupId].umumiy_narx += Number(item[priceKey] || 0) * Number(item[volumeKey] || 0);
    });

    // Pivot jadval formatiga o'tkazish
    const pivotData = Object.values(groupedMap).map((group) => {
      const row = {
        [nameKey]: group[nameKey],
        [unitKey]: group[unitKey],
        umumiy_hajm: group.umumiy_hajm,
        umumiy_narx: group.umumiy_narx.toFixed(2),
      };
      uniqueDates.forEach((date) => {
        row[`hajm_${date}`] = group.dates[date]?.hajm || 0;
        row[`narx_${date}`] = (group.dates[date]?.narx || 0).toFixed(2);
      });
      return row;
    });

    return { pivotData, uniqueDates };
  };

  // 🔹 Ma’lumotlarni mahsulot bilan boyitish
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
      return { ...p, available_hajm };
    });

    const productMap = {};
    extendedProducts.forEach((p) => {
      productMap[p.id] = p.nomi;
    });

    const enrichedChiqimlar = chiqimlar.map((item) => {
      const raw = item.description || '';
      const cleanedDescription = raw.startsWith('B:') ? raw.replace('B:', '') : raw;
      const narx = Number(item.narx || 0);
      const hajm = Number(item.hajm || 0);
      const summa = (narx * hajm).toFixed(2);

      return {
        ...item,
        product_nomi: productMap[item.sklad_product_id] || 'Noma’lum',
        hajm_birlik: extendedProducts.find((p) => p.id === item.sklad_product_id)?.hajm_birlik || '',
        hajm: parseFloat(item.hajm) !== parseInt(item.hajm) ? parseFloat(item.hajm) : parseInt(item.hajm),
        narx: parseFloat(item.narx).toString(),
        summa: summa,
        cleanedDescription,
        created_at: item.created_at?.slice(0, 10) || '',
        chiqim_sana: item.chiqim_sana?.slice(0, 10) || '',
      };
    });

    enrichedChiqimlar.sort((a, b) =>
      (a.product_nomi || '').localeCompare(b.product_nomi || '', 'uz', { sensitivity: 'base' })
    );

    const uniqueDescriptions = Array.from(
      new Set(enrichedChiqimlar.map((d) => d.cleanedDescription).filter(Boolean))
    );
    setDescriptionOptions(uniqueDescriptions);

    setData(enrichedChiqimlar);
    setProducts(extendedProducts);
    applySearchAndFilter(enrichedChiqimlar, searchTerm, descriptionFilter);
  };

  // 🔹 Qidiruv va filter funksiyasi
  const applySearchAndFilter = (dataList, search, description) => {
    let filtered = [...dataList];

    if (search.trim()) {
      filtered = filtered.filter((item) => item.product_nomi.toLowerCase().includes(search));
    }

    if (description) {
      filtered = filtered.filter((item) => item.cleanedDescription === description);
    }

    setFilteredData(filtered);

    if (isAggregated) {
      const { pivotData, uniqueDates } = createPivotTable(
        filtered,
        'sklad_product_id',
        'created_at',
        'hajm',
        'narx',
        'product_nomi',
        'hajm_birlik'
      );
      setDisplayedData(pivotData);
      setUniqueDates(uniqueDates);
    } else {
      setDisplayedData(filtered);
    }
  };

  // 🔹 API’dan ma’lumotlarni olish
  const fetchData = async (start = '', end = '', productId = '') => {
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const type = localStorage.getItem('type') || null;
      const adminId =
        type === '3' && typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('admin'))?.id
          : null;

      let permissionsData = {
        view_household_expenses: true,
        create_household_expenses: true,
        edit_household_expenses: true,
        delete_household_expenses: true,
      };

      const params = new URLSearchParams();
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      if (productId) params.append('product', productId);

      const apiCalls = [
        axios.get(`${url}/chiqim_maishiy?${params.toString()}`, authHeader),
        axios.get(`${url}/sklad_maishiy`, authHeader),
      ];

      if (type === '3' && adminId) {
        apiCalls.push(
          axios.get(`${url}/permissions/${adminId}`, { headers: { Authorization: `Bearer ${token}` } })
        );
      }

      const [res, productsRes, permissionsRes] = await Promise.all(apiCalls);

      if (type === '3') {
        permissionsData = permissionsRes?.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);

      enrichData(res.data, productsRes.data);
    } catch (err) {
      console.error('Xatolik:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.push('/');
      } else {
        setErrorMessage("Ma'lumotlarni yuklashda xatolik yuz berdi!");
      }
    }
  };

  // 🔹 Komponent mount bo‘lganda
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const start = toLocalDate(today);
    const end = toLocalDate(tomorrow);

    setFilter({ startDate: start, endDate: end, productId: '' });
    fetchData(start, end);
  }, []);

  // 🔹 Qidiruv, filter va pivot jadval uchun
  useEffect(() => {
    applySearchAndFilter(data, searchTerm, descriptionFilter);
  }, [data, searchTerm, descriptionFilter, isAggregated]);

  // 🔹 Filter o‘zgarishi
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 Filterlash
  const handleFilterSubmit = async () => {
    try {
      const { startDate, endDate, productId } = filter;
      await fetchData(startDate, endDate, productId);
    } catch (err) {
      console.error('Filterlashda xatolik:', err);
      setErrorMessage(t('filterError'));
    }
  };

  // 🔹 Qidiruv
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
  };

  // 🔹 Wordga eksport
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
      ? [
          t('colNumber'),
          t('colProduct'),
          t('colUnit'),
          ...uniqueDates.flatMap((date) => [
            t('colVolumeWithDate').replace('{date}', date),
            t('colPriceWithDate').replace('{date}', date),
          ]),
          t('colTotalVolume'),
          t('colTotalPrice'),
        ]
      : [t('colNumber'), t('colProduct'), t('colVolume'), t('colUnit'), t('colComment'), t('colExpenseDate'), t('colCreatedDate')];
    const columnWidths = isAggregated
      ? [500, 2000, 1000, ...uniqueDates.flatMap(() => [1000, 1500]), 1500, 1500]
      : [500, 2000, 1000, 1000, 4000, 1800, 1800];

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
              ...uniqueDates.flatMap((date, dIndex) => [
                createCell(item[`hajm_${date}`]?.toString() || '0', columnWidths[3 + dIndex * 2]),
                createCell(item[`narx_${date}`]?.toString() || '0', columnWidths[4 + dIndex * 2]),
              ]),
              createCell(item.umumiy_hajm?.toString() || '0', columnWidths[columnWidths.length - 2]),
              createCell(item.umumiy_narx?.toString() || '0', columnWidths[columnWidths.length - 1]),
            ]
          : [
              createCell((index + 1).toString(), columnWidths[0]),
              createCell(item.product_nomi || '', columnWidths[1]),
              createCell(item.hajm?.toString() || '', columnWidths[2]),
              createCell(item.hajm_birlik || '', columnWidths[3]),
              createCell(item.cleanedDescription || '', columnWidths[4]),
              createCell(item.chiqim_sana || '', columnWidths[5]),
              createCell(item.created_at || '', columnWidths[6]),
            ],
      })
    );

    const total = displayedData.reduce((acc, cur) => acc + (parseFloat(cur.summa) || parseFloat(cur.umumiy_narx) || 0), 0);

    const totalRow = !isAggregated
      ? new TableRow({
          children: [
            createCell('', columnWidths[0]),
            createCell(t('colTotal'), columnWidths[1], AlignmentType.RIGHT, true),
            createCell(
              displayedData.reduce((acc, cur) => acc + (parseFloat(cur.hajm) || 0), 0).toString(),
              columnWidths[2],
              AlignmentType.CENTER,
              true
            ),
            createCell('', columnWidths[3]),
            createCell('', columnWidths[4]),
            createCell('', columnWidths[5]),
            createCell(parseFloat(total).toFixed(2).toLocaleString() + ' so‘m', columnWidths[6], AlignmentType.CENTER, true),
          ],
        })
      : null;

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: t('expensesList'),
              heading: 'Heading1',
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }),
            new Table({
              rows: totalRow ? [headerRow, ...bodyRows, totalRow] : [headerRow, ...bodyRows],
              width: { size: 10000, type: WidthType.DXA },
            }),
          ],
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, 'chiqimlar.docx');
    });
  };

  // 🔹 Excelga eksport
  const handleExportToExcel = async () => {
    if (!displayedData.length) {
      setErrorMessage("Export qilish uchun ma'lumot yo‘q");
      return;
    }

    const headers = isAggregated
      ? [
          t('colNumber'),
          t('colProduct'),
          t('colUnit'),
          ...uniqueDates.flatMap((date) => [
            t('colVolumeWithDate').replace('{date}', date),
            t('colPriceWithDate').replace('{date}', date),
          ]),
          t('colTotalVolume'),
          t('colTotalPrice'),
        ]
      : [t('colNumber'), t('colProduct'), t('colVolume'), t('colUnit'), t('colComment'), t('colExpenseDate'), t('colCreatedDate')];

    const rows = displayedData.map((item, index) =>
      isAggregated
        ? [
            index + 1,
            item.product_nomi || '',
            item.hajm_birlik || '',
            ...uniqueDates.flatMap((date) => [
              item[`hajm_${date}`]?.toString() || '0',
              item[`narx_${date}`]?.toString() || '0',
            ]),
            item.umumiy_hajm?.toString() || '0',
            item.umumiy_narx?.toString() || '0',
          ]
        : [
            index + 1,
            item.product_nomi || '',
            item.hajm?.toString() || '',
            item.hajm_birlik || '',
            item.cleanedDescription || '',
            item.chiqim_sana || '',
            item.created_at || '',
          ]
    );

    await exportToExcel({ headers, rows, filename: 'maishiy-chiqim' });
  };

  // 🔹 Saqlash
  const handleSave = async (form) => {
    if (!permissions.create_household_expenses && Array.isArray(form)) {
      setErrorMessage(t('noCreateExpensePermission'));
      return;
    }
    if (!permissions.edit_household_expenses && !Array.isArray(form)) {
      setErrorMessage(t('noEditExpensePermission'));
      return;
    }
    try {
      if (Array.isArray(form)) {
        await axios.post(`${url}/chiqim_maishiy/multi`, form, authHeader);
      } else {
        await axios.put(`${url}/chiqim_maishiy/${form.id}`, form, authHeader);
      }
      await fetchData(filter.startDate, filter.endDate, filter.productId);
      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error("Saqlashda xatolik:", err);
      setErrorMessage(t('saveError'));
    }
  };

  // 🔹 Tahrirlash
  const handleEdit = (item) => {
    if (!permissions.edit_household_expenses) {
      setErrorMessage(t('noEditExpensePermission'));
      return;
    }
    setEditingItem(item);
    setModalOpen(true);
  };

  // 🔹 O‘chirish
  const handleDelete = async (id) => {
    if (!permissions.delete_household_expenses) {
      setErrorMessage(t('noDeleteExpensePermission'));
      return;
    }
    try {
      await axios.delete(`${url}/chiqim_maishiy/${id}`, authHeader);
      await fetchData(filter.startDate, filter.endDate, filter.productId);
    } catch (err) {
      console.error('O‘chirishda xatolik:', err);
      setErrorMessage(t('expenseDeleteError'));
    }
  };

  return (
    <LayoutComponent>
      {(isSuperAdmin || permissions.view_household_expenses) ? (
        <>
          <AdminHeader
            title={t('expenseStorage')}
            onCreate={
              permissions.create_household_expenses
                ? () => {
                    setEditingItem(null);
                    setModalOpen(true);
                  }
                : null
            }
            canCreate={permissions.create_household_expenses}
          />

          <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
            <input
              type="checkbox"
              checked={isAggregated}
              onChange={(e) => setIsAggregated(e.target.checked)}
              style={{ marginRight: '10px' }}
            />
            <span>{isAggregated ? t('totalByDates') : 'Yakka'}</span>
          </div>

          <div style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: '500', fontSize: '16px' }}>{t('filterByComment')}</label>
            <select
              value={descriptionFilter}
              onChange={(e) => setDescriptionFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                fontSize: '15px',
                backgroundColor: '#fff',
                minWidth: '200px',
                cursor: 'pointer',
              }}
            >
              <option value="">{t('all')}</option>
              {descriptionOptions.map((desc, i) => (
                <option key={i} value={desc}>{desc}</option>
              ))}
            </select>
          </div>

          <ChiqimFilter
            filter={{ ...filter, products }}
            onChange={handleFilterChange}
            onSubmit={handleFilterSubmit}
            onExport={handleExportToWord}
            onExportExcel={handleExportToExcel}
            onSearch={handleSearch}
          />

          <AdminTable
            title={t('expensesList')}
            columns={
              isAggregated
                ? ['product_nomi', 'hajm_birlik', ...uniqueDates.flatMap((date) => [`hajm_${date}`, `narx_${date}`]), 'umumiy_hajm', 'umumiy_narx']
                : ['id', 'product_nomi', 'hajm', 'hajm_birlik', 'cleanedDescription', 'chiqim_sana', 'created_at', 'actions']
            }
            columnTitles={
              isAggregated
                ? {
                    product_nomi: t('colProduct'),
                    hajm_birlik: t('colUnit'),
                    ...uniqueDates.reduce(
                      (acc, date) => ({
                        ...acc,
                        [`hajm_${date}`]: `${t('colVolume')} (${date})`,
                        [`narx_${date}`]: `${t('colPrice')} (${date})`,
                      }),
                      {}
                    ),
                    umumiy_hajm: t('colTotalVolume'),
                    umumiy_narx: t('colTotalPrice'),
                  }
                : {
                    id: t('colId'),
                    product_nomi: t('colProduct'),
                    hajm: t('colVolume'),
                    hajm_birlik: t('colUnit'),
                    cleanedDescription: t('colComment'),
                    chiqim_sana: t('colExpenseDate'),
                    created_at: t('colCreatedDate'),
                    actions: t('colActions'),
                  }
            }
            data={displayedData}
            onEdit={isAggregated ? null : (permissions.edit_household_expenses ? (item) => handleEdit(item) : null)}
            onDelete={isAggregated ? null : (permissions.delete_household_expenses ? (id) => handleDelete(id) : null)}
            permissions={{
              view1: permissions.view_household_expenses,
              edit1: permissions.edit_household_expenses,
              delete1: permissions.delete_household_expenses,
            }}
            customRenderers={{
              summa: (row) => (row.summa || 0).toLocaleString() + ' so‘m',
              umumiy_narx: (row) => (row.umumiy_narx || 0).toLocaleString() + ' so‘m',
              ...uniqueDates.reduce(
                (acc, date) => ({
                  ...acc,
                  [`narx_${date}`]: (row) => (row[`narx_${date}`] || 0).toLocaleString() + ' so‘m',
                }),
                {}
              ),
            }}
          />

          <div style={{ marginTop: '10px', fontWeight: 'bold', fontSize: '16px' }}>
            Jami summa: {parseFloat(displayedData.reduce((acc, cur) => acc + (parseFloat(cur.summa) || parseFloat(cur.umumiy_narx) || 0), 0)).toFixed(2).toLocaleString()} so‘m
          </div>

          {modalOpen && (permissions.create_household_expenses || permissions.edit_household_expenses) && (
            <ChiqimModal
              isOpen={modalOpen}
              onClose={() => {
                setModalOpen(false);
                setEditingItem(null);
              }}
              onSave={handleSave}
              initialData={editingItem}
              products={products}
            />
          )}

          <ErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />
        </>
      ) : (
        <p style={{ padding: '20px', color: 'red' }}>
          Sizda chiqimlarni ko‘rish uchun ruxsat yo‘q!
        </p>
      )}
    </LayoutComponent>
  );
}