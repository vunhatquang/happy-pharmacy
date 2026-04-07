"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import { api, formatVND, type Medicine } from "../../../lib/api";
import { useCart } from "../../../lib/cart-context";
import { useAuth } from "../../../lib/auth-context";

export default function MedicineDetail() {
  const params = useParams();
  const id = params.id as string;
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    api.getMedicine(id).then(d => setMedicine(d.data)).finally(() => setLoading(false));
  }, [id]);

  const handleAdd = async () => {
    if (!isLoggedIn) { window.location.href = "/login"; return; }
    await addToCart(medicine!.id, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!medicine) return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center"><p className="text-slate-500">Không tìm thấy sản phẩm</p></div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-8">
            <Link href="/" className="hover:text-emerald-500">Trang chủ</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">{medicine.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Image */}
            <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-3xl p-12 flex items-center justify-center min-h-[400px]">
              <div className="text-[120px]">💊</div>
            </div>

            {/* Info */}
            <div>
              {medicine.requires_prescription && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
                  ⚠️ Cần đơn thuốc
                </span>
              )}

              <p className="text-emerald-500 text-sm font-bold uppercase tracking-wider mb-1">{medicine.generic_name}</p>
              <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{medicine.name}</h1>
              <p className="text-slate-500 mb-1">{medicine.category?.name}</p>

              <div className="flex items-baseline gap-2 mt-4 mb-6">
                <span className="text-3xl font-bold text-slate-900">{formatVND(medicine.price)}</span>
                <span className="text-sm text-slate-400">/ {medicine.packaging_type}</span>
              </div>

              <p className="text-slate-600 leading-relaxed mb-6">{medicine.description}</p>

              {/* Stock */}
              <div className="flex items-center gap-2 mb-6">
                {medicine.stock_qty > 0 ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm text-emerald-600 font-medium">Còn hàng ({medicine.stock_qty})</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm text-red-600 font-medium">Hết hàng</span>
                  </>
                )}
              </div>

              {/* Quantity + Add to Cart */}
              {medicine.stock_qty > 0 && (
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50">−</button>
                    <span className="w-12 text-center font-semibold">{qty}</span>
                    <button onClick={() => setQty(Math.min(medicine.stock_qty, qty + 1))} className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50">+</button>
                  </div>
                  <button onClick={handleAdd} disabled={added}
                    className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${added ? "bg-emerald-600" : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"}`}>
                    {added ? "✓ Đã thêm vào giỏ" : "Thêm vào giỏ hàng"}
                  </button>
                </div>
              )}

              {/* Details */}
              <div className="border-t border-slate-100 pt-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Đóng gói:</span>
                  <span className="font-medium text-slate-800">{medicine.packaging_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Danh mục:</span>
                  <span className="font-medium text-slate-800">{medicine.category?.name}</span>
                </div>
                {medicine.origin_doc_url && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Chứng nhận nguồn gốc:</span>
                    <a href={medicine.origin_doc_url} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-600 hover:underline">Xem tài liệu</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
