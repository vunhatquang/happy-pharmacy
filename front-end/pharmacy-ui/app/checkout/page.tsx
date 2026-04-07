"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { api, formatVND, type Address } from "../../lib/api";
import { useCart } from "../../lib/cart-context";
import { useAuth } from "../../lib/auth-context";

export default function CheckoutPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { items, total, refreshCart } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "home", street: "", ward: "", district: "", city: "TP. Hồ Chí Minh", is_default: true });

  useEffect(() => {
    if (!isLoggedIn) { router.push("/login"); return; }
    api.getAddresses().then(d => {
      setAddresses(d.data || []);
      const def = (d.data || []).find((a: Address) => a.is_default);
      if (def) setSelectedAddress(def.id);
      else if (d.data?.length) setSelectedAddress(d.data[0].id);
    });
  }, [isLoggedIn, router]);

  const handleAddAddress = async () => {
    try {
      const res = await api.createAddress(newAddress);
      setAddresses(prev => [...prev, res.data]);
      setSelectedAddress(res.data.id);
      setShowAddAddress(false);
      setNewAddress({ label: "home", street: "", ward: "", district: "", city: "TP. Hồ Chí Minh", is_default: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể thêm địa chỉ");
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { setError("Vui lòng chọn địa chỉ giao hàng"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await api.createOrder({ address_id: selectedAddress, payment_method: paymentMethod, notes });
      await refreshCart();
      router.push(`/orders/${res.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đặt hàng thất bại");
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { id: "cod", name: "Thanh toán khi nhận hàng", desc: "Trả tiền mặt khi nhận hàng", icon: "💵" },
    { id: "vietqr", name: "VietQR", desc: "Chuyển khoản qua mã QR", icon: "📱" },
    { id: "card", name: "Thẻ ngân hàng", desc: "Visa, Mastercard, JCB", icon: "💳" },
  ];

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 text-lg mb-4">Giỏ hàng trống</p>
            <button onClick={() => router.push("/")} className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium">Tiếp tục mua sắm</button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-8">Thanh toán</h1>

          {error && <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="font-bold text-lg text-slate-800 mb-4">📍 Địa chỉ giao hàng</h2>
                {addresses.length === 0 && !showAddAddress ? (
                  <div className="text-center py-6">
                    <p className="text-slate-500 mb-3">Bạn chưa có địa chỉ nào</p>
                    <button onClick={() => setShowAddAddress(true)} className="text-emerald-600 font-medium hover:text-emerald-700">+ Thêm địa chỉ mới</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map(addr => (
                      <label key={addr.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedAddress === addr.id ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 hover:border-slate-200"}`}>
                        <input type="radio" name="address" checked={selectedAddress === addr.id} onChange={() => setSelectedAddress(addr.id)} className="mt-1 accent-emerald-500" />
                        <div>
                          <p className="font-medium text-slate-800">{addr.label === "home" ? "🏠 Nhà riêng" : "🏢 Công ty"}</p>
                          <p className="text-sm text-slate-500">{addr.street}, {addr.ward}, {addr.district}, {addr.city}</p>
                        </div>
                      </label>
                    ))}
                    {!showAddAddress && (
                      <button onClick={() => setShowAddAddress(true)} className="text-sm text-emerald-600 font-medium hover:text-emerald-700">+ Thêm địa chỉ mới</button>
                    )}
                  </div>
                )}

                {showAddAddress && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl space-y-3">
                    <select value={newAddress.label} onChange={e => setNewAddress(p => ({ ...p, label: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="home">🏠 Nhà riêng</option>
                      <option value="work">🏢 Công ty</option>
                    </select>
                    <input placeholder="Địa chỉ (số nhà, đường)" value={newAddress.street} onChange={e => setNewAddress(p => ({ ...p, street: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Phường/Xã" value={newAddress.ward} onChange={e => setNewAddress(p => ({ ...p, ward: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <input placeholder="Quận/Huyện" value={newAddress.district} onChange={e => setNewAddress(p => ({ ...p, district: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <input placeholder="Tỉnh/Thành phố" value={newAddress.city} onChange={e => setNewAddress(p => ({ ...p, city: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    <div className="flex gap-2">
                      <button onClick={handleAddAddress} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium">Lưu</button>
                      <button onClick={() => setShowAddAddress(false)} className="px-4 py-2 text-slate-500 text-sm">Hủy</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="font-bold text-lg text-slate-800 mb-4">💳 Phương thức thanh toán</h2>
                <div className="space-y-3">
                  {paymentMethods.map(pm => (
                    <label key={pm.id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${paymentMethod === pm.id ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 hover:border-slate-200"}`}>
                      <input type="radio" name="payment" checked={paymentMethod === pm.id} onChange={() => setPaymentMethod(pm.id)} className="accent-emerald-500" />
                      <span className="text-2xl">{pm.icon}</span>
                      <div>
                        <p className="font-medium text-slate-800">{pm.name}</p>
                        <p className="text-xs text-slate-500">{pm.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="font-bold text-lg text-slate-800 mb-4">📝 Ghi chú</h2>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú cho đơn hàng (tùy chọn)" rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 h-fit sticky top-24">
              <h3 className="font-bold text-lg text-slate-800 mb-4">Đơn hàng ({items.length} sản phẩm)</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{item.medicine.name}</p>
                      <p className="text-slate-400">x{item.quantity}</p>
                    </div>
                    <p className="font-medium ml-4">{formatVND(item.medicine.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Tạm tính</span><span>{formatVND(total)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Phí vận chuyển</span><span className="text-emerald-600">Miễn phí</span></div>
              </div>
              <div className="border-t border-slate-100 mt-4 pt-4 flex justify-between items-center mb-6">
                <span className="font-bold text-lg">Tổng cộng</span>
                <span className="font-bold text-xl text-slate-900">{formatVND(total)}</span>
              </div>
              <button onClick={handlePlaceOrder} disabled={loading || !selectedAddress}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50">
                {loading ? "Đang xử lý..." : "Đặt hàng"}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
