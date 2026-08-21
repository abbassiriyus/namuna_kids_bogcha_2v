'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import dayjs from 'dayjs';
import LayoutComponent from '../../components/LayoutComponent';
import ErrorModal from '../../components/ErrorModal';
import styles from '../../styles/XodimDavomat.module.css';
import url from '../../host/host';
import { saveAs } from 'file-saver';
import Modal from 'react-modal';
import { exportToExcel } from '../../utils/exportExcel';
import { FileSpreadsheet, FileText, Check, LogOut, X } from 'lucide-react';

import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Tashkent');

Modal.setAppElement('#__next');

export default function XodimDavomat() {
  const router = useRouter();
  const [xodimlar, setXodimlar] = useState([]);
  const [ishKunlari, setIshKunlari] = useState([]);
  const [maxsusKunlar, setMaxsusKunlar] = useState([]);
  const [uniqueDays, setUniqueDays] = useState([]);
  const [ishKunlari2, setIshKunlari2] = useState({});
  const [monthlyAttendance, setMonthlyAttendance] = useState({});
  const [summaries, setSummaries] = useState({});
  const [vaqtlar, setVaqtlar] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [permissions, setPermissions] = useState({
    view_employees: true,
    create_employees: true,
    edit_employees: true,
    delete_employees: true,
  });
  const [userType, setUserType] = useState(typeof window !== 'undefined' ? localStorage.getItem('type') : null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});

  const bugun = dayjs().tz('Asia/Tashkent').format('YYYY-MM-DD');

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const getAttendance = async (xodimId, workdayId) => {
    try {
      const res = await axios.get(
        `${url}/xodim_one_day/${xodimId}?workday=${workdayId}`,
        getAuthHeaders()
      );
      return res.data.length > 0 ? res.data[0] : null;
    } catch (err) {
      console.error('Davomatni olishda xatolik:', err);
      setErrorMessage("Davomat ma'lumotlarini olishda xatolik yuz berdi!");
      return null;
    }
  };

  const getBackgroundColorAndLateness = (startTime, endTime, startTime_plan, endTime_Plan) => {
    const result = { lateness: '-' };

    const currentTime = new Date();
    currentTime.setSeconds(0, 0);

    let arrivalLateness = 'Vaqtida';
    if (startTime_plan) {
      try {
        const [planHours, planMinutes] = startTime_plan.split(':').map(Number);
        const expectedStartTime = new Date(currentTime);
        expectedStartTime.setHours(planHours, planMinutes, 0, 0);

        const startDate = startTime
          ? new Date(currentTime).setHours(...startTime.split(':').map(Number), 0, 0)
          : currentTime;

        const delayMinutes = (startDate - expectedStartTime) / (1000 * 60);

        if (delayMinutes <= 0) {
          arrivalLateness = 'Vaqtida';
        } else if (delayMinutes <= 10) {
          arrivalLateness = `${Math.round(delayMinutes)} min kech`;
        } else if (delayMinutes <= 60) {
          arrivalLateness = `${Math.round(delayMinutes)} min kech`;
        } else {
          arrivalLateness = `${Math.floor(delayMinutes / 60)} soat ${Math.round(delayMinutes % 60)} min kech`;
        }
      } catch (err) {
        console.error("Kechikish hisoblashda xato:", err);
        arrivalLateness = 'Xato';
      }
    }

    let departureLateness = '';
    if (endTime && endTime_Plan) {
      try {
        const [endPlanHours, endPlanMinutes] = endTime_Plan.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);

        const expectedEndTime = new Date(currentTime);
        expectedEndTime.setHours(endPlanHours, endPlanMinutes, 0, 0);
        const endDate = new Date(currentTime);
        endDate.setHours(endHours, endMinutes, 0, 0);

        const earlyMinutes = (endDate - expectedEndTime) / (1000 * 60);
        if (earlyMinutes < 0) {
          const absMinutes = Math.abs(Math.round(earlyMinutes));
          if (absMinutes >= 60) {
            departureLateness = `, -${Math.floor(absMinutes / 60)} soat ${absMinutes % 60} min erta`;
          } else {
            departureLateness = `, -${absMinutes} min erta`;
          }
        } else {
          departureLateness = ', Vaqtida';
        }
      } catch (err) {
        console.error("Erta ketish hisoblashda xato:", err);
        departureLateness = ', Xato';
      }
    }

    result.lateness = arrivalLateness + (departureLateness || '');
    return result;
  };

  const fetchData = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const userType = typeof window !== 'undefined' ? localStorage.getItem('type') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const adminId = userType === '3' && typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('admin'))?.id : null;

      let permissionsData = {
        view_employees: true,
        create_employees: true,
        edit_employees: true,
        delete_employees: true,
      };

      const [year, month] = selectedMonth.split('-');
      const apiCalls = [
        axios.get(`${url}/xodim`, getAuthHeaders()),
        axios.get(`${url}/bola_kun_all?month=${month}&year=${year}`, getAuthHeaders()),
        axios.get(`${url}/xodim_one_day`, getAuthHeaders()),
      ];

      if (userType === '3') {
        apiCalls.push(axios.get(`${url}/permissions/${adminId}`, getAuthHeaders()));
      }

      const [xodimRes, bolaKuniRes, xodimOneDayRes, permissionsRes] = await Promise.all(apiCalls);

      if (userType === '3') {
        permissionsData = permissionsRes?.data?.permissions || permissionsData;
        setPermissions(permissionsData);
      }

      if (!permissionsData.view_employees && userType !== '1') {
        setErrorMessage("Sizda xodimlar davomatini ko'rish uchun ruxsat yo'q!");
        setLoading(false);
        return;
      }

      const sortedXodimlar = xodimRes.data.sort((a, b) => a.name.localeCompare(b.name, 'uz'));
      setXodimlar(sortedXodimlar);

      const oyKunlari = bolaKuniRes.data
        .map(k => ({
          ...k,
          original_sana: k.sana,
          sana: dayjs(k.sana).tz('Asia/Tashkent').subtract(1, 'day').format('YYYY-MM-DD'),
        }))
        .filter(k => dayjs(k.sana).format('YYYY-MM') === selectedMonth && !dayjs(k.sana).isAfter(bugun))
        .sort((a, b) => new Date(a.sana) - new Date(b.sana));
      setIshKunlari(oyKunlari);

      const kunMap = {};
      let allMaxsusWorkdays = [];
      for (const xodim of sortedXodimlar) {
        if (xodim.ish_tur === 2) {
          const res = await axios.get(`${url}/xodim_workdays/xodim/${xodim.id}`, getAuthHeaders());
          kunMap[xodim.id] = res.data
            .map(k => ({
              ...k,
              work_day: dayjs(k.work_day).tz('Asia/Tashkent').format('YYYY-MM-DD'),
            }))
            .filter(k => 
              dayjs(k.work_day).format('YYYY-MM') === selectedMonth &&
              !dayjs(k.work_day).isAfter(bugun)
            );
          allMaxsusWorkdays = [...allMaxsusWorkdays, ...kunMap[xodim.id]];
        } else {
          kunMap[xodim.id] = oyKunlari;
        }
      }
      setIshKunlari2(kunMap);

      const uniqueMaxsusKunlar = [...new Set(allMaxsusWorkdays.map(k => k.work_day))]
        .filter(sana => !dayjs(sana).isAfter(bugun))
        .sort((a, b) => new Date(a) - new Date(b))
        .map(sana => ({ id: allMaxsusWorkdays.find(k => k.work_day === sana).id, sana }));
      setMaxsusKunlar(uniqueMaxsusKunlar);

      const allDays = [...new Set([
        ...oyKunlari.map(k => k.sana),
        ...uniqueMaxsusKunlar.map(k => k.sana)
      ])]
        .filter(day => !dayjs(day).isAfter(bugun))
        .sort((a, b) => new Date(a) - new Date(b));
      setUniqueDays(allDays);

      const monthlyAtt = {};
      for (const xodim of sortedXodimlar) {
        monthlyAtt[xodim.id] = xodimOneDayRes.data.filter(
          item => item.xodim_id === xodim.id && 
          dayjs(item.created_at).tz('Asia/Tashkent').format('YYYY-MM') === selectedMonth
        );
      }
      setMonthlyAttendance(monthlyAtt);

      const vaqtlarObj = {};
      const todayBolaKuni = oyKunlari.filter(item => item.sana === bugun);
      for (const xodim of sortedXodimlar) {
        const todayAtt = monthlyAtt[xodim.id].find(
          item => dayjs(item.created_at).tz('Asia/Tashkent').format('YYYY-MM-DD') === bugun
        );
        if (todayAtt) {
          vaqtlarObj[xodim.id] = {
            kelgan: todayAtt.start_time,
            ketgan: todayAtt.end_time,
          };
        }
      }
      setVaqtlar(vaqtlarObj);

      const summariesObj = {};
      for (const xodim of sortedXodimlar) {
        summariesObj[xodim.id] = calculateSummary(xodim, kunMap[xodim.id], monthlyAtt[xodim.id]);
      }
      setSummaries(summariesObj);
    } catch (err) {
      console.error('Xatolik:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.push('/login');
      } else {
        setErrorMessage("Ma'lumotlarni yuklashda xatolik yuz berdi!");
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (xodim, workdays, attendance) => {
    const totalWorkingDays = workdays.length;
    let attendedDays = 0;
    let missedDays = 0;
    let totalPossibleHours = 0;
    let totalActualHours = 0;

    for (const workday of workdays) {
      const workdayDate = workday.sana || workday.work_day;
      const isThisDayToday = workdayDate === bugun;
      const att = attendance.find(item => item.xodim_workdays_id === workday.id);

      const plannedStart = dayjs(`2000-01-01 ${xodim.start_time}`);
      const plannedEnd = dayjs(`2000-01-01 ${xodim.end_time}`);
      const plannedMinutes = plannedEnd.diff(plannedStart, 'minute');
      const plannedHours = plannedMinutes / 60;
      totalPossibleHours += plannedHours;

      if (att && att.start_time) {
        attendedDays++;
        const actualStart = dayjs(`2000-01-01 ${att.start_time}`);
        let actualEnd;
        if (att.end_time) {
          actualEnd = dayjs(`2000-01-01 ${att.end_time}`);
        } else if (isThisDayToday) {
          actualEnd = dayjs(`2000-01-01`).set('hour', dayjs().hour()).set('minute', dayjs().minute()).set('second', 0);
        } else {
          actualEnd = actualStart;
        }
        const actualMinutes = actualEnd.diff(actualStart, 'minute');
        const actualHours = actualMinutes / 60;
        totalActualHours += actualHours;
      } else {
        missedDays++;
      }
    }

    return {
      totalWorkingDays,
      attendedDays,
      missedDays,
      plan: totalPossibleHours.toFixed(2),
      fulfilled: totalActualHours.toFixed(2),
    };
  };

  const calculateWorkedHours = (startTime, endTime, isToday) => {
    if (!startTime) return 'Kelmagan';
    const start = dayjs(`2000-01-01 ${startTime}`);
    const end = endTime ? dayjs(`2000-01-01 ${endTime}`) : (isToday ? dayjs(`2000-01-01`).set('hour', dayjs().hour()).set('minute', dayjs().minute()) : start);
    const minutes = end.diff(start, 'minute');
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return endTime ? `${hours} soat ${remainingMinutes} minut` : `${hours} soat ${remainingMinutes} minut (davom etmoqda)`;
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const openModal = (xodim, kun, att, vaqtInfo, isToday) => {
    const expectedStart = xodim.start_time;
    const expectedEnd = xodim.end_time;
    const actualStart = att?.start_time || vaqtInfo?.kelgan || '-';
    const actualEnd = att?.end_time || vaqtInfo?.ketgan || (isToday ? 'Hali ketmagan' : '-');
    const { lateness } = getBackgroundColorAndLateness(actualStart, actualEnd, expectedStart, expectedEnd);
    const displayDate = xodim.ish_tur === 1 ? dayjs(kun.original_sana).tz('Asia/Tashkent').subtract(1, 'day').format('DD-MM-YYYY') : dayjs(kun.work_day).format('DD-MM-YYYY');

    setSelectedDetails({
      xodimName: xodim.name,
      kun: displayDate,
      expectedStart,
      expectedEnd,
      actualStart,
      actualEnd,
      lateness,
    });
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedDetails(null);
  };

  const sendTime = async (xodimId, type) => {
    if (!permissions.edit_employees) {
      setErrorMessage("Sizda davomatni tahrirlash uchun ruxsat yo'q!");
      return;
    }

    const vaqt = new Date().toLocaleTimeString('uz-UZ', { hour12: false, timeZone: 'Asia/Tashkent' });
    const xodim = xodimlar.find(x => x.id === xodimId);
    let todayWorkdayId;
    if (xodim.ish_tur === 1) {
      const todayBolaKuni = ishKunlari.filter(k => k.sana === bugun);
      todayWorkdayId = todayBolaKuni.length > 0 ? todayBolaKuni[0].id : null;
    } else if (xodim.ish_tur === 2) {
      todayWorkdayId = ishKunlari2[xodimId]?.find(w => w.work_day === bugun)?.id || null;
    }

    if (!todayWorkdayId) {
      setErrorMessage('Bugungi ish kuni topilmadi!');
      return;
    }

    setLoadingStates(prev => ({ ...prev, [`${type}_${xodimId}`]: true }));
    try {
      const existing = await getAttendance(xodimId, todayWorkdayId);

      if (!existing && type === 'kelgan') {
        const res = await axios.post(
          `${url}/xodim_one_day`,
          {
            xodim_id: xodimId,
            xodim_workdays_id: todayWorkdayId,
            start_time: vaqt,
          },
          getAuthHeaders()
        );
        setVaqtlar((prev) => ({
          ...prev,
          [xodimId]: { ...prev[xodimId], kelgan: res.data.start_time },
        }));
        const updatedMonthlyAtt = { ...monthlyAttendance };
        updatedMonthlyAtt[xodimId].push(res.data);
        setMonthlyAttendance(updatedMonthlyAtt);
        setSummaries(prev => ({
          ...prev,
          [xodimId]: calculateSummary(xodim, ishKunlari2[xodim.id], updatedMonthlyAtt[xodimId])
        }));
      }

      if (existing && type === 'ketgan') {
        const res = await axios.put(
          `${url}/xodim_one_day/${xodimId}`,
          {
            end_time: vaqt,
          },
          getAuthHeaders()
        );
        setVaqtlar((prev) => ({
          ...prev,
          [xodimId]: { ...prev[xodimId], ketgan: res.data.end_time },
        }));
        const updatedMonthlyAtt = { ...monthlyAttendance };
        const index = updatedMonthlyAtt[xodimId].findIndex(a => a.id === res.data.id);
        if (index !== -1) {
          updatedMonthlyAtt[xodimId][index] = res.data;
          setMonthlyAttendance(updatedMonthlyAtt);
          setSummaries(prev => ({
            ...prev,
            [xodimId]: calculateSummary(xodim, ishKunlari2[xodim.id], updatedMonthlyAtt[xodimId])
          }));
        }
      }
      // Refresh data to ensure consistency
      await fetchData();
    } catch (err) {
      console.error('Vaqt yuborishda xatolik:', err);
      setErrorMessage('Vaqt yuborishda xatolik yuz berdi!');
    } finally {
      setLoadingStates(prev => ({ ...prev, [`${type}_${xodimId}`]: false }));
    }
  };

  const handleExportToWord = async () => {
    console.log("sss");

    if (!permissions.view_employees) {
      setErrorMessage("Sizda ma'lumotlarni eksport qilish uchun ruxsat yo'q!");
      return;
    }
    if (!xodimlar.length) {
      setErrorMessage("Eksport qilish uchun ma'lumot yo'q!");
      return;
    }

    const {
      Document,
      Packer,
      Paragraph,
      Table,
      TableCell,
      TableRow,
      TextRun,
      AlignmentType,
      WidthType,
    } = await import('docx');

    const createCell = (text) =>
      new TableCell({
        width: { size: 1500, type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun(text || '')],
          }),
        ],
      });

    const headers = [
      'Xodim',
      'Ish turi',
      ...uniqueDays.map(day => dayjs(day).format('DD-MM')),
      'Jami ish kunlari',
      'Kelgan kunlari',
      'Kelmagan kunlari',
      'Oy plani (soat)',
      'Bajargani (soat)',
    ];
    const headerRow = new TableRow({
      children: headers.map((text) => createCell(text)),
    });

    const rows = xodimlar.map((xodim) => {
      const cells = [createCell(xodim.name), createCell(xodim.ish_tur === 1 ? 'Oddiy' : 'Maxsus')];
      uniqueDays.forEach((day) => {
        const kunKey = day;
        const kunDavomat = ishKunlari2[xodim.id]?.find(k => (k.sana || k.work_day) === kunKey);
        let cellText = '';
        if (kunDavomat) {
          const att = monthlyAttendance[xodim.id].find(a => a.xodim_workdays_id === kunDavomat.id);
          if (att && (att.start_time || att.end_time)) {
            cellText = calculateWorkedHours(att.start_time, att.end_time, kunKey === bugun);
          } else {
            cellText = 'N/B';
          }
        }
        cells.push(createCell(cellText));
      });
      const sum = summaries[xodim.id] || {};
      cells.push(
        createCell(sum.totalWorkingDays?.toString() || '0'),
        createCell(sum.attendedDays?.toString() || '0'),
        createCell(sum.missedDays?.toString() || '0'),
        createCell(sum.plan?.toString() || '0'),
        createCell(sum.fulfilled?.toString() || '0')
      );
      return new TableRow({ children: cells });
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Xodimlar Davomat Hisoboti',
              heading: 'Heading1',
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }),
            new Table({
              rows: [headerRow, ...rows],
              width: { size: 12000, type: WidthType.DXA },
            }),
          ],
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `davomat_${selectedMonth}.docx`);
    });
  };

  const handleExportToExcel = async () => {
    if (!permissions.view_employees) {
      setErrorMessage("Sizda ma'lumotlarni eksport qilish uchun ruxsat yo'q!");
      return;
    }
    if (!xodimlar.length) {
      setErrorMessage("Eksport qilish uchun ma'lumot yo'q!");
      return;
    }

    const headers = [
      'Xodim',
      'Ish turi',
      ...uniqueDays.map(day => dayjs(day).format('DD-MM')),
      'Jami ish kunlari',
      'Kelgan kunlari',
      'Kelmagan kunlari',
      'Oy plani (soat)',
      'Bajargani (soat)',
    ];

    const rows = xodimlar.map((xodim) => {
      const row = [xodim.name, xodim.ish_tur === 1 ? 'Oddiy' : 'Maxsus'];
      uniqueDays.forEach((day) => {
        const kunKey = day;
        const kunDavomat = ishKunlari2[xodim.id]?.find(k => (k.sana || k.work_day) === kunKey);
        let cellText = '';
        if (kunDavomat) {
          const att = monthlyAttendance[xodim.id].find(a => a.xodim_workdays_id === kunDavomat.id);
          if (att && (att.start_time || att.end_time)) {
            cellText = calculateWorkedHours(att.start_time, att.end_time, kunKey === bugun);
          } else {
            cellText = 'N/B';
          }
        }
        row.push(cellText);
      });
      const sum = summaries[xodim.id] || {};
      row.push(
        sum.totalWorkingDays || 0,
        sum.attendedDays || 0,
        sum.missedDays || 0,
        sum.plan || 0,
        sum.fulfilled || 0
      );
      return row;
    });

    await exportToExcel({ headers, rows, filename: `davomat_${selectedMonth}` });
  };

  const handleExportTomorrowToWord = async () => {
    if (!permissions.view_employees) {
      setErrorMessage("Sizda ma'lumotlarni eksport qilish uchun ruxsat yo'q!");
      return;
    }
    if (!xodimlar.length) {
      setErrorMessage("Eksport qilish uchun ma'lumot yo'q!");
      return;
    }

    const {
      Document,
      Packer,
      Paragraph,
      Table,
      TableCell,
      TableRow,
      TextRun,
      AlignmentType,
      WidthType,
    } = await import('docx');

    setLoading(true);
    try {
      const tomorrow = dayjs().add(1, 'day').tz('Asia/Tashkent').format('YYYY-MM-DD');
      const [year, month] = selectedMonth.split('-');
      let tomorrowBolaKuni = [];
      try {
        const tomorrowBolaKuniRes = await axios.get(`${url}/bola_kun_all?month=${month}&year=${year}`, getAuthHeaders());
        tomorrowBolaKuni = tomorrowBolaKuniRes.data
          .map(k => ({
            ...k,
            original_sana: k.sana,
            sana: dayjs(k.sana).tz('Asia/Tashkent').subtract(1, 'day').format('YYYY-MM-DD'),
          }))
          .filter(k => k.sana === tomorrow);
      } catch (err) {
        console.error('bola_kun_all so‘rovida xato:', err);
        setErrorMessage("Ish kunlari ma'lumotlarini olishda xatolik!");
        throw err;
      }

      const tomorrowKunMap = {};
      let tomorrowMaxsusWorkdays = [];
      for (const xodim of xodimlar) {
        if (xodim.ish_tur === 2) {
          try {
            const res = await axios.get(`${url}/xodim_workdays/xodim/${xodim.id}`, getAuthHeaders());
            tomorrowKunMap[xodim.id] = res.data
              .map(k => ({
                ...k,
                work_day: dayjs(k.work_day).tz('Asia/Tashkent').format('YYYY-MM-DD'),
              }))
              .filter(k => k.work_day === tomorrow);
            tomorrowMaxsusWorkdays = [...tomorrowMaxsusWorkdays, ...tomorrowKunMap[xodim.id]];
          } catch (err) {
            console.error(`Xodim ${xodim.id} uchun workdays so‘rovida xato:`, err);
            tomorrowKunMap[xodim.id] = [];
          }
        } else {
          tomorrowKunMap[xodim.id] = tomorrowBolaKuni;
        }
      }

      const tomorrowMaxsusKunlar = [...new Set(tomorrowMaxsusWorkdays.map(k => k.work_day))]
        .sort((a, b) => new Date(a) - new Date(b))
        .map(sana => ({ id: tomorrowMaxsusWorkdays.find(k => k.work_day === sana).id, sana }));

      const tomorrowAttendance = {};
      for (const xodim of xodimlar) {
        let workday;
        if (xodim.ish_tur === 1 && tomorrowBolaKuni.length > 0) {
          workday = tomorrowBolaKuni[0];
        } else if (xodim.ish_tur === 2) {
          workday = tomorrowKunMap[xodim.id]?.find(w => w.work_day === tomorrow);
        }
        if (workday) {
          try {
            const data = await getAttendance(xodim.id, workday.id);
            if (data) {
              tomorrowAttendance[xodim.id] = data;
            }
          } catch (err) {
            console.error(`Xodim ${xodim.id} uchun davomat so‘rovida xato:`, err);
          }
        }
      }

      if (!tomorrowBolaKuni.length && !tomorrowMaxsusKunlar.length) {
        setErrorMessage("Ertangi kun uchun ish kuni ma'lumotlari yo'q!");
        setLoading(false);
        return;
      }

      const createCell = (text) =>
        new TableCell({
          width: { size: 2000, type: WidthType.DXA },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun(text || '')],
            }),
          ],
        });

      const headers = ['Xodim', 'Ish turi', `Ertangi kun (${dayjs(tomorrow).tz('Asia/Tashkent').format('DD-MM')})`];
      const headerRow = new TableRow({
        children: headers.map((text) => createCell(text)),
      });

      const rows = xodimlar.map((xodim) => {
        const cells = [createCell(xodim.name), createCell(xodim.ish_tur === 1 ? 'Oddiy' : 'Maxsus')];
        const att = tomorrowAttendance[xodim.id];
        let cellText = '';
        if (tomorrowKunMap[xodim.id]?.length > 0) {
          if (att && (att.start_time || att.end_time)) {
            cellText = calculateWorkedHours(att.start_time, att.end_time, false);
          } else {
            cellText = 'N/B';
          }
        }
        cells.push(createCell(cellText));
        return new TableRow({ children: cells });
      });

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: `Xodimlar Davomat Hisoboti (Ertangi kun: ${dayjs(tomorrow).tz('Asia/Tashkent').format('DD-MM-YYYY')})`,
                heading: 'Heading1',
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({ text: '' }),
              new Table({
                rows: [headerRow, ...rows],
                width: { size: 10000, type: WidthType.DXA },
              }),
            ],
          },
        ],
      });

      Packer.toBlob(doc).then((blob) => {
        saveAs(blob, `davomat_${tomorrow}.docx`);
      }).catch(err => {
        console.error('Docx faylini yaratishda xato:', err);
        setErrorMessage("Docx faylini yaratishda xatolik yuz berdi!");
      });
    } catch (err) {
      console.error('Ertangi kun ma\'lumotlarini eksport qilishda xato:', err);
      setErrorMessage('Ertangi kun ma\'lumotlarini eksport qilishda xatolik yuz berdi!');
    } finally {
      setLoading(false);
    }
  };

  const handleExportTomorrowToExcel = async () => {
    if (!permissions.view_employees) {
      setErrorMessage("Sizda ma'lumotlarni eksport qilish uchun ruxsat yo'q!");
      return;
    }
    if (!xodimlar.length) {
      setErrorMessage("Eksport qilish uchun ma'lumot yo'q!");
      return;
    }

    setLoading(true);
    try {
      const tomorrow = dayjs().add(1, 'day').tz('Asia/Tashkent').format('YYYY-MM-DD');
      const [year, month] = selectedMonth.split('-');
      let tomorrowBolaKuni = [];
      try {
        const tomorrowBolaKuniRes = await axios.get(`${url}/bola_kun_all?month=${month}&year=${year}`, getAuthHeaders());
        tomorrowBolaKuni = tomorrowBolaKuniRes.data
          .map(k => ({
            ...k,
            original_sana: k.sana,
            sana: dayjs(k.sana).tz('Asia/Tashkent').subtract(1, 'day').format('YYYY-MM-DD'),
          }))
          .filter(k => k.sana === tomorrow);
      } catch (err) {
        console.error('bola_kun_all so‘rovida xato:', err);
        setErrorMessage("Ish kunlari ma'lumotlarini olishda xatolik!");
        throw err;
      }

      const tomorrowKunMap = {};
      let tomorrowMaxsusWorkdays = [];
      for (const xodim of xodimlar) {
        if (xodim.ish_tur === 2) {
          try {
            const res = await axios.get(`${url}/xodim_workdays/xodim/${xodim.id}`, getAuthHeaders());
            tomorrowKunMap[xodim.id] = res.data
              .map(k => ({
                ...k,
                work_day: dayjs(k.work_day).tz('Asia/Tashkent').format('YYYY-MM-DD'),
              }))
              .filter(k => k.work_day === tomorrow);
            tomorrowMaxsusWorkdays = [...tomorrowMaxsusWorkdays, ...tomorrowKunMap[xodim.id]];
          } catch (err) {
            console.error(`Xodim ${xodim.id} uchun workdays so‘rovida xato:`, err);
            tomorrowKunMap[xodim.id] = [];
          }
        } else {
          tomorrowKunMap[xodim.id] = tomorrowBolaKuni;
        }
      }

      const tomorrowMaxsusKunlar = [...new Set(tomorrowMaxsusWorkdays.map(k => k.work_day))]
        .sort((a, b) => new Date(a) - new Date(b))
        .map(sana => ({ id: tomorrowMaxsusWorkdays.find(k => k.work_day === sana).id, sana }));

      const tomorrowAttendance = {};
      for (const xodim of xodimlar) {
        let workday;
        if (xodim.ish_tur === 1 && tomorrowBolaKuni.length > 0) {
          workday = tomorrowBolaKuni[0];
        } else if (xodim.ish_tur === 2) {
          workday = tomorrowKunMap[xodim.id]?.find(w => w.work_day === tomorrow);
        }
        if (workday) {
          try {
            const data = await getAttendance(xodim.id, workday.id);
            if (data) {
              tomorrowAttendance[xodim.id] = data;
            }
          } catch (err) {
            console.error(`Xodim ${xodim.id} uchun davomat so‘rovida xato:`, err);
          }
        }
      }

      if (!tomorrowBolaKuni.length && !tomorrowMaxsusKunlar.length) {
        setErrorMessage("Ertangi kun uchun ish kuni ma'lumotlari yo'q!");
        setLoading(false);
        return;
      }

      const headers = ['Xodim', 'Ish turi', `Ertangi kun (${dayjs(tomorrow).tz('Asia/Tashkent').format('DD-MM')})`];

      const rows = xodimlar.map((xodim) => {
        const att = tomorrowAttendance[xodim.id];
        let cellText = '';
        if (tomorrowKunMap[xodim.id]?.length > 0) {
          if (att && (att.start_time || att.end_time)) {
            cellText = calculateWorkedHours(att.start_time, att.end_time, false);
          } else {
            cellText = 'N/B';
          }
        }
        return [xodim.name, xodim.ish_tur === 1 ? 'Oddiy' : 'Maxsus', cellText];
      });

      await exportToExcel({ headers, rows, filename: `davomat_${tomorrow}` });
    } catch (err) {
      console.error('Ertangi kun ma\'lumotlarini eksport qilishda xato:', err);
      setErrorMessage('Ertangi kun ma\'lumotlarini eksport qilishda xatolik yuz berdi!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LayoutComponent>
      {userType === '1' || permissions.view_employees ? (
        <>
          <div className={styles.wrapper}>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <label htmlFor="monthSelect" style={{ fontWeight: 'bold' }}>
                Oyni tanlang:
              </label>
              <input
                type="month"
                id="monthSelect"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: '16px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                }}
                disabled={loading}
              />
              <button
                onClick={()=>handleExportToWord()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: '#3498db',
                  color: '#fff',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                }}
                disabled={loading || !permissions.view_employees}
              >
                <FileText size={16} /> Export (Oylik)
              </button>

              <button
                onClick={()=>handleExportToExcel()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: '#217346',
                  color: '#fff',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                }}
                disabled={loading || !permissions.view_employees}
              >
                <FileSpreadsheet size={16} /> Excel (Oylik)
              </button>

              <button
                onClick={()=>handleExportTomorrowToExcel()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: '#217346',
                  color: '#fff',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                }}
                disabled={loading || !permissions.view_employees}
              >
                <FileSpreadsheet size={16} /> Excel (Ertangi kun)
              </button>

            </div>

            <h1 className={styles.title}>Xodimlar Davomat</h1>
            {loading ? (
              <p style={{ padding: '10px' }}>Yuklanmoqda...</p>
            ) : (
              <div>
                <table className={styles.table}>
                  <thead className={styles.table__head}>
                    <tr>
                      <th className={`${styles.table__cell} ${styles.sticky}`}>Ism</th>
                      <th className={`${styles.table__cell}`}>Ish turi</th>
                      {uniqueDays.map((day) => (
                        <th key={day} className={styles.table__cell}>
                          {dayjs(day).format('DD-MM')}
                        </th>
                      ))}
                      <th className={styles.table__cell}>Jami ish kunlari</th>
                      <th className={styles.table__cell}>Kelgan kunlari</th>
                      <th className={styles.table__cell}>Kelmagan kunlari</th>
                      <th className={styles.table__cell}>Oy plani (soat)</th>
                      <th className={styles.table__cell}>Bajargani (soat)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xodimlar.map((xodim) => {
                      const sum = summaries[xodim.id] || {};
                      const todayAtt = monthlyAttendance[xodim.id]?.find(
                        (a) => dayjs(a.created_at).tz('Asia/Tashkent').format('YYYY-MM-DD') === bugun
                      );
                      return (
                        <tr key={xodim.id}>
                          <td className={`${styles.table__cell} ${styles.sticky}`}>{xodim.name}</td>
                          <td className={`${styles.table__cell}`}>{xodim.ish_tur === 1 ? 'Oddiy' : 'Maxsus'}</td>
                          {uniqueDays.map((day) => {
                            const kunKey = day;
                            const isToday = kunKey === bugun;
                            const kunDavomat = ishKunlari2[xodim.id]?.find(
                              (k) => (k.sana || k.work_day) === kunKey
                            );
                            const att = kunDavomat
                              ? monthlyAttendance[xodim.id].find(
                                  (a) => a.xodim_workdays_id === kunDavomat.id
                                )
                              : null;
                            const vaqtInfo = isToday ? (todayAtt || {}) : (att || {});
                            const isRedBackground = kunDavomat && isToday && (vaqtInfo.start_time) && !vaqtInfo.end_time;
                            const workedHours = kunDavomat ? calculateWorkedHours(vaqtInfo.start_time, vaqtInfo.end_time, isToday) : '';

                            return (
                              <td
                                key={kunKey}
                                className={`${styles.table__cell} ${isRedBackground ? styles.redBackground : ''}`}
                                onClick={() => kunDavomat && openModal(xodim, kunDavomat, att, vaqtInfo, isToday)}
                                style={{ cursor: kunDavomat ? 'pointer' : 'default' }}
                              >
                                {isToday && kunDavomat ? (
                                  <>
                                    <div>
                                      {vaqtInfo.start_time ? (
                                        vaqtInfo.start_time.slice(0, 5)
                                      ) : (
                                        <button
                                          className={styles.kelBtn}
                                          onClick={(e) => { e.stopPropagation(); sendTime(xodim.id, 'kelgan'); }}
                                          disabled={loading || !permissions.edit_employees || loadingStates[`kelgan_${xodim.id}`]}
                                        >
                                          {loadingStates[`kelgan_${xodim.id}`] ? 'Saqlanmoqda...' : <><Check size={14} /> Ishga keldim</>}
                                        </button>
                                      )}
                                    </div>
                                    <div>
                                      {vaqtInfo.end_time ? (
                                        vaqtInfo.end_time.slice(0, 5)
                                      ) : (
                                        <button
                                          className={styles.ketBtn}
                                          onClick={(e) => { e.stopPropagation(); sendTime(xodim.id, 'ketgan'); }}
                                          disabled={loading || !permissions.edit_employees || !vaqtInfo.start_time || loadingStates[`ketgan_${xodim.id}`]}
                                        >
                                          {loadingStates[`ketgan_${xodim.id}`] ? 'Saqlanmoqda...' : <><LogOut size={14} /> Ishdan ketdim</>}
                                        </button>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  workedHours || (kunDavomat ? <span className={styles.icon}><X size={14} /></span> : '')
                                )}
                              </td>
                            );
                          })}
                          <td className={styles.table__cell}>{sum.totalWorkingDays || 0}</td>
                          <td className={styles.table__cell}>{sum.attendedDays || 0}</td>
                          <td className={styles.table__cell}>{sum.missedDays || 0}</td>
                          <td className={styles.table__cell}>{sum.plan || 0}</td>
                          <td className={styles.table__cell}>{sum.fulfilled || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <ErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />

          <Modal
            isOpen={modalIsOpen}
            onRequestClose={closeModal}
            style={{
              content: {
                top: '50%',
                left: '50%',
                right: 'auto',
                bottom: 'auto',
                marginRight: '-50%',
                transform: 'translate(-50%, -50%)',
                padding: '15px',
                borderRadius: '8px',
                maxWidth: '400px',
                width: '90%',
                background: '#fff',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              },
              overlay: {
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 99,
              },
            }}
          >
            {selectedDetails && (
              <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '18px', textAlign: 'center' }}>
                  {selectedDetails.xodimName} ({selectedDetails.kun})
                </h3>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Kelish vaqti:</strong> {selectedDetails.expectedStart}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Aslida kelgan:</strong> {selectedDetails.actualStart}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Ketish vaqti:</strong> {selectedDetails.expectedEnd}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Aslida ketgan:</strong> {selectedDetails.actualEnd}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Kechikish:</strong> {selectedDetails.lateness}
                </div>
                <button
                  onClick={closeModal}
                  style={{
                    display: 'block',
                    margin: '0 auto',
                    padding: '8px 16px',
                    background: '#3498db',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Yopish
                </button>
              </div>
            )}
          </Modal>
        </>
      ) : (
        <p style={{ padding: '20px', color: 'red' }}>
          Sizda xodimlar davomatini ko'rish uchun ruxsat yo'q!
        </p>
      )}
    </LayoutComponent>
  );
}