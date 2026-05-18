import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  limit 
} from 'firebase/firestore';
import { Order } from '../types';
import { Search, ClipboardList, Calendar, User, ChevronRight, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });
    return () => unsubscribe();
  }, []);

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Đơn hàng</h2>
          <p className="text-slate-500">Lịch sử giao dịch và trạng thái đơn hàng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3 shadow-sm">
            <Search className="text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Tìm theo mã đơn hoặc tên khách hàng..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Chưa có đơn hàng nào</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-all text-left ${
                      selectedOrder?.id === order.id ? 'bg-emerald-50/50 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">#{order.id.slice(-6).toUpperCase()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {order.status === 'completed' ? 'Hoàn thành' : 'Chờ'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          {order.customerName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="font-bold text-slate-900">
                        {order.totalAmount.toLocaleString('vi-VN')} đ
                      </div>
                      <ChevronRight size={20} className="text-slate-300" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Order Details Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div
                key={selectedOrder.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden sticky top-8"
              >
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Chi tiết đơn hàng</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {selectedOrder.id}</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sản phẩm</h4>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                              <Package size={16} />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500">x{item.quantity}</p>
                            </div>
                          </div>
                          <span className="font-semibold text-slate-700">
                            {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Tạm tính</span>
                      <span>{(selectedOrder.totalAmount - (selectedOrder.vat || 0) + (selectedOrder.discount || 0)).toLocaleString('vi-VN')} đ</span>
                    </div>
                    {selectedOrder.vat > 0 && (
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>VAT</span>
                        <span>{selectedOrder.vat.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>Giảm giá</span>
                        <span className="text-red-500">-{selectedOrder.discount.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-50">
                      <span>Tổng tiền</span>
                      <span className="text-emerald-600">{selectedOrder.totalAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Thông tin khách hàng</h4>
                    <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                      <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{selectedOrder.customerName}</p>
                        <p className="text-xs text-slate-500">ID: {selectedOrder.customerId || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-[400px] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <ClipboardList size={48} className="mb-4 opacity-20" />
                <p className="text-sm">Chọn một đơn hàng để xem chi tiết</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
