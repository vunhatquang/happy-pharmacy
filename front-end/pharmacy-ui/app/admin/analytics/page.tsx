"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import { api, formatVND } from "../../../lib/api";

interface AnalyticsData {
  top_products: { medicine_name: string; total_qty: number; total_revenue: number }[];
  daily_sales: { date: string; order_count: number; revenue: number }[];
  order_by_status: { status: string; count: number }[];
}

const statusLabels: Record<string, string> = { placed: "Đã đặt", processing: "Đang xử lý", shipped: "Đang giao", delivered: "Đã giao" };

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) { router.push("/login"); return; }
    api.adminGetAnalytics().then(d => setData(d as AnalyticsData)).finally(() => setLoading(false));
  }, [isLoggedIn, isAdmin, router]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-slate-900 text-white"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between items-center h-16"><Link href="/admin" className="flex items-center space-x-3"><div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center"><span className="font-bold tracking-tighter text-sm">HP</span></div><span className="font-semibold text-lg">Admin — Thống kê</span></Link></div></div></nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin" className="text-slate-500 hover:text-slate-700 mb-6 inline-block">← Dashboard</Link>

        {loading ? (
          <div className="flex justify-center p-12"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : !data ? (
          <div className="text-center text-slate-500 p-12">Không có dữ liệu</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Status Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-bold text-lg text-slate-800 mb-4">📊 Đơn hàng theo trạng thái</h2>
              {(data.order_by_status || []).length === 0 ? (
                <p className="text-slate-400 text-sm">Chưa có dữ liệu</p>
              ) : (
                <div className="space-y-3">
                  {data.order_by_status.map(item => {
                    const total = data.order_by_status.reduce((s, i) => s + i.count, 0);
                    const pct = total > 0 ? (item.count / total) * 100 : 0;
                    return (
                      <div key={item.status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">{statusLabels[item.status] || item.status}</span>
                          <span className="font-medium">{item.count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-bold text-lg text-slate-800 mb-4">🏆 Sản phẩm bán chạy</h2>
              {(data.top_products || []).length === 0 ? (
                <p className="text-slate-400 text-sm">Chưa có dữ liệu</p>
              ) : (
                <div className="space-y-4">
                  {data.top_products.map((p, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i < 3 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                      }`}>{i + 1}</div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{p.medicine_name}</p>
                        <p className="text-xs text-slate-500">{p.total_qty} đã bán</p>
                      </div>
                      <p className="font-bold text-slate-900">{formatVND(p.total_revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Sales */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:col-span-2">
              <h2 className="font-bold text-lg text-slate-800 mb-4">📈 Doanh thu 30 ngày</h2>
              {(data.daily_sales || []).length === 0 ? (
                <p className="text-slate-400 text-sm">Chưa có dữ liệu đơn hàng</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-1 h-40 min-w-[600px]">
                    {data.daily_sales.map((day, i) => {
                      const maxRev = Math.max(...data.daily_sales.map(d => d.revenue));
                      const height = maxRev > 0 ? (day.revenue / maxRev) * 100 : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group" title={`${day.date}: ${formatVND(day.revenue)}`}>
                          <div className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-sm transition-all group-hover:from-emerald-600 group-hover:to-teal-500" style={{ height: `${Math.max(height, 2)}%` }} />
                          {i % 5 === 0 && <span className="text-[9px] text-slate-400 mt-1 rotate-45">{day.date.slice(5)}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
