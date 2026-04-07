"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { api, formatVND, type Subscription, type Medicine, type Address } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

export default function SubscriptionsPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState({ medicine_id: "", address_id: "", frequency: "monthly", quantity: 1 });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) { router.push("/login"); return; }
    api.getSubscriptions().then(d => setSubscriptions(d.data || [])).finally(() => setLoading(false));
  }, [isLoggedIn, router]);

  const openCreate = async () => {
    setShowCreate(true);
    const [meds, addrs] = await Promise.all([api.getMedicines(), api.getAddresses()]);
    setMedicines((meds.data || []).filter(m => !m.requires_prescription));
    setAddresses(addrs.data || []);
    if (meds.data?.length) setForm(f => ({ ...f, medicine_id: meds.data[0].id }));
    if (addrs.data?.length) setForm(f => ({ ...f, address_id: addrs.data[0].id }));
  };

  const handleCreate = async () => {
    if (!form.medicine_id || !form.address_id) return;
    setCreating(true);
    try {
      await api.createSubscription(form);
      const data = await api.getSubscriptions();
      setSubscriptions(data.data || []);
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (id: string) => {
    await api.cancelSubscription(id);
    const data = await api.getSubscriptions();
    setSubscriptions(data.data || []);
  };

  const handleReactivate = async (id: string) => {
    await api.reactivateSubscription(id);
    const data = await api.getSubscriptions();
    setSubscriptions(data.data || []);
  };

  const freqLabels: Record<string, string> = { weekly: "Hàng tuần", monthly: "Hàng tháng" };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Đăng ký định kỳ</h1>
              <p className="text-slate-500 mt-1">Tự động đặt lại thuốc bạn dùng thường xuyên</p>
            </div>
            <button onClick={openCreate} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-teal-600 transition-all">
              + Đăng ký mới
            </button>
          </div>

          {/* Create Form */}
          {showCreate && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-8">
              <h2 className="font-bold text-lg text-slate-800 mb-4">Tạo đăng ký mới</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Thuốc</label>
                  <select value={form.medicine_id} onChange={e => setForm(f => ({ ...f, medicine_id: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
                    {medicines.map(m => <option key={m.id} value={m.id}>{m.name} — {formatVND(m.price)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ giao</label>
                  <select value={form.address_id} onChange={e => setForm(f => ({ ...f, address_id: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
                    {addresses.map(a => <option key={a.id} value={a.id}>{a.label === "home" ? "Nhà" : "VP"}: {a.street}, {a.district}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tần suất</label>
                  <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
                    <option value="weekly">Hàng tuần</option>
                    <option value="monthly">Hàng tháng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số lượng</label>
                  <input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={creating} className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {creating ? "Đang tạo..." : "Tạo đăng ký"}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-6 py-2 text-slate-500 text-sm">Hủy</button>
              </div>
            </div>
          )}

          {/* Subscriptions List */}
          {loading ? (
            <div className="flex justify-center p-12"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : subscriptions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center">
              <div className="text-6xl mb-4">🔄</div>
              <p className="text-slate-500 text-lg mb-2">Chưa có đăng ký nào</p>
              <p className="text-sm text-slate-400">Đăng ký để tự động nhận thuốc theo lịch</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map(sub => (
                <div key={sub.id} className={`bg-white rounded-2xl border p-6 ${sub.is_active ? "border-slate-100" : "border-slate-100 opacity-60"}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl">💊</div>
                      <div>
                        <p className="font-semibold text-slate-800">{sub.medicine?.name}</p>
                        <p className="text-sm text-slate-500">Số lượng: {sub.quantity} • {freqLabels[sub.frequency]}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Giao tại: {sub.address?.street}, {sub.address?.district}
                        </p>
                        <p className="text-xs mt-1">
                          {sub.is_active ? (
                            <span className="text-emerald-600">Lần giao tiếp theo: {new Date(sub.next_order_at).toLocaleDateString("vi-VN")}</span>
                          ) : (
                            <span className="text-slate-400">Đã tạm dừng</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.is_active ? (
                        <>
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Đang hoạt động</span>
                          <button onClick={() => handleCancel(sub.id)} className="text-sm text-red-500 hover:text-red-600 font-medium">Tạm dừng</button>
                        </>
                      ) : (
                        <button onClick={() => handleReactivate(sub.id)} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">Kích hoạt lại</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
