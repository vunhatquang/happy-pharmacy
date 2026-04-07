"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [formData, setFormData] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(formData);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="block">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-xl flex items-center justify-center hover:scale-105 transition-transform">
            <span className="text-white text-2xl font-bold tracking-tighter">HP</span>
          </div>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">Tạo tài khoản</h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Đã có tài khoản? <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors">Đăng nhập</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-4 shadow-xl shadow-emerald-900/5 sm:rounded-[2rem] sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleRegister}>
            {error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-slate-700">Họ tên</label>
              <input name="full_name" type="text" required onChange={handleChange}
                className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm" placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input name="email" type="email" required onChange={handleChange}
                className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Số điện thoại</label>
              <input name="phone" type="text" required onChange={handleChange}
                className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm" placeholder="0901 234 567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
              <input name="password" type="password" required minLength={6} onChange={handleChange}
                className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm" placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all">
              {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
