"use client";
import styles from "../../styles/Tarix.module.css";
import { X } from "lucide-react";

import LayoutComponent from "../../components/LayoutComponent";
import AdminTable from "../../components/AdminTable";
import { useEffect, useState } from "react";
import axios from "axios";
import url from "../../host/host";
import { getText } from '../../i18n/translations';

export default function Tarix() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [adminFilter, setAdminFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const getData = async () => {
    try {
      const res = await axios.get(`${url}/tarix`, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });
      setData(res.data || []);
      setFilteredData(res.data || []);
    } catch (err) {
      console.error("Xatolik:", err);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  // 🔎 Filterni qo‘llash
  useEffect(() => {
    let filtered = [...data];

    if (searchText) {
      filtered = filtered.filter(
        (item) =>
          item.table_name?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.admin_username?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.izoh?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (methodFilter) {
      filtered = filtered.filter((item) => item.method === methodFilter);
    }

    if (adminFilter) {
      filtered = filtered.filter(
        (item) => String(item.admin_username) === String(adminFilter)
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(
        (item) =>
          item.created_at &&
          item.created_at.startsWith(dateFilter) // faqat YYYY-MM-DD qismini tekshiradi
      );
    }

    setFilteredData(filtered);
  }, [searchText, methodFilter, adminFilter, dateFilter, data]);

  const columns = [
    "id",
    "admin_username",
    "method", 
    "table_name",
    "izoh",
    "created_at",
    "updated_at",
  ];

  const columnTitles = {
    id: "№",
    admin_username: getText('colAdmin'),
    method: getText('colAction'),
    table_name: getText('colTable'),
    izoh: getText('colCommentJson'),
    created_at: getText('colCreatedAt'),
    updated_at: getText('colUpdatedAt'),
  };

  // 🔽 unique adminlarni chiqarib olish
  const uniqueAdmins = [...new Set(data.map((d) => d.admin_username))];

  return (
    <LayoutComponent>
     <h2 className={styles.title}>Tarix</h2>

<div className={styles.filterPanel}>
  <input
    type="text"
    placeholder="Qidirish..."
    className={styles.searchInput}
    value={searchText}
    onChange={(e) => setSearchText(e.target.value)}
  />

  <select
    className={styles.selectBox}
    value={methodFilter}
    onChange={(e) => setMethodFilter(e.target.value)}
  >
    <option value="">Barcha metodlar</option>
    <option value="POST">POST</option>
    <option value="PUT">PUT</option>
    <option value="DELETE">DELETE</option>
  </select>

  <select
    className={styles.selectBox}
    value={adminFilter}
    onChange={(e) => setAdminFilter(e.target.value)}
  >
    <option value="">Barcha adminlar</option>
    {uniqueAdmins.map((admin, i) => (
      <option key={i} value={admin}>
        {admin}
      </option>
    ))}
  </select>

  <input
    type="date"
    className={styles.dateInput}
    value={dateFilter}
    onChange={(e) => setDateFilter(e.target.value)}
  />

  <button
    className={styles.clearBtn}
    onClick={() => {
      setSearchText("");
      setMethodFilter("");
      setAdminFilter("");
      setDateFilter("");
    }}
  >
    <X size={16} /> Tozalash
  </button>
</div>

      <AdminTable
        title="Tarix"
        columns={columns}
        columnTitles={columnTitles}
        data={filteredData}
        permissions={{
          view1: true,
          edit1: false,
          delete1: false,
        }}
      />
    </LayoutComponent>
  );
}
