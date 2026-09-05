"use client";

import { useEffect, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { api, type Consultation, type PharmacistProfile } from "../../../lib/api";

const statusLabels: Record<string, { label: string; color: string }> = {
  offline: { label: "Ngoại tuyến", color: "bg-slate-100 text-slate-600" },
  available: { label: "Đang trực", color: "bg-emerald-100 text-emerald-700" },
  in_call: { label: "Đang tư vấn", color: "bg-amber-100 text-amber-700" },
};

const consultationLabels: Record<string, { label: string; color: string }> = {
  waiting: { label: "Đang chờ", color: "bg-amber-100 text-amber-700" },
  active: { label: "Đang diễn ra", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Hoàn thành", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Đã huỷ", color: "bg-red-100 text-red-700" },
};

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  license_number: "",
  specialization: "",
  years_experience: 0,
};

export default function AdminPharmacistsPage() {
  const [pharmacists, setPharmacists] = useState<PharmacistProfile[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.adminGetPharmacists(), api.adminGetConsultations()])
      .then(([p, c]) => {
        setPharmacists(p.data || []);
        setConsultations(c.data || []);
      })
      .catch(err => setError(err instanceof Error ? err.message : "Không tải được dữ liệu"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.adminCreatePharmacist(form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo tài khoản dược sĩ");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: key === "years_experience" ? Number(e.target.value) : e.target.value });

  const inputClass =
    "w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none";

  return (
    <AdminLayout title="Dược sĩ & Tư vấn">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <p className="text-slate-500 text-sm">{pharmacists.length} dược sĩ</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors"
        >
          {showForm ? "Đóng" : "+ Thêm dược sĩ"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-100 p-6 mb-8">
          <h3 className="font-bold text-slate-800 mb-4">Tạo tài khoản dược sĩ</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Họ tên *</label>
              <input required value={form.full_name} onChange={set("full_name")} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={set("email")} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Số điện thoại</label>
              <input value={form.phone} onChange={set("phone")} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Mật khẩu * (tối thiểu 6 ký tự)</label>
              <input required type="password" minLength={6} value={form.password} onChange={set("password")} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Số chứng chỉ hành nghề *</label>
              <input required value={form.license_number} onChange={set("license_number")} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Chuyên môn</label>
              <input value={form.specialization} onChange={set("specialization")} placeholder="Ví dụ: Dược lâm sàng" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Số năm kinh nghiệm</label>
              <input type="number" min={0} value={form.years_experience} onChange={set("years_experience")} className={inputClass} />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-5 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 disabled:bg-slate-300 transition-colors"
          >
            {submitting ? "Đang tạo..." : "Tạo tài khoản"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Pharmacists */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">Dược sĩ</th>
                    <th className="text-left px-6 py-3 font-medium">Chứng chỉ</th>
                    <th className="text-left px-6 py-3 font-medium">Chuyên môn</th>
                    <th className="text-left px-6 py-3 font-medium">Kinh nghiệm</th>
                    <th className="text-left px-6 py-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pharmacists.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-500">
                        Chưa có dược sĩ nào
                      </td>
                    </tr>
                  ) : (
                    pharmacists.map(p => {
                      const s = statusLabels[p.status] || { label: p.status, color: "bg-slate-100" };
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-800">{p.user?.full_name}</p>
                            <p className="text-slate-500 text-xs">{p.user?.email}</p>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{p.license_number}</td>
                          <td className="px-6 py-4 text-slate-600">{p.specialization || "—"}</td>
                          <td className="px-6 py-4 text-slate-600">{p.years_experience} năm</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.color}`}>{s.label}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Consultation history */}
          <h2 className="text-xl font-bold text-slate-800 mb-4">Lịch sử tư vấn ({consultations.length})</h2>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">Khách hàng</th>
                    <th className="text-left px-6 py-3 font-medium">Dược sĩ</th>
                    <th className="text-left px-6 py-3 font-medium">Nội dung</th>
                    <th className="text-left px-6 py-3 font-medium">Đề xuất</th>
                    <th className="text-left px-6 py-3 font-medium">Trạng thái</th>
                    <th className="text-left px-6 py-3 font-medium">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consultations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500">
                        Chưa có buổi tư vấn nào
                      </td>
                    </tr>
                  ) : (
                    consultations.map(cs => {
                      const s = consultationLabels[cs.status] || { label: cs.status, color: "bg-slate-100" };
                      return (
                        <tr key={cs.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-800">{cs.customer?.full_name || "—"}</td>
                          <td className="px-6 py-4 text-slate-600">{cs.pharmacist?.full_name || "—"}</td>
                          <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{cs.topic}</td>
                          <td className="px-6 py-4 text-slate-600">{cs.recommendations?.length || 0} thuốc</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.color}`}>{s.label}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-xs">
                            {new Date(cs.created_at).toLocaleString("vi-VN")}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
