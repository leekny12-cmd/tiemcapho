import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  increment,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { Product, Customer, OrderItem, AppSettings } from '../types';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  ShoppingCart, 
  CreditCard, 
  CheckCircle2,
  Package,
  Printer,
  X,
  FileText,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import ReceiptContent from '../components/ReceiptContent';

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [vatRate, setVatRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [settings, setSettings] = useState<AppSettings | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastOrderData, setLastOrderData] = useState<{
    cart: OrderItem[],
    customer: Customer | null,
    subtotal: number,
    vat: number,
    discount: number,
    total: number
  } | null>(null);

  useEffect(() => {
    const qProducts = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const qCustomers = query(collection(db, 'customers'), orderBy('name'));
    const unsubscribeCustomers = onSnapshot(qCustomers, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
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

    return () => {
      unsubscribeProducts();
      unsubscribeCustomers();
      unsubscribeSettings();
    };
  }, []);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } 
            : item
        );
      }
      return [...prev, { 
        productId: product.id, 
        name: product.name, 
        price: product.price, 
        quantity: 1 
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const product = products.find(p => p.id === productId);
        const newQty = Math.max(0, item.quantity + delta);
        if (product && newQty > product.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleQuantityInput = (productId: string, value: string) => {
    const newQty = parseInt(value) || 0;
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const product = products.find(p => p.id === productId);
        const validatedQty = Math.max(0, Math.min(newQty, product?.stock || 0));
        return { ...item, quantity: validatedQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handlePriceChange = (productId: string, value: string) => {
    const newPrice = parseFloat(value) || 0;
    setCart(prev => prev.map(item => 
      item.productId === productId ? { ...item, price: newPrice } : item
    ));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vatAmount = (subtotal * vatRate) / 100;
  const totalAmount = subtotal + vatAmount - discount;

  const handlePrint = () => {
    console.log('handlePrint called');
    const printContent = document.getElementById('receipt-print-only') || document.getElementById('receipt-preview-content');
    
    if (!printContent) {
      console.error('Receipt content not found');
      alert('Không tìm thấy nội dung hóa đơn để in. Vui lòng thử lại.');
      return;
    }

    // Direct window.print() is more reliable in most browsers
    // We use CSS to hide everything else and show only the receipt
    window.print();
  };

  const handleExportImage = async () => {
    console.log('handleExportImage called');
    const element = document.getElementById('receipt-print-only') || document.getElementById('receipt-preview-content');
    if (!element) {
      alert('Không tìm thấy nội dung hóa đơn.');
      return;
    }
    
    setIsProcessing(true);
    const isHidden = element.id === 'receipt-print-only';
    let originalStyle = '';
    
    // Ensure element is visible for capture
    if (isHidden && element.parentElement) {
      originalStyle = element.parentElement.style.cssText;
      element.parentElement.style.cssText = 'position: fixed; left: 0; top: 0; z-index: -1; display: block; background: white;';
    }
    
    try {
      // Wait a bit for images to load if any
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: true,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(element.id);
          if (clonedElement && isHidden) {
            clonedElement.style.display = 'block';
            clonedElement.style.position = 'static';
            clonedElement.style.visibility = 'visible';
            clonedElement.style.left = '0';
            clonedElement.style.top = '0';
          }
        }
      });
      
      const link = document.createElement('a');
      link.download = `receipt-${lastOrderId || 'order'}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting image:', error);
      alert('Có lỗi khi xuất ảnh. Vui lòng thử lại.');
    } finally {
      if (isHidden && element.parentElement) {
        element.parentElement.style.cssText = originalStyle;
      }
      setIsProcessing(false);
    }
  };

  const handleExportPDF = async () => {
    console.log('handleExportPDF called');
    const element = document.getElementById('receipt-print-only') || document.getElementById('receipt-preview-content');
    if (!element) {
      alert('Không tìm thấy nội dung hóa đơn.');
      return;
    }
    
    setIsProcessing(true);
    const isHidden = element.id === 'receipt-print-only';
    let originalStyle = '';
    
    // Ensure element is visible for capture
    if (isHidden && element.parentElement) {
      originalStyle = element.parentElement.style.cssText;
      element.parentElement.style.cssText = 'position: fixed; left: 0; top: 0; z-index: -1; display: block; background: white;';
    }
    
    try {
      // Wait a bit for images to load if any
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: true,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(element.id);
          if (clonedElement && isHidden) {
            clonedElement.style.display = 'block';
            clonedElement.style.position = 'static';
            clonedElement.style.visibility = 'visible';
            clonedElement.style.left = '0';
            clonedElement.style.top = '0';
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`receipt-${lastOrderId || 'order'}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Có lỗi khi xuất PDF. Vui lòng thử lại.');
    } finally {
      if (isHidden && element.parentElement) {
        element.parentElement.style.cssText = originalStyle;
      }
      setIsProcessing(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    const batch = writeBatch(db);
    
    try {
      const orderRef = doc(collection(db, 'orders'));
      setLastOrderId(orderRef.id);

      const orderData = {
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || 'Khách lẻ',
        items: cart,
        totalAmount,
        vat: vatAmount,
        discount: discount,
        status: 'completed',
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid
      };
      
      batch.set(orderRef, orderData);

      cart.forEach(item => {
        const productRef = doc(db, 'products', item.productId);
        batch.update(productRef, {
          stock: increment(-item.quantity)
        });
      });

      setLastOrderData({
        cart: [...cart],
        customer: selectedCustomer,
        subtotal,
        vat: vatAmount,
        discount,
        total: totalAmount
      });

      await batch.commit();
      
      setCart([]);
      setSelectedCustomer(null);
      setShowPreview(false);
      setShowSuccess(true);

      if (settings?.autoPrint) {
        setTimeout(() => {
          handlePrint();
        }, 1000);
      }

      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)] no-print">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Bán hàng</h2>
            <div className="text-sm text-slate-500 font-medium">
              {filteredProducts.length} sản phẩm có sẵn
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Tìm sản phẩm theo tên hoặc mã SKU..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <motion.button
              key={product.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => addToCart(product)}
              disabled={product.stock <= 0}
              className={`group relative flex flex-col p-4 bg-white border rounded-2xl text-left transition-all hover:shadow-md ${
                product.stock <= 0 ? 'opacity-50 grayscale cursor-not-allowed border-slate-200' : 'border-slate-200 hover:border-emerald-200'
              }`}
            >
              <div className="w-full aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center text-slate-300 group-hover:text-emerald-200 transition-colors overflow-hidden">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Package size={48} />
                )}
              </div>
              <h3 className="font-semibold text-slate-900 line-clamp-2 mb-1">{product.name}</h3>
              <p className="text-emerald-600 font-bold mt-auto">{product.price.toLocaleString('vi-VN')} đ</p>
              <div className="mt-2 flex items-center justify-between text-xs font-medium">
                <span className="text-slate-400">SKU: {product.sku || 'N/A'}</span>
                <span className={product.stock <= 5 ? 'text-red-500' : 'text-slate-500'}>
                  Kho: {product.stock}
                </span>
              </div>
              {product.stock <= 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl">
                  <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Hết hàng</span>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-[400px] flex flex-col bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <ShoppingCart size={20} className="text-emerald-600" />
            Giỏ hàng
          </div>
          <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
            {cart.reduce((s, i) => s + i.quantity, 0)} món
          </span>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const customer = customers.find(c => c.id === e.target.value);
                setSelectedCustomer(customer || null);
              }}
            >
              <option value="">Khách lẻ</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
              <ShoppingCart size={48} strokeWidth={1} />
              <p className="text-sm">Giỏ hàng đang trống</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl group">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">{item.name}</h4>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-slate-400">Giá:</span>
                    <input
                      type="number"
                      className="w-20 text-xs font-bold text-emerald-600 bg-white border border-slate-200 rounded px-1 focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={item.price}
                      onChange={(e) => handlePriceChange(item.productId, e.target.value)}
                    />
                    <span className="text-[10px] text-slate-400">đ</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                  <button 
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    className="w-12 text-center text-sm font-bold text-slate-900 bg-transparent border-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={item.quantity}
                    onChange={(e) => handleQuantityInput(item.productId, e.target.value)}
                  />
                  <button 
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button 
                  onClick={() => updateQuantity(item.productId, -item.quantity)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <span>Tạm tính</span>
            <span>{subtotal.toLocaleString('vi-VN')} đ</span>
          </div>
          
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <div className="flex items-center gap-2">
              <span>VAT (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                className="w-12 text-center text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded p-1 focus:ring-1 focus:ring-emerald-500 outline-none"
                value={vatRate}
                onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
              />
            </div>
            <span>{vatAmount.toLocaleString('vi-VN')} đ</span>
          </div>

          <div className="flex items-center justify-between text-slate-500 text-sm">
            <div className="flex items-center gap-2">
              <span>Giảm giá</span>
              <input
                type="number"
                min="0"
                className="w-24 text-right text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded p-1 focus:ring-1 focus:ring-emerald-500 outline-none"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <span className="text-red-500">-{discount.toLocaleString('vi-VN')} đ</span>
          </div>

          <div className="flex items-center justify-between text-slate-900 font-bold text-xl pt-2 border-t border-slate-200">
            <span>Tổng cộng</span>
            <span className="text-emerald-600">{totalAmount.toLocaleString('vi-VN')} đ</span>
          </div>
          
          <button
            disabled={cart.length === 0 || isProcessing}
            onClick={() => setShowPreview(true)}
            className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-lg shadow-emerald-100 mt-2"
          >
            <CreditCard size={20} />
            Thanh toán ngay
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-white rounded-[32px] w-full ${settings?.paperSize === 'A4' ? 'max-w-4xl' : 'max-w-md'} shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <FileText size={20} className="text-emerald-600" />
                  Xem trước hóa đơn ({settings?.paperSize || '80mm'})
                </div>
                <button onClick={() => setShowPreview(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-200/50 p-4 md:p-8">
                <div className="shadow-lg mx-auto bg-white print-only">
                  <ReceiptContent 
                    cart={cart} 
                    customer={selectedCustomer} 
                    subtotal={subtotal}
                    vat={vatAmount}
                    discount={discount}
                    total={totalAmount} 
                    settings={settings}
                    id="receipt-preview-content"
                  />
                </div>
              </div>

              <div className="p-6 bg-white border-t border-slate-100 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                >
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Xác nhận
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <div className="bg-white p-10 rounded-[40px] text-center shadow-2xl max-w-sm w-full">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Thanh toán xong!</h3>
              <p className="text-slate-500 mb-8">Đơn hàng đã được lưu thành công.</p>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Xuất PDF
                </button>
                <button
                  onClick={handleExportImage}
                  className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <ImageIcon size={18} />
                  Xuất Ảnh
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowSuccess(false)}
                  className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Đóng
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  In hóa đơn
                </button>
              </div>
              
              <div className="print-only no-print-screen" style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                {lastOrderData && (
                  <ReceiptContent 
                    cart={lastOrderData.cart} 
                    customer={lastOrderData.customer} 
                    subtotal={lastOrderData.subtotal}
                    vat={lastOrderData.vat}
                    discount={lastOrderData.discount}
                    total={lastOrderData.total} 
                    orderId={lastOrderId || ''} 
                    settings={settings}
                    id="receipt-print-only"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
