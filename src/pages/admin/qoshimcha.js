'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LayoutComponent from '../../components/LayoutComponent';
import AdminTable from '../../components/AdminTable';
import QoshimchaModal from '../../components/QoshimchaModal';
import axios from 'axios';
import url from '../../host/host';
import AdminHeader from '../../components/AdminHeader';
import ChiqimFilter from '../../components/ChiqimFilter';
import ErrorModal from '../../components/ErrorModal';
import { saveAs } from 'file-saver';
import { exportToExcel } from '../../utils/exportExcel';
import { FileSpreadsheet } from 'lucide-react';

export default function QoshimchaPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState({
    startDate: '',
    endDate: '',
    products: [], // faqat ChiqimFilter bilan mos bo‘lishi uchun
  });
  const [permissions, setPermissions] = useState({
    view_extras: false,
    create_extras: false,
    edit_extras: false,
    delete_extras: false,
  });

  const token = (typeof window !== "undefined")  ? localStorage.getItem('token') : null;
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = async () => {
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const type = localStorage.getItem('type') ? localStorage.getItem('type'): null;
      const adminId = type === '3' && typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('admin'))?.id : null;

      let permissionsData = {
        view_extras: true,
        create_extras: true,
        edit_extras: true,
        delete_extras: true,
      };

      const apiCalls = [
        axios.get(`${url}/chiqim_qoshimcha`, authHeader),
      ];

      if (type === '3') {
        apiCalls.push(
          axios.get(`${url}/permissions/${adminId}`, { headers: { Authorization: `Bearer ${token}` } })
        );
      }

      const [chiqimRes, permissionsRes] = await Promise.all(apiCalls);

      // Set permissions
      if (type === '3') {
        permissionsData = permissionsRes?.data?.permissions || permissionsData;
      }
      setPermissions(permissionsData);

      setData(chiqimRes.data);
    } catch (err) {
      console.error('Xatolik:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.push('/');
      } else {
        setErrorMessage('Ma\'lumotlarni yuklashda xatolik yuz berdi!');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!permissions.delete_extras) {
      setErrorMessage("Sizda qo‘shimcha chiqimni o‘chirish uchun ruxsat yo‘q!");
      return;
    }
    try {
      await axios.delete(`${url}/chiqim_qoshimcha/${id}`, authHeader);
      fetchData();
    } catch (err) {
      console.error("O‘chirishda xatolik:", err);
      setErrorMessage('Qo‘shimcha chiqimni o‘chirishda xatolik yuz berdi!');
    }
  };

  const handleSave = async (form) => {
    try {
      if (editingItem) {
        if (!permissions.edit_extras) {
          setErrorMessage("Sizda qo‘shimcha chiqimni tahrirlash uchun ruxsat yo‘q!");
          return;
        }
        await axios.put(`${url}/chiqim_qoshimcha/${editingItem.id}`, form, authHeader);
      } else {
        if (!permissions.create_extras) {
          setErrorMessage("Sizda qo‘shimcha chiqim yaratish uchun ruxsat yo‘q!");
          return;
        }
        await axios.post(`${url}/chiqim_qoshimcha`, form, authHeader);
      }
      fetchData();
      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error("Saqlashda xatolik:", err);
      setErrorMessage('Saqlashda xatolik yuz berdi!');
    }
  };

  const handleEdit = (item) => {
    if (!permissions.edit_extras) {
      setErrorMessage("Sizda qo‘shimcha chiqimni tahrirlash uchun ruxsat yo‘q!");
      return;
    }
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.startDate) params.append('start', filter.startDate);
      if (filter.endDate) params.append('end', filter.endDate);

      const res = await axios.get(`${url}/chiqim_qoshimcha?${params.toString()}`, authHeader);
      setData(res.data);
    } catch (err) {
      console.error("Filterlashda xatolik:", err);
      setErrorMessage('Filterlashda xatolik yuz berdi!');
    }
  };

  const handleExportToWord = async () => {
    if (!data.length) {
      setErrorMessage("Ma'lumot yo‘q");
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

    const headers = ['#', 'Narxi', 'Izoh', 'Sana'];
    const columnWidths = [500, 1500, 4000, 2000];

    const createCell = (text, width, align = AlignmentType.CENTER, bold = false) =>
      new TableCell({
        width: { size: width, type: WidthType.DXA },
        verticalAlign: 'center',
        children: [
          new Paragraph({
            alignment: align,
            children: [new TextRun({ text, bold })],
          }),
        ],
        shading: {
          fill: 'ffffff',
          type: ShadingType.CLEAR,
          color: '000000',
        },
      });

    const headerRow = new TableRow({
      children: headers.map((text, i) =>
        new TableCell({
          width: { size: columnWidths[i], type: WidthType.DXA },
          verticalAlign: 'center',
          shading: {
            fill: 'f0f0f0',
            type: ShadingType.CLEAR,
            color: '000000',
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: text.toUpperCase(), bold: true })],
            }),
          ],
        })
      ),
    });

    const bodyRows = data.map((item, index) =>
      new TableRow({
        children: [
          createCell((index + 1).toString(), columnWidths[0]),
          createCell(item.price?.toString() || '', columnWidths[1]),
          createCell(item.description || '', columnWidths[2]),
          createCell(item.created_at?.slice(0, 10) || '', columnWidths[3]),
        ],
      })
    );

    const totalSumma = data.reduce((acc, item) => acc + (item.price || 0), 0);

    const totalRow = new TableRow({
      children: [
        createCell('', columnWidths[0]),
        createCell('Jami', columnWidths[1], AlignmentType.RIGHT, true),
        createCell(totalSumma.toLocaleString() + " so'm", columnWidths[2], AlignmentType.CENTER, true),
        createCell('', columnWidths[3]),
      ],
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Qo‘shimcha chiqimlar ro‘yxati',
              heading: 'Heading1',
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }),
            new Table({
              rows: [headerRow, ...bodyRows, totalRow],
              width: { size: 10000, type: WidthType.DXA },
            }),
          ],
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, 'qoshimcha_chiqimlar.docx');
    });
  };

  const handleExportToExcel = async () => {
    if (!data.length) {
      setErrorMessage("Ma'lumot yo‘q");
      return;
    }

    const headers = ['#', 'Narxi', 'Izoh', 'Sana'];
    const rows = data.map((item, index) => [
      index + 1,
      item.price || '',
      item.description || '',
      item.created_at?.slice(0, 10) || '',
    ]);

    const totalSumma = data.reduce((acc, item) => acc + (item.price || 0), 0);
    rows.push(['', 'Jami', totalSumma.toLocaleString() + " so'm", '']);

    await exportToExcel({ headers, rows, filename: 'qoshimcha_chiqimlar' });
  };

  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }
    fetchData();
  }, []);

  return (
    <LayoutComponent>
      {typeof window !== 'undefined' && localStorage.getItem('type') == '1' || permissions.view_extras ? (
        <>
          <AdminHeader
            title="Qo‘shimcha chiqimlar"
            onCreate={
              permissions.create_extras
                ? () => {
                    setEditingItem(null);
                    setModalOpen(true);
                  }
                : null
            }
            canCreate={permissions.create_extras}
          />

          <ChiqimFilter
            filter={filter}
            onChange={handleFilterChange}
            onSubmit={handleFilterSubmit}
            onExport={handleExportToWord}
          />

          <button
            onClick={handleExportToExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#217346',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '12px',
            }}
          >
            <FileSpreadsheet size={16} /> Excel’ga aylantirish
          </button>

          <AdminTable
            title="Qo‘shimcha chiqimlar ro‘yxati"
            columns={['id', 'price', 'description', 'created_at', 'actions']}
            columnTitles={{
              id: 'ID',
              price: 'Narxi',
              description: 'Izoh',
              created_at: 'Vaqti',
              actions: 'Amallar',
            }}
            data={data}
            onDelete={permissions.delete_extras ? (id) => handleDelete(id) : null}
            onEdit={permissions.edit_extras ? (item) => handleEdit(item) : null}
            permissions={{
              view1: permissions.view_extras,
              edit1: permissions.edit_extras,
              delete1: permissions.delete_extras,
            }}
          />

          <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
            Jami summa: {data.reduce((acc, item) => acc + (item.price || 0), 0).toLocaleString()} so'm
          </div>

          {modalOpen && (permissions.create_extras || permissions.edit_extras) && (
            <QoshimchaModal
              isOpen={modalOpen}
              onClose={() => {
                setModalOpen(false);
                setEditingItem(null);
              }}
              onSave={handleSave}
              initialData={editingItem}
            />
          )}

          <ErrorModal message={errorMessage} onClose={() => setErrorMessage('')} />
        </>
      ) : (
        <p style={{ padding: '20px', color: 'red' }}>
          Sizda qo‘shimcha chiqimlarni ko‘rish uchun ruxsat yo‘q!
        </p>
      )}
    </LayoutComponent>
  );
}