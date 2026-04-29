"use client";

import { useEffect, useState } from "react";
import { api, formatVND, type Order } from "../../../lib/api";
import AdminLayout from "../../../components/AdminLayout";

const statusOptions = ["placed", "processing", "shipped", "delivered"];
const statusLabels: Record<string, string> = { placed: "Đã đặt", processing: "Đang xử lý", shipped: "Đang giao", delivered: "Đã giao", pending_approval: "Chờ duyệt" };
const statusColors: Record<string, string> = { placed: "bg-blue-100 text-blue-700", processing: "bg-indigo-100 text-indigo-700", shipped: "bg-purple-100 text-purple-700", delivered: "bg-emerald-100 text-emerald-700", pending_approval: "bg-amber-100 text-amber-700" };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = (status?: string) => {
    setLoading(true);
    api.adminGetOrders(status).then(d => setOrders(d.data || [])).finally(() => setLoading(false));
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await api.adminUpdateOrder(orderId, { status: newStatus });
    loadOrders(filter || undefined);
  };

  const handlePaymentStatus = async (orderId: string) => {
    if (!confirm("Xác nhận đã thanh toán cho đơn hàng này?")) return;
    await api.adminUpdateOrder(orderId, { payment_status: "paid" });
    loadOrders(filter || undefined);
  };

  return (
    <AdminLayout title="Quản lý đơn hàng">
      <div className="flex justify-between items-center mb-6">
        <div />
        <div className="flex gap-2">
          <button onClick={() => { setFilter(""); loadOrders(); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!filter ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>Tất cả</button>
          {statusOptions.map(s => (
            <button key={s} onClick={() => { setFilter(s); loadOrders(s); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === s ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>{statusLabels[s]}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">Không có đơn hàng nào</div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-semibold text-slate-800">Đơn #{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[order.status] || 'bg-slate-100'}`}>{statusLabels[order.status] || order.status}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {order.payment_status === 'paid' ? 'Đã TT' : 'Chờ TT'}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="text-sm text-slate-600 mb-4">
                {(order.items || []).map(item => (
                  <span key={item.id} className="inline-block mr-3">{item.medicine?.name} x{item.quantity}</span>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <p className="font-bold text-slate-900">{formatVND(order.total_amount)}</p>
                <div className="flex items-center gap-2">
                  {order.payment_status !== 'paid' && (
                    <button onClick={() => handlePaymentStatus(order.id)} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-100">Xác nhận TT</button>
                  )}
                  {order.status !== 'delivered' && (
                    <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs">
                      {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
