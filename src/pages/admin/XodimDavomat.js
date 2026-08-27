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
import { FileSpreadsheet, FileText, Check, LogOut, X, ScanFace, MousePointerClick } from 'lucide-react';
import { getDavomatMood, formatMinutes } from '../../utils/davomatMood';

import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Loader from '../../components/Loader';
import { useLang } from '../../i18n/LanguageContext';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Tashkent');

Modal.setAppElement('#__next');

export default function XodimDavomat() {
  const { t } = useLang();
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
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    setUserType(localStorage.getItem('type'));
  }, []);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [davomatMode, setDavomatMode] = useState('button');
  const [modeSaving, setModeSaving] = useState(false);
  const [viewMode, setViewMode] = useState('simple'); // 'simple' | 'detailed'
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
      const detail = err.response?.data?.message || err.response?.data?.error || err.message;
      setErrorMessage(`${t('attendanceDataError')}: ${detail}`);
      return null;
    }
  };

  const getBackgroundColorAndLateness = (startTime, endTime, startTime_plan, endTime_Plan) => {
    const result = { lateness: '-' };

    const currentTime = new Date();
    currentTime.setSeconds(0, 0);

    let arrivalLateness = t('onTime');
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
          arrivalLateness = t('onTime');
        } else if (delayMinutes <= 10) {
          arrivalLateness = t('minLate').replace('{m}', Math.round(delayMinutes));
        } else if (delayMinutes <= 60) {
          arrivalLateness = t('minLate').replace('{m}', Math.round(delayMinutes));
        } else {
          arrivalLateness = t('hourMinLate').replace('{h}', Math.floor(delayMinutes / 60)).replace('{m}', Math.round(delayMinutes % 60));
        }
      } catch (err) {
        console.error("Kechikish hisoblashda xato:", err);
        arrivalLateness = t('errorTitle');
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
            departureLateness = ', -' + t('hourMinEarly').replace('{h}', Math.floor(absMinutes / 60)).replace('{m}', absMinutes % 60);
          } else {
            departureLateness = ', -' + t('minEarly').replace('{m}', absMinutes);
          }
        } else {
          departureLateness = ', ' + t('onTime');
        }
      } catch (err) {
        console.error("Erta ketish hisoblashda xato:", err);
        departureLateness = ', ' + t('errorTitle');
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
        setErrorMessage(t('noEmployeeAttendancePermission'));
        setLoading(false);
        return;
      }

      const sortedXodimlar = xodimRes.data.sort((a, b) => a.name.localeCompare(b.name, 'uz'));
      setXodimlar(sortedXodimlar);

      // Dars sanasi bazada haqiqiy kun sifatida saqlanadi. `.tz('Asia/Tashkent')`
      // JSON'dagi UTC ko'rinishini mahalliy kunga qaytaradi — qo'shimcha
      // `.subtract(1,'day')` kerak emas edi, aynan shu davomatni bir kunga
      // surib yuborardi.
      const oyKunlari = bolaKuniRes.data
        .map(k => ({
          ...k,
          original_sana: k.sana,
          sana: dayjs(k.sana).tz('Asia/Tashkent').format('YYYY-MM-DD'),
        }))
        .filter(k => dayjs(k.sana).format('YYYY-MM') === selectedMonth && !dayjs(k.sana).isAfter(bugun))
        .sort((a, b) => new Date(a.sana) - new Date(b.sana));
      setIshKunlari(oyKunlari);

      // Barcha maxsus ish kunlarini bitta so'rovda olamiz. Avval har bir xodim
      // uchun alohida so'rov yuborilardi (N+1) va o'sha manzil backendda
      // mavjud bo'lmagani uchun 404 qaytarardi.
      const workdaysRes = await axios.get(
        `${url}/xodim_workdays?month=${selectedMonth}`,
        getAuthHeaders()
      );
      const workdaysByXodim = {};
      workdaysRes.data.forEach((k) => {
        const workDay = dayjs(k.work_day).tz('Asia/Tashkent').format('YYYY-MM-DD');
        if (dayjs(workDay).isAfter(bugun)) return;
        if (!workdaysByXodim[k.xodim_id]) workdaysByXodim[k.xodim_id] = [];
        workdaysByXodim[k.xodim_id].push({ ...k, work_day: workDay });
      });

      const kunMap = {};
      let allMaxsusWorkdays = [];
      for (const xodim of sortedXodimlar) {
        if (xodim.ish_tur === 2) {
          kunMap[xodim.id] = workdaysByXodim[xodim.id] || [];
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
        setErrorMessage(t('loadError'));
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
    if (!startTime) return t('notCome');
    const start = dayjs(`2000-01-01 ${startTime}`);
    const end = endTime ? dayjs(`2000-01-01 ${endTime}`) : (isToday ? dayjs(`2000-01-01`).set('hour', dayjs().hour()).set('minute', dayjs().minute()) : start);
    const minutes = end.diff(start, 'minute');
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return endTime
      ? t('hourMinWorked').replace('{h}', hours).replace('{m}', remainingMinutes)
      : t('hourMinWorkedOngoing').replace('{h}', hours).replace('{m}', remainingMinutes);
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  useEffect(() => {
    axios
      .get(`${url}/davomat-settings`)
      .then((res) => setDavomatMode(res.data.mode || 'button'))
      .catch((err) => console.error('Davomat rejimini olishda xatolik:', err));
  }, []);

  const changeDavomatMode = async (mode) => {
    if (mode === davomatMode || modeSaving) return;
    setModeSaving(true);
    try {
      const res = await axios.put(`${url}/davomat-settings`, { mode }, getAuthHeaders());
      setDavomatMode(res.data.mode);
    } catch (err) {
      console.error('Davomat rejimini o‘zgartirishda xatolik:', err);
      setErrorMessage(t('attendanceModeError'));
    } finally {
      setModeSaving(false);
    }
  };

  const openModal = (xodim, kun, att, vaqtInfo, isToday) => {
    const expectedStart = xodim.start_time;
    const expectedEnd = xodim.end_time;
    const actualStart = att?.start_time || vaqtInfo?.kelgan || '-';
    const actualEnd = att?.end_time || vaqtInfo?.ketgan || (isToday ? t('notLeftYet') : '-');
    const { lateness } = getBackgroundColorAndLateness(actualStart, actualEnd, expectedStart, expectedEnd);
    const displayDate = xodim.ish_tur === 1 ? dayjs(kun.original_sana).tz('Asia/Tashkent').format('DD-MM-YYYY') : dayjs(kun.work_day).format('DD-MM-YYYY');

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
      setErrorMessage(t('todayWorkdayNotFound'));
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
      const detail = err.response?.data?.message || err.response?.data?.error || err.message;
      setErrorMessage(`${t('sendTimeError')}: ${detail}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [`${type}_${xodimId}`]: false }));
    }
  };

  const handleExportToWord = async () => {
    console.log("sss");

    if (!permissions.view_employees) {
      setErrorMessage(t('noExportPermission'));
      return;
    }
    if (!xodimlar.length) {
      setErrorMessage(t('noDataToExport'));
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
      t('colEmployee'),
      t('colWorkType'),
      ...uniqueDays.map(day => dayjs(day).format('DD-MM')),
      t('colTotalWorkdays'),
      t('colAttendedDays'),
      t('colMissedDays'),
      t('colMonthPlanHours'),
      t('colFulfilledHours'),
    ];
    const headerRow = new TableRow({
      children: headers.map((text) => createCell(text)),
    });

    const rows = xodimlar.map((xodim) => {
      const cells = [createCell(xodim.name), createCell(xodim.ish_tur === 1 ? t('workTypeNormal') : t('workTypeSpecial'))];
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
              text: t('employeeAttendanceReport'),
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
      setErrorMessage(t('noExportPermission'));
      return;
    }
    if (!xodimlar.length) {
      setErrorMessage("Eksport qilish uchun ma'lumot yo'q!");
      return;
    }

    const headers = [
      t('colEmployee'),
      t('colWorkType'),
      ...uniqueDays.map(day => dayjs(day).format('DD-MM')),
      t('colTotalWorkdays'),
      t('colAttendedDays'),
      t('colMissedDays'),
      t('colMonthPlanHours'),
      t('colFulfilledHours'),
    ];

    const rows = xodimlar.map((xodim) => {
      const row = [xodim.name, xodim.ish_tur === 1 ? t('workTypeNormal') : t('workTypeSpecial')];
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
      setErrorMessage(t('noExportPermission'));
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
            sana: dayjs(k.sana).tz('Asia/Tashkent').format('YYYY-MM-DD'),
          }))
          .filter(k => k.sana === tomorrow);
      } catch (err) {
        console.error('bola_kun_all so‘rovida xato:', err);
        setErrorMessage(t('workdayDataError'));
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
        setErrorMessage(t('tomorrowNoWorkdayData'));
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

      const headers = [t('colEmployee'), t('colWorkType'), t('colTomorrow').replace('{date}', dayjs(tomorrow).tz('Asia/Tashkent').format('DD-MM'))];
      const headerRow = new TableRow({
        children: headers.map((text) => createCell(text)),
      });

      const rows = xodimlar.map((xodim) => {
        const cells = [createCell(xodim.name), createCell(xodim.ish_tur === 1 ? t('workTypeNormal') : t('workTypeSpecial'))];
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
                text: t('attendanceReportTomorrow').replace('{date}', dayjs(tomorrow).tz('Asia/Tashkent').format('DD-MM-YYYY')),
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
        setErrorMessage(t('docxCreateError'));
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
      setErrorMessage(t('noExportPermission'));
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
            sana: dayjs(k.sana).tz('Asia/Tashkent').format('YYYY-MM-DD'),
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

      const headers = [t('colEmployee'), t('colWorkType'), t('colTomorrow').replace('{date}', dayjs(tomorrow).tz('Asia/Tashkent').format('DD-MM'))];

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
        return [xodim.name, xodim.ish_tur === 1 ? t('workTypeNormal') : t('workTypeSpecial'), cellText];
      });

      await exportToExcel({ headers, rows, filename: `davomat_${tomorrow}` });
    } catch (err) {
      console.error('Ertangi kun ma\'lumotlarini eksport qilishda xato:', err);
      setErrorMessage('Ertangi kun ma\'lumotlarini eksport qilishda xatolik yuz berdi!');
    } finally {
      setLoading(false);
    }
  };

  const todayKelgan = xodimlar.filter((x) => vaqtlar[x.id]?.kelgan).length;
  const todayKelmagan = Math.max(xodimlar.length - todayKelgan, 0);
  const fulfilledRates = xodimlar
    .map((x) => summaries[x.id])
    .filter((s) => s && Number(s.plan) > 0)
    .map((s) => (Number(s.fulfilled) / Number(s.plan)) * 100);
  const avgFulfilled = fulfilledRates.length
    ? Math.round(fulfilledRates.reduce((a, b) => a + b, 0) / fulfilledRates.length)
    : 0;

  return (
    <LayoutComponent>
      {userType === '1' || permissions.view_employees ? (
        <>
          <div className={styles.wrapper}>
            <h1 className={styles.title}>{t('employeeAttendanceTitle')}</h1>

            <div className={styles.statGrid}>
              <div className={`${styles.statCard} ${styles.statBlue}`}>
                <span className={styles.statLabel}>{t('totalEmployeesLabel')}</span>
                <span className={styles.statValue}>{xodimlar.length}</span>
              </div>
              <div className={`${styles.statCard} ${styles.statGreen}`}>
                <span className={styles.statLabel}>{t('presentToday')}</span>
                <span className={styles.statValue}>{todayKelgan}</span>
              </div>
              <div className={`${styles.statCard} ${styles.statRed}`}>
                <span className={styles.statLabel}>{t('absentToday')}</span>
                <span className={styles.statValue}>{todayKelmagan}</span>
              </div>
              <div className={`${styles.statCard} ${styles.statPurple}`}>
                <span className={styles.statLabel}>{t('avgFulfilment')}</span>
                <span className={styles.statValue}>{avgFulfilled}%</span>
              </div>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.modeInfo}>
                <span className={styles.modeLabel}>{t('attendanceModeLabel')} ({`/xodimdavomat`}):</span>
                <span className={styles.modeHint}>
                  {t('attendanceModeHint')}
                </span>
              </div>
              <div className={styles.modeSwitch}>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${davomatMode === 'button' ? styles.modeBtnActive : ''}`}
                  onClick={() => changeDavomatMode('button')}
                  disabled={userType !== '1' || modeSaving}
                >
                  <MousePointerClick size={15} /> {t('simpleButtons')}
                </button>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${davomatMode === 'face' ? styles.modeBtnActive : ''}`}
                  onClick={() => changeDavomatMode('face')}
                  disabled={userType !== '1' || modeSaving}
                >
                  <ScanFace size={15} /> Face ID
                </button>
              </div>
            </div>

            {/* Yuz ma'lumotini yangilash Face ID oynasiga (/xodimdavomat)
                ko'chirildi — u yerda kamera va xodimlar ro'yxati birga turadi. */}

            <div className={styles.controls}>
              <label htmlFor="monthSelect" className={styles.label}>
                {t('selectMonth')}:
              </label>
              <input
                type="month"
                id="monthSelect"
                className={styles.monthSelect}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={loading}
              />

              <div className={styles.viewSwitch}>
                <button
                  type="button"
                  className={`${styles.viewBtn} ${viewMode === 'simple' ? styles.viewBtnActive : ''}`}
                  onClick={() => setViewMode('simple')}
                >
                  {t('simpleView')}
                </button>
                <button
                  type="button"
                  className={`${styles.viewBtn} ${viewMode === 'detailed' ? styles.viewBtnActive : ''}`}
                  onClick={() => setViewMode('detailed')}
                >
                  {t('dailyTable')}
                </button>
                <button
                  type="button"
                  className={`${styles.viewBtn} ${viewMode === 'bugun' ? styles.viewBtnActive : ''}`}
                  onClick={() => setViewMode('bugun')}
                >
                  {t('todayAttendanceView')}
                </button>
              </div>

              <button
                className={styles.exportBtn}
                onClick={()=>handleExportToWord()}
                disabled={loading || !permissions.view_employees}
              >
                <FileText size={16} /> {t('exportMonthly')}
              </button>

              <button
                className={styles.exportTomorrowBtn}
                onClick={()=>handleExportToExcel()}
                disabled={loading || !permissions.view_employees}
              >
                <FileSpreadsheet size={16} /> {t('excelMonthly')}
              </button>

              <button
                className={styles.exportTomorrowBtn}
                onClick={()=>handleExportTomorrowToExcel()}
                disabled={loading || !permissions.view_employees}
              >
                <FileSpreadsheet size={16} /> {t('excelTomorrow')}
              </button>
            </div>

            {loading ? (
              <Loader />
            ) : viewMode === 'bugun' ? (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead className={styles.table__head}>
                    <tr>
                      <th className={`${styles.table__cell} ${styles.sticky}`}>{t('colName')}</th>
                      <th className={styles.table__cell}>{t('colMood')}</th>
                      <th className={styles.table__cell}>{t('colPlanStartEnd')}</th>
                      <th className={styles.table__cell}>{t('colAttended')}</th>
                      <th className={styles.table__cell}>{t('colLeft')}</th>
                      <th className={styles.table__cell}>{t('colLate')}</th>
                      <th className={styles.table__cell}>{t('colLeftEarly')}</th>
                      <th className={styles.table__cell}>{t('colStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xodimlar.map((xodim) => {
                      const info = vaqtlar[xodim.id] || {};
                      const mood = getDavomatMood({
                        startTime: info.kelgan,
                        endTime: info.ketgan,
                        planStart: xodim.start_time,
                        planEnd: xodim.end_time,
                        seed: xodim.id,
                      });
                      return (
                        <tr key={xodim.id}>
                          <td className={`${styles.table__cell} ${styles.sticky}`}>{xodim.name}</td>
                          <td className={`${styles.table__cell} ${styles.moodCell}`} title={mood.label}>
                            <span className={styles.moodSticker}>{mood.sticker}</span>
                          </td>
                          <td className={styles.table__cell}>
                            {(xodim.start_time || '-').slice(0, 5)} – {(xodim.end_time || '-').slice(0, 5)}
                          </td>
                          <td className={styles.table__cell}>{info.kelgan ? info.kelgan.slice(0, 5) : '-'}</td>
                          <td className={styles.table__cell}>
                            {info.ketgan ? info.ketgan.slice(0, 5) : (info.kelgan ? t('atWork') : '-')}
                          </td>
                          <td className={styles.table__cell}>{formatMinutes(mood.kechikish)}</td>
                          <td className={styles.table__cell}>{formatMinutes(mood.ertaKetish)}</td>
                          <td className={`${styles.table__cell} ${styles[`tone_${mood.tone}`] || ''}`}>
                            {mood.label}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : viewMode === 'simple' ? (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead className={styles.table__head}>
                    <tr>
                      <th className={`${styles.table__cell} ${styles.sticky}`}>{t('colName')}</th>
                      <th className={styles.table__cell}>{t('colWorkType')}</th>
                      <th className={styles.table__cell}>{t('colTodayStatus')}</th>
                      <th className={styles.table__cell}>{t('colAttendedDays')}</th>
                      <th className={styles.table__cell}>{t('colMissedDays')}</th>
                      <th className={styles.table__cell}>{t('colMonthPlanHours')}</th>
                      <th className={styles.table__cell}>{t('colFulfilledHours')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xodimlar.map((xodim) => {
                      const sum = summaries[xodim.id] || {};
                      const todayInfo = vaqtlar[xodim.id];
                      return (
                        <tr key={xodim.id}>
                          <td className={`${styles.table__cell} ${styles.sticky}`}>{xodim.name}</td>
                          <td className={styles.table__cell}>{xodim.ish_tur === 1 ? t('workTypeNormal') : t('workTypeSpecial')}</td>
                          <td className={styles.table__cell}>
                            {todayInfo?.kelgan ? (
                              <div className={styles.actions}>
                                <span className={styles.time}>
                                  {todayInfo.kelgan.slice(0, 5)}
                                  {todayInfo.ketgan ? ` – ${todayInfo.ketgan.slice(0, 5)}` : ''}
                                </span>
                                {!todayInfo.ketgan && (
                                  <button
                                    className={styles.ketBtn}
                                    onClick={() => sendTime(xodim.id, 'ketgan')}
                                    disabled={loading || !permissions.edit_employees || loadingStates[`ketgan_${xodim.id}`]}
                                  >
                                    {loadingStates[`ketgan_${xodim.id}`] ? t('saving') : <><LogOut size={14} /> {t('checkOut')}</>}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                className={styles.kelBtn}
                                onClick={() => sendTime(xodim.id, 'kelgan')}
                                disabled={loading || !permissions.edit_employees || loadingStates[`kelgan_${xodim.id}`]}
                              >
                                {loadingStates[`kelgan_${xodim.id}`] ? t('saving') : <><Check size={14} /> {t('checkIn')}</>}
                              </button>
                            )}
                          </td>
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
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead className={styles.table__head}>
                    <tr>
                      <th className={`${styles.table__cell} ${styles.sticky}`}>{t('colName')}</th>
                      <th className={`${styles.table__cell}`}>{t('colWorkType')}</th>
                      {uniqueDays.map((day) => (
                        <th key={day} className={styles.table__cell}>
                          {dayjs(day).format('DD-MM')}
                        </th>
                      ))}
                      <th className={styles.table__cell}>{t('colTotalWorkdays')}</th>
                      <th className={styles.table__cell}>{t('colAttendedDays')}</th>
                      <th className={styles.table__cell}>{t('colMissedDays')}</th>
                      <th className={styles.table__cell}>{t('colMonthPlanHours')}</th>
                      <th className={styles.table__cell}>{t('colFulfilledHours')}</th>
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
                          <td className={`${styles.table__cell}`}>{xodim.ish_tur === 1 ? t('workTypeNormal') : t('workTypeSpecial')}</td>
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
                                          {loadingStates[`kelgan_${xodim.id}`] ? t('saving') : <><Check size={14} /> Ishga keldim</>}
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
                                          {loadingStates[`ketgan_${xodim.id}`] ? t('saving') : <><LogOut size={14} /> Ishdan ketdim</>}
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
            className={styles.modal}
            overlayClassName={styles.overlay}
          >
            {selectedDetails && (
              <div className={styles.modalContent}>
                <h3>
                  {selectedDetails.xodimName} ({selectedDetails.kun})
                </h3>
                <div className={styles.modalItem}>
                  <strong>{t('arrivalTimeLabel')}</strong> {selectedDetails.expectedStart}
                </div>
                <div className={styles.modalItem}>
                  <strong>{t('actualArrivalLabel')}</strong> {selectedDetails.actualStart}
                </div>
                <div className={styles.modalItem}>
                  <strong>{t('departureTimeLabel')}</strong> {selectedDetails.expectedEnd}
                </div>
                <div className={styles.modalItem}>
                  <strong>{t('actualDepartureLabel')}</strong> {selectedDetails.actualEnd}
                </div>
                <div className={styles.modalItem}>
                  <strong>{t('latenessLabel')}</strong> {selectedDetails.lateness}
                </div>
                <button className={styles.modalCloseBtn} onClick={closeModal}>
                  {t('close')}
                </button>
              </div>
            )}
          </Modal>
        </>
      ) : (
        <p className={styles.noPermission}>
          {t('noEmployeeAttendancePermission')}
        </p>
      )}
    </LayoutComponent>
  );
}