
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import LayoutComponent from '../../components/LayoutComponent';
import AdminTable from '../../components/AdminTable';
import SkladkirimModal from '../../components/SkladkirimModal';
import ErrorModal from '../../components/ErrorModal';
import Loader from '../../components/Loader';
import AdminHeader from '../../components/AdminHeader';
import ChiqimFilter from '../../components/ChiqimFilter';
import { saveAs } from 'file-saver';
import axios from 'axios';
import url from '../../host/host';
import { useLang } from '../../i18n/LanguageContext';
import styles from '../../styles/ChiqimlarPage.module.css';
import { exportToExcel } from '../../utils/exportExcel';
import { toLocalDate } from '../../utils/sana';

export default function KirimlarPage() {
  const { t } = useLang();
  const router = useRouter();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filter, setFilter] = useState({ startDate: '', endDate: '', productId: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAggregated, setIsAggregated] = useState(false);
  const [uniqueDates, setUniqueDates] = useState([]);
  const [permissions, setPermissions] = useState({
    view_household_incomes: false,
    create_household_incomes: false,
    edit_household_incomes: false,
    delete_household_incomes: false,
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

  const createPivotTable = (data, groupByKey, dateKey, volumeKey, priceKey, nameKey, unitKey) => {
    const uniqueDates = [...new Set(data.map((item) => item[dateKey]))].sort();
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
      const date = item[dateKey];
      groupedMap[groupId].dates[date] = groupedMap[groupId].dates[date] || { hajm: 0, narx: 0 };
      groupedMap[groupId].dates[date].hajm += Number(item[volumeKey] || 0);
      groupedMap[groupId].dates[date].narx += Number(item[priceKey] || 0) * Number(item[volumeKey] || 0);
      groupedMap[groupId].umumiy_hajm += Number(item[volumeKey] || 0);
      groupedMap[groupId].umumiy_narx += Number(item[priceKey] || 0) * Number(item[volumeKey] || 0);
    });

    const pivotData = Object.values(groupedMap).map((group) => {
      const row = {
        [nameKey]: group[nameKey],
        [unitKey]: group[unitKey],
        umumiy_hajm: Number(group.umumiy_hajm.toFixed(3)),
        umumiy_narx: Number(group.umumiy_narx.toFixed(2)),
      };
      uniqueDates.forEach((date) => {
        row[`hajm_${date}`] = Number((group.dates[date]?.hajm || 0).toFixed(3));
        row[`narx_${date}`] = Number((group.dates[date]?.narx || 0).toFixed(2));
      });
      return row;
    });

    return { pivotData, uniqueDates };
  };

  const enrichData = (takticData, productsData) => {
    const productsMap = {};
    productsData.forEach((p) => {
      productsMap[p.id] = { nomi: p.nomi, hajm_birlik: p.hajm_birlik };
    });

    return takticData.map((item) => {
      const narx = parseFloat(item.narx || 0);
      const hajm = parseFloat(item.hajm || 0);
      const summa = isNaN(narx) || isNaN(hajm) ? 0 : Number((narx * hajm).toFixed(2));

      return {
        ...item,
        product_nomi: productsMap[item.sklad_product_id]?.nomi || 'Noma’lum',
        hajm_birlik: productsMap[item.sklad_product_id]?.hajm_birlik || '',
        summa,
        hajm: isNaN(hajm) ? 0 : Number(hajm.toFixed(3)),
        narx: isNaN(narx) ? 0 : Number(narx.toFixed(2)),
        created_at: item.created_at?.slice(0, 10) || '',
      };
    });
  };

  const applySearch = (dataList, query) => {
    return dataList.filter((item) =>
      item.product_nomi?.toLowerCase().includes(query.toLowerCase())
    );
  };

  const fetchData = async (start = '', end = '', productId = '') => {
    if (!token) {
      setErrorMessage(t('noTokenError'));
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      let permissionsData = {
        view_household_incomes: true,
        create_household_incomes: true,
        edit_household_incomes: true,
        delete_household_incomes: true,
      };

      const params = new URLSearchParams();
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      if (productId) params.append('product', productId);

      const apiCalls = [
        axios.get(`${url}/kirim_maishiy?${params.toString()}`, authHeader),
        axios.get(`${url}/sklad_maishiy`, authHeader),
      ];

      if (type === '3' && adminId) {
        apiCalls.push(axios.get(`${url}/permissions/${adminId}`, authHeader));
      }

      const [takticRes, productsRes, permissionsRes] = await Promise.all(apiCalls);

      if (type === '3' && permissionsRes) {
        permissionsData = permissionsRes.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);
      setCanView(type === '1' || permissionsData.view_household_incomes);

      const enriched = enrichData(takticRes.data, productsRes.data);
      setProducts(productsRes.data);
      setData(enriched);
      setFilteredData(applySearch(enriched, searchQuery));
    } catch (err) {
      console.error('Ma\'lumotlarni olishda xatolik:', err.message);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        setErrorMessage(t('sessionExpired'));
        router.push('/login');
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

  const filteredDataMemo = useMemo(() => {
    return applySearch(data, searchQuery);
  }, [data, searchQuery]);

  useEffect(() => {
    setFilteredData(filteredDataMemo);
    if (isAggregated) {
      const { pivotData, uniqueDates } = createPivotTable(
        filteredDataMemo,
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
      setDisplayedData(filteredDataMemo);
    }
  }, [filteredDataMemo, isAggregated]);

  const handleEdit = (item) => {
    if (!permissions.edit_household_incomes) {
      setErrorMessage(t('noEditIncomePermission'));
      return;
    }
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!permissions.delete_household_incomes) {
      setErrorMessage(t('noDeleteIncomePermission'));
      return;
    }
    try {
      setLoading(true);
      await axios.delete(`${url}/kirim_maishiy/${id}`, authHeader);
      await handleFilterSubmit();
    } catch (err) {
      console.error('O‘chirishda xatolik:', err.message);
      setErrorMessage(t('incomeDeleteError') + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (form) => {
    if (!Array.isArray(form)) {
      if (!form.sklad_product_id || !form.hajm || parseFloat(form.hajm) <= 0 || !form.narx) {
        setErrorMessage(t('productVolumePriceRequired'));
        return;
      }
    } else {
      for (let i = 0; i < form.length; i++) {
        const item = form[i];
        if (!item.sklad_product_id || !item.hajm || parseFloat(item.hajm) <= 0 || !item.narx) {
          setErrorMessage(t('rowProductVolumePriceRequired').replace('{n}', i + 1));
          return;
        }
      }
    }
    try {
      setLoading(true);
      if (editingItem) {
        if (!permissions.edit_household_incomes) {
          setErrorMessage(t('noEditIncomePermission'));
          return;
        }
        await axios.put(`${url}/kirim_maishiy/${editingItem.id}`, form, authHeader);
      } else {
        if (!permissions.create_household_incomes) {
          setErrorMessage(t('noCreateIncomePermission'));
          return;
        }
        await axios.post(`${url}/kirim_maishiy/multi`, form, authHeader);
      }
      await handleFilterSubmit();
      setEditingItem(null);
      setModalOpen(false);
    } catch (err) {
      console.error('Saqlashda xatolik:', err.message);
      setErrorMessage(t('saveError') + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = async () => {
    try {
      setLoading(true);
      const { startDate, endDate, productId } = filter;
      if (startDate && isNaN(new Date(startDate).getTime())) {
        setErrorMessage(t('startDateInvalid'));
        return;
      }
      if (endDate && isNaN(new Date(endDate).getTime())) {
        setErrorMessage(t('endDateInvalid'));
        return;
      }
      await fetchData(startDate, endDate, productId);
    } catch (err) {
      console.error('Filterlashda xatolik:', err.message);
      setErrorMessage(t('filterError') + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
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
      setErrorMessage(t('noDataToExport'));
      return;
    }

    const headers = isAggregated
      ? [t('colNumber'), t('colProduct'), t('colUnit'), ...uniqueDates.flatMap((date) => [t('colVolumeWithDate').replace('{date}', date), t('colPriceWithDate').replace('{date}', date)]), t('colTotalVolume'), t('colTotalPrice')]
      : [t('colNumber'), t('colProduct'), t('colVolume'), t('colUnit'), t('colPrice'), t('colTotal'), t('colComment'), t('colPaymentType'), t('colTime')];
    const columnWidths = isAggregated
      ? [500, 2000, 1000, ...uniqueDates.flatMap(() => [1000, 1500]), 1500, 1500]
      : [500, 2000, 1000, 1000, 1000, 1500, 3000, 2000, 2000];

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

    const bodyRows = displayedData.map((item, index) =>
      new TableRow({
        children: isAggregated
          ? [
              createCell((index + 1).toString(), columnWidths[0]),
              createCell(item.product_nomi || '', columnWidths[1]),
              createCell(item.hajm_birlik || '', columnWidths[2]),
              ...uniqueDates.flatMap((date, dIndex) => [
                createCell(Number(item[`hajm_${date}`] || 0).toLocaleString(), columnWidths[3 + dIndex * 2]),
                createCell(Number(item[`narx_${date}`] || 0).toLocaleString() + ' so‘m', columnWidths[4 + dIndex * 2]),
              ]),
              createCell(Number(item.umumiy_hajm || 0).toLocaleString(), columnWidths[columnWidths.length - 2]),
              createCell(Number(item.umumiy_narx || 0).toLocaleString() + ' so‘m', columnWidths[columnWidths.length - 1]),
            ]
          : [
              createCell((index + 1).toString(), columnWidths[0]),
              createCell(item.product_nomi || '', columnWidths[1]),
              createCell(Number(item.hajm || 0).toLocaleString(), columnWidths[2]),
              createCell(item.hajm_birlik || '', columnWidths[3]),
              createCell(Number(item.narx || 0).toLocaleString(), columnWidths[4]),
              createCell(Number(item.summa || 0).toLocaleString() + ' so‘m', columnWidths[5]),
              createCell(item.description || '', columnWidths[6]),
              createCell(item.payment_method || '', columnWidths[7]),
              createCell(item.created_at || '', columnWidths[8]),
            ],
      })
    );

    const totalRow = !isAggregated
      ? new TableRow({
          children: [
            createCell('', columnWidths[0]),
            createCell(t('colTotal'), columnWidths[1], AlignmentType.RIGHT, true),
            ...Array(3).fill('').map((_, i) => createCell('', columnWidths[2 + i])),
            createCell(Number(totalSum.toFixed(2)).toLocaleString() + ' so‘m', columnWidths[5], AlignmentType.CENTER, true),
            createCell('', columnWidths[6]),
            createCell('', columnWidths[7]),
            createCell('', columnWidths[8]),
          ],
        })
      : null;

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: t('incomesList'), heading: 'Heading1', alignment: AlignmentType.CENTER }),
            new Paragraph({ text: '' }),
            new Table({
              rows: totalRow ? [headerRow, ...bodyRows, totalRow] : [headerRow, ...bodyRows],
              width: { size: 10000, type: WidthType.DXA },
            }),
          ],
        },
      ],
    });

    Packer.toBlob(doc)
      .then((blob) => saveAs(blob, 'kirimlar.docx'))
      .catch((err) => {
        console.error('Word eksportida xatolik:', err);
        setErrorMessage(t('wordExportError') + ': ' + err.message);
      });
  };

  const handleExportToExcel = async () => {
    if (!displayedData.length) {
      setErrorMessage(t('noDataToExport'));
      return;
    }

    const headers = isAggregated
      ? [t('colNumber'), t('colProduct'), t('colUnit'), ...uniqueDates.flatMap((date) => [t('colVolumeWithDate').replace('{date}', date), t('colPriceWithDate').replace('{date}', date)]), t('colTotalVolume'), t('colTotalPrice')]
      : [t('colNumber'), t('colProduct'), t('colVolume'), t('colUnit'), t('colPrice'), t('colTotal'), t('colComment'), t('colPaymentType'), t('colTime')];

    const rows = displayedData.map((item, index) =>
      isAggregated
        ? [
            index + 1,
            item.product_nomi || '',
            item.hajm_birlik || '',
            ...uniqueDates.flatMap((date) => [
              Number(item[`hajm_${date}`] || 0).toLocaleString(),
              Number(item[`narx_${date}`] || 0).toLocaleString() + ' so‘m',
            ]),
            Number(item.umumiy_hajm || 0).toLocaleString(),
            Number(item.umumiy_narx || 0).toLocaleString() + ' so‘m',
          ]
        : [
            index + 1,
            item.product_nomi || '',
            Number(item.hajm || 0).toLocaleString(),
            item.hajm_birlik || '',
            Number(item.narx || 0).toLocaleString(),
            Number(item.summa || 0).toLocaleString() + ' so‘m',
            item.description || '',
            item.payment_method || '',
            item.created_at || '',
          ]
    );

    await exportToExcel({ headers, rows, filename: 'maishiy-kirim' });
  };

  const totalSum = displayedData.reduce((acc, item) => {
    const value = isAggregated ? Number(item.umumiy_narx || 0) : Number(item.summa || 0);
    return acc + (isNaN(value) ? 0 : value);
  }, 0);

  const formattedData = displayedData.map((item) => ({
    ...item,
    hajm: Number(item.hajm || 0).toLocaleString(),
    narx: Number(item.narx || 0).toLocaleString(),
    summa: Number(item.summa || 0).toLocaleString() + ' so‘m',
    umumiy_hajm: Number(item.umumiy_hajm || 0).toLocaleString(),
    umumiy_narx: Number(item.umumiy_narx || 0).toLocaleString() + ' so‘m',
  }));

  return (
    <LayoutComponent>
      {canView ? (
        <>
          <AdminHeader
            title={t('kitchenIncomes')}
            onCreate={permissions.create_household_incomes ? () => { setEditingItem(null); setModalOpen(true); } : null}
            canCreate={permissions.create_household_incomes}
          />
          <div className={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={isAggregated}
              onChange={(e) => setIsAggregated(e.target.checked)}
              id="aggregateToggle"
            />
            <label htmlFor="aggregateToggle">{isAggregated ? t('totalByDates') : t('singleView')}</label>
          </div>
          {loading ? (
            <Loader />
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
                title={t('productIncomes')}
                columns={
                  isAggregated
                    ? ['product_nomi', 'hajm_birlik', ...uniqueDates.flatMap((date) => [`hajm_${date}`, `narx_${date}`]), 'umumiy_hajm', 'umumiy_narx']
                    : ['id', 'product_nomi', 'hajm', 'hajm_birlik', 'narx', 'summa', 'description', 'payment_method', 'created_at', 'actions']
                }
                columnTitles={
                  isAggregated
                    ? {
                        product_nomi: t('colProduct'),
                        hajm_birlik: t('colUnit'),
                        ...uniqueDates.reduce((acc, date) => ({
                          ...acc,
                          [`hajm_${date}`]: `${t('colVolume')} (${date})`,
                          [`narx_${date}`]: `${t('colPrice')} (${date})`,
                        }), {}),
                        umumiy_hajm: t('colTotalVolume'),
                        umumiy_narx: t('colTotalPrice'),
                      }
                    : {
                        id: t('colId'),
                        product_nomi: t('colProduct'),
                        hajm: t('colVolume'),
                        hajm_birlik: t('colUnit'),
                        narx: t('colPrice'),
                        summa: t('colTotalSum'),
                        description: t('colComment'),
                        payment_method: t('colPaymentType'),
                        created_at: t('colTime'),
                        actions: t('colActions'),
                      }
                }
                data={formattedData}
                onDelete={isAggregated ? null : permissions.delete_household_incomes ? handleDelete : null}
                onEdit={isAggregated ? null : permissions.edit_household_incomes ? handleEdit : null}
                permissions={{
                  view1: permissions.view_household_incomes,
                  edit1: permissions.edit_household_incomes,
                  delete1: permissions.delete_household_incomes,
                }}
                customRenderers={{
                  ...uniqueDates.reduce((acc, date) => ({
                    ...acc,
                    [`hajm_${date}`]: (row) => Number(row[`hajm_${date}`] || 0).toLocaleString(),
                    [`narx_${date}`]: (row) => Number(row[`narx_${date}`] || 0).toLocaleString() + ' so‘m',
                  }), {}),
                }}
              />
              <div className={styles.totalBox}>
                Jami summa: {isNaN(totalSum) ? '0' : Number(totalSum.toFixed(2)).toLocaleString()} so&apos;m
              </div>
            </>
          )}
          {modalOpen && (permissions.create_household_incomes || permissions.edit_household_incomes) && (
            <SkladkirimModal
              isOpen={modalOpen}
              onClose={() => { setModalOpen(false); setEditingItem(null); }}
              onSave={handleSave}
              products={products}
              initialData={editingItem}
            />
          )}
          <ErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />
        </>
      ) : (
        <div className={styles.errorMessage}>
          Sizda kirimlarni ko‘rish uchun ruxsat yo‘q!
        </div>
      )}
    </LayoutComponent>
  );
}