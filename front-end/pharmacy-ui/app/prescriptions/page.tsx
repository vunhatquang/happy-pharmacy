"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { api, type Prescription } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Đang chờ duyệt", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Đã duyệt", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Từ chối", color: "bg-red-100 text-red-700" },
};

export default function PrescriptionsPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [doctorName, setDoctorName] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) { router.push("/login"); return; }
    api.getPrescriptions().then(d => setPrescriptions(d.data || [])).finally(() => setLoading(false));
  }, [isLoggedIn, router]);

  const handleUpload = async () => {
    if (!file) { setError("Vui lòng chọn ảnh đơn thuốc"); return; }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("prescription_image", file);
      if (doctorName) formData.append("doctor_name", doctorName);
      if (hospitalName) formData.append("hospital_name", hospitalName);
      await api.uploadPrescription(formData);
      // Refresh list
      const data = await api.getPrescriptions();
      setPrescriptions(data.data || []);
      setShowUpload(false);
      setFile(null);
      setDoctorName("");
      setHospitalName("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Tải lên thất bại");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800">Đơn thuốc</h1>
            <button onClick={() => setShowUpload(!showUpload)} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-teal-600 transition-all">
              {showUpload ? "Hủy" : "📷 Tải đơn thuốc"}
            </button>
          </div>

          {/* Upload Form */}
          {showUpload && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-8">
              <h2 className="font-bold text-lg text-slate-800 mb-4">Tải ảnh đơn thuốc</h2>
              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

              <div className="mb-4">
                <label className="block w-full p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center cursor-pointer hover:border-emerald-500 transition-colors">
                  <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
                  {file ? (
                    <div>
                      <p className="text-emerald-600 font-medium">📎 {file.name}</p>
                      <p className="text-sm text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="text-slate-500">Nhấn để chọn ảnh đơn thuốc</p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG — tối đa 10MB</p>
                    </div>
                  )}
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên bác sĩ (tùy chọn)</label>
                  <input value={doctorName} onChange={e => setDoctorName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Bs. Nguyễn Văn B" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bệnh viện (tùy chọn)</label>
                  <input value={hospitalName} onChange={e => setHospitalName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Bệnh viện Chợ Rẫy" />
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-4">💡 AI sẽ tự động trích xuất thông tin từ đơn thuốc. Bạn có thể điền thêm thông tin để hỗ trợ quá trình xử lý.</p>

              <button onClick={handleUpload} disabled={uploading || !file} className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-all">
                {uploading ? "Đang tải lên..." : "Gửi đơn thuốc"}
              </button>
            </div>
          )}

          {/* Prescriptions List */}
          {loading ? (
            <div className="flex justify-center p-12"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : prescriptions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-slate-500 text-lg mb-2">Chưa có đơn thuốc nào</p>
              <p className="text-sm text-slate-400">Tải ảnh đơn thuốc để bắt đầu đặt thuốc theo đơn</p>
            </div>
          ) : (
            <div className="space-y-4">
              {prescriptions.map(rx => {
                const status = statusLabels[rx.status] || { label: rx.status, color: "bg-slate-100 text-slate-700" };
                return (
                  <div key={rx.id} className="bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">📋</div>
                        <div>
                          <p className="font-medium text-slate-800">Đơn thuốc #{rx.id.slice(0, 8).toUpperCase()}</p>
                          {rx.doctor_name && <p className="text-sm text-slate-500">Bác sĩ: {rx.doctor_name}</p>}
                          {rx.hospital_name && <p className="text-sm text-slate-500">Bệnh viện: {rx.hospital_name}</p>}
                          <p className="text-xs text-slate-400 mt-1">{new Date(rx.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>{status.label}</span>
                    </div>
                  </div>
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
