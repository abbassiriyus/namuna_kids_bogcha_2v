"use client";

import { useState } from 'react';
import url from '../host/host';
import { saveAs } from 'file-saver';
import styles from '../styles/umumiySumma.module.css';
import { exportToExcel } from '../utils/exportExcel';
import { useLang } from '../i18n/LanguageContext';

export default function UmumiySumma() {
  const { t } = useLang();
  const [year, setYear] = useState('2025');
  const [month, setMonth] = useState('6');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Oylar ro‘yxati o‘zbek tilida
  const months = [
    { value: '1', label: 'Yanvar' },
    { value: '2', label: 'Fevral' },
    { value: '3', label: 'Mart' },
    { value: '4', label: 'Aprel' },
    { value: '5', label: 'May' },
    { value: '6', label: 'Iyun' },
    { value: '7', label: 'Iyul' },
    { value: '8', label: 'Avgust' },
    { value: '9', label: 'Sentyabr' },
    { value: '10', label: 'Oktyabr' },
    { value: '11', label: 'Noyabr' },
    { value: '12', label: 'Dekabr' },
  ];

  // Oy uchun sana oralig‘ini hisoblash
  const getDateRange = (year, month) => {
    const start = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, parseInt(month), 0);
    const end = `${year}-${month.padStart(2, '0')}-${endDate.getDate()}`;
    return { start, end };
  };

  // Sana oralig‘iga mos yozuvlarni filtr qilish
  const filterByDateRange = (rows, start, end) => {
    return rows.filter(row => {
      const rowDate = new Date(row.created_at);
      return rowDate >= new Date(start) && rowDate <= new Date(`${end}T23:59:59.999Z`);
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    // Tokenni localStorage dan olish
    const token = localStorage.getItem('token');
    if (!token) {
      setError(t('authTokenNotFound'));
      setLoading(false);
      return;
    }

    // Yil validatsiyasi
    const yearRegex = /^\d{4}$/;
    if (!yearRegex.test(year)) {
      setError('Yil YYYY formatida bo‘lishi kerak');
      setLoading(false);
      return;
    }

    try {
      // Sana oralig‘ini olish
      const { start, end } = getDateRange(year, month);

      // Daromat ma’lumotlarini olish
      const daromatRes = await fetch(`${url}/daromat_type?year=${year}&month=${month}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const daromatRows = await daromatRes.json();
      console.log('Daromat Rows:', daromatRows); // Debugging
      if (!daromatRes.ok) {
        throw new Error(daromatRows.error || 'Daromat ma’lumotlarini olishda xato');
      }

      // Daromat summalarini hisoblash
      const daromatTotals = daromatRows.reduce(
        (acc, row) => ({
          total_naqt: acc.total_naqt + (parseFloat(row?.naqt) || 0),
          total_karta: acc.total_karta + (parseFloat(row?.karta) || 0),
          total_prichislena: acc.total_prichislena + (parseFloat(row?.prichislena) || 0),
          total_naqt_prichislena: acc.total_naqt_prichislena + (parseFloat(row?.naqt_prichislena) || 0),
        }),
        { total_naqt: 0, total_karta: 0, total_prichislena: 0, total_naqt_prichislena: 0 }
      );
      daromatTotals.total_daromat =
        (daromatTotals.total_naqt || 0) +
        (daromatTotals.total_karta || 0) +
        (daromatTotals.total_prichislena || 0) +
        (daromatTotals.total_naqt_prichislena || 0);

      // Maishiy chiqimlar ma’lumotlarini olish
      const maishiyRes = await fetch(`${url}/kirim_maishiy?start=${start}&end=${end}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const maishiyRows = await maishiyRes.json();
      console.log('Maishiy Rows:', maishiyRows); // Debugging
      if (!maishiyRes.ok) {
        throw new Error(maishiyRows.error || 'Maishiy chiqim ma’lumotlarini olishda xato');
      }

      // Maishiy chiqim summalarini hisoblash
      const maishiyTotals = maishiyRows.reduce(
        (acc, row) => {
          const amount = (parseFloat(row?.hajm) || 0) * (parseFloat(row?.narx) || 0);
          return {
            total_naqt: acc.total_naqt + (row?.payment_method === 'naqt' ? amount : 0),
            total_karta: acc.total_karta + (row?.payment_method === 'karta' ? amount : 0),
            total_prichislena: acc.total_prichislena + ((row?.payment_method === 'bank' || row?.payment_method === 'prichislena') ? amount : 0),
            total_naqt_prichislena: acc.total_naqt_prichislena + ((row?.payment_method === 'boshqa' || row?.payment_method === 'naqt_prichislena') ? amount : 0),
            total_kirim: acc.total_kirim + amount,
          };
        },
        { total_naqt: 0, total_karta: 0, total_prichislena: 0, total_naqt_prichislena: 0, total_kirim: 0 }
      );

      // Oshxona chiqimlari ma’lumotlarini olish
      const takticRes = await fetch(`${url}/sklad_product_taktic`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      let takticRows = await takticRes.json();
      console.log('Taktic Rows (before filter):', takticRows); // Debugging
      if (!takticRes.ok) {
        throw new Error(takticRows.error || 'Oshxona chiqim ma’lumotlarini olishda xato');
      }

      // Frontendda sana bo‘yicha filtr qilish
      takticRows = filterByDateRange(takticRows, start, end);
      console.log('Taktic Rows (after filter):', takticRows); // Debugging

      // Oshxona chiqim summalarini hisoblash
      const takticTotals = takticRows.reduce(
        (acc, row) => {
          const amount = (parseFloat(row?.hajm) || 0) * (parseFloat(row?.narx) || 0);
          return {
            total_naqt: acc.total_naqt + (row?.payment_method === 'naqt' ? amount : 0),
            total_karta: acc.total_karta + (row?.payment_method === 'karta' ? amount : 0),
            total_prichislena: acc.total_prichislena + ((row?.payment_method === 'bank' || row?.payment_method === 'prichislena') ? amount : 0),
            total_naqt_prichislena: acc.total_naqt_prichislena + ((row?.payment_method === 'boshqa' || row?.payment_method === 'naqt_prichislena') ? amount : 0),
            total_kirim: acc.total_kirim + amount,
          };
        },
        { total_naqt: 0, total_karta: 0, total_prichislena: 0, total_naqt_prichislena: 0, total_kirim: 0 }
      );

      // Qo‘shimcha xarajatlar ma’lumotlarini olish
      const qoshimchaRes = await fetch(`${url}/chiqim_qoshimcha`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      let qoshimchaRows = await qoshimchaRes.json();
      console.log('Qoshimcha Rows (before filter):', qoshimchaRows); // Debugging
      if (!qoshimchaRes.ok) {
        throw new Error(qoshimchaRows.error || t('extraExpensesLoadError'));
      }

      // Frontendda sana bo‘yicha filtr qilish
      qoshimchaRows = filterByDateRange(qoshimchaRows, start, end);
      console.log('Qoshimcha Rows (after filter):', qoshimchaRows); // Debugging

      // Qo‘shimcha xarajatlar summasini hisoblash
      const qoshimchaTotals = qoshimchaRows.reduce(
        (acc, row) => ({
          total_naqt: acc.total_naqt + (row?.payment_method === 'naqt' ? parseFloat(row?.price) || 0 : 0),
          total_karta: acc.total_karta + (row?.payment_method === 'karta' ? parseFloat(row?.price) || 0 : 0),
          total_prichislena: acc.total_prichislena + ((row?.payment_method === 'bank' || row?.payment_method === 'prichislena') ? parseFloat(row?.price) || 0 : 0),
          total_naqt_prichislena: acc.total_naqt_prichislena + ((row?.payment_method === 'boshqa' || row?.payment_method === 'naqt_prichislena') ? parseFloat(row?.price) || 0 : 0),
          total_kirim: acc.total_kirim + (parseFloat(row?.price) || 0),
        }),
        { total_naqt: 0, total_karta: 0, total_prichislena: 0, total_naqt_prichislena: 0, total_kirim: 0 }
      );

      // Xodimlar oyligi ma’lumotlarini olish
      const oylikRes = await fetch(`${url}/oylik_type`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      let oylikRows = await oylikRes.json();
      console.log('Oylik Rows (before filter):', oylikRows); // Debugging
      if (!oylikRes.ok) {
        throw new Error(oylikRows.error || t('salariesLoadError'));
      }

      // Frontendda sana bo‘yicha filtr qilish
      oylikRows = filterByDateRange(oylikRows, start, end);
      console.log('Oylik Rows (after filter):', oylikRows); // Debugging

      // Xodimlar oyligi summasini hisoblash
      const oylikTotals = oylikRows.reduce(
        (acc, row) => ({
          ...acc,
          total_kirim: acc.total_kirim + (parseFloat(row?.narx) || 0),
        }),
        { total_naqt: 0, total_karta: 0, total_prichislena: 0, total_naqt_prichislena: 0, total_kirim: 0 }
      );

      // Umumiy chiqimni hisoblash
      const totalChiqim = {
        total_naqt: (maishiyTotals.total_naqt || 0) + (takticTotals.total_naqt || 0) + (qoshimchaTotals.total_naqt || 0),
        total_karta: (maishiyTotals.total_karta || 0) + (takticTotals.total_karta || 0) + (qoshimchaTotals.total_karta || 0),
        total_prichislena: (maishiyTotals.total_prichislena || 0) + (takticTotals.total_prichislena || 0) + (qoshimchaTotals.total_prichislena || 0),
        total_naqt_prichislena: (maishiyTotals.total_naqt_prichislena || 0) + (takticTotals.total_naqt_prichislena || 0) + (qoshimchaTotals.total_naqt_prichislena || 0),
        total_kirim: (maishiyTotals.total_kirim || 0) + (takticTotals.total_kirim || 0) + (qoshimchaTotals.total_kirim || 0) + (oylikTotals.total_kirim || 0),
      };

      // Barcha ma’lumotlarni birlashtirish
      setData({
        daromat: daromatTotals,
        maishiy: maishiyTotals,
        taktic: takticTotals,
        qoshimcha: qoshimchaTotals,
        oylik: oylikTotals,
        totalChiqim,
      });
    } catch (err) {
      console.error('Fetch Error:', err); // Debugging
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Safe number formatting
  const formatNumber = (value) => {
    return typeof value === 'number' ? value.toLocaleString() : '0';
  };

  // Word eksporti uchun funksiya
  const handleExportToWord = async () => {
    if (!data || !data.daromat || !data.maishiy || !data.taktic || !data.qoshimcha || !data.oylik || !data.totalChiqim) {
      setError('Eksport qilish uchun ma’lumotlar hali to‘liq yuklanmadi');
      return;
    }

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

    const headers = ['Kategoriya', 'Naqt (so‘m)', 'Karta (so‘m)', 'Bank (so‘m)', 'Naqt bank (so‘m)', t('colTotalSom')];
    const columnWidths = [2000, 1500, 1500, 1500, 1500, 1500];

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

    const bodyRows = [
      {
        category: 'Daromad',
        values: [
          data.daromat?.total_naqt || 0,
          data.daromat?.total_karta || 0,
          data.daromat?.total_prichislena || 0,
          data.daromat?.total_naqt_prichislena || 0,
          data.daromat?.total_daromat || 0,
        ],
      },
      {
        category: 'Maishiy chiqimlar',
        values: [
          data.maishiy?.total_naqt || 0,
          data.maishiy?.total_karta || 0,
          data.maishiy?.total_prichislena || 0,
          data.maishiy?.total_naqt_prichislena || 0,
          data.maishiy?.total_kirim || 0,
        ],
      },
      {
        category: 'Oshxona chiqimlari',
        values: [
          data.taktic?.total_naqt || 0,
          data.taktic?.total_karta || 0,
          data.taktic?.total_prichislena || 0,
          data.taktic?.total_naqt_prichislena || 0,
          data.taktic?.total_kirim || 0,
        ],
      },
      {
        category: t('extraExpenses'),
        values: [
          data.qoshimcha?.total_naqt || 0,
          data.qoshimcha?.total_karta || 0,
          data.qoshimcha?.total_prichislena || 0,
          data.qoshimcha?.total_naqt_prichislena || 0,
          data.qoshimcha?.total_kirim || 0,
        ],
      },
      {
        category: t('employeeSalaries'),
        values: [
          data.oylik?.total_naqt || 0,
          data.oylik?.total_karta || 0,
          data.oylik?.total_prichislena || 0,
          data.oylik?.total_naqt_prichislena || 0,
          data.oylik?.total_kirim || 0,
        ],
      },
      {
        category: 'Umumiy chiqim',
        values: [
          data.totalChiqim?.total_naqt || 0,
          data.totalChiqim?.total_karta || 0,
          data.totalChiqim?.total_prichislena || 0,
          data.totalChiqim?.total_naqt_prichislena || 0,
          data.totalChiqim?.total_kirim || 0,
        ],
        bold: true,
      },
      {
        category: 'Sof foyda',
        values: [
          (data.daromat?.total_naqt || 0) - (data.totalChiqim?.total_naqt || 0),
          (data.daromat?.total_karta || 0) - (data.totalChiqim?.total_karta || 0),
          (data.daromat?.total_prichislena || 0) - (data.totalChiqim?.total_prichislena || 0),
          (data.daromat?.total_naqt_prichislena || 0) - (data.totalChiqim?.total_naqt_prichislena || 0),
          (data.daromat?.total_daromat || 0) - (data.totalChiqim?.total_kirim || 0),
        ],
        bold: true,
      },
    ].map((row) =>
      new TableRow({
        children: [
          createCell(row.category, columnWidths[0], AlignmentType.LEFT, row.bold || false),
          ...row.values.map((value, i) =>
            createCell(Number(value).toLocaleString() + (i >= 1 ? ' so‘m' : ''), columnWidths[i + 1], AlignmentType.CENTER, row.bold || false)
          ),
        ],
      })
    );

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: `${year} yil, ${months.find((m) => m.value === month)?.label || 'Tanlanmagan'} uchun umumiy hisobot`,
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
      .then((blob) => saveAs(blob, `umumiy_hisobot_${year}_${month.padStart(2, '0')}.docx`))
      .catch((err) => {
        console.error('Word eksportida xatolik:', err);
        setError(t('wordExportError') + ': ' + err.message);
      });
  };

  // Excel eksporti uchun funksiya
  const handleExportToExcel = async () => {
    if (!data || !data.daromat || !data.maishiy || !data.taktic || !data.qoshimcha || !data.oylik || !data.totalChiqim) {
      setError('Eksport qilish uchun ma’lumotlar hali to‘liq yuklanmadi');
      return;
    }

    const headers = ['Kategoriya', 'Naqt (so‘m)', 'Karta (so‘m)', 'Bank (so‘m)', 'Naqt bank (so‘m)', t('colTotalSom')];

    const categories = [
      {
        category: 'Daromad',
        values: [
          data.daromat?.total_naqt || 0,
          data.daromat?.total_karta || 0,
          data.daromat?.total_prichislena || 0,
          data.daromat?.total_naqt_prichislena || 0,
          data.daromat?.total_daromat || 0,
        ],
      },
      {
        category: 'Maishiy chiqimlar',
        values: [
          data.maishiy?.total_naqt || 0,
          data.maishiy?.total_karta || 0,
          data.maishiy?.total_prichislena || 0,
          data.maishiy?.total_naqt_prichislena || 0,
          data.maishiy?.total_kirim || 0,
        ],
      },
      {
        category: 'Oshxona chiqimlari',
        values: [
          data.taktic?.total_naqt || 0,
          data.taktic?.total_karta || 0,
          data.taktic?.total_prichislena || 0,
          data.taktic?.total_naqt_prichislena || 0,
          data.taktic?.total_kirim || 0,
        ],
      },
      {
        category: t('extraExpenses'),
        values: [
          data.qoshimcha?.total_naqt || 0,
          data.qoshimcha?.total_karta || 0,
          data.qoshimcha?.total_prichislena || 0,
          data.qoshimcha?.total_naqt_prichislena || 0,
          data.qoshimcha?.total_kirim || 0,
        ],
      },
      {
        category: t('employeeSalaries'),
        values: [
          data.oylik?.total_naqt || 0,
          data.oylik?.total_karta || 0,
          data.oylik?.total_prichislena || 0,
          data.oylik?.total_naqt_prichislena || 0,
          data.oylik?.total_kirim || 0,
        ],
      },
      {
        category: 'Umumiy chiqim',
        values: [
          data.totalChiqim?.total_naqt || 0,
          data.totalChiqim?.total_karta || 0,
          data.totalChiqim?.total_prichislena || 0,
          data.totalChiqim?.total_naqt_prichislena || 0,
          data.totalChiqim?.total_kirim || 0,
        ],
      },
      {
        category: 'Sof foyda',
        values: [
          (data.daromat?.total_naqt || 0) - (data.totalChiqim?.total_naqt || 0),
          (data.daromat?.total_karta || 0) - (data.totalChiqim?.total_karta || 0),
          (data.daromat?.total_prichislena || 0) - (data.totalChiqim?.total_prichislena || 0),
          (data.daromat?.total_naqt_prichislena || 0) - (data.totalChiqim?.total_naqt_prichislena || 0),
          (data.daromat?.total_daromat || 0) - (data.totalChiqim?.total_kirim || 0),
        ],
      },
    ];

    const rows = categories.map(({ category, values }) => [
      category,
      ...values.map((value) => Number(value).toLocaleString() + " so'm"),
    ]);

    try {
      await exportToExcel({ headers, rows, filename: `umumiy_hisobot_${year}_${month.padStart(2, '0')}` });
    } catch (err) {
      console.error('Excel eksportida xatolik:', err);
      setError(t('exportExcelError') + ': ' + err.message);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('totalIncomeExpense')}</h1>
      <div className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Yil:</label>
          <input
            type="text"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="YYYY"
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Oy:</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={styles.select}
          >
            <option value="" disabled>Tanlang</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchData}
          className={styles.button}
          disabled={loading}
        >
          {loading && <span className={styles.loader}></span>}
          {loading ? t('loadingShort') : t('calculate')}
        </button>
        <button
          onClick={handleExportToWord}
          className={styles.button}
          disabled={loading || !data}
        >
          Word&apos;ga Eksport
        </button>
        <button
          onClick={handleExportToExcel}
          className={styles.button}
          disabled={loading || !data}
        >
          Excel&apos;ga Eksport
        </button>
      </div>

      {error && <p className={styles.error}>Xato: {error}</p>}

      {data && data.daromat && data.maishiy && data.taktic && data.qoshimcha && data.oylik && data.totalChiqim ? (
        <div className={styles.tableContainer}>
          <h2 className={styles.tableTitle}>
            {year} yil, {months.find((m) => m.value === month)?.label || 'Tanlanmagan'} uchun umumiy hisobot
          </h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Kategoriya</th>
                <th className={styles.th}>Naqt (so‘m)</th>
                <th className={styles.th}>Karta (so‘m)</th>
                <th className={styles.th}>Bank (so‘m)</th>
                <th className={styles.th}>Naqt bank (so‘m)</th>
                <th className={styles.th}>Jami (so‘m)</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.tr}>
                <td className={styles.td}>Daromad</td>
                <td className={styles.td}>{formatNumber(data.daromat?.total_naqt)}</td>
                <td className={styles.td}>{formatNumber(data.daromat?.total_karta)}</td>
                <td className={styles.td}>{formatNumber(data.daromat?.total_prichislena)}</td>
                <td className={styles.td}>{formatNumber(data.daromat?.total_naqt_prichislena)}</td>
                <td className={styles.td}>{formatNumber(data.daromat?.total_daromat)}</td>
              </tr>
              <tr className={styles.tr}>
                <td className={styles.td}>Maishiy chiqimlar</td>
                <td className={styles.td}>{formatNumber(data.maishiy?.total_naqt)}</td>
                <td className={styles.td}>{formatNumber(data.maishiy?.total_karta)}</td>
                <td className={styles.td}>{formatNumber(data.maishiy?.total_prichislena)}</td>
                <td className={styles.td}>{formatNumber(data.maishiy?.total_naqt_prichislena)}</td>
                <td className={styles.td}>{formatNumber(data.maishiy?.total_kirim)}</td>
              </tr>
              <tr className={styles.tr}>
                <td className={styles.td}>Oshxona chiqimlari</td>
                <td className={styles.td}>{formatNumber(data.taktic?.total_naqt)}</td>
                <td className={styles.td}>{formatNumber(data.taktic?.total_karta)}</td>
                <td className={styles.td}>{formatNumber(data.taktic?.total_prichislena)}</td>
                <td className={styles.td}>{formatNumber(data.taktic?.total_naqt_prichislena)}</td>
                <td className={styles.td}>{formatNumber(data.taktic?.total_kirim)}</td>
              </tr>
              <tr className={styles.tr}>
                <td className={styles.td}>Qo‘shimcha xarajatlar</td>
                <td className={styles.td}>{formatNumber(data.qoshimcha?.total_naqt)}</td>
                <td className={styles.td}>{formatNumber(data.qoshimcha?.total_karta)}</td>
                <td className={styles.td}>{formatNumber(data.qoshimcha?.total_prichislena)}</td>
                <td className={styles.td}>{formatNumber(data.qoshimcha?.total_naqt_prichislena)}</td>
                <td className={styles.td}>{formatNumber(data.qoshimcha?.total_kirim)}</td>
              </tr>
              <tr className={styles.tr}>
                <td className={styles.td}>Xodimlar oyligi</td>
                <td className={styles.td}>{formatNumber(data.oylik?.total_naqt)}</td>
                <td className={styles.td}>{formatNumber(data.oylik?.total_karta)}</td>
                <td className={styles.td}>{formatNumber(data.oylik?.total_prichislena)}</td>
                <td className={styles.td}>{formatNumber(data.oylik?.total_naqt_prichislena)}</td>
                <td className={styles.td}>{formatNumber(data.oylik?.total_kirim)}</td>
              </tr>
              <tr className={`${styles.tr} ${styles.bold}`}>
                <td className={styles.td}>Umumiy chiqim</td>
                <td className={styles.td}>{formatNumber(data.totalChiqim?.total_naqt)}</td>
                <td className={styles.td}>{formatNumber(data.totalChiqim?.total_karta)}</td>
                <td className={styles.td}>{formatNumber(data.totalChiqim?.total_prichislena)}</td>
                <td className={styles.td}>{formatNumber(data.totalChiqim?.total_naqt_prichislena)}</td>
                <td className={styles.td}>{formatNumber(data.totalChiqim?.total_kirim)}</td>
              </tr>
              <tr className={`${styles.tr} ${styles.bold}`}>
                <td className={styles.td}>Sof foyda</td>
                <td className={styles.td}>
                  {formatNumber((data.daromat?.total_naqt || 0) - (data.totalChiqim?.total_naqt || 0))}
                </td>
                <td className={styles.td}>
                  {formatNumber((data.daromat?.total_karta || 0) - (data.totalChiqim?.total_karta || 0))}
                </td>
                <td className={styles.td}>
                  {formatNumber((data.daromat?.total_prichislena || 0) - (data.totalChiqim?.total_prichislena || 0))}
                </td>
                <td className={styles.td}>
                  {formatNumber((data.daromat?.total_naqt_prichislena || 0) - (data.totalChiqim?.total_naqt_prichislena || 0))}
                </td>
                <td className={styles.td}>
                  {formatNumber((data.daromat?.total_daromat || 0) - (data.totalChiqim?.total_kirim || 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : data && !error ? (
        <p className={styles.error}>Ma’lumotlar hali to‘liq yuklanmadi</p>
      ) : null}
    </div>
  );
}