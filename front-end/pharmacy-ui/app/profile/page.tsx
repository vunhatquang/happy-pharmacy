"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { api, type Address } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ full_name: "", phone: "" });
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "home", street: "", ward: "", district: "", city: "TP. Hồ Chí Minh", is_default: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) { router.push("/login"); return; }
    setProfileData({ full_name: user?.full_name || "", phone: user?.phone || "" });
    api.getAddresses().then(d => setAddresses(d.data || []));
  }, [isLoggedIn, router, user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile(profileData);
      setEditingProfile(false);
    } finally { setSaving(false); }
  };

  const handleAddAddress = async () => {
    setSaving(true);
    try {
      const res = await api.createAddress(newAddress);
      setAddresses(prev => [...prev, res.data]);
      setShowAddAddress(false);
      setNewAddress({ label: "home", street: "", ward: "", district: "", city: "TP. Hồ Chí Minh", is_default: false });
    } finally { setSaving(false); }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa địa chỉ này?")) return;
    await api.deleteAddress(id);
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-8">Tài khoản</h1>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-lg text-slate-800">Thông tin cá nhân</h2>
              <button onClick={() => setEditingProfile(!editingProfile)} className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
                {editingProfile ? "Hủy" : "Chỉnh sửa"}
              </button>
            </div>

            {editingProfile ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Họ tên</label>
                  <input value={profileData.full_name} onChange={e => setProfileData(p => ({ ...p, full_name: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                  <input value={profileData.phone} onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <button onClick={handleSaveProfile} disabled={saving} className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xl font-bold">
                    {user?.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{user?.full_name}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                    <p className="text-sm text-slate-500">{user?.phone}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Addresses */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-lg text-slate-800">Địa chỉ giao hàng</h2>
              <button onClick={() => setShowAddAddress(!showAddAddress)} className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
                {showAddAddress ? "Hủy" : "+ Thêm địa chỉ"}
              </button>
            </div>

            {showAddAddress && (
              <div className="p-4 bg-slate-50 rounded-xl mb-4 space-y-3">
                <select value={newAddress.label} onChange={e => setNewAddress(p => ({ ...p, label: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="home">🏠 Nhà riêng</option>
                  <option value="work">🏢 Công ty</option>
                </select>
                <input placeholder="Địa chỉ" value={newAddress.street} onChange={e => setNewAddress(p => ({ ...p, street: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Phường/Xã" value={newAddress.ward} onChange={e => setNewAddress(p => ({ ...p, ward: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                  <input placeholder="Quận/Huyện" value={newAddress.district} onChange={e => setNewAddress(p => ({ ...p, district: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <input placeholder="Tỉnh/Thành phố" value={newAddress.city} onChange={e => setNewAddress(p => ({ ...p, city: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={newAddress.is_default} onChange={e => setNewAddress(p => ({ ...p, is_default: e.target.checked }))} className="accent-emerald-500" />
                  Đặt làm địa chỉ mặc định
                </label>
                <button onClick={handleAddAddress} disabled={saving} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium">Lưu địa chỉ</button>
              </div>
            )}

            {addresses.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">Chưa có địa chỉ nào</p>
            ) : (
              <div className="space-y-3">
                {addresses.map(addr => (
                  <div key={addr.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="font-medium text-slate-800">{addr.label === "home" ? "🏠 Nhà riêng" : "🏢 Công ty"} {addr.is_default && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-1">Mặc định</span>}</p>
                      <p className="text-sm text-slate-500 mt-1">{addr.street}, {addr.ward}, {addr.district}, {addr.city}</p>
                    </div>
                    <button onClick={() => handleDeleteAddress(addr.id)} className="text-slate-400 hover:text-red-500 transition-colors text-sm">Xóa</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
