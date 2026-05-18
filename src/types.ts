export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  sku: string;
  imageUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerId?: string;
  customerName?: string;
  items: OrderItem[];
  totalAmount: number;
  vat: number;
  discount: number;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
  createdBy: string;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'staff';
  email: string;
}

export interface StockHistory {
  id: string;
  productId: string;
  productName: string;
  oldStock: number;
  newStock: number;
  change: number;
  type: 'adjustment' | 'sale' | 'manual';
  createdAt: string;
  createdBy: string;
  userEmail: string;
}

export interface AppSettings {
  storeName: string;
  storeLogoUrl?: string;
  storeAddress?: string;
  storePhone?: string;
  receiptFooter?: string;
  paperSize: '80mm' | '58mm' | 'A4';
  autoPrint: boolean;
  showLogoOnReceipt: boolean;
  // Receipt Customization
  showCustomerPhone?: boolean;
  showCustomerAddress?: boolean;
  showStoreAddress?: boolean;
  showStorePhone?: boolean;
  receiptSections?: string[]; // e.g. ['header', 'customer', 'items', 'summary', 'footer']
}
