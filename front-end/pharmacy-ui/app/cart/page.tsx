"use client";

import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { useCart } from "../../lib/cart-context";
import { formatVND } from "../../lib/api";

export default function CartPage() {
  const { items, total, isLoading, updateItem, removeItem, clearCart } = useCart();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-8">Giỏ hàng</h1>

          {items.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-slate-500 text-lg mb-4">Giỏ hàng trống</p>
              <Link href="/" className="inline-flex px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">
                Tiếp tục mua sắm
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">💊</div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/medicines/${item.medicine_id}`} className="font-semibold text-slate-800 hover:text-emerald-600 transition-colors">
                        {item.medicine.name}
                      </Link>
                      <p className="text-sm text-slate-500">{item.medicine.packaging_type}</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{formatVND(item.medicine.price)}</p>
                    </div>
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                      <button onClick={() => item.quantity > 1 ? updateItem(item.id, item.quantity - 1) : removeItem(item.id)} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-50 text-sm">−</button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateItem(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-50 text-sm">+</button>
                    </div>
                    <p className="font-bold text-slate-900 w-24 text-right">{formatVND(item.medicine.price * item.quantity)}</p>
                    <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                <button onClick={() => { if (confirm("Bạn có chắc muốn xóa toàn bộ giỏ hàng?")) clearCart(); }} className="text-sm text-red-500 hover:text-red-600 font-medium">Xóa giỏ hàng</button>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 h-fit sticky top-24">
                <h3 className="font-bold text-lg text-slate-800 mb-4">Tóm tắt đơn hàng</h3>
                <div className="space-y-3 border-b border-slate-100 pb-4 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Tạm tính ({items.length} sản phẩm)</span>
                    <span className="font-medium">{formatVND(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Phí vận chuyển</span>
                    <span className="font-medium text-emerald-600">Miễn phí</span>
                  </div>
                </div>
                <div className="flex justify-between items-center mb-6">
                  <span className="font-bold text-lg text-slate-800">Tổng cộng</span>
                  <span className="font-bold text-xl text-slate-900">{formatVND(total)}</span>
                </div>
                <Link href="/checkout" className="block w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-center rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all">
                  Thanh toán
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
