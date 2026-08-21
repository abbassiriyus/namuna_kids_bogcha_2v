"use client";

import { useEffect } from 'react';
import axios from 'axios';
import url from '../host/host';

export default function AxiosSetup() {
  useEffect(() => {
    try {
      axios.defaults.baseURL = url;
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
