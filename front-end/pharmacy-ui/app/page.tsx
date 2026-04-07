"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ChatAssistant from "../components/ChatAssistant";
import { api, formatVND, type Medicine, type Category } from "../lib/api";
import { useCart } from "../lib/cart-context";
import { useAuth } from "../lib/auth-context";

export default function Home() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const { addToCart } = useCart();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    Promise.all([
      api.getMedicines().then(d => setMedicines(d.data || [])),
      api.getCategories().then(d => setCategories(d.data || [])),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      const data = await api.getMedicines();
      setMedicines(data.data || []);
      setSelectedCategory(null);
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchMedicines(searchQuery);
      setMedicines(data.data || []);
      setSelectedCategory(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (slug: string) => {
    if (selectedCategory === slug) {
      setSelectedCategory(null);
      const data = await api.getMedicines();
      setMedicines(data.data || []);
    } else {
      setSelectedCategory(slug);
      setLoading(true);
      try {
        const data = await api.getMedicines(slug);
        setMedicines(data.data || []);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddToCart = async (med: Medicine) => {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    setAddingId(med.id);
    try {
      await addToCart(med.id, 1);
    } finally {
      setTimeout(() => setAddingId(null), 600);
    }
  };

  const categoryIcons: Record<string, string> = {
    "giam-dau": "💊",
    "vitamin": "🍊",
    "cam-cum": "🤧",
    "cham-soc-da": "🧴",
    "tieu-hoa": "🫄",
    "mat-tai": "👁️",
  };

  const filtered = medicines;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Navbar />

      <main className="pt-24 pb-16 flex-1">
        {/* Hero */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-100 via-emerald-50/20 to-slate-50 rounded-[3rem] opacity-70"></div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span className="block text-slate-800">Sức khỏe của bạn,</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">được giao tận tay.</span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-slate-500 mb-8">
            Tư vấn AI thông minh, tải đơn thuốc nhanh chóng, giao hàng mọi nơi tại Việt Nam.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto mb-8">
            <div className="flex rounded-full bg-white shadow-lg shadow-emerald-900/5 border border-slate-200 overflow-hidden">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Tìm thuốc theo tên, thành phần..."
                className="flex-1 px-6 py-4 text-sm focus:outline-none"
              />
              <button
                onClick={handleSearch}
                className="px-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/prescriptions" className="px-8 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-lg hover:shadow-lg hover:scale-105 transform transition-all inline-flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Tải đơn thuốc
            </Link>
            <button onClick={() => document.getElementById("medicines-grid")?.scrollIntoView({ behavior: "smooth" })} className="px-8 py-4 rounded-full bg-white border border-slate-200 text-slate-800 font-semibold text-lg hover:bg-slate-50 hover:shadow-sm transition-all">
              Xem thuốc
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-6">Danh mục</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map(cat => (
              <div
                key={cat.id}
                onClick={() => handleCategoryClick(cat.slug)}
                className={`group relative rounded-2xl p-5 shadow-sm border transition-all cursor-pointer ${
                  selectedCategory === cat.slug
                    ? "bg-emerald-500 border-emerald-500 shadow-emerald-500/30 shadow-lg text-white"
                    : "bg-white border-slate-100 hover:shadow-md hover:border-emerald-200"
                }`}
              >
                <div className="text-3xl mb-3">{categoryIcons[cat.slug] || "💊"}</div>
                <h3 className={`font-semibold text-sm transition-colors ${
                  selectedCategory === cat.slug ? "text-white" : "text-slate-800 group-hover:text-emerald-600"
                }`}>{cat.name}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div id="medicines-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-800">
              {selectedCategory ? categories.find(c => c.slug === selectedCategory)?.name : searchQuery ? `Kết quả: "${searchQuery}"` : "Tất cả sản phẩm"}
            </h2>
            {(selectedCategory || searchQuery) && (
              <button onClick={() => { setSelectedCategory(null); setSearchQuery(""); api.getMedicines().then(d => setMedicines(d.data || [])); }} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                Xóa bộ lọc ✕
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-lg">Không tìm thấy sản phẩm nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map(med => (
                <div key={med.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all group">
                  <Link href={`/medicines/${med.id}`}>
                    <div className="h-48 overflow-hidden bg-gradient-to-br from-slate-50 to-emerald-50/30 p-6 flex items-center justify-center relative">
                      {med.requires_prescription && (
                        <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Cần đơn thuốc</span>
                      )}
                      <div className="text-6xl group-hover:scale-110 transition-transform duration-500">💊</div>
                    </div>
                  </Link>
                  <div className="p-5">
                    <div className="text-emerald-500 text-xs font-bold tracking-wider uppercase mb-1">{med.generic_name}</div>
                    <Link href={`/medicines/${med.id}`}>
                      <h3 className="text-lg font-bold text-slate-800 mb-1 hover:text-emerald-600 transition-colors">{med.name}</h3>
                    </Link>
                    <p className="text-slate-500 text-sm line-clamp-2 mb-3">{med.description}</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">{med.packaging_type}</p>
                        <p className="text-xl font-bold text-slate-900">{formatVND(med.price)}</p>
                      </div>
                      {med.stock_qty > 0 ? (
                        <button
                          onClick={() => handleAddToCart(med)}
                          disabled={addingId === med.id}
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                            addingId === med.id
                              ? "bg-emerald-500 text-white scale-110"
                              : "bg-slate-900 text-white hover:bg-emerald-500"
                          }`}
                        >
                          {addingId === med.id ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-red-500 font-medium">Hết hàng</span>
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
      <ChatAssistant />
    </div>
  );
}
