"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import VideoCall from "../../components/VideoCall";
import { useAuth } from "../../lib/auth-context";
import { useCart } from "../../lib/cart-context";
import { api, formatVND, type Consultation, type ConsultationAvailability } from "../../lib/api";

const POLL_MS = 3000;

export default function ConsultationPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading } = useAuth();
  const { refreshCart } = useCart();

  const [availability, setAvailability] = useState<ConsultationAvailability | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  // Tracks how many recommendations we've seen so the cart only refreshes when
  // the pharmacist actually adds something new.
  const seenRecommendations = useRef(0);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) { router.push("/login"); return; }
    setReady(true);
  }, [isLoggedIn, isLoading, router]);

  const poll = useCallback(async () => {
    try {
      const [avail, active] = await Promise.all([
        api.getConsultationAvailability(),
        api.getActiveConsultation(),
      ]);
      setAvailability(avail.data);
      setConsultation(active.data);
      setQueuePosition(active.queue_position);

      const recCount = active.data?.recommendations?.length ?? 0;
      if (recCount > seenRecommendations.current) {
        seenRecommendations.current = recCount;
        refreshCart();
      }
    } catch {
      // Transient network errors are expected while polling — keep the last
      // good state on screen rather than flashing an error.
    }
  }, [refreshCart]);

  useEffect(() => {
    if (!ready) return;
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [ready, poll]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.joinConsultationQueue(topic);
      setTopic("");
      await poll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể vào hàng chờ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async () => {
    if (!consultation) return;
    if (!confirm("Bạn có chắc muốn rời khỏi hàng chờ?")) return;
    try {
      await api.leaveConsultationQueue(consultation.id);
      setConsultation(null);
      seenRecommendations.current = 0;
      await poll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể rời hàng chờ");
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const recommendations = consultation?.recommendations ?? [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">Tư vấn với dược sĩ</h1>
        <p className="text-slate-500 mb-8">
          Trò chuyện video trực tiếp với dược sĩ của chúng tôi để được tư vấn về thuốc và sức khỏe.
        </p>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Availability banner */}
        {availability && !consultation && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={`w-3 h-3 rounded-full ${availability.is_open ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
              <span className="font-semibold text-slate-800">
                {availability.is_open ? "Dược sĩ đang trực tuyến" : "Hiện không có dược sĩ trực tuyến"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{availability.pharmacists_available}</p>
                <p className="text-xs text-slate-500 mt-1">Dược sĩ sẵn sàng</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{availability.queue_length}</p>
                <p className="text-xs text-slate-500 mt-1">Đang chờ</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">~{availability.estimated_wait_minutes}&apos;</p>
                <p className="text-xs text-slate-500 mt-1">Thời gian chờ</p>
              </div>
            </div>
          </div>
        )}

        {/* Join form */}
        {!consultation && (
          <form onSubmit={handleJoin} className="bg-white rounded-2xl border border-slate-100 p-6">
            <label htmlFor="topic" className="block font-semibold text-slate-800 mb-2">
              Bạn muốn hỏi về vấn đề gì?
            </label>
            <p className="text-sm text-slate-500 mb-3">
              Mô tả ngắn gọn triệu chứng hoặc câu hỏi của bạn để dược sĩ chuẩn bị trước.
            </p>
            <textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              minLength={5}
              maxLength={500}
              rows={4}
              placeholder="Ví dụ: Tôi bị ho khan và đau họng 3 ngày nay, muốn hỏi nên dùng thuốc gì..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
            />
            <button
              type="submit"
              disabled={submitting || !availability?.is_open}
              className="mt-4 w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Đang vào hàng chờ..." : availability?.is_open ? "Vào hàng chờ tư vấn" : "Hiện chưa có dược sĩ trực"}
            </button>
          </form>
        )}

        {/* Waiting in queue */}
        {consultation?.status === "waiting" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Bạn đang trong hàng chờ</h2>
            <p className="text-5xl font-bold text-emerald-600 my-4">#{queuePosition}</p>
            <p className="text-slate-500 mb-2">Vị trí của bạn trong hàng chờ</p>
            <p className="text-sm text-slate-400 mb-6">
              Vui lòng giữ trang này mở. Cuộc gọi sẽ tự động bắt đầu khi đến lượt bạn.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 text-left mb-6">
              <p className="text-xs font-medium text-slate-500 mb-1">Nội dung bạn cần tư vấn:</p>
              <p className="text-sm text-slate-700">{consultation.topic}</p>
            </div>
            <button
              onClick={handleLeave}
              className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
            >
              Rời khỏi hàng chờ
            </button>
          </div>
        )}

        {/* Active call */}
        {consultation?.status === "active" && (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm text-emerald-800">
                Đang tư vấn với <strong>{consultation.pharmacist?.full_name || "dược sĩ"}</strong>
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <VideoCall roomName={consultation.room_name} displayName={user?.full_name} />
            </div>

            {recommendations.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="font-bold text-slate-800 mb-1">Thuốc dược sĩ đề xuất</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Các sản phẩm này đã được thêm vào giỏ hàng của bạn.
                </p>
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="flex justify-between items-start gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">{rec.medicine?.name}</p>
                        <p className="text-sm text-slate-500">Số lượng: {rec.quantity}</p>
                        {rec.note && <p className="text-sm text-emerald-700 mt-1">💡 {rec.note}</p>}
                      </div>
                      <p className="font-semibold text-slate-800 whitespace-nowrap">
                        {formatVND((rec.medicine?.price || 0) * rec.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/cart"
                  className="mt-4 inline-flex px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
                >
                  Xem giỏ hàng
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
