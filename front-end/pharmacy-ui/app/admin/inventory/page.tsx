"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import { api, formatVND, type Medicine } from "../../../lib/api";

export default function AdminInventoryPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [changeQty, setChangeQty] = useState(0);
  const [reason, setReason] = useState("restock");

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) { router.push("/login"); return; }
    api.adminGetInventory().then(d => setMedicines(d.data || [])).finally(() => setLoading(false));
  }, [isLoggedIn, isAdmin, router]);

  const handleUpdateStock = async (id: string) => {
    if (changeQty === 0) return;
    await api.adminUpdateStock(id, { change_qty: changeQty, reason });
    const data = await api.adminGetInventory();
    setMedicines(data.data || []);
    setAdjusting(null);
    setChangeQty(0);
    setReason("restock");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-slate-900 text-white"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between items-center h-16"><Link href="/admin" className="flex items-center space-x-3"><div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center"><span className="font-bold tracking-tighter text-sm">HP</span></div><span className="font-semibold text-lg">Admin — Kho hàng</span></Link></div></div></nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <Link href="/admin" className="text-slate-500 hover:text-slate-700">← Dashboard</Link>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {medicines.map(med => (
              <div key={med.id} className={`bg-white rounded-2xl border p-6 ${med.stock_qty < 10 ? "border-red-200" : "border-slate-100"}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${med.stock_qty < 10 ? "bg-red-50" : "bg-emerald-50"}`}>
                      {med.stock_qty < 10 ? "⚠️" : "💊"}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{med.name}</p>
                      <p className="text-sm text-slate-500">{med.category?.name} • {med.packaging_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${med.stock_qty < 10 ? "text-red-600" : med.stock_qty < 30 ? "text-amber-600" : "text-slate-900"}`}>{med.stock_qty}</p>
                      <p className="text-xs text-slate-400">sản phẩm</p>
                    </div>
                    <button onClick={() => { setAdjusting(adjusting === med.id ? null : med.id); setChangeQty(0); }}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200">
                      {adjusting === med.id ? "Hủy" : "Điều chỉnh"}
                    </button>
                  </div>
                </div>

                {adjusting === med.id && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setChangeQty(changeQty - 1)} className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-50">−</button>
                      <input type="number" value={changeQty} onChange={e => setChangeQty(parseInt(e.target.value) || 0)} className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm text-center" />
                      <button onClick={() => setChangeQty(changeQty + 1)} className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-50">+</button>
                    </div>
                    <select value={reason} onChange={e => setReason(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="restock">Nhập hàng</option>
                      <option value="expired">Hết hạn</option>
                      <option value="damaged">Hư hỏng</option>
                      <option value="adjustment">Điều chỉnh</option>
                    </select>
                    <button onClick={() => handleUpdateStock(med.id)} disabled={changeQty === 0}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">Cập nhật</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
