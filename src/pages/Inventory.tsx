import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  limit
} from 'firebase/firestore';
import { Product, Category, StockHistory } from '../types';
import { Plus, Search, Edit2, Trash2, Package, X, Upload, Image as ImageIcon, Settings, List, Box, History, ArrowUpRight, ArrowDownLeft, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'stock' | 'history'>('products');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    category: '',
    sku: '',
    imageUrl: ''
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
    });

    const qCat = query(collection(db, 'categories'), orderBy('name'));
    const unsubscribeCat = onSnapshot(qCat, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(data);
    });

    const qHistory = query(collection(db, 'stock_history'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockHistory));
      setStockHistory(data);
    });

    return () => {
      unsubscribe();
      unsubscribeCat();
      unsubscribeHistory();
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      // Optional: Resize image using canvas to keep it small
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setFormData(prev => ({ ...prev, imageUrl: compressedBase64 }));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      name: formData.name,
      price: Number(formData.price),
      stock: Number(formData.stock),
      category: formData.category,
      sku: formData.sku,
      imageUrl: formData.imageUrl
    };

    try {
      if (editingProduct) {
        const oldStock = editingProduct.stock;
        const newStock = Number(formData.stock);
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        
        if (oldStock !== newStock) {
          await addDoc(collection(db, 'stock_history'), {
            productId: editingProduct.id,
            productName: productData.name,
            oldStock,
            newStock,
            change: newStock - oldStock,
            type: 'manual',
            createdAt: new Date().toISOString(),
            createdBy: auth.currentUser?.uid || 'unknown',
            userEmail: auth.currentUser?.email || 'unknown'
          });
        }
      } else {
        const docRef = await addDoc(collection(db, 'products'), productData);
        await addDoc(collection(db, 'stock_history'), {
          productId: docRef.id,
          productName: productData.name,
          oldStock: 0,
          newStock: productData.stock,
          change: productData.stock,
          type: 'manual',
          createdAt: new Date().toISOString(),
          createdBy: auth.currentUser?.uid || 'unknown',
          userEmail: auth.currentUser?.email || 'unknown'
        });
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', price: '', stock: '', category: '', sku: '', imageUrl: '' });
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), categoryFormData);
      } else {
        await addDoc(collection(db, 'categories'), categoryFormData);
      }
      setEditingCategory(null);
      setCategoryFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || ''
    });
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category || '',
      sku: product.sku || '',
      imageUrl: product.imageUrl || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleStockUpdate = async (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const oldStock = product.stock;
    const newStock = Math.max(0, oldStock + delta);
    if (oldStock === newStock) return;

    try {
      await updateDoc(doc(db, 'products', productId), { stock: newStock });
      await addDoc(collection(db, 'stock_history'), {
        productId,
        productName: product.name,
        oldStock,
        newStock,
        change: newStock - oldStock,
        type: 'adjustment',
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || 'unknown',
        userEmail: auth.currentUser?.email || 'unknown'
      });
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  const handleStockInput = async (productId: string, value: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newStock = parseInt(value);
    if (isNaN(newStock) || newStock < 0) return;
    
    const oldStock = product.stock;
    if (oldStock === newStock) return;

    try {
      await updateDoc(doc(db, 'products', productId), { stock: newStock });
      await addDoc(collection(db, 'stock_history'), {
        productId,
        productName: product.name,
        oldStock,
        newStock,
        change: newStock - oldStock,
        type: 'manual',
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || 'unknown',
        userEmail: auth.currentUser?.email || 'unknown'
      });
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Kho hàng</h2>
          <div className="flex items-center gap-1 mt-1">
            <button 
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-all ${activeTab === 'products' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Quản lý sản phẩm
            </button>
            <span className="text-slate-300">/</span>
            <button 
              onClick={() => setActiveTab('stock')}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-all ${activeTab === 'stock' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Quản lý kho hàng
            </button>
            <span className="text-slate-300">/</span>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-all ${activeTab === 'history' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Lịch sử kho
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'products' && (
            <>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-medium hover:bg-slate-50 transition-all active:scale-95"
              >
                <List size={20} />
                Quản lý danh mục
              </button>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setFormData({ name: '', price: '', stock: '', category: '', sku: '', imageUrl: '' });
                  setIsModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-all active:scale-95"
              >
                <Plus size={20} />
                Thêm sản phẩm
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="text-slate-400" size={20} />
          <input
            type="text"
            placeholder={
              activeTab === 'products' ? "Tìm kiếm sản phẩm..." : 
              activeTab === 'stock' ? "Tìm kiếm theo tên hoặc SKU để kiểm kho..." :
              "Tìm kiếm lịch sử theo tên sản phẩm..."
            }
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'products' ? (
            <table className="w-full text-left border-collapse">
              {/* ... existing products table ... */}
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Sản phẩm</th>
                  <th className="px-6 py-4 font-semibold">Mã SKU</th>
                  <th className="px-6 py-4 font-semibold">Danh mục</th>
                  <th className="px-6 py-4 font-semibold">Giá bán</th>
                  <th className="px-6 py-4 font-semibold">Tồn kho</th>
                  <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center overflow-hidden">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Package size={20} />
                          )}
                        </div>
                        <span className="font-medium text-slate-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-sm">{product.sku || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                        {product.category || 'Chưa phân loại'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {product.price.toLocaleString('vi-VN')} đ
                    </td>
                    <td className={`px-6 py-4 transition-colors ${product.stock <= 5 ? 'bg-red-50/50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${product.stock <= 5 ? 'text-red-600' : 'text-slate-900'}`}>
                          {product.stock}
                        </span>
                        {product.stock <= 5 && (
                          <AlertTriangle size={16} className="text-red-500 animate-pulse" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'stock' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Sản phẩm</th>
                  <th className="px-6 py-4 font-semibold">Mã SKU</th>
                  <th className="px-6 py-4 font-semibold">Tồn kho hiện tại</th>
                  <th className="px-6 py-4 font-semibold text-center">Điều chỉnh nhanh</th>
                  <th className="px-6 py-4 font-semibold text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Box size={20} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-sm">{product.sku || '-'}</td>
                    <td className={`px-6 py-4 transition-colors ${product.stock <= 5 ? 'bg-red-50/50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${product.stock <= 5 ? 'text-red-600' : 'text-slate-900'}`}>
                          {product.stock}
                        </span>
                        {product.stock <= 5 && (
                          <AlertTriangle size={20} className="text-red-500 animate-pulse" />
                        )}
                        <span className="text-xs text-slate-400 font-medium uppercase">Đơn vị</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleStockUpdate(product.id, -1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"
                        >
                          <ArrowDownLeft size={14} />
                        </button>
                        <input
                          type="number"
                          min="0"
                          className="w-16 text-center text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded-lg py-1 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={product.stock}
                          onChange={(e) => handleStockInput(product.id, e.target.value)}
                        />
                        <button 
                          onClick={() => handleStockUpdate(product.id, 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-90"
                        >
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {product.stock <= 0 ? (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase">Hết hàng</span>
                      ) : product.stock <= 5 ? (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase">Sắp hết</span>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase">Sẵn sàng</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Thời gian</th>
                  <th className="px-6 py-4 font-semibold">Sản phẩm</th>
                  <th className="px-6 py-4 font-semibold">Thay đổi</th>
                  <th className="px-6 py-4 font-semibold">Tồn kho</th>
                  <th className="px-6 py-4 font-semibold">Người thực hiện</th>
                  <th className="px-6 py-4 font-semibold text-right">Loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockHistory
                  .filter(h => h.productName.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((history) => (
                  <tr key={history.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(history.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{history.productName}</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${history.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {history.change > 0 ? `+${history.change}` : history.change}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {history.oldStock} → <span className="font-bold text-slate-900">{history.newStock}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">{history.userEmail}</span>
                        <span className="text-[10px] text-slate-400 font-mono uppercase">{history.createdBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        history.type === 'adjustment' ? 'bg-blue-100 text-blue-700' :
                        history.type === 'manual' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {history.type === 'adjustment' ? 'Điều chỉnh' :
                         history.type === 'manual' ? 'Thủ công' : 'Bán hàng'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-slate-700">Tên sản phẩm *</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium text-slate-700">Ảnh sản phẩm</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
                        {formData.imageUrl ? (
                          <img 
                            src={formData.imageUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ImageIcon className="text-slate-300" size={32} />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-all">
                          <Upload size={18} />
                          Tải ảnh lên
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-2">Định dạng: JPG, PNG. Dung lượng tối đa: 1MB</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Mã SKU</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      value={formData.sku}
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Danh mục</label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Giá bán *</label>
                    <input
                      required
                      type="number"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Số lượng tồn kho *</label>
                    <input
                      required
                      type="number"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    Lưu sản phẩm
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Management Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Quản lý danh mục</h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 flex flex-col md:flex-row gap-6 overflow-hidden">
                {/* Add/Edit Category Form */}
                <div className="w-full md:w-1/2 space-y-4">
                  <h4 className="font-bold text-slate-800">{editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h4>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Tên danh mục *</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        value={categoryFormData.name}
                        onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Mô tả</label>
                      <textarea
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                        value={categoryFormData.description}
                        onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-2">
                      {editingCategory && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(null);
                            setCategoryFormData({ name: '', description: '' });
                          }}
                          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all"
                        >
                          Hủy
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-all"
                      >
                        {editingCategory ? 'Cập nhật' : 'Thêm mới'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Categories List */}
                <div className="w-full md:w-1/2 flex flex-col min-h-0">
                  <h4 className="font-bold text-slate-800 mb-4">Danh sách hiện có</h4>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {categories.length === 0 ? (
                      <p className="text-slate-400 text-center py-8 italic">Chưa có danh mục nào</p>
                    ) : (
                      categories.map(cat => (
                        <div key={cat.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between group">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{cat.name}</p>
                            {cat.description && <p className="text-xs text-slate-500 truncate">{cat.description}</p>}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditCategory(cat)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
