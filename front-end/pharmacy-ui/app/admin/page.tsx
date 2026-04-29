"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, formatVND } from "../../lib/api";
import AdminLayout from "../../components/AdminLayout";

export default function AdminDashboard() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminGetStats()
      .then((d) => { const r = d as { data: Record<string, number> }; setStats(r.data || r as unknown as Record<string, number>); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Đơn thuốc chờ duyệt", value: stats.pending_prescriptions || 0, icon: "📋" },
              { label: "Đơn hàng đang xử lý", value: stats.active_orders || 0, icon: "📦" },
              { label: "Sản phẩm", value: stats.total_medicines || 0, icon: "💊" },
              { label: "Sắp hết hàng", value: stats.low_stock_count || 0, icon: "⚠️" },
              { label: "Doanh thu", value: stats.total_revenue || 0, icon: "💰", isCurrency: true },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stat.isCurrency ? formatVND(stat.value) : stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

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
        </>
      )}
    </AdminLayout>
  );
}
