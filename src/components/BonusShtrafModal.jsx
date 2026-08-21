"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import url from '../host/host';
import { getText } from '../i18n/translations';

export default function BonusShtrafModal({ open, onClose, bola, month, onSaved }) {
  const [miqdor, setMiqdor] = useState('');
  const [sana, setSana] = useState(month ? `${month}-01` : new Date().toISOString().slice(0, 10));
  const [izoh, setIzoh] = useState('');
  const [shtrafList, setShtrafList] = useState([]);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const fetchShtrafList = async () => {
    if (!bola) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${url}/bola_pay_control?bola_id=${bola.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShtrafList(res.data);
    } catch (err) {
      console.error('Shtraf ro‘yxatini olishda xato:', err);
      setError('Shtraf ro‘yxatini olishda xato yuz berdi');
    }
  };

  useEffect(() => {
    if (open && bola) {
      fetchShtrafList();
    }
  }, [open, bola]);

  const handleSave = async () => {
    if (!miqdor || !sana) {
      setError('Miqdor va sana kiritilishi shart!');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const data = {
        bola_id: bola.id,
        miqdor: parseFloat(miqdor),
        sana,
        izoh,
      };

      if (editId) {
        // O‘zgartirish
        await axios.put(`${url}/bola_pay_control/${editId}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Qo‘shish
        await axios.post(`${url}/bola_pay_control`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setMiqdor('');
      setSana(month ? `${month}-01` : new Date().toISOString().slice(0, 10));
      setIzoh('');
      setEditId(null);
      setError('');
      fetchShtrafList();
      onSaved();
    } catch (err) {
      setError('Saqlashda xato yuz berdi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setMiqdor(item.miqdor.toString());
    setSana(item.sana.slice(0, 10));
    setIzoh(item.izoh || '');
  };

  const handleDelete = async (id) => {
    if (!confirm('Ushbu shtraf/bonusni o‘chirishni xohlaysizmi?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${url}/bola_pay_control/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchShtrafList();
      onSaved();
    } catch (err) {
      setError('O‘chirishda xato yuz berdi: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!open || !bola) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          width: '500px',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <h3>{bola.username} {getText('bonusShtrafTitle')}</h3>
        {error && <p style={{ color: 'red' }}>{error}</p>}

        <div style={{ marginBottom: '20px' }}>
          <label>{getText('bonusShtrafAmountLabel')}:</label>
          <input
            type="number"
            value={miqdor}
            onChange={(e) => setMiqdor(e.target.value)}
            placeholder={getText('amountExample')}
            style={{ width: '95%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>{getText('date')}:</label>
          <input
            type="date"
            value={sana}
            onChange={(e) => setSana(e.target.value)}
            style={{ width: '95%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>{getText('comment')} ({getText('optional')}):</label>
          <textarea
            value={izoh}
            onChange={(e) => setIzoh(e.target.value)}
            placeholder={getText('reasonPlaceholder')}
            style={{ width: '95%', padding: '8px', marginTop: '5px', height: '80px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={handleSave}
            style={{
              padding: '10px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
            }}
          >
            {editId ? getText('update') : getText('save')}
          </button>
          <button
            onClick={() => {
              setMiqdor('');
              setSana(month ? `${month}-01` : new Date().toISOString().slice(0, 10));
              setIzoh('');
              setEditId(null);
              setError('');
              onClose();
            }}
            style={{
              padding: '10px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
            }}
          >
            {getText('close')}
          </button>
        </div>

        <h4>{getText('existingBonusShtraf')}</h4>
        {shtrafList.length === 0 ? (
          <p>{getText('noData')}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>{getText('amount')}</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>{getText('date')}</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>{getText('comment')}</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>{getText('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {shtrafList.map((item) => (
                <tr key={item.id}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {item.miqdor > 0 ? `+${item.miqdor.toLocaleString()}` : item.miqdor.toLocaleString()} so‘m
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{item.sana.slice(0, 10)}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{item.izoh || '-'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    <button
                      onClick={() => handleEdit(item)}
                      style={{ marginRight: '5px', padding: '5px' }}
                    >
                      {getText('update')}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{ padding: '5px', backgroundColor: '#f44336', color: 'white', border: 'none' }}
                    >
                      {getText('delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}