import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminForm({ onSaved, editData }) {
  const [form, setForm] = useState({
    username: '',
    phone_number: '',
    type: 1,
    description: '',
    password: '',
    is_active: false,
  });

  useEffect(() => {
    if (editData) setForm(editData);
  }, [editData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editData) {
        await axios.put(`/api/admin/${editData.id}`, form);
      } else {
        await axios.post('/api/admin', form);
      }
      onSaved();
      setForm({ username: '', phone_number: '', type: 1, description: '', password: '', is_active: false });
    } catch (err) {
      alert(err.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8 }}>
      <input name="username" value={form.username} onChange={handleChange} placeholder="Username" required />
      <input name="phone_number" value={form.phone_number} onChange={handleChange} placeholder="Phone Number" required />
      <input type="number" name="type" value={form.type} onChange={handleChange} min={1} max={3} placeholder="Type (1-3)" />
      <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" />
      <input name="password" value={form.password} onChange={handleChange} placeholder="Password" required />
      <label>
        <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
        Active
      </label>
      <button type="submit">{editData ? 'Update' : 'Create'}</button>
    </form>
  );
}
