"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import { api, formatVND, type Order } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

const statusSteps = ["placed", "processing", "shipped", "delivered"];
const stepLabels: Record<string, string> = { placed: "Đã đặt", processing: "Đang xử lý", shipped: "Đang giao", delivered: "Đã giao" };

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { router.push("/login"); return; }
    api.getOrder(params.id as string).then(d => setOrder(d.data)).finally(() => setLoading(false));
  }, [params.id, isLoggedIn, router]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!order) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500">Không tìm thấy đơn hàng</p></div>;

  const currentStep = statusSteps.indexOf(order.status);
  const paymentLabels: Record<string, string> = { cod: "Thanh toán khi nhận hàng", vietqr: "VietQR", card: "Thẻ ngân hàng" };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-8">
            <Link href="/orders" className="hover:text-emerald-500">Đơn hàng</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">#{order.id.slice(0, 8).toUpperCase()}</span>
          </nav>

          {/* Success banner for new orders */}
          {order.status === "placed" && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white flex-shrink-0">✓</div>
              <div>
                <p className="font-semibold text-emerald-800">Đặt hàng thành công!</p>
                <p className="text-sm text-emerald-600">Đơn hàng của bạn đang được xử lý.</p>
              </div>
            </div>
          )}

          {/* Status Timeline */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
            <h2 className="font-bold text-lg text-slate-800 mb-6">Trạng thái đơn hàng</h2>
            <div className="flex items-center justify-between">
              {statusSteps.map((step, i) => (
                <div key={step} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      i <= currentStep ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                    }`}>
                      {i <= currentStep ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${i <= currentStep ? "text-emerald-600" : "text-slate-400"}`}>{stepLabels[step]}</span>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${i < currentStep ? "bg-emerald-500" : "bg-slate-200"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Shipment tracking */}
            {order.shipment && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                <p className="text-sm font-medium text-slate-800">📦 Mã vận đơn: <span className="text-emerald-600">{order.shipment.tracking_code}</span></p>
                <p className="text-sm text-slate-500 mt-1">Đơn vị vận chuyển: {order.shipment.carrier}</p>
                {order.shipment.estimated_delivery && (
                  <p className="text-sm text-slate-500 mt-1">Dự kiến giao: {new Date(order.shipment.estimated_delivery).toLocaleDateString("vi-VN")}</p>
                )}
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
            <h2 className="font-bold text-lg text-slate-800 mb-4">Chi tiết sản phẩm</h2>
            <div className="space-y-4">
              {(order.items || []).map(item => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl">💊</div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{item.medicine?.name}</p>
                    <p className="text-sm text-slate-500">x{item.quantity}</p>
                  </div>
                  <p className="font-bold text-slate-900">{formatVND(item.unit_price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 mt-4 pt-4 flex justify-between items-center">
              <span className="font-bold text-lg text-slate-800">Tổng cộng</span>
              <span className="font-bold text-xl text-slate-900">{formatVND(order.total_amount)}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="font-bold text-lg text-slate-800 mb-4">Thông tin thanh toán</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Phương thức:</span> <span className="font-medium ml-1">{paymentLabels[order.payment_method] || order.payment_method}</span></div>
              <div><span className="text-slate-500">Trạng thái:</span> <span className={`font-medium ml-1 ${order.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>{order.payment_status === "paid" ? "Đã thanh toán" : "Chờ thanh toán"}</span></div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
