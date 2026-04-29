"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/products", label: "Sản phẩm", icon: "💊" },
  { href: "/admin/orders", label: "Đơn hàng", icon: "📦" },
  { href: "/admin/prescriptions", label: "Đơn thuốc", icon: "📋" },
  { href: "/admin/inventory", label: "Kho hàng", icon: "🏬" },
  { href: "/admin/analytics", label: "Thống kê", icon: "📈" },
];

export default function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, isLoggedIn, logout } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) { router.push("/login"); return; }
    if (!isAdmin) { router.push("/"); return; }
    setReady(true);
  }, [isLoggedIn, isAdmin, router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
                <span className="font-bold tracking-tighter text-sm">HP</span>
              </div>
              <span className="font-semibold text-lg tracking-tight">Admin Portal</span>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-400">Xin chào, {user?.full_name || "Admin"}</span>
              <button onClick={() => { logout(); router.push("/"); }} className="text-sm bg-slate-800 px-3 py-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-2">
            {navItems.map(item => (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  pathname === item.href ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
                }`}>
                <span>{item.icon}</span> {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-8">{title}</h1>
        {children}
      </main>
    </div>
  );
}
