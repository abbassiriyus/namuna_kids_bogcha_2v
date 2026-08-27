'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Pencil, Trash2, Settings, Plus, Save, X, Check } from 'lucide-react';
import LayoutComponent from '../../components/LayoutComponent';
import PermissionTable from '../../components/PermissionModal';
import { getText } from '../../i18n/translations';
import styles from '../../styles/Adminlar.module.css';
import { useRouter } from 'next/navigation';
import url from '../../host/host';

const TABS = [
  { labelKey: 'role.superAdmin', type: 1 },
  { labelKey: 'role.teacher', type: 2 },
  { labelKey: 'role.extraAdmin', type: 3 }
];

export default function AdminTabs() {
  const [activeType, setActiveType] = useState(1);
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({
    username: '',
    phone_number: '',
    password: '',
    type: 3,
    is_active: false
  });
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  const [permissions, setPermissions] = useState({});
  const [selectedAdminId, setSelectedAdminId] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const [showAdminModal, setShowAdminModal] = useState(false);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalAdmin, setGroupModalAdmin] = useState(null);
  const [allGuruhlar, setAllGuruhlar] = useState([]);
  const [assignedGroups, setAssignedGroups] = useState([]); // group_admin rows {id, group_id}

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [myPermissions, setMyPermissions] = useState({});

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const adminStr = localStorage.getItem('admin');
    if (!token || !adminStr) return router.push('/login');

    const admin = JSON.parse(adminStr);
    setIsSuperAdmin(admin.type === 1);

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    if (admin.type === 3) {
      axios.get(`${url}/permissions/${admin.id}`).then(res => {
        setMyPermissions(res.data.permissions || {});
      });
    }

    fetchAdmins();
  }, [activeType]);

  const hasPermission = (actionKey) => {
    return isSuperAdmin || !!myPermissions[actionKey];
  };

  const fetchAdmins = async () => {
    try {
      const res = await axios.get(`${url}/admin?type=${activeType}`);
      const sortedAdmins = res.data.sort((a, b) =>
        a.username.localeCompare(b.username, 'uz', { sensitivity: 'base' })
      );
      setAdmins(sortedAdmins);
    } catch {
      alert(getText('loadError'));
    }
  };

  const fetchPermissions = async (adminId) => {
    if (!hasPermission('edit_admins')) {
      return alert(getText('noActionPermission'));
    }
    try {
      const res = await axios.get(`${url}/permissions/${adminId}`);
      setPermissions(res.data.permissions || {});
      setSelectedAdminId(adminId);
      setShowPermissionModal(true);
    } catch {
      alert(getText('loadError'));
    }
  };

  const handleSavePermissions = async () => {
    try {
      await axios.post(`${url}/permissions/${selectedAdminId}`, { permissions });
      alert(getText('save'));
      setShowPermissionModal(false);
    } catch {
      alert(getText('saveError'));
    }
  };

  const handleDelete = async (id) => {
    if (!hasPermission('delete_admins')) {
      return alert(getText('noActionPermission'));
    }
    if (confirm(getText('confirmDelete'))) {
      await axios.delete(`${url}/admin/${id}`);
      fetchAdmins();
    }
  };

  const handleOpenCreate = () => {
    setSelectedAdmin(null);
    setForm({ username: '', phone_number: '', password: '', type: 3, is_active: false });
    setShowAdminModal(true);
  };

  const handleOpenEdit = (admin) => {
    setSelectedAdmin(admin);
    setForm({
      username: admin.username,
      phone_number: admin.phone_number,
      password: '',
      type: admin.type,
      is_active: admin.is_active
    });
    setShowAdminModal(true);
  };

  const openGroupModal = async (admin) => {
    try {
      const [guruhRes, assignedRes] = await Promise.all([
        axios.get(`${url}/guruh`),
        axios.get(`${url}/group-admin?admin_id=${admin.id}`),
      ]);
      setAllGuruhlar(guruhRes.data);
      setAssignedGroups(assignedRes.data);
      setGroupModalAdmin(admin);
      setShowGroupModal(true);
    } catch {
      alert(getText('loadError'));
    }
  };

  const toggleGroupAssignment = async (groupId) => {
    const existing = assignedGroups.find((g) => g.group_id === groupId);
    try {
      if (existing) {
        await axios.delete(`${url}/group-admin/${existing.id}`);
        setAssignedGroups((prev) => prev.filter((g) => g.id !== existing.id));
      } else {
        const res = await axios.post(`${url}/group-admin`, {
          admin_id: groupModalAdmin.id,
          group_id: groupId,
        });
        setAssignedGroups((prev) => [...prev, res.data]);
      }
    } catch {
      alert(getText('saveError'));
    }
  };

  const handleSaveAdmin = async (e) => {
    e.preventDefault();
    if (selectedAdmin) {
      if (!hasPermission('edit_admins')) {
        return alert(getText('noActionPermission'));
      }
      await axios.put(`${url}/admin/${selectedAdmin.id}`, form);
    } else {
      if (!hasPermission('create_admins')) {
        return alert(getText('noActionPermission'));
      }
      await axios.post(`${url}/admin`, form);
    }
    setShowAdminModal(false);
    fetchAdmins();
  };

  return (
    <LayoutComponent>
      <div className={styles.wrapper}>
        <h2>{getText('admins')}</h2>

        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setActiveType(tab.type)}
              className={`${styles.tab} ${activeType === tab.type ? styles.tabActive : ''}`}
            >
              {getText(tab.labelKey)}
            </button>
          ))}
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>{getText('colId')}</th>
              <th>{getText('colFullName')}</th>
              <th>{getText('colPhone')}</th>
              <th>{getText('colActiveStatus')}</th>
              <th>{getText('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.username}</td>
                <td>{a.phone_number}</td>
                <td>
                  {a.is_active ? (
                    <Check size={16} color="var(--color-success)" />
                  ) : (
                    <X size={16} color="var(--color-danger)" />
                  )}
                </td>
                <td className={styles.actions}>
                  {hasPermission('edit_admins') && (
                    <button onClick={() => handleOpenEdit(a)} title={getText('edit')}>
                      <Pencil size={16} />
                    </button>
                  )}
                  {hasPermission('delete_admins') && (
                    <button onClick={() => handleDelete(a.id)} title={getText('delete')}>
                      <Trash2 size={16} color="var(--color-danger)" />
                    </button>
                  )}
                  {activeType === 3 && hasPermission('edit_admins') && (
                    <button onClick={() => fetchPermissions(a.id)} title={getText('permissionsManageTitle')}>
                      <Settings size={16} /> {getText('permissionsManageTitle')}
                    </button>
                  )}
                  {activeType === 2 && hasPermission('edit_admins') && (
                    <button onClick={() => openGroupModal(a)} title={getText('groups')}>
                      <Settings size={16} /> {getText('groups')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showGroupModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h3>{groupModalAdmin?.username} — {getText('assignedGroupsTitle')}</h3>
              <div className={styles.form}>
                {allGuruhlar.length === 0 ? (
                  <p>{getText('groupsNotFound')}</p>
                ) : (
                  allGuruhlar.map((g) => (
                    <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={assignedGroups.some((ag) => ag.group_id === g.id)}
                        onChange={() => toggleGroupAssignment(g.id)}
                      />
                      {g.name}
                    </label>
                  ))
                )}
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowGroupModal(false)}><X size={16} /> {getText('close')}</button>
              </div>
            </div>
          </div>
        )}

        {showPermissionModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h3>{getText('permissionsManageTitle')} (ID: {selectedAdminId})</h3>
              <PermissionTable
                permissions={permissions}
                setPermissions={setPermissions}
                onSave={handleSavePermissions}
                onClose={() => setShowPermissionModal(false)}
              />
            </div>
          </div>
        )}

        {hasPermission('create_admins') && (
          <button className={styles.addBtn} onClick={handleOpenCreate}>
            <Plus size={16} /> {getText('add')} {getText('admins')}
          </button>
        )}

        {showAdminModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h3>{selectedAdmin ? getText('edit') + ' ' + getText('admins') : getText('add') + ' ' + getText('admins')}</h3>
              <form onSubmit={handleSaveAdmin} className={styles.form}>
                <input
                  placeholder={getText('usernamePlaceholder')}
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
                <input
                  placeholder={getText('colPhone')}
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  required
                />
                <input
                  type="password"
                  placeholder={getText('password')}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!selectedAdmin}
                />
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: parseInt(e.target.value) })}
                >
                  <option value={1}>{getText('role.superAdmin')}</option>
                  <option value={2}>{getText('role.teacher')}</option>
                  <option value={3}>{getText('role.extraAdmin')}</option>
                </select>
                <label>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  {getText('colActiveStatus')}
                </label>
                <div className={styles.modalActions}>
                  <button type="submit"><Save size={16} /> {getText('save')}</button>
                  <button type="button" onClick={() => setShowAdminModal(false)}><X size={16} /> {getText('cancel')}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </LayoutComponent>
  );
}
