import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { AppSettings } from '../types';
import { Save, Store, MapPin, Phone, FileText, CheckCircle2, Image as ImageIcon, Upload, X, Printer, Settings2, Plus, ArrowUp, ArrowDown, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import ReceiptContent from '../components/ReceiptContent';

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    storeName: 'SalesMaster POS',
    storeLogoUrl: '',
    storeAddress: '',
    storePhone: '',
    receiptFooter: 'Cảm ơn quý khách. Hẹn gặp lại!',
    paperSize: '80mm',
    autoPrint: false,
    showLogoOnReceipt: true,
    showCustomerPhone: true,
    showCustomerAddress: true,
    showStoreAddress: true,
    showStorePhone: true,
    receiptSections: ['header', 'customer', 'items', 'summary', 'footer']
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          storeName: data.storeName || 'SalesMaster POS',
          storeLogoUrl: data.storeLogoUrl || '',
          storeAddress: data.storeAddress || '',
          storePhone: data.storePhone || '',
          receiptFooter: data.receiptFooter || 'Cảm ơn quý khách. Hẹn gặp lại!',
          paperSize: data.paperSize || '80mm',
          autoPrint: data.autoPrint ?? false,
          showLogoOnReceipt: data.showLogoOnReceipt ?? true,
          showCustomerPhone: data.showCustomerPhone ?? true,
          showCustomerAddress: data.showCustomerAddress ?? true,
          showStoreAddress: data.showStoreAddress ?? true,
          showStorePhone: data.showStorePhone ?? true,
          receiptSections: data.receiptSections || ['header', 'customer', 'items', 'summary', 'footer']
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), settings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, storeLogoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Cấu hình hệ thống</h2>
        <p className="text-slate-500">Quản lý thông tin cửa hàng và hóa đơn</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Store size={20} className="text-emerald-600" />
              Thông tin cửa hàng
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
              <div className="relative group">
                <div className="w-32 h-32 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-300 overflow-hidden shadow-sm">
                  {settings.storeLogoUrl ? (
                    <img src={settings.storeLogoUrl} alt="Store Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon size={48} />
                  )}
                </div>
                {settings.storeLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, storeLogoUrl: '' })}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="text-center">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                  <Upload size={16} />
                  Tải lên Logo
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </label>
                <p className="mt-2 text-xs text-slate-400">Định dạng: JPG, PNG. Kích thước khuyên dùng: 200x200px</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Tên cửa hàng (Hiển thị trên hóa đơn)</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={settings.storeName}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Số điện thoại</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={settings.storePhone}
                  onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })}
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-700">Địa chỉ</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                <textarea
                  rows={2}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={settings.storeAddress}
                  onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Printer size={20} className="text-emerald-600" />
              Cấu hình máy in
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Khổ giấy in</label>
                <select
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={settings.paperSize}
                  onChange={(e) => setSettings({ ...settings, paperSize: e.target.value as any })}
                >
                  <option value="80mm">Khổ 80mm (Máy in nhiệt K80)</option>
                  <option value="58mm">Khổ 58mm (Máy in nhiệt K58)</option>
                  <option value="A4">Khổ A4 (Máy in văn phòng)</option>
                </select>
              </div>

              <div className="space-y-4 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={settings.autoPrint}
                      onChange={(e) => setSettings({ ...settings, autoPrint: e.target.checked })}
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors ${settings.autoPrint ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.autoPrint ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Tự động mở hộp thoại in sau khi thanh toán</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={settings.showLogoOnReceipt}
                      onChange={(e) => setSettings({ ...settings, showLogoOnReceipt: e.target.checked })}
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors ${settings.showLogoOnReceipt ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showLogoOnReceipt ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Hiển thị Logo trên hóa đơn</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Printer size={20} className="text-emerald-600" />
                Cấu hình hóa đơn
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Hiển thị thông tin</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'showStoreAddress', label: 'Địa chỉ cửa hàng' },
                      { key: 'showStorePhone', label: 'Số điện thoại cửa hàng' },
                      { key: 'showCustomerPhone', label: 'Số điện thoại khách hàng' },
                      { key: 'showCustomerAddress', label: 'Địa chỉ khách hàng' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={(settings as any)[item.key]}
                            onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                          />
                          <div className={`w-10 h-5 rounded-full transition-colors ${(settings as any)[item.key] ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${(settings as any)[item.key] ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                        <span className="text-sm text-slate-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Thứ tự hiển thị</h4>
                  <div className="space-y-2">
                    {settings.receiptSections?.map((section, index) => (
                      <div key={section} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => {
                              const newSections = [...(settings.receiptSections || [])];
                              [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
                              setSettings({ ...settings, receiptSections: newSections });
                            }}
                            className="p-0.5 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-30"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={index === (settings.receiptSections?.length || 0) - 1}
                            onClick={() => {
                              const newSections = [...(settings.receiptSections || [])];
                              [newSections[index + 1], newSections[index]] = [newSections[index], newSections[index + 1]];
                              setSettings({ ...settings, receiptSections: newSections });
                            }}
                            className="p-0.5 hover:bg-slate-200 rounded text-slate-400 disabled:opacity-30"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                        <span className="text-xs font-medium text-slate-700 flex-1">
                          {section === 'header' && 'Cửa hàng'}
                          {section === 'customer' && 'Khách hàng'}
                          {section === 'items' && 'Sản phẩm'}
                          {section === 'summary' && 'Tổng cộng'}
                          {section === 'footer' && 'Chân trang'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Lời chào cuối hóa đơn</label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                  value={settings.receiptFooter}
                  onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Eye size={20} className="text-emerald-600" />
                Xem trước
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bản xem trước</span>
            </div>
            <div className="p-6 bg-slate-100 flex-1 flex justify-center items-start overflow-y-auto min-h-[400px]">
              <div className="shadow-xl">
                <ReceiptContent
                  settings={settings}
                  cart={[
                    { productId: '1', name: 'Sản phẩm mẫu 1', price: 150000, quantity: 2 },
                    { productId: '2', name: 'Sản phẩm mẫu 2', price: 85000, quantity: 1 }
                  ]}
                  customer={{
                    id: '1',
                    name: 'Nguyễn Văn A',
                    phone: '0987654321',
                    address: '123 Đường ABC, Quận 1, TP.HCM',
                    email: 'a@example.com',
                    totalSpent: 1000000,
                    orderCount: 5,
                    createdAt: new Date().toISOString()
                  }}
                  subtotal={385000}
                  vat={38500}
                  discount={20000}
                  total={403500}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-emerald-600 font-medium"
            >
              <CheckCircle2 size={20} />
              Đã lưu thành công
            </motion.div>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save size={20} />
            {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </form>
    </div>
  );
}
