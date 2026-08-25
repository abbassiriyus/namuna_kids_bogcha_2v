"use client";

import { useEffect } from 'react';
import axios from 'axios';

export default function AxiosSetup() {
  useEffect(() => {
    try {
      // axios.defaults.baseURL QO'YILMAYDI: barcha chaqiruvlar allaqachon
      // host/host.js dagi url bilan yoziladi, ya'ni '/api' prefiksi ularda bor.
      // Bu yerda ham qo'yilsa, axios uni ikkinchi marta qo'shib /api/api/...
      // hosil qilardi va login 404 qaytarardi.
      axios.defaults.timeout = 20000;
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('AxiosSetup init error', e);
    }
  }, []);

  return null;
}
