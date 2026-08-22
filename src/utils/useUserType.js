'use client';

import { useEffect, useState } from 'react';

/**
 * localStorage'dagi foydalanuvchi turini ("1" = superadmin) xavfsiz o'qiydi.
 *
 * To'g'ridan-to'g'ri render ichida `localStorage.getItem('type')` o'qish
 * hydration xatosiga olib keladi: serverda `window` yo'q (natija `null`),
 * clientdagi birinchi renderda esa haqiqiy qiymat qaytadi va React ikki xil
 * HTML ko'radi. Shu sababli qiymat faqat mount bo'lgandan keyin o'qiladi.
 */
export function useUserType() {
  const [type, setType] = useState(null);

  useEffect(() => {
    setType(localStorage.getItem('type'));
  }, []);

  return { type, isSuperAdmin: type === '1' };
}

export default useUserType;
