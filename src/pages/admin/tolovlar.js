'use client';

import { saveAs } from 'file-saver';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../../utils/exportExcel';
import { useEffect, useState, useMemo } from 'react';
import { debounce } from 'lodash';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styles from '../../styles/AdminTable.module.css';
import url from '../../host/host';
import { useLang } from '../../i18n/LanguageContext';
import LayoutComponent from '../../components/LayoutComponent';
import DaromatModal from '../../components/DaromatModal';
import DaromatDeleteModal from '../../components/DaromatDeleteModal';
import BonusShtrafModal from '../../components/BonusShtrafModal';
import AdminTable from '../../components/AdminTableTolov';
import ErrorModal from '../../components/ErrorModal';
import { bugungiOy } from '../../utils/sana';
import Loader from '../../components/Loader';

export default function TolovlarPage() {
  const { t } = useLang();
  const [rows, setRows] = useState([]);
  const [allBolalar, setAllBolalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => bugungiOy());
  const [selectedGroup, setSelectedGroup] = useState('');
  const [searchFish, setSearchFish] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedPaymentType, setSelectedPaymentType] = useState('');
  const [selectedBola, setSelectedBola] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bonusShtrafModalOpen, setBonusShtrafModalOpen] = useState(false);
  const [deleteTargetBolaId, setDeleteTargetBolaId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [permissions, setPermissions] = useState({
    view_payments: false,
    create_payments: false,
    edit_payments: false,
    delete_payments: false,
  });
  const itemsPerPage = 100;

  const router = useRouter();
  const columns = [
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
    'qarz_hadola_otgan',
    'qarz_miqdori_otgan',
    'balans',
    'prognoz_tola_kelsa',
    'prognoz_kelmasa',
  ];

  const columnTitles = {
    fish: t('colFullName'),
    guruh: t('colGroup'),
    oylik_tolov: t('colMonthlyFee'),
    kunlik_tolov: t('colDailyFee'),
    jami: t('colTotalLessons'),
    kelgan: t('colAttended'),
    hisob: t('colCalculated'),
    naqt: t('colCash'),
    karta: t('colCard'),
    prichislena: t('colBank'),
    naqt_prichislena: t('colBankCash'),
    jami_tolangan: t('colTotalPaid'),
    bonus_shtraf: t('colBonusPenalty'),
    qarz_hadola_otgan: t('colPastStatus'),
    qarz_miqdori_otgan: t('colPastAmount'),
    balans: t('colBalanceFull'),
    prognoz_tola_kelsa: t('colForecastFull'),
    prognoz_kelmasa: t('colForecastNone'),
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '0 so‘m';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' so‘m';
  };

  const fetchData = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    // if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    //   setErrorMessage('Noto‘g‘ri oy formati kiritildi!');
    //   return;
    // }

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const type = typeof window !== 'undefined' ? localStorage.getItem('type') : null;
      const adminId = type === '3' && typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('admin'))?.id : null;

      const apiCalls = [
        axios.get(`${url}/guruh`, { headers }),
        axios.get(`${url}/bola_kun/bola?oy=${month}`, { headers }),
      ];

      if (type === '3') {
        apiCalls.push(axios.get(`${url}/permissions/${adminId}`, { headers }));
      }

      const [guruhRes, bolaRes, permissionsRes] = await Promise.all(apiCalls);

      let permissionsData = {
        view_payments: type === '1' ? true : false,
        create_payments: type === '1' ? true : false,
        edit_payments: type === '1' ? true : false,
        delete_payments: type === '1' ? true : false,
      };

      if (type === '3') {
        permissionsData = permissionsRes?.data?.permissions || permissionsData;
        setPermissions((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(permissionsData)) {
            return permissionsData;
          }
          return prev;
        });
      } else {
        setPermissions(permissionsData);
      }

      const guruhMap = {};
      guruhRes.data.forEach((g) => {
        guruhMap[g.id] = g.name;
      });
      setGroups(guruhRes.data);

      const bolalarData = bolaRes.data.map((item) => {
        const bola = item.bola;
        const oyData = item.oylar.find((o) => o.oy === month) || {
          keldi: 0,
          kelmadi: 0,
          tolov_miqdori: parseFloat(bola.oylik_toliv) || 0,
          kunlik_tolov: parseFloat(bola.oylik_toliv) / 25 || 0,
          hisoblangan_tolov: 0,
          fakt_tolov: 0,
          farq: 0,
          balans: parseFloat(bola.balans) || 0,
          daromad: { naqt: 0, karta: 0, prichislena: 0, naqt_prichislena: 0 },
          bonus_shtraf: 0,
          jami_dars_kun: 0,
          bola_dars_kunlari: [],
          prognoz_tola_kelsa: 0,
          prognoz_kelmasa: 0,
        };

        // Calculate previous months' debt/credit
        let qarz_hadola_otgan = 'Noma’lum';
        let qarz_miqdori_otgan = 0;
        const previousOylar = item.oylar.filter((o) => o.oy < month).sort((a, b) => b.oy.localeCompare(a.oy));
        if (previousOylar.length > 0) {
          const lastPreviousOy = previousOylar[0];
          const lastBalans = lastPreviousOy.balans || 0;
          qarz_miqdori_otgan = lastBalans < 0 ? Math.abs(lastBalans) : -lastBalans;
          qarz_hadola_otgan = lastBalans < 0 ? 'Qarzdor' : lastBalans > 0 ? 'Haqdor' : 'Noma’lum';
        }

        return {
          id: bola.id,
          fish: bola.username,
          guruh: guruhMap[bola.guruh_id] || 'Noma’lum',
          oylik_tolov: oyData.tolov_miqdori,
          kunlik_tolov: oyData.kunlik_tolov,
          jami: oyData.jami_dars_kun,
          kelgan: oyData.keldi,
          hisob: oyData.hisoblangan_tolov,
          naqt: oyData.daromad.naqt,
          karta: oyData.daromad.karta,
          prichislena: oyData.daromad.prichislena,
          naqt_prichislena: oyData.daromad.naqt_prichislena,
          jami_tolangan: oyData.fakt_tolov,
          bonus_shtraf: oyData.bonus_shtraf,
          qarz_hadola_otgan,
          qarz_miqdori_otgan:-qarz_miqdori_otgan,
          balans: oyData.balans,
          prognoz_tola_kelsa: oyData.prognoz_tola_kelsa ?? 0,
          prognoz_kelmasa: oyData.prognoz_kelmasa ?? 0,
          username: bola.username,
          guruh_id: guruhMap[bola.guruh_id] || 'Noma’lum',
          is_active: bola.is_active,
          shtraf_bonuslar: item.shtraf_bonuslar || [],
        };
      });

      bolalarData.sort((a, b) => a.fish?.localeCompare(b.fish, 'uz', { sensitivity: 'base' }));
      setAllBolalar(bolalarData);
      setRows(bolalarData);
    } catch (error) {
      console.error('Xatolik:', error);
      if (error.response?.status === 400) {
        setErrorMessage('Noto‘g‘ri oy parametri kiritildi!');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.push('/login');
      } else {
        setErrorMessage(t('loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  // `month` ni dependency sifatida kiritish shart: aks holda debounce birinchi
  // renderdagi eskirgan `fetchData` yopilishini (bugungi oy bilan) doim ishlatib qolaveradi.
  const debouncedFetchData = useMemo(() => debounce(fetchData, 300), [month]);

  const filterRows = () => {
    let filtered = allBolalar;

    // Client-side filtering as a fallback if backend doesn't handle 'filter' parameter
    if (filter === 'active') {
      filtered = filtered.filter((b) => b.is_active);
    } else if (filter === 'inactive') {
      filtered = filtered.filter((b) => !b.is_active);
    } else if (filter === 'qarzdor') {
      filtered = filtered.filter((b) => b.balans < 0);
    }

    // Payment type filter
    if (selectedPaymentType) {
      filtered = filtered.filter((r) => {
        switch (selectedPaymentType) {
          case 'naqt':
            return r.naqt > 0;
          case 'karta':
            return r.karta > 0;
          case 'prichislena':
            return r.prichislena > 0;
          case 'naqt_prichislena':
            return r.naqt_prichislena > 0;
          case 'naqt_yoq':
            return r.naqt === 0;
          case 'karta_yoq':
            return r.karta === 0;
          case 'prichislena_yoq':
            return r.prichislena === 0;
          case 'naqt_prichislena_yoq':
            return r.naqt_prichislena === 0;
          default:
            return true;
        }
      });
    }

    // Group, search, and debt status filters
    filtered = filtered.filter((r) => {
      const guruhOk = selectedGroup ? r.guruh === groups.find((g) => g.id == selectedGroup)?.name : true;
      const searchOk = columns.some((col) => {
        const value = r[col];
        return value !== null && value !== undefined && value.toString().toLowerCase().includes(searchFish.toLowerCase());
      });
      let statusOk = true;
      if (selectedStatus === 'qarzdor') {
        statusOk = r.balans < 0;
      } else if (selectedStatus === 'qarzsiz') {
        statusOk = r.balans >= 0;
      }
      return guruhOk && searchOk && statusOk;
    });

    return filtered;
  };

  const filteredRows = useMemo(
    () => filterRows(),
    [allBolalar, filter, selectedPaymentType, selectedGroup, groups, searchFish, selectedStatus]
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, endIndex);

  const totalSummary = useMemo(
    () =>
      filteredRows.reduce(
        (acc, row) => {
          acc.naqt += row.naqt || 0;
          acc.karta += row.karta || 0;
          acc.prichislena += row.prichislena || 0;
          acc.naqt_prichislena += row.naqt_prichislena || 0;
          acc.jami_tolangan += row.jami_tolangan || 0;
          acc.bonus_shtraf += row.bonus_shtraf || 0;
          acc.qarz_miqdori_otgan += row.qarz_miqdori_otgan || 0;
          return acc;
        },
        {
          naqt: 0,
          karta: 0,
          prichislena: 0,
          naqt_prichislena: 0,
          jami_tolangan: 0,
          bonus_shtraf: 0,
          qarz_miqdori_otgan: 0,
        }
      ),
    [filteredRows]
  );

  const exportToDocx = async () => {
    const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } = await import('docx');

    if (!permissions.view_payments) {
      setErrorMessage("Sizda ma'lumotlarni eksport qilish uchun ruxsat yo‘q!");
      return;
    }
    if (!filteredRows.length) {
      setErrorMessage("Eksport qilish uchun ma'lumot yo‘q!");
      return;
    }

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: `To‘lovlar Ro'yxati (${month})`, bold: true, size: 14 })],
              spacing: { after: 200 },
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '№', size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ism', size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Guruh', size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Oylik to'lov", size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Kunlik to'lov", size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t('colTotalLessonsShort'), size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Kelgan', size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Hisob', size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Naqt', size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Karta', size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Bank', size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Bank (naqt)', size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t('colTotalPaid'), size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Bonus/Shtraf', size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'O‘tgan oylardagi holat', size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'O‘tgan oylardagi qarz/haqdorlik', size: 14, bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Balans', size: 14, bold: true })] })] }),
                  ],
                }),
                ...filteredRows.map((item, index) =>
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString(), size: 12 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.fish || '', size: 12 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.guruh || '', size: 12 })] })] }),
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: formatCurrency(item.oylik_tolov) || '0 so‘m', size: 12 })] }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: formatCurrency(item.kunlik_tolov) || '0 so‘m', size: 12 })] }),
                        ],
                      }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.jami?.toString() || '0', size: 12 })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.kelgan?.toString() || '0', size: 12 })] })] }),
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: formatCurrency(item.hisob) || '0 so‘m', size: 12 })] }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: formatCurrency(item.naqt) || '0 so‘m', size: 12 })] }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: formatCurrency(item.karta) || '0 so‘m', size: 12 })] }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: formatCurrency(item.prichislena) || '0 so‘m', size: 12 })] }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: formatCurrency(item.naqt_prichislena) || '0 so‘m', size: 12 })] }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: formatCurrency(item.jami_tolangan) || '0 so‘m', size: 12 })] }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: formatCurrency(item.bonus_shtraf) || '0 so‘m', size: 12 })] }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: item.qarz_hadola_otgan || 'Noma’lum', size: 12 })] }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: formatCurrency(item.qarz_miqdori_otgan) || '0 so‘m', size: 12 })] }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: formatCurrency(item.balans) || '0 so‘m', size: 12 })] }),
                        ],
                      }),
                    ],
                  })
                ),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Umumiy naqt: ${formatCurrency(totalSummary.naqt)}`,
                  bold: true,
                  size: 12,
                }),
              ],
              spacing: { before: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Umumiy karta: ${formatCurrency(totalSummary.karta)}`,
                  bold: true,
                  size: 12,
                }),
              ],
              spacing: { before: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: t('totalBankPaymentLine').replace('{sum}', formatCurrency(totalSummary.prichislena)),
                  bold: true,
                  size: 12,
                }),
              ],
              spacing: { before: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Umumiy bank (naqt): ${formatCurrency(totalSummary.naqt_prichislena)}`,
                  bold: true,
                  size: 12,
                }),
              ],
              spacing: { before: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Umumiy to‘langan: ${formatCurrency(totalSummary.jami_tolangan)}`,
                  bold: true,
                  size: 12,
                }),
              ],
              spacing: { before: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Umumiy bonus/shtraf: ${formatCurrency(totalSummary.bonus_shtraf)}`,
                  bold: true,
                  size: 12,
                }),
              ],
              spacing: { before: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Umumiy o‘tgan oylardagi qarz/haqdorlik: ${formatCurrency(totalSummary.qarz_miqdori_otgan)}`,
                  bold: true,
                  size: 12,
                }),
              ],
              spacing: { before: 100 },
            }),
          ],
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `tolovlar_${month}.docx`);
    });
  };

  const handleExportToExcel = async () => {
    if (!permissions.view_payments) {
      setErrorMessage("Sizda ma'lumotlarni eksport qilish uchun ruxsat yo‘q!");
      return;
    }
    if (!filteredRows.length) {
      setErrorMessage("Eksport qilish uchun ma'lumot yo‘q!");
      return;
    }

    const headers = [
      '№',
      'Ism',
      'Guruh',
      "Oylik to'lov",
      "Kunlik to'lov",
      t('colTotalLessonsShort'),
      'Kelgan',
      'Hisob',
      'Naqt',
      'Karta',
      'Bank',
      'Bank (naqt)',
      t('colTotalPaid'),
      'Bonus/Shtraf',
      'O‘tgan oylardagi holat',
      'O‘tgan oylardagi qarz/haqdorlik',
      'Balans',
    ];

    const rows = filteredRows.map((item, index) => [
      index + 1,
      item.fish || '',
      item.guruh || '',
      formatCurrency(item.oylik_tolov),
      formatCurrency(item.kunlik_tolov),
      item.jami?.toString() || '0',
      item.kelgan?.toString() || '0',
      formatCurrency(item.hisob),
      formatCurrency(item.naqt),
      formatCurrency(item.karta),
      formatCurrency(item.prichislena),
      formatCurrency(item.naqt_prichislena),
      formatCurrency(item.jami_tolangan),
      formatCurrency(item.bonus_shtraf),
      item.qarz_hadola_otgan || 'Noma’lum',
      formatCurrency(item.qarz_miqdori_otgan),
      formatCurrency(item.balans),
    ]);

    await exportToExcel({ headers, rows, filename: `tolovlar_${month}` });
  };

  const handleCustomAction = (row, actionType) => {
    if (!permissions.edit_payments && actionType !== 'delete') {
      setErrorMessage("Sizda to'lovlarni tahrirlash uchun ruxsat yo‘q!");
      return;
    }
    if (!permissions.delete_payments && actionType === 'delete') {
      setErrorMessage("Sizda to'lovlarni o‘chirish uchun ruxsat yo‘q!");
      return;
    }
    if (actionType === 'bonusShtraf') {
      setSelectedBola({ ...row, shtraf_bonuslar: row.shtraf_bonuslar });
      setBonusShtrafModalOpen(true);
    } else if (actionType === 'tolov') {
      setSelectedBola(row);
      setModalOpen(true);
    } else if (actionType === 'delete') {
      setDeleteTargetBolaId(row.id);
      setDeleteModalOpen(true);
    }
  };

  useEffect(() => {
    debouncedFetchData();
    return () => debouncedFetchData.cancel();
  }, [month, filter, debouncedFetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGroup, searchFish, selectedStatus, filter, selectedPaymentType]);

  return (
    <LayoutComponent>
      <>
        {permissions.view_payments ? (
        <>
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>
          To‘lovlar va daromadlar ({month})
        </h2>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label>Oy:</label>
            <input
              type="month"
              defaultValue={month}
              min="2020-01"
              max={bugungiOy()}
              onChange={(e) => {
                setMonth(e.target.value);
                setCurrentPage(1);
              }}
              id='month1'
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label>{t('groupLabel')}</label>
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
              }}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
            >
              <option value="">{t('all')}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label>{t('nameSurnameLabel')}</label>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchFish}
              onChange={(e) => {
                setSearchFish(e.target.value);
              }}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
            <label>{t('paymentTypeLabel')}</label>
            <select
              value={selectedPaymentType}
              onChange={(e) => {
                setSelectedPaymentType(e.target.value);
              }}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
            >
              <option value="">{t('all')}</option>
              <option value="naqt">Naqt to‘laganlar</option>
              <option value="karta">Karta to‘laganlar</option>
              <option value="prichislena">Bank orqali to‘laganlar</option>
              <option value="naqt_prichislena">Bank (naqt) orqali to‘laganlar</option>
              <option value="naqt_yoq">Naqt to‘lamaganlar</option>
              <option value="karta_yoq">Karta to‘lamaganlar</option>
              <option value="prichislena_yoq">Bank orqali to‘lamaganlar</option>
              <option value="naqt_prichislena_yoq">Bank (naqt) orqali to‘lamaganlar</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
            <label>{t('debtStatusLabel')}</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
              }}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
            >
              <option value="">{t('all')}</option>
              <option value="qarzdor">Qarzdor</option>
              <option value="qarzsiz">Qarzsiz</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
            <label>{t('statusLabel')}</label>
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
            >
              <option value="all">Barchasi</option>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
              <option value="qarzdor">Qarzdor</option>
            </select>
          </div>
          <button
            onClick={exportToDocx}
            style={{
              margin: '10px',
              padding: '10px',
              backgroundColor: '#4CAF50',
              color: 'white',
              borderRadius: '5px',
              border: 'none',
              marginTop: '19px',
            }}
            disabled={!permissions.view_payments}
          >
            <FileDown size={16} /> Filega aylantirish
          </button>
          <button
            onClick={handleExportToExcel}
            style={{
              margin: '10px',
              padding: '10px',
              backgroundColor: '#217346',
              color: 'white',
              borderRadius: '5px',
              border: 'none',
              marginTop: '19px',
            }}
            disabled={!permissions.view_payments}
          >
            <FileSpreadsheet size={16} /> Excelga aylantirish
          </button>
        </div>

        {loading ? (
          <Loader />
        ) : filteredRows.length === 0 ? (
          <p style={{ padding: '10px' }}>{t('noDataFound')}</p>
        ) : (
          <>
            <p>
              <strong>Natija:</strong> {filteredRows.length} ta bola
            </p>
            <AdminTable
              title=""
              columns={columns}
              columnTitles={columnTitles}
              data={paginatedRows}
              onEdit={permissions.edit_payments ? (row) => {
                setSelectedBola(row);
                setModalOpen(true);
              } : null}
              onDelete={permissions.delete_payments ? (id) => {
                setDeleteTargetBolaId(id);
                setDeleteModalOpen(true);
              } : null}
              onCustomAction={permissions.edit_payments || permissions.delete_payments ? handleCustomAction : null}
              currentPage={currentPage}
              totalItems={filteredRows.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              permissions={{
                view_payments: permissions.view_payments,
                edit_payments: permissions.edit_payments,
                delete_payments: permissions.delete_payments,
              }}
            />
            <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '8px', maxWidth: '400px' }}>
              <h3>{t('totalPaymentsTitle')}</h3>
              <p>
                <strong>Naqt:</strong> {formatCurrency(totalSummary.naqt)}
              </p>
              <p>
                <strong>Karta:</strong> {formatCurrency(totalSummary.karta)}
              </p>
              <p>
                <strong>Bank to‘lov:</strong> {formatCurrency(totalSummary.prichislena)}
              </p>
              <p>
                <strong>Bank (naqt):</strong> {formatCurrency(totalSummary.naqt_prichislena)}
              </p>
              <p>
                <strong>Jami to‘langan:</strong> {formatCurrency(totalSummary.jami_tolangan)}
              </p>
              <p>
                <strong>Bonus/Shtraf:</strong> {formatCurrency(totalSummary.bonus_shtraf)}
              </p>
              <p>
                <strong>O‘tgan oylardagi qarz/haqdorlik:</strong> {formatCurrency(totalSummary.qarz_miqdori_otgan)}
              </p>
            </div>
          </>
        )}
        </>
        ) : (
          <p style={{ padding: '20px', color: 'red' }}>{t('noPaymentsPermission')}</p>
        )}

        {modalOpen && (permissions.create_payments || permissions.edit_payments) && (
          <DaromatModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            bola={selectedBola}
            month={month}
            onSaved={() => {
              setModalOpen(false);
              setLoading(true);
              fetchData();
            }}
          />
        )}

        {deleteModalOpen && permissions.delete_payments && (
          <DaromatDeleteModal
            open={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            bolaId={deleteTargetBolaId}
            month={month}
            onDeleted={() => {
              setLoading(true);
              fetchData();
            }}
          />
        )}

        {bonusShtrafModalOpen && permissions.edit_payments && (
          <BonusShtrafModal
            open={bonusShtrafModalOpen}
            onClose={() => setBonusShtrafModalOpen(false)}
            bola={selectedBola}
            month={month}
            onSaved={() => {
              setBonusShtrafModalOpen(false);
              setLoading(true);
              fetchData();
            }}
          />
        )}

        <ErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />
      </>
    </LayoutComponent>
  );
}