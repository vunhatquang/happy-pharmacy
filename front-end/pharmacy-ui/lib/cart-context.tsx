"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, type CartItem } from "./api";
import { useAuth } from "./auth-context";

interface CartContextType {
  items: CartItem[];
  total: number;
  count: number;
  isLoading: boolean;
  addToCart: (medicineId: string, quantity?: number) => Promise<void>;
  updateItem: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn) {
      setItems([]);
      setTotal(0);
      setCount(0);
      return;
    }
    try {
      const data = await api.getCart();
      setItems(data.data || []);
      setTotal(data.total || 0);
      setCount(data.count || 0);
    } catch {
      // Silently fail if not logged in
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (medicineId: string, quantity = 1) => {
    setIsLoading(true);
    try {
      await api.addToCart(medicineId, quantity);
      await refreshCart();
    } finally {
      setIsLoading(false);
    }
  };

  const updateItem = async (id: string, quantity: number) => {
    setIsLoading(true);
    try {
      await api.updateCartItem(id, quantity);
      await refreshCart();
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (id: string) => {
    setIsLoading(true);
    try {
      await api.removeFromCart(id);
      await refreshCart();
    } finally {
      setIsLoading(false);
    }
  };

  const clearCartItems = async () => {
    setIsLoading(true);
    try {
      await api.clearCart();
      setItems([]);
      setTotal(0);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{ items, total, count, isLoading, addToCart, updateItem, removeItem, clearCart: clearCartItems, refreshCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
