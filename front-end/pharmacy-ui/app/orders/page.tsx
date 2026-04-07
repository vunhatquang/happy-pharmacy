"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { api, formatVND, type Order } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending_approval: { label: "Chờ duyệt đơn thuốc", color: "bg-amber-100 text-amber-700" },
  placed: { label: "Đã đặt hàng", color: "bg-blue-100 text-blue-700" },
  processing: { label: "Đang xử lý", color: "bg-indigo-100 text-indigo-700" },
  shipped: { label: "Đang giao", color: "bg-purple-100 text-purple-700" },
  delivered: { label: "Đã giao", color: "bg-emerald-100 text-emerald-700" },
};

export default function OrdersPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { router.push("/login"); return; }
    api.getOrders().then(d => setOrders(d.data || [])).finally(() => setLoading(false));
  }, [isLoggedIn, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-8">Đơn hàng của tôi</h1>

          {loading ? (
            <div className="flex justify-center p-12"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <p className="text-slate-500 text-lg mb-4">Bạn chưa có đơn hàng nào</p>
              <Link href="/" className="inline-flex px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">Bắt đầu mua sắm</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => {
                const status = statusLabels[order.status] || { label: order.status, color: "bg-slate-100 text-slate-700" };
                return (
                  <Link key={order.id} href={`/orders/${order.id}`} className="block bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm text-slate-500">Đơn hàng #{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(order.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>{status.label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(order.items || []).slice(0, 3).map((item, i) => (
                          <div key={i} className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-lg">💊</div>
                        ))}
                        {(order.items || []).length > 3 && <span className="text-sm text-slate-400">+{order.items.length - 3}</span>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">{(order.items || []).length} sản phẩm</p>
                        <p className="font-bold text-slate-900">{formatVND(order.total_amount)}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
