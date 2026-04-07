"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../lib/auth-context";
import { useCart } from "../lib/cart-context";

export default function Navbar() {
  const { user, logout, isAdmin, isLoggedIn } = useAuth();
  const { count } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-white font-bold tracking-tighter text-xs">HP</span>
            </div>
            <span className="font-semibold text-xl tracking-tight text-slate-800">Happy Pharmacy</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-emerald-500 transition-colors">Trang chủ</Link>
            <Link href="/prescriptions" className="hover:text-emerald-500 transition-colors">Đơn thuốc</Link>
            {isLoggedIn && <Link href="/orders" className="hover:text-emerald-500 transition-colors">Đơn hàng</Link>}
            {isLoggedIn && <Link href="/subscriptions" className="hover:text-emerald-500 transition-colors">Đăng ký định kỳ</Link>}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            {/* Cart */}
            <Link href="/cart" className="relative text-slate-600 hover:text-emerald-500 transition-colors p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-in zoom-in">
                  {count}
                </span>
              )}
            </Link>

            {isAdmin && (
              <Link href="/admin" className="hidden sm:inline-flex px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors shadow-sm">
                Admin
              </Link>
            )}

            {isLoggedIn ? (
              <div className="flex items-center space-x-2">
                <Link href="/profile" className="hidden sm:inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-emerald-500 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs">
                    {user?.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                </Link>
                <button onClick={logout} className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
                  Đăng xuất
                </button>
              </div>
            ) : (
              <Link href="/login" className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
                Đăng nhập
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-slate-100 mt-2 pt-4 space-y-3 animate-in slide-in-from-top-5 duration-200">
            <Link href="/" onClick={() => setMobileOpen(false)} className="block text-slate-600 hover:text-emerald-500 font-medium">Trang chủ</Link>
            <Link href="/prescriptions" onClick={() => setMobileOpen(false)} className="block text-slate-600 hover:text-emerald-500 font-medium">Đơn thuốc</Link>
            {isLoggedIn && <Link href="/orders" onClick={() => setMobileOpen(false)} className="block text-slate-600 hover:text-emerald-500 font-medium">Đơn hàng</Link>}
            {isLoggedIn && <Link href="/subscriptions" onClick={() => setMobileOpen(false)} className="block text-slate-600 hover:text-emerald-500 font-medium">Đăng ký định kỳ</Link>}
            {isLoggedIn && <Link href="/profile" onClick={() => setMobileOpen(false)} className="block text-slate-600 hover:text-emerald-500 font-medium">Tài khoản</Link>}
            {isAdmin && <Link href="/admin" onClick={() => setMobileOpen(false)} className="block text-emerald-600 font-semibold">Admin Dashboard</Link>}
          </div>
        )}
      </div>
    </nav>
  );
}
