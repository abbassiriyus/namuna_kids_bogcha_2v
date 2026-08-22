'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import url from '../../host/host';
import { Check, X } from 'lucide-react';
import { bugungiSana } from '../../utils/sana';

export default function DavomatBugungi() {
  const [adminId, setAdminId] = useState(null);
  const [guruhlar, setGuruhlar] = useState([]);
  const [selectedGuruhId, setSelectedGuruhId] = useState('');
  const [bolalar, setBolalar] = useState([]);
  const [davomatlar, setDavomatlar] = useState([]);
  const [dars, setDars] = useState(null);
  const [token, setToken] = useState(null);

 const [today, setToday] = useState("");

useEffect(() => {
  setToday(bugungiSana());
}, []);

  // localStorage faqat clientda o'qiladi
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('token');
      setToken(t);

      const adminData = JSON.parse(localStorage.getItem('admin'));
      if (adminData?.id) {
        setAdminId(adminData.id);
      }
    }
  }, []);

  const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  const fetchGuruhlar = async () => {
    if (!adminId || !token) return;
    const res = await axios.get(`${url}/group-admin?admin_id=${adminId}`, authHeader);
    const guruhIds = res.data.map(item => item.group_id);

    const guruhRes = await axios.get(`${url}/guruh`, authHeader);
    const filtered = guruhRes.data.filter(g => guruhIds.includes(g.id));
    setGuruhlar(filtered);

    if (filtered.length > 0) {
      setSelectedGuruhId(filtered[0].id);
    }
  };

  const fetchData = async () => {
    if (!selectedGuruhId || !token) return;

    const bolaRes = await axios.get(`${url}/bola?is_active=true`, authHeader);
    const filteredBolalar = bolaRes.data.filter(b => b.guruh_id == selectedGuruhId);
    setBolalar(filteredBolalar);

    const darsRes = await axios.get(`${url}/bola_kun_all?month=${today.slice(0, 7)}`, authHeader);
    const todayLesson = darsRes.data.find(d => toLocalDate(d.sana) === today);
    setDars(todayLesson);

    const davomatRes = await axios.get(`${url}/bola_kun`, authHeader);
    setDavomatlar(davomatRes.data);
  };

  useEffect(() => {
    if (adminId && token) {
      fetchGuruhlar();
    }
  }, [adminId, token]);

  useEffect(() => {
    if (selectedGuruhId && token) {
      fetchData();
    }
  }, [selectedGuruhId, token]);

  const handleChange = async (bola, holati) => {
    if (!dars || !token) return;

    const existing = davomatlar.find(
      d => d.bola_id === bola.id && d.darssana_id === dars.id
    );

    const payload = {
      bola_id: bola.id,
      darssana_id: dars.id,
      holati
    };

    const method = existing ? 'put' : 'post';
    const endpoint = existing ? `${url}/bola_kun/${existing.id}` : `${url}/bola_kun`;

    await axios[method](endpoint, payload, authHeader);
    fetchData(); // yangilash
  };

  // Statistika hisoblash
  const holatlar = bolalar.map(bola => {
    const entry = davomatlar.find(
      d => d.bola_id === bola.id && d.darssana_id === dars?.id
    );
    return entry?.holati;
  });

  const jami = bolalar.length;
  const kelgan = holatlar.filter(h => h === 1).length;
  const kelmagan = holatlar.filter(h => h === 2).length;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Bugungi davomat: {today}</h2>

      {guruhlar.length > 0 && (
        <div style={{ margin: '15px 0' }}>
          <label style={{ fontWeight: '600' }}>Guruh tanlang:</label>
          <select
            value={selectedGuruhId}
            onChange={(e) => setSelectedGuruhId(e.target.value)}
            style={{
              marginLeft: '10px',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          >
            {guruhlar.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      {!dars && (
        <p style={{ color: 'red' }}>Bugungi dars belgilanmagan. Iltimos, avval mavzu yarating.</p>
      )}

      {dars && bolalar.length > 0 && (
        <>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '20px',
            maxWidth: '500px'
          }}>
            {bolalar.map((bola, index) => {
              const entry = davomatlar.find(
                d => d.bola_id === bola.id && d.darssana_id === dars.id
              );

              return (
                <div key={bola.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  background: '#f9f9f9'
                }}>
                  <span>{index + 1}. {bola.username}</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleChange(bola, 1)}
                      style={{
                        backgroundColor: entry?.holati === 1 ? 'green' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '4px'
                      }}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => handleChange(bola, 2)}
                      style={{
                        backgroundColor: entry?.holati === 2 ? 'red' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '4px'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Statistika */}
          <div style={{
            marginTop: '25px',
            padding: '15px',
            borderTop: '1px solid #ccc',
            fontSize: '16px'
          }}>
            <strong>Statistika:</strong><br />
            Jami bola: <strong>{jami}</strong><br />
            Kelgan: <strong style={{ color: 'green' }}>{kelgan}</strong><br />
            Kelmagan: <strong style={{ color: 'red' }}>{kelmagan}</strong>
          </div>
        </>
      )}
    </div>
  );
}
