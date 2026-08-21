'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import LayoutComponent from '../../components/LayoutComponent';
import ErrorModal from '../../components/ErrorModal';
import url from '../../host/host';
import styles from '../../styles/Calendar.module.css';

export default function DarslarPage() {
  const router = useRouter();
  const today = new Date();
  const [yearMonth, setYearMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedDates, setSelectedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [permissions, setPermissions] = useState({
    view_lessons: false,
    create_lessons: false,
    edit_lessons: false,
    delete_lessons: false,
  });

  const [year, month] = yearMonth.split('-').map(Number);
  const token =(typeof window !== "undefined") ? localStorage.getItem('token') : null;
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchSelectedDates = async () => {
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const type = localStorage.getItem('type') ? localStorage.getItem('type'): null;
      const adminId = type == '3' && typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('admin'))?.id : null;

      let permissionsData = {
        view_lessons: true,
        create_lessons: true,
        edit_lessons: true,
        delete_lessons: true,
      };

      const apiCalls = [axios.get(`${url}/bola_kun_all?month=${month}&year=${year}`, authHeader)];

      if (type == '3') {
        apiCalls.push(axios.get(`${url}/permissions/${adminId}`, authHeader));
      }

      const [res, permissionsRes] = await Promise.all(apiCalls);

      if (type == '3') {
        permissionsData = permissionsRes?.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);

      const dates = res.data.map((item) => new Date(item.sana).toLocaleDateString('sv-SE'));
      setSelectedDates(dates);
    } catch (err) {
      console.error('Xatolik:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.push('/login');
      } else {
        setErrorMessage('Dars kunlarini yuklashda xatolik yuz berdi!');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    
      fetchSelectedDates();
   
  }, [yearMonth]); // Faqat yearMonth dependensiya sifatida qoldiriladi

  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month - 1, 1);
    const days = [];
    while (date.getMonth() === month - 1) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const handleCheckboxChange = async (dateStr) => {
    if (!permissions.edit_lessons && !permissions.delete_lessons) {
      setErrorMessage("Sizda dars kunlarini tahrirlash yoki o'chirish uchun ruxsat yo'q!");
      return;
    }

    const isChecked = selectedDates.includes(dateStr);

    setLoading(true);
    try {
      if (isChecked) {
        if (!permissions.delete_lessons) {
          setErrorMessage("Sizda dars kunini o'chirish uchun ruxsat yo'q!");
          return;
        }
        await axios.delete(`${url}/bola_kun_all`, { data: { sana: dateStr }, ...authHeader });
        setSelectedDates((prev) => prev.filter((d) => d !== dateStr));
      } else {
        if (!permissions.create_lessons) {
          setErrorMessage("Sizda dars kuni yaratish uchun ruxsat yo'q!");
          return;
        }
        await axios.post(
          `${url}/bola_kun_all`,
          {
            sana: dateStr,
            mavzu: 'Avtomatik mavzu',
          },
          authHeader
        );
        setSelectedDates((prev) => [...prev, dateStr]);
      }
    } catch (err) {
      console.error('Xatolik:', err);
      setErrorMessage('Dars kuni o`zgartirishda xatolik yuz berdi!');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFill = async () => {
    if (!permissions.create_lessons) {
      setErrorMessage("Sizda dars kunlarini avtomatik to'ldirish uchun ruxsat yo'q!");
      return;
    }

    const days = getDaysInMonth(year, month);
    const newDates = [];
    setLoading(true);
    try {
      for (const day of days) {
        const dateStr = day.toLocaleDateString('sv-SE');
        if (!selectedDates.includes(dateStr)) {
          await axios.post(
            `${url}/bola_kun_all`,
            {
              sana: dateStr,
              mavzu: 'Avtomatik mavzu',
            },
            authHeader
          );
          newDates.push(dateStr);
        }
      }
      setSelectedDates((prev) => [...prev, ...newDates]);
    } catch (err) {
      console.error('Xatolik:', err);
      setErrorMessage('Avtomatik to`ldirishda xatolik yuz berdi!');
    } finally {
      setLoading(false);
    }
  };

  const days = getDaysInMonth(year, month);

  return (
    <LayoutComponent>
     
        <>
          <div className={styles.calendar}>
            <div className={styles.calendar__top}>
              <label htmlFor="month-select" className={styles.calendar__label}>
                Oy tanlang:
              </label>
              <input
                id="month-select"
                type="month"
                className={styles.calendar__monthInput}
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                disabled={loading}
              />
              <button
                onClick={handleAutoFill}
                className={styles.calendar__autofillBtn}
                disabled={loading || !permissions.create_lessons}
              >
                Avtomatik to'ldirish
              </button>
            </div>

            <h2 className={styles.calendar__title}>
              {year}-{String(month).padStart(2, '0')}
            </h2>

            {loading ? (
              <p style={{ padding: '10px' }}>Yuklanmoqda...</p>
            ) : (
              <div className={styles.calendar__grid}>
                {days.map((day, idx) => {
                  const dateStr = day.toLocaleDateString('sv-SE');
                  const checked = selectedDates.includes(dateStr);
                  const isSunday = day.getDay() === 0;
                  return (
                    <div
                      key={idx}
                      className={`${styles.calendar__day} ${isSunday ? styles.calendar__sunday : ''}`}
                    >
                      <div className={styles.calendar__date}>{dateStr}</div>
                      <input
                        type="checkbox"
                        className={styles.calendar__checkbox}
                        checked={checked}
                        onChange={() => handleCheckboxChange(dateStr)}
                        disabled={loading || (!permissions.create_lessons && !permissions.delete_lessons)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <ErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />
        </>
    
    </LayoutComponent>
  );
}