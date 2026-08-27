'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LayoutComponent from '../../components/LayoutComponent';
import AdminTable from '../../components/AdminTable';
import OylikEditModal from '../../components/OylikEditModal';
import OylikDeleteModal from '../../components/OylikDeleteModal';
import ErrorModal from '../../components/ErrorModal';
import axios from 'axios';
import url from '../../host/host';
import { useLang } from '../../i18n/LanguageContext';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { bugungiOy } from '../../utils/sana';
import { useUserType } from '../../utils/useUserType';
import Loader from '../../components/Loader';

export default function OyliklarPage() {
  const { t } = useLang();
  // localStorage render paytida o'qilsa hydration xatosi beradi — hook mount'dan keyin o'qiydi.
  const { isSuperAdmin } = useUserType();
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  // Qaysi xodimning to'lov tafsilotlari (akkordion) ochilgani
  const [expandedId, setExpandedId] = useState(null);
  const [selectedXodim, setSelectedXodim] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => bugungiOy());
  const [permissions, setPermissions] = useState({
    view_salaries: false,
    create_salaries: false,
    edit_salaries: false,
    delete_salaries: false,
  });

  const token = (typeof window !== "undefined")  ? localStorage.getItem('token') : null;
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchAll = async () => {
    if (!token) {
      router.push('/');
      return;
    }

    if (!selectedMonth) return;
    setLoading(true);

    try {
      const type = localStorage.getItem('type') ? localStorage.getItem('type'): null;
      const adminId = type === '3' && typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('admin'))?.id : null;

      let permissionsData = {
        view_salaries: true,
        create_salaries: true,
        edit_salaries: true,
        delete_salaries: true,
      };

      const apiCalls = [
        axios.get(`${url}/xodim`, authHeader),
        axios.get(`${url}/bonus?month=${selectedMonth}`, authHeader),
        axios.get(`${url}/jarima?month=${selectedMonth}`, authHeader),
        axios.get(`${url}/kunlik?month=${selectedMonth}`, authHeader),
        axios.get(`${url}/oylik_type?month=${selectedMonth}`, authHeader),
      ];

      if (type === '3') {
        apiCalls.push(
          axios.get(`${url}/permissions/${adminId}`, { headers: { Authorization: `Bearer ${token}` } })
        );
      }

      const [xodimRes, bonusRes, jarimaRes, kunlikRes, typeRes, permissionsRes] = await Promise.all(apiCalls);

      // Set permissions
      if (type === '3') {
        permissionsData = permissionsRes?.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);

      const bonusMap = {},
            jarimaMap = {},
            kunlikMap = {},
            tolanganMap = {},
            tolovlarMap = {}; // xodim_id => alohida to'lovlar ro'yxati

      bonusRes.data.forEach((b) => {
        bonusMap[b.xodim_id] = (bonusMap[b.xodim_id] || 0) + Number(b.narx);
      });

      jarimaRes.data.forEach((j) => {
        jarimaMap[j.xodim_id] = (jarimaMap[j.xodim_id] || 0) + Number(j.narx);
      });

      kunlikRes.data.forEach((k) => {
        kunlikMap[k.xodim_id] = (kunlikMap[k.xodim_id] || 0) + Number(k.narx);
      });

      typeRes.data.forEach((t) => {
        tolanganMap[t.xodim_id] = (tolanganMap[t.xodim_id] || 0) + Number(t.narx);
        if (!tolovlarMap[t.xodim_id]) tolovlarMap[t.xodim_id] = [];
        tolovlarMap[t.xodim_id].push(t);
      });

      // Har bir xodimning to'lovlarini sana bo'yicha eskidan yangiga saralaymiz.
      Object.values(tolovlarMap).forEach((list) =>
        list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      );

      const enriched = xodimRes.data.map((x) => {
        const bonus = bonusMap[x.id] || 0;
        const jarima = jarimaMap[x.id] || 0;
        const kunlik = kunlikMap[x.id] || 0;
        const oylik = x.oylik ?? 0;
        const tolangan = tolanganMap[x.id] || 0;

        const total = Math.max(0, oylik + bonus + kunlik - jarima);
        const tolovlar = tolovlarMap[x.id] || [];

        let holat = 'To‘lanmadi';
        if (tolangan >= total && total > 0) holat = 'To‘landi';
        else if (tolangan > 0 && tolangan < total) holat = 'To‘liq to‘lanmadi';

        return {
          id: x.id,
          name: x.name,
          phone: x.phone,
          address: x.address,
          oylik,
          bonus,
          jarima,
          kunlik,
          tolangan,
          total,
          qoldiq: Math.max(0, total - tolangan),
          holat,
          tolovlar,
        };
      });

      setData(enriched);
    } catch (err) {
      console.error("Xatolik:", err);
      setErrorMsg("Ma'lumotlarni olishda xatolik yuz berdi!\n" + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [selectedMonth]);

  const handleEdit = (row) => {
    if (!permissions.edit_salaries) {
      setErrorMsg(t('noEditSalaryPermission'));
      return;
    }
    setSelectedXodim(row);
    setEditMode(false);
    setShowModal(true);
  };

  const handleDelete = (row) => {
    if (!permissions.delete_salaries) {
      setErrorMsg(t('noDeleteSalaryPermission'));
      return;
    }
    setSelectedXodim(row);
    setEditMode(true);
    setShowModal(true);
  };

  const columnTitles = {
    id: t('colId'),
    name: t('colFullName'),
    oylik: t('colSalary'),
    bonus: t('colBonus'),
    jarima: t('colPenalty'),
    kunlik: t('colDaily'),
    total: t('colShouldPay'),
    tolangan: t('colPaid'),
    qoldiq: t('colRemainder'),
    holat: t('colStatus'),
  };

  const formatSum = (value) =>
    Number(value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const customRenderers = {
    // To'lov bir necha bo'lib berilgan bo'lsa, tafsilotlarni ochadigan akkordion.
    tolangan: (row) => {
      const tolovlar = row.tolovlar || [];
      const bolinib = tolovlar.length >= 2;
      const ochiq = expandedId === row.id;

      if (!bolinib) return <span>{formatSum(row.tolangan)}</span>;

      return (
        <div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedId(ochiq ? null : row.id);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              font: 'inherit',
              color: 'var(--color-primary)',
              fontWeight: 600,
              padding: 0,
            }}
            title={t('viewPaymentDetails')}
          >
            {ochiq ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {formatSum(row.tolangan)} ({tolovlar.length} ta)
          </button>

          {ochiq && (
            <div
              style={{
                marginTop: 6,
                padding: '6px 8px',
                background: 'var(--color-surface-muted, #f5f5f5)',
                borderRadius: 6,
                fontSize: 13,
                textAlign: 'left',
              }}
            >
              {tolovlar.map((t, i) => (
                <div
                  key={t.id}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '2px 0' }}
                >
                  <span>
                    {i + 1}. {new Date(t.created_at).toLocaleDateString('uz-UZ')}
                  </span>
                  <strong>{formatSum(t.narx)} so‘m</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    },
  };

  return (
    <LayoutComponent>
      {isSuperAdmin || permissions.view_salaries ? (
        <>
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              {t('selectMonthLabel')}:
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '16px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                outline: 'none',
                width: '200px',
              }}
            />
            <button
              onClick={fetchAll}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Ko‘rish
            </button>
          </div>

          {loading ? (
            <Loader />
          ) : (
            <AdminTable
              title={`Oylik / Bonus / Jarima ro‘yxati — ${selectedMonth}`}
              columns={Object.keys(columnTitles)}
              columnTitles={columnTitles}
              data={data}
              customRenderers={customRenderers}
              onEdit={permissions.edit_salaries ? handleEdit : null}
              onDelete={permissions.delete_salaries ? handleDelete : null}
              permissions={{
                view1: permissions.view_salaries,
                edit1: permissions.edit_salaries,
                delete1: permissions.delete_salaries,
              }}
            />
          )}

          {showModal && (permissions.edit_salaries || permissions.delete_salaries) && (
            <>
              {!editMode ? (
                <OylikEditModal
                  open={showModal}
                  xodim={selectedXodim}
                  onClose={() => setShowModal(false)}
                  onSaved={fetchAll}
                  editMode={editMode}
                  selectedMonth={selectedMonth}
                />
              ) : (
                <OylikDeleteModal
                  open={showModal}
                  xodim={selectedXodim}
                  selectedMonth={selectedMonth}
                  onClose={() => setShowModal(false)}
                  onSaved={fetchAll}
                />
              )}
            </>
          )}

          <ErrorModal message={errorMsg} onClose={() => setErrorMsg('')} />
        </>
      ) : (
        <p style={{ padding: '20px', color: 'red' }}>
          Sizda oyliklarni ko‘rish uchun ruxsat yo‘q!
        </p>
      )}
    </LayoutComponent>
  );
}