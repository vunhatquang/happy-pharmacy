"use client";

import { useEffect, useState } from "react";
import { api, type Prescription } from "../../../lib/api";
import AdminLayout from "../../../components/AdminLayout";

export default function AdminPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    loadPrescriptions("pending");
  }, []);

  const loadPrescriptions = (status?: string) => {
    setLoading(true);
    api.adminGetPrescriptions(status).then(d => setPrescriptions(d.data || [])).finally(() => setLoading(false));
  };

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    const message = status === 'rejected' ? "Bạn có chắc muốn từ chối đơn thuốc này?" : "Xác nhận phê duyệt đơn thuốc này?";
    if (!confirm(message)) return;
    await api.adminReviewPrescription(id, status);
    loadPrescriptions(filter || undefined);
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "Chờ duyệt", color: "bg-amber-100 text-amber-700" },
    approved: { label: "Đã duyệt", color: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Từ chối", color: "bg-red-100 text-red-700" },
  };

  return (
    <AdminLayout title="Duyệt đơn thuốc">
      <div className="flex justify-between items-center mb-6">
        <div />
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected', ''].map(s => (
            <button key={s} onClick={() => { setFilter(s); loadPrescriptions(s || undefined); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === s ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
              {s ? statusLabels[s]?.label : 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">Không có đơn thuốc nào</div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map(rx => {
            const status = statusLabels[rx.status] || { label: rx.status, color: "bg-slate-100" };
            return (
              <div key={rx.id} className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-3xl">📋</div>
                    <div>
                      <p className="font-semibold text-slate-800">Đơn thuốc #{rx.id.slice(0, 8).toUpperCase()}</p>
                      {rx.doctor_name && <p className="text-sm text-slate-500">Bác sĩ: {rx.doctor_name}</p>}
                      {rx.hospital_name && <p className="text-sm text-slate-500">Bệnh viện: {rx.hospital_name}</p>}
                      <p className="text-xs text-slate-400 mt-1">{new Date(rx.created_at).toLocaleDateString("vi-VN")}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>{status.label}</span>
                </div>

                {rx.image_url && (
                  <div className="mb-4">
                    <a href={`http://localhost:8080${rx.image_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:underline">📎 Xem ảnh đơn thuốc</a>
                  </div>
                )}

                {rx.status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button onClick={() => handleReview(rx.id, "approved")} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600">✓ Phê duyệt</button>
                    <button onClick={() => handleReview(rx.id, "rejected")} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100">✕ Từ chối</button>
                  </div>
                )}

                {rx.reviewed_at && (
                  <p className="text-xs text-slate-400 pt-2">Duyệt lúc: {new Date(rx.reviewed_at).toLocaleDateString("vi-VN")}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
