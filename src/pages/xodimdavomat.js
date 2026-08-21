import { useEffect, useState } from 'react';
import axios from 'axios';
import { Smile, Meh, Frown, Angry, CircleHelp, Check, LogOut } from 'lucide-react';
import url from '../host/host';
import styles from '../styles/XodimCard.module.css';
import XodimDavomat from './admin/xodim_davomat_control';

const AdminTable = ({ data, refresh, title, xodimOneDay, todayBolaKuni, xodimWorkdays }) => {
  const token = localStorage.getItem("token");
  const [loadingStates, setLoadingStates] = useState({}); // Har bir xodim uchun loading holati

  const handleStart = async (xodim_id, xodim_workdays_id) => {
    if (!xodim_workdays_id) {
      alert("Ish kuni ID si topilmadi!");
      return;
    }
    setLoadingStates(prev => ({ ...prev, [`start_${xodim_id}`]: true }));
    try {
      const now = new Date().toLocaleTimeString("uz-UZ", { 
        hour12: false, 
        timeZone: 'Asia/Tashkent' 
      });
      await axios.post(`${url}/xodim_one_day`, 
        { xodim_id, xodim_workdays_id, start_time: now }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refresh(); 
    } catch (err) {
      console.error("Kelish xatosi:", err);
      alert("Kelish xatosi!");
    } finally {
      setLoadingStates(prev => ({ ...prev, [`start_${xodim_id}`]: false }));
    }
  };

  const handleEnd = async (xodim_id) => {
    setLoadingStates(prev => ({ ...prev, [`end_${xodim_id}`]: true }));
    try {
      const now = new Date().toLocaleTimeString("uz-UZ", { 
        hour12: false, 
        timeZone: 'Asia/Tashkent' 
      });
      await axios.put(`${url}/xodim_one_day/${xodim_id}`, 
        { end_time: now }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refresh(); 
    } catch (err) {
      console.error("Ketish xatosi:", err);
      alert("Ketish xatosi!");
    } finally {
      setLoadingStates(prev => ({ ...prev, [`end_${xodim_id}`]: false }));
    }
  };

  const getBackgroundColorAndLateness = (startTime, endTime, startTime_plan, endTime_Plan) => {
    const result = { color: '#FFFFFF', sticker: <Smile size={20} />, lateness: '-' };
    let totalDeviation = 0;

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
        totalDeviation += Math.max(0, delayMinutes);

        if (delayMinutes <= 0) {
          arrivalLateness = 'Vaqtida';
          result.sticker = <Smile size={20} />;
          result.color = '#FFFFFF';
        } else if (delayMinutes <= 10) {
          arrivalLateness = `${Math.round(delayMinutes)} min kech`;
          result.sticker = <Meh size={20} />;
          result.color = '#FFFF00';
        } else if (delayMinutes <= 60) {
          arrivalLateness = `${Math.round(delayMinutes)} min kech`;
          result.sticker = <Frown size={20} />;
          const ratio = (totalDeviation - 10) / 50;
          const r = 255;
          const g = Math.round(255 * (1 - ratio));
          const b = 0;
          result.color = `rgb(${r}, ${g}, ${b})`;
        } else {
          arrivalLateness = `${Math.floor(delayMinutes / 60)} soat ${Math.round(delayMinutes % 60)} min kech`;
          result.sticker = <Angry size={20} />;
          result.color = '#FF0000';
        }
      } catch (err) {
        console.error("Kechikish hisoblashda xato:", err);
        arrivalLateness = 'Xato';
        result.sticker = <CircleHelp size={20} />;
        result.color = '#FFFFFF';
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
          totalDeviation += absMinutes;
          if (absMinutes >= 60) {
            departureLateness = `, -${Math.floor(absMinutes / 60)} soat ${absMinutes % 60} min erta`;
          } else {
            departureLateness = `, -${absMinutes} min erta`;
          }
          result.sticker = totalDeviation <= 10 ? <Meh size={20} /> : totalDeviation <= 60 ? <Frown size={20} /> : <Angry size={20} />;
          if (totalDeviation <= 10) {
            result.color = '#FFFF00';
          } else if (totalDeviation <= 60) {
            const ratio = (totalDeviation - 10) / 50;
            const r = 255;
            const g = Math.round(255 * (1 - ratio));
            const b = 0;
            result.color = `rgb(${r}, ${g}, ${b})`;
          } else {
            result.color = '#FF0000';
          }
        } else {
          departureLateness = ', Vaqtida';
        }
      } catch (err) {
        console.error("Erta ketish hisoblashda xato:", err);
        departureLateness = ', Xato';
        result.sticker = <CircleHelp size={20} />;
        result.color = '#FFFFFF';
      }
    }

    result.lateness = arrivalLateness + (departureLateness || '');
    return result;
  };

  return (
    <div>
      <h2>{title}</h2>
      {data.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>№</th>
              <th>Ism va Familiya</th>
              <th>Ish vaqti</th>
              <th>Ish bajardi</th>
              <th>Kechikish</th>
              <th>Kayfiyat</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {data.map((xodim, index) => {
              const todayOneDay = xodimOneDay.find(
                item => item.xodim_id === xodim.id && 
                new Date(item.created_at).toISOString().split('T')[0] === 
                new Date().toISOString().split('T')[0]
              );
             
              const today = new Date();
              today.setDate(today.getDate() - 1);
              const todayDate = today.toISOString().split('T')[0];

              let xodimWorkdaysId = null;
              if (xodim.ish_tur === 1) {
                xodimWorkdaysId = todayBolaKuni.length > 0 ? todayBolaKuni[0]?.id : null;
              } else if (xodim.ish_tur === 2) {
                xodimWorkdaysId = xodimWorkdays.find(w =>
                  w.xodim_id === xodim.id &&
                  new Date(w.work_day).toISOString().split('T')[0] == todayDate
                )?.id || null;
              }

              const { color, sticker, lateness } = getBackgroundColorAndLateness(
                todayOneDay?.start_time, 
                todayOneDay?.end_time, 
                xodim?.start_time, 
                xodim?.end_time
              );

              return (
                <tr key={xodim.id}>
                  <td data-label="№">{index + 1}</td>
                  <td data-label="Ism va Familiya">{xodim.name}</td>
                  <td data-label="Ish vaqti">
                    {xodim?.start_time ? xodim.start_time.slice(0, 5) : '-'} - 
                    {xodim?.end_time ? xodim.end_time.slice(0, 5) : '-'}
                  </td>
                  <td data-label="Ish bajardi">
                    {todayOneDay?.start_time ? todayOneDay.start_time.slice(0, 5) : '-'} - 
                    {todayOneDay?.end_time ? todayOneDay.end_time.slice(0, 5) : '-'}
                  </td>
                  <td data-label="Kechikish">{lateness}</td>
                  <td data-label="Kayfiyat" style={{ backgroundColor: color }}>{sticker}</td>
                  <td data-label="Amallar">
                    <div className={styles.actions}>
                      <button
                        className={`${styles.btn} ${styles.btnGreen}`}
                        onClick={() => handleStart(xodim.id, xodimWorkdaysId)}
                        disabled={todayOneDay && todayOneDay.start_time || loadingStates[`start_${xodim.id}`]}
                      >
                        {loadingStates[`start_${xodim.id}`] ? 'Saqlanmoqda...' : (<><Check size={16} /> Ishga keldim</>)}
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnRed}`}
                        onClick={() => handleEnd(xodim.id)}
                        disabled={!todayOneDay || !todayOneDay.start_time || (todayOneDay && todayOneDay.end_time) || loadingStates[`end_${xodim.id}`]}
                      >
                        {loadingStates[`end_${xodim.id}`] ? 'Saqlanmoqda...' : (<><LogOut size={16} /> Ishdan ketdim</>)}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p>{title} xodimlar topilmadi</p>
      )}
    </div>
  );
};

const Xodimlar = () => {
  const [xodimlar, setXodimlar] = useState([]);
  const [bolaKuni, setBolaKuni] = useState([]);
  const [xodimOneDay, setXodimOneDay] = useState([]);
  const [xodimWorkdays, setXodimWorkdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date().toLocaleDateString('uz-UZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tashkent',
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token topilmadi!');

      const currentDate = new Date();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const year = currentDate.getFullYear().toString();
      const day = currentDate.getDate().toString().padStart(2, '0');
      const todayDate = `${year}-${month}-${day}`;

      const xodimRes = await axios.get(`${url}/xodim/work-today`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const bolaKuniRes = await axios.get(`${url}/bola_kun_all`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { month, year },
      });

      const xodimOneDayRes = await axios.get(`${url}/xodim_one_day`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const xodimWorkdaysRes = await axios.get(`${url}/xodim_workdays`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const todayBolaKuni = bolaKuniRes.data.filter(item => 
        new Date(item.sana).toISOString().split('T')[0] === todayDate
      );

      const mergedXodimlar = xodimRes.data.map(xodim => {
        const todayOneDay = xodimOneDayRes.data.find(
          item => item.xodim_id === xodim.id && 
          new Date(item.created_at).toISOString().split('T')[0] === todayDate
        );
        return {
          ...xodim,
          start_time_today: todayOneDay?.start_time || null,
          end_time_today: todayOneDay?.end_time || null,
        };
      });

      setXodimlar(mergedXodimlar || []);
      setBolaKuni(todayBolaKuni);
      setXodimOneDay(xodimOneDayRes.data || []);
      setXodimWorkdays(xodimWorkdaysRes.data || []);
    } catch (err) {
      console.error("Xato:", err);
      setError(err.message || "Ma'lumot yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const oddiyXodimlar = xodimlar
    .filter(x => x.ish_tur === 1)
    .sort((a, b) => a.name.localeCompare(b.name, 'uz'));
  const maxsusXodimlar = xodimlar
    .filter(x => x.ish_tur === 2)
    .sort((a, b) => a.name.localeCompare(b.name, 'uz'));

  if (loading) return <div>Yuklanmoqda...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className={styles.container}>
      <h2>Bugungi sana: {today}</h2>
      <XodimDavomat/>
      <h1>Bugungi ishga kelgan xodimlar</h1>
      
      <div>
        <h3>Bugungi bola kuni</h3>
        {bolaKuni.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>№</th>
                <th>Id</th>
                <th>Mavzu</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {bolaKuni.map((item, index) => (
                <tr key={item.id}>
                  <td data-label="№">{index + 1}</td>
                  <td data-label="Id">{item.id}</td>
                  <td data-label="Mavzu">{item.mavzu}</td>
                  <td data-label="Sana">{new Date(item.sana).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Bugun uchun bola kuni rejalari topilmadi</p>
        )}
      </div>

      <AdminTable 
        data={oddiyXodimlar} 
        refresh={fetchData} 
        title="Oddiy xodimlar"
        xodimOneDay={xodimOneDay}
        todayBolaKuni={bolaKuni}
        xodimWorkdays={xodimWorkdays}
      />
      
      <AdminTable 
        data={maxsusXodimlar} 
        refresh={fetchData} 
        title="Maxsus xodimlar"
        xodimOneDay={xodimOneDay}
        todayBolaKuni={bolaKuni}
        xodimWorkdays={xodimWorkdays}
      />
    </div>
  );
};

export default Xodimlar;