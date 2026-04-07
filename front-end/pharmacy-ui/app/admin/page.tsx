"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import { api, formatVND } from "../../lib/api";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAdmin, isLoggedIn, logout } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { router.push("/login"); return; }
    if (!isAdmin) { router.push("/"); return; }
    api.adminGetStats().then((d) => { const r = d as { data: Record<string, number> }; setStats(r.data || r as unknown as Record<string, number>); }).finally(() => setLoading(false));
  }, [isLoggedIn, isAdmin, router]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: "📊", active: true },
    { href: "/admin/products", label: "Sản phẩm", icon: "💊" },
    { href: "/admin/orders", label: "Đơn hàng", icon: "📦" },
    { href: "/admin/prescriptions", label: "Đơn thuốc", icon: "📋" },
    { href: "/admin/inventory", label: "Kho hàng", icon: "🏬" },
    { href: "/admin/analytics", label: "Thống kê", icon: "📈" },
  ];

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
              <span className="text-sm text-slate-400">Xin chào, {user?.full_name}</span>
              <button onClick={() => { logout(); router.push("/"); }} className="text-sm bg-slate-800 px-3 py-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors">Đăng xuất</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sub-Nav */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-2">
            {navItems.map(item => (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  item.active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
                }`}>
                <span>{item.icon}</span> {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-8">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Đơn thuốc chờ duyệt", value: stats.pending_prescriptions || 0, icon: "📋", color: "emerald" },
            { label: "Đơn hàng đang xử lý", value: stats.active_orders || 0, icon: "📦", color: "blue" },
            { label: "Sản phẩm", value: stats.total_medicines || 0, icon: "💊", color: "indigo" },
            { label: "Sắp hết hàng", value: stats.low_stock_count || 0, icon: "⚠️", color: "amber" },
            { label: "Doanh thu", value: stats.total_revenue || 0, icon: "💰", color: "emerald", isCurrency: true },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{stat.icon}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full bg-${stat.color}-50 text-${stat.color}-600 font-medium`}>Live</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.isCurrency ? formatVND(stat.value) : stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin/prescriptions" className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl">📋</div>
              <h3 className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">Duyệt đơn thuốc</h3>
            </div>
            <p className="text-sm text-slate-500">Xem và phê duyệt đơn thuốc từ khách hàng</p>
          </Link>
          <Link href="/admin/orders" className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">📦</div>
              <h3 className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">Quản lý đơn hàng</h3>
            </div>
            <p className="text-sm text-slate-500">Cập nhật trạng thái và theo dõi đơn hàng</p>
          </Link>
          <Link href="/admin/inventory" className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-xl">🏬</div>
              <h3 className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">Quản lý kho</h3>
            </div>
            <p className="text-sm text-slate-500">Kiểm tra và cập nhật tồn kho</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
