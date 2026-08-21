// CartContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cartCount, setCartCount] = useState(0);
useEffect(()=>{
    if (localStorage.getItem('shop')) {
      setCartCount((JSON.parse(localStorage.getItem('shop'))).length)  
    }
    
})
    return (
        <CartContext.Provider value={{ cartCount, setCartCount }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);