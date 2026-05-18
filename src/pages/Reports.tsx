import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Order, Product, Customer } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Reports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    const unsubscribeCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
      unsubscribeCustomers();
    };
  }, []);

  // Calculate Metrics
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  
  // Top Products
  const productSales: Record<string, { name: string, count: number, revenue: number }> = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.name, count: 0, revenue: 0 };
      }
      productSales[item.productId].count += item.quantity;
      productSales[item.productId].revenue += item.price * item.quantity;
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top Customers
  const customerSpending: Record<string, { name: string, total: number, count: number }> = {};
  orders.forEach(order => {
    const cId = order.customerId || 'Khách lẻ';
    if (!customerSpending[cId]) {
      customerSpending[cId] = { name: order.customerName || 'Khách lẻ', total: 0, count: 0 };
    }
    customerSpending[cId].total += order.totalAmount;
    customerSpending[cId].count += 1;
  });

  const topCustomers = Object.values(customerSpending)
    .filter(c => c.name !== 'Khách lẻ')
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Revenue by Day (Last 7 days)
  const revenueByDay: Record<string, number> = {};
  orders.forEach(order => {
    const date = order.createdAt.split('T')[0];
    revenueByDay[date] = (revenueByDay[date] || 0) + order.totalAmount;
  });

  const chartData = Object.entries(revenueByDay)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  const stats = [
    { label: 'Tổng doanh thu', value: `${totalRevenue.toLocaleString('vi-VN')} đ`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Tổng đơn hàng', value: orders.length, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Sản phẩm trong kho', value: products.length, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Khách hàng', value: customers.length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Trang chủ</h2>
        <p className="text-slate-500">Tổng quan tình hình kinh doanh của cửa hàng</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
          >
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">Doanh thu 7 ngày gần nhất</h3>
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold">
              <TrendingUp size={14} />
              Tăng trưởng
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [new Intl.NumberFormat('vi-VN').format(value) + ' đ', 'Doanh thu']}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Sản phẩm bán chạy</h3>
          <div className="space-y-6">
            {topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.count} đã bán</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">{product.revenue.toLocaleString('vi-VN')} đ</p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm italic">Chưa có dữ liệu bán hàng</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Customers */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Khách hàng thân thiết</h3>
          <div className="space-y-6">
            {topCustomers.map((customer, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-600 border border-slate-200">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{customer.name}</p>
                    <p className="text-xs text-slate-500">{customer.count} đơn hàng</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{customer.total.toLocaleString('vi-VN')} đ</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">VIP</p>
                </div>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm italic">Chưa có dữ liệu khách hàng</p>
            )}
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-6">Gợi ý kinh doanh</h3>
            <div className="space-y-4">
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <ArrowUpRight className="text-emerald-400" size={20} />
                  <span className="font-bold text-sm">Cơ hội tăng trưởng</span>
                </div>
                <p className="text-sm text-slate-300">
                  Sản phẩm <span className="text-white font-bold">"{topProducts[0]?.name || '...'}"</span> đang có sức mua tốt nhất. Hãy cân nhắc nhập thêm hàng.
                </p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="text-blue-400" size={20} />
                  <span className="font-bold text-sm">Chăm sóc khách hàng</span>
                </div>
                <p className="text-sm text-slate-300">
                  Bạn có <span className="text-white font-bold">{topCustomers.length}</span> khách hàng thân thiết. Hãy gửi mã giảm giá để tri ân họ.
                </p>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
}

// Missing import fix
import { ClipboardList } from 'lucide-react';
