import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center">
                <span className="text-white font-bold tracking-tighter text-xs">HP</span>
              </div>
              <span className="font-semibold text-lg text-white">Happy Pharmacy</span>
            </div>
            <p className="text-sm leading-relaxed">
              Nhà thuốc trực tuyến đáng tin cậy của gia đình bạn. Giao hàng nhanh chóng trên toàn Việt Nam.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Liên kết nhanh</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-emerald-400 transition-colors">Trang chủ</Link></li>
              <li><Link href="/prescriptions" className="hover:text-emerald-400 transition-colors">Đơn thuốc</Link></li>
              <li><Link href="/orders" className="hover:text-emerald-400 transition-colors">Đơn hàng</Link></li>
              <li><Link href="/subscriptions" className="hover:text-emerald-400 transition-colors">Đăng ký định kỳ</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Liên hệ</h4>
            <ul className="space-y-2 text-sm">
              <li>📍 123 Đường Nguyễn Huệ, Q.1, TP.HCM</li>
              <li>📞 (028) 1234-5678</li>
              <li>✉️ contact@happypharmacy.vn</li>
            </ul>
          </div>

          {/* Payment Methods */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Thanh toán</h4>
            <div className="flex flex-wrap gap-2">
              <span className="bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium">VietQR</span>
              <span className="bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium">MoMo</span>
              <span className="bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium">VNPAY</span>
              <span className="bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium">COD</span>
              <span className="bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium">Visa/MC</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm">
          <p>© 2026 Happy Pharmacy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
