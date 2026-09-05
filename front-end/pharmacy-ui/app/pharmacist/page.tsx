"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VideoCall from "../../components/VideoCall";
import { useAuth } from "../../lib/auth-context";
import {
  api,
  formatVND,
  type Consultation,
  type Medicine,
  type PharmacistProfile,
} from "../../lib/api";

const POLL_MS = 3000;

export default function PharmacistConsolePage() {
  const router = useRouter();
  const { user, isPharmacist, isLoggedIn, isLoading, logout } = useAuth();

  const [profile, setProfile] = useState<PharmacistProfile | null>(null);
  const [queue, setQueue] = useState<Consultation[]>([]);
  const [active, setActive] = useState<Consultation | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  // Recommendation form
  const [search, setSearch] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.push("/login"); return; }
    if (!isPharmacist) { router.push("/"); return; }
    setReady(true);
  }, [isLoggedIn, isPharmacist, isLoading, router]);

  // Medicine catalogue for the recommendation picker — fetched once.
  useEffect(() => {
    if (!ready) return;
    api.getMedicines().then(r => setMedicines(r.data || [])).catch(() => {});
  }, [ready]);

  const poll = useCallback(async () => {
    try {
      const [me, q, act] = await Promise.all([
        api.pharmacistGetProfile(),
        api.pharmacistGetQueue(),
        api.pharmacistGetActive(),
      ]);
      setProfile(me.data);
      setQueue(q.data || []);
      setActive(act.data);
    } catch {
      // Keep last good state during transient polling failures.
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [ready, poll]);

  const runAction = async (fn: () => Promise<unknown>, fallbackMsg: string) => {
    setError("");
    setBusy(true);
    try {
      await fn();
      await poll();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackMsg);
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = () => {
    const next = profile?.status === "available" ? "offline" : "available";
    runAction(() => api.pharmacistSetStatus(next), "Không thể đổi trạng thái");
  };

  const claimNext = () => runAction(() => api.pharmacistClaimNext(), "Không thể nhận khách");

  const complete = () => {
    if (!active) return;
    if (!confirm("Kết thúc buổi tư vấn này?")) return;
    runAction(async () => {
      await api.pharmacistComplete(active.id, note);
      setNote("");
    }, "Không thể kết thúc buổi tư vấn");
  };

  const recommend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !selectedMedicine) return;
    runAction(async () => {
      await api.pharmacistRecommend(active.id, {
        medicine_id: selectedMedicine,
        quantity,
        note,
      });
      setSelectedMedicine("");
      setQuantity(1);
      setNote("");
      setSearch("");
    }, "Không thể đề xuất thuốc");
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOnline = profile?.status === "available";
  const inCall = profile?.status === "in_call";
  const filteredMedicines = search
    ? medicines.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : medicines;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <nav className="bg-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
                <span className="font-bold tracking-tighter text-sm">HP</span>
              </div>
              <span className="font-semibold text-lg tracking-tight">Cổng dược sĩ</span>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-400">DS. {user?.full_name}</span>
              <button
                onClick={() => { logout(); router.push("/"); }}
                className="text-sm bg-slate-800 px-3 py-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Status bar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${
              inCall ? "bg-amber-500 animate-pulse" : isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
            }`} />
            <div>
              <p className="font-semibold text-slate-800">
                {inCall ? "Đang tư vấn" : isOnline ? "Đang trực tuyến" : "Ngoại tuyến"}
              </p>
              <p className="text-sm text-slate-500">
                {queue.length} khách đang chờ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleStatus}
              disabled={busy || inCall}
              className={`px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isOnline
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-emerald-500 text-white hover:bg-emerald-600"
              }`}
            >
              {isOnline ? "Chuyển sang ngoại tuyến" : "Bắt đầu trực"}
            </button>

            {!active && isOnline && (
              <button
                onClick={claimNext}
                disabled={busy || queue.length === 0}
                className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                Nhận khách tiếp theo
              </button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {active ? (
              <>
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="font-bold text-slate-800 text-lg">
                        {active.customer?.full_name || "Khách hàng"}
                      </h2>
                      <p className="text-sm text-slate-500">{active.customer?.phone}</p>
                    </div>
                    <button
                      onClick={complete}
                      disabled={busy}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      Kết thúc tư vấn
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 mb-5">
                    <p className="text-xs font-medium text-slate-500 mb-1">Khách cần tư vấn về:</p>
                    <p className="text-sm text-slate-700">{active.topic}</p>
                  </div>

                  <VideoCall roomName={active.room_name} displayName={`DS. ${user?.full_name}`} />
                </div>

                {/* Recommendation form */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h3 className="font-bold text-slate-800 mb-1">Đề xuất thuốc</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Thuốc được đề xuất sẽ tự động thêm vào giỏ hàng của khách.
                  </p>

                  <form onSubmit={recommend} className="space-y-4">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Tìm thuốc theo tên..."
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    />

                    <select
                      value={selectedMedicine}
                      onChange={(e) => setSelectedMedicine(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    >
                      <option value="">— Chọn thuốc —</option>
                      {filteredMedicines.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {formatVND(m.price)} (còn {m.stock_qty})
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-4">
                      <div className="w-32">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Số lượng</label>
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Hướng dẫn dùng (tuỳ chọn)
                        </label>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Ví dụ: Uống 1 viên sau ăn, ngày 2 lần"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={busy || !selectedMedicine}
                      className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Thêm vào giỏ hàng của khách
                    </button>
                  </form>

                  {(active.recommendations?.length ?? 0) > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <p className="text-sm font-medium text-slate-700 mb-3">
                        Đã đề xuất ({active.recommendations?.length})
                      </p>
                      <div className="space-y-2">
                        {active.recommendations?.map(rec => (
                          <div key={rec.id} className="flex justify-between items-start gap-4 p-3 bg-slate-50 rounded-xl text-sm">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800">{rec.medicine?.name}</p>
                              {rec.note && <p className="text-slate-500 mt-0.5">{rec.note}</p>}
                            </div>
                            <span className="text-slate-600 whitespace-nowrap">×{rec.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <div className="text-5xl mb-4">🩺</div>
                <h2 className="font-bold text-slate-800 text-lg mb-2">Chưa có buổi tư vấn nào</h2>
                <p className="text-slate-500">
                  {!isOnline
                    ? "Bật trạng thái trực tuyến để bắt đầu nhận khách."
                    : queue.length > 0
                      ? "Nhấn \"Nhận khách tiếp theo\" để bắt đầu."
                      : "Đang chờ khách hàng vào hàng chờ."}
                </p>
              </div>
            )}
          </div>

          {/* Queue sidebar */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 h-fit">
            <h3 className="font-bold text-slate-800 mb-4">
              Hàng chờ ({queue.length})
            </h3>
            {queue.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Không có khách đang chờ</p>
            ) : (
              <div className="space-y-3">
                {queue.map((item, i) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {item.customer?.full_name || "Khách hàng"}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-3">{item.topic}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(item.created_at).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
