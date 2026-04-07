"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import { api, formatVND, type Medicine, type Category } from "../../../lib/api";

export default function AdminProductsPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [form, setForm] = useState({ name: "", generic_name: "", category_id: "", requires_prescription: false, price: 0, stock_qty: 0, packaging_type: "", description: "", image_url: "", origin_doc_url: "" });

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) { router.push("/login"); return; }
    Promise.all([
      api.adminGetMedicines().then(d => setMedicines(d.data || [])),
      api.getCategories().then(d => setCategories(d.data || [])),
    ]).finally(() => setLoading(false));
  }, [isLoggedIn, isAdmin, router]);

  const handleSave = async () => {
    try {
      if (editing) {
        await api.adminUpdateMedicine(editing.id, form);
      } else {
        await api.adminCreateMedicine(form);
      }
      const data = await api.adminGetMedicines();
      setMedicines(data.data || []);
      setShowForm(false);
      setEditing(null);
      setForm({ name: "", generic_name: "", category_id: "", requires_prescription: false, price: 0, stock_qty: 0, packaging_type: "", description: "", image_url: "", origin_doc_url: "" });
    } catch (err) { console.error(err); }
  };

  const handleEdit = (med: Medicine) => {
    setEditing(med);
    setForm({ name: med.name, generic_name: med.generic_name, category_id: med.category_id, requires_prescription: med.requires_prescription, price: med.price, stock_qty: med.stock_qty, packaging_type: med.packaging_type, description: med.description, image_url: med.image_url, origin_doc_url: med.origin_doc_url });
    setShowForm(true);
  };

  const handleToggle = async (id: string) => {
    await api.adminToggleMedicine(id);
    const data = await api.adminGetMedicines();
    setMedicines(data.data || []);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-slate-900 text-white"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between items-center h-16"><Link href="/admin" className="flex items-center space-x-3"><div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center"><span className="font-bold tracking-tighter text-sm">HP</span></div><span className="font-semibold text-lg">Admin — Sản phẩm</span></Link></div></div></nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 hover:text-slate-700">← Dashboard</Link>
          </div>
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: "", generic_name: "", category_id: categories[0]?.id || "", requires_prescription: false, price: 0, stock_qty: 0, packaging_type: "", description: "", image_url: "", origin_doc_url: "" }); }}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600">+ Thêm sản phẩm</button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-8">
            <h2 className="font-bold text-lg mb-4">{editing ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <input placeholder="Tên thuốc" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              <input placeholder="Tên gốc (generic)" value={form.generic_name} onChange={e => setForm(f => ({ ...f, generic_name: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-xl text-sm">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="Giá (VNĐ)" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              <input placeholder="Tồn kho" type="number" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: parseInt(e.target.value) || 0 }))} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              <input placeholder="Đóng gói" value={form.packaging_type} onChange={e => setForm(f => ({ ...f, packaging_type: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requires_prescription} onChange={e => setForm(f => ({ ...f, requires_prescription: e.target.checked }))} className="accent-emerald-500" /> Cần đơn thuốc</label>
            </div>
            <textarea placeholder="Mô tả" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm mb-4 resize-none" />
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium">Lưu</button>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-6 py-2 text-slate-500 text-sm">Hủy</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-12"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Sản phẩm</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Danh mục</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Giá</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Tồn kho</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Trạng thái</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {medicines.map(med => (
                  <tr key={med.id} className={`hover:bg-slate-50 ${!med.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{med.name}</p>
                      <p className="text-xs text-slate-500">{med.generic_name}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{med.category?.name}</td>
                    <td className="px-4 py-4 text-right font-medium">{formatVND(med.price)}</td>
                    <td className="px-4 py-4 text-right"><span className={med.stock_qty < 10 ? 'text-red-600 font-bold' : ''}>{med.stock_qty}</span></td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${med.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {med.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleEdit(med)} className="text-emerald-600 hover:text-emerald-700 font-medium">Sửa</button>
                      <button onClick={() => handleToggle(med.id)} className="text-slate-500 hover:text-red-500 font-medium">{med.is_active ? 'Tắt' : 'Bật'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
