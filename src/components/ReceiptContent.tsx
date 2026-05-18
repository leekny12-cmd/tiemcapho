import React from 'react';
import { OrderItem, Customer, AppSettings } from '../types';

interface ReceiptContentProps {
  cart: OrderItem[];
  customer: Customer | null;
  subtotal: number;
  vat: number;
  discount: number;
  total: number;
  orderId?: string;
  settings?: AppSettings;
  id?: string;
}

const ReceiptContent: React.FC<ReceiptContentProps> = ({ 
  cart, 
  customer, 
  subtotal, 
  vat, 
  discount, 
  total, 
  orderId, 
  settings, 
  id = 'receipt-content' 
}) => {
  const getPaperWidth = () => {
    switch (settings?.paperSize) {
      case '58mm': return 'w-[58mm]';
      case 'A4': return 'w-[210mm]';
      default: return 'w-[80mm]';
    }
  };

  const sections = settings?.receiptSections || ['header', 'customer', 'items', 'summary', 'footer'];

  const renderSection = (section: string) => {
    switch (section) {
      case 'header':
        return (
          <div key="header" className="text-center mb-6">
            {settings?.showLogoOnReceipt && settings?.storeLogoUrl && (
              <div className="flex justify-center mb-4">
                <img src={settings.storeLogoUrl} alt="Logo" className="h-16 w-auto object-contain" referrerPolicy="no-referrer" />
              </div>
            )}
            <h2 className="text-xl font-bold uppercase">{settings?.storeName || 'SalesMaster POS'}</h2>
            <p className="text-xs text-slate-500">Hóa đơn bán hàng</p>
            {settings?.showStoreAddress && settings?.storeAddress && <p className="text-[10px] text-slate-400">{settings.storeAddress}</p>}
            {settings?.showStorePhone && settings?.storePhone && <p className="text-[10px] text-slate-400">SĐT: {settings.storePhone}</p>}
            {orderId && <p className="text-[10px] mt-1">Mã đơn: {orderId}</p>}
            <p className="text-[10px]">{new Date().toLocaleString('vi-VN')}</p>
          </div>
        );
      case 'customer':
        return (
          <div key="customer" className="border-t border-b border-dashed border-slate-300 py-3 mb-4 space-y-1">
            <div className="flex justify-between">
              <span>Khách hàng:</span>
              <span className="font-bold">{customer?.name || 'Khách lẻ'}</span>
            </div>
            {settings?.showCustomerPhone && customer?.phone && (
              <div className="flex justify-between">
                <span>SĐT:</span>
                <span>{customer.phone}</span>
              </div>
            )}
            {settings?.showCustomerAddress && customer?.address && (
              <div className="flex justify-between">
                <span>Địa chỉ:</span>
                <span className="text-right max-w-[150px] truncate">{customer.address}</span>
              </div>
            )}
          </div>
        );
      case 'items':
        return (
          <div key="items" className="space-y-2 mb-6">
            <div className="flex justify-between font-bold border-b border-slate-100 pb-1">
              <span className="flex-[2]">Sản phẩm</span>
              <span className="flex-1 text-center">SL</span>
              <span className="flex-1 text-right">T.Tiền</span>
            </div>
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="flex-[2] truncate">{item.name}</span>
                <span className="flex-1 text-center">x{item.quantity}</span>
                <span className="flex-1 text-right">{(item.price * item.quantity).toLocaleString('vi-VN')}</span>
              </div>
            ))}
          </div>
        );
      case 'summary':
        return (
          <div key="summary" className="border-t border-dashed border-slate-300 pt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Tạm tính:</span>
              <span>{subtotal.toLocaleString('vi-VN')} đ</span>
            </div>
            {vat > 0 && (
              <div className="flex justify-between text-xs">
                <span>VAT:</span>
                <span>{vat.toLocaleString('vi-VN')} đ</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-xs">
                <span>Giảm giá:</span>
                <span>-{discount.toLocaleString('vi-VN')} đ</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-slate-100 mt-2 pt-2">
              <span>TỔNG CỘNG:</span>
              <span>{total.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        );
      case 'footer':
        return (
          <div key="footer" className="text-center mt-8 text-[10px] text-slate-400 italic">
            {settings?.receiptFooter || 'Cảm ơn quý khách. Hẹn gặp lại!'}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div id={id} className={`p-4 md:p-8 bg-white text-slate-800 font-mono text-sm mx-auto shadow-sm ${getPaperWidth()}`}>
      {sections.map(section => renderSection(section))}
    </div>
  );
};

export default ReceiptContent;
