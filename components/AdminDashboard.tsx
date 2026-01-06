
import React, { useState, useMemo, useCallback } from 'react';
import { Table, MenuItem, ServiceRequest, Order, TableStatus, OrderStatus, Category, VegType, OrderItem } from '../types';
import BillingModule from './BillingModule';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, AreaChart, Area } from 'recharts';

interface AdminDashboardProps {
  tables: Table[];
  menu: MenuItem[];
  categories: Category[];
  serviceRequests: ServiceRequest[];
  orders: Order[];
  onResolveRequest: (id: number) => void;
  onSettleBill: (orderId: number, tableId: number, finalAmount: number, gstAmount: number, serviceTaxAmount: number, paymentMethod: string) => void;
  onAddMenuItem: (item: MenuItem) => void;
  onUpdateMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (id: number) => void;
  onAddCategory: (category: Category) => void;
  onAddTable: (table: Table) => void;
  onDeleteTable: (id: number) => void;
  onUpdateArea: (oldArea: string, newArea: string) => void;
  onDeleteArea: (area: string) => void;
  onCreateOrder: (order: Order) => void;
  onCancelOrderItem: (orderId: number, itemId: number) => void;
  onCancelOrder: (orderId: number) => void;
}

type TimeRange = 'today' | '7days' | 'month';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  tables, menu, categories, serviceRequests, orders, onResolveRequest, onSettleBill,
  onAddMenuItem, onUpdateMenuItem, onDeleteMenuItem, onAddCategory, onAddTable, onDeleteTable,
  onUpdateArea, onDeleteArea, onCreateOrder, onCancelOrderItem, onCancelOrder
}) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'menu' | 'analytics'>('tables');
  const [selectedTableForBilling, setSelectedTableForBilling] = useState<Table | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  
  // Quick Sell State
  const [isQuickSelling, setIsQuickSelling] = useState(false);
  const [quickSellCart, setQuickSellCart] = useState<OrderItem[]>([]);
  const [quickSellSearch, setQuickSellSearch] = useState('');
  const [quickSellOrderId, setQuickSellOrderId] = useState<number | null>(null);

  // Modals state
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [isManagingTables, setIsManagingTables] = useState(false);
  const [isEditingArea, setIsEditingArea] = useState(false);
  const [selectedAreaToEdit, setSelectedAreaToEdit] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [isShowingActiveOrders, setIsShowingActiveOrders] = useState(false);

  // Form States
  const [newItem, setNewItem] = useState({ name: '', price: 0, categoryId: 0, vegType: VegType.Veg, shortcut: '', inventoryCount: 50 });
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3b82f6' });
  const [newTable, setNewTable] = useState({ number: '', area: '', isNewArea: false, customArea: '' });

  // Update categoryId when categories load
  React.useEffect(() => {
    if (categories.length > 0 && newItem.categoryId === 0) {
      setNewItem(prev => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories]);

  const areas = useMemo(() => Array.from(new Set(tables.map(t => t.area))), [tables]);

  // Filtering Logic
  const filterOrdersByTime = (ordersToFilter: Order[], range: TimeRange) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return ordersToFilter.filter(order => {
      const orderDate = new Date(order.createdAt);
      if (range === 'today') {
        return orderDate >= startOfDay;
      } else if (range === '7days') {
        const sevenDaysAgo = new Date(startOfDay);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return orderDate >= sevenDaysAgo;
      } else if (range === 'month') {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return orderDate >= firstOfMonth;
      }
      return true;
    });
  };

  const periodOrders = useMemo(() => filterOrdersByTime(orders, timeRange).filter(o => o.status === OrderStatus.Paid), [orders, timeRange]);
  const activeOrders = useMemo(() => orders.filter(o => o.status !== OrderStatus.Paid), [orders]);

  const periodTotals = useMemo(() => {
    return periodOrders.reduce((acc, o) => ({
      grandTotal: acc.grandTotal + o.totalAmount,
      gst: acc.gst + (o.gstAmount || 0),
      serviceTax: acc.serviceTax + (o.serviceTaxAmount || 0),
      subtotal: acc.subtotal + (o.totalAmount - (o.gstAmount || 0) - (o.serviceTaxAmount || 0) + o.discount),
      discount: acc.discount + (o.discount || 0)
    }), { grandTotal: 0, gst: 0, serviceTax: 0, subtotal: 0, discount: 0 });
  }, [periodOrders]);

  const stats = [
    { label: "Today's Revenue", value: `₹${filterOrdersByTime(orders, 'today').filter(o => o.status === OrderStatus.Paid).reduce((acc, o) => acc + o.totalAmount, 0).toFixed(2)}`, color: 'text-green-600', action: null },
    { label: "Active Orders", value: activeOrders.length, color: 'text-blue-600', action: () => setIsShowingActiveOrders(true) },
    { label: "Guest Alerts", value: serviceRequests.length, color: 'text-red-600', action: null }
  ];

  // Identifies the merged order (all items for a table) and the latest order (newest items only)
  const billingContext = useMemo(() => {
    if (!selectedTableForBilling) return null;
    
    const tableOrders = activeOrders.filter(o => o.tableId === selectedTableForBilling.id);
    if (tableOrders.length === 0) return null;
    
    // Sort by ID (timestamp based) to get oldest to newest
    const sorted = [...tableOrders].sort((a, b) => a.id - b.id);
    const latestOrder = sorted[sorted.length - 1];
    
    const mergedOrder: Order = {
      ...latestOrder,
      items: sorted.flatMap(o => o.items),
      totalAmount: sorted.reduce((acc, o) => acc + o.totalAmount, 0)
    };
    
    return { mergedOrder, latestOrder };
  }, [selectedTableForBilling, activeOrders]);

  // Quick Sell Handlers
  const addToQuickSellCart = (item: MenuItem) => {
    if (item.inventoryCount <= 0) return;
    setQuickSellCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) {
        return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: Date.now(),
        menuItemId: item.id,
        name: item.name,
        quantity: 1,
        price: item.price
      }];
    });
  };

  const removeFromQuickSellCart = (id: number) => {
    setQuickSellCart(prev => prev.filter(i => i.id !== id));
  };

  const handleQuickSellProceed = () => {
    if (quickSellCart.length === 0) return;
    const newOrderId = Date.now();
    const newOrder: Order = {
      id: newOrderId,
      tableId: 0,
      status: OrderStatus.Kitchen,
      items: [...quickSellCart],
      totalAmount: quickSellCart.reduce((acc, i) => acc + (i.price * i.quantity), 0),
      discount: 0,
      createdAt: new Date()
    };
    onCreateOrder(newOrder);
    setQuickSellOrderId(newOrderId);
    setIsQuickSelling(false);
    setQuickSellCart([]);
    setQuickSellSearch('');
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.categoryId && categories.length > 0) {
      setNewItem({ ...newItem, categoryId: categories[0].id });
      return;
    }
    if (!newItem.categoryId) {
      alert('Please select a category first');
      return;
    }
    await onAddMenuItem({ ...newItem, id: Date.now(), isAvailable: true, categoryId: newItem.categoryId });
    setIsAddingItem(false);
    setNewItem({ name: '', price: 0, categoryId: categories.length > 0 ? categories[0].id : 0, vegType: VegType.Veg, shortcut: '', inventoryCount: 50 });
  };

  const handleEditItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      onUpdateMenuItem(editingItem);
      setIsEditingItem(false);
      setEditingItem(null);
    }
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) {
      alert('Please enter a category name');
      return;
    }
    await onAddCategory({ id: Date.now(), ...newCategory });
    setIsAddingCategory(false);
    setNewCategory({ name: '', color: '#3b82f6' });
  };

  const handleAddTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const area = newTable.isNewArea ? newTable.customArea : newTable.area;
    if (!area || !area.trim()) {
      alert('Please select or create an area');
      return;
    }
    if (!newTable.number || !newTable.number.trim()) {
      alert('Please enter a table number');
      return;
    }
    await onAddTable({
      id: Date.now(),
      number: newTable.number.trim(),
      area: area.trim(),
      status: TableStatus.Available,
      token: `token-${Date.now()}`
    });
    setIsAddingTable(false);
    setNewTable({ number: '', area: '', isNewArea: false, customArea: '' });
  };

  const handleEditAreaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAreaToEdit && newAreaName.trim()) {
      onUpdateArea(selectedAreaToEdit, newAreaName.trim());
      setIsEditingArea(false);
      setSelectedAreaToEdit(null);
      setNewAreaName('');
    }
  };

  const handleQuickStockUpdate = (itemId: number, delta: number) => {
    const item = menu.find(m => m.id === itemId);
    if (item) {
      onUpdateMenuItem({ ...item, inventoryCount: Math.max(0, item.inventoryCount + delta) });
    }
  };

  // Reusable Modal Component
  const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
        <div className={`bg-white w-full ${maxWidth} rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-200`}>
          <header className="p-6 border-b flex justify-between items-center bg-slate-50">
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase text-xs tracking-widest">{title}</h3>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 transition-all border border-gray-100">✕</button>
          </header>
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    );
  };

  const topSellingData = useMemo(() => {
    const itemCounts: Record<string, number> = {};
    periodOrders.forEach(o => o.items.forEach(i => {
      itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity;
    }));
    return Object.entries(itemCounts)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [periodOrders]);

  const taxCompositionData = useMemo(() => [
    { name: 'Net Sales', value: periodTotals.subtotal, color: '#6366f1' },
    { name: 'GST', value: periodTotals.gst, color: '#10b981' },
    { name: 'Service Tax', value: periodTotals.serviceTax, color: '#f59e0b' }
  ], [periodTotals]);

  const categoryRevenueData = useMemo(() => {
    const revenue: Record<string, number> = {};
    periodOrders.forEach(o => o.items.forEach(i => {
      const item = menu.find(m => m.id === i.menuItemId);
      const cat = categories.find(c => c.id === item?.categoryId)?.name || 'Other';
      revenue[cat] = (revenue[cat] || 0) + (i.price * i.quantity);
    }));
    return Object.entries(revenue).map(([name, value]) => ({ 
      name, 
      value, 
      color: categories.find(c => c.name === name)?.color || '#94a3b8' 
    }));
  }, [periodOrders, menu, categories]);

  const salesTrendData = useMemo(() => {
    const trend: Record<string, number> = {};
    periodOrders.forEach(o => {
      const date = new Date(o.createdAt);
      const label = timeRange === 'today' 
        ? date.getHours() + ":00" 
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      trend[label] = (trend[label] || 0) + o.totalAmount;
    });
    return Object.entries(trend).map(([name, value]) => ({ name, value }));
  }, [periodOrders, timeRange]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">HiTap <span className="text-blue-600">POS</span></h1>
          <p className="text-slate-500 font-medium">Enterprise Management Suite</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
          {['tables', 'menu', 'analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2.5 rounded-lg font-bold capitalize transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            onClick={stat.action || undefined}
            className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group transition-all hover:shadow-md ${stat.action ? 'cursor-pointer hover:border-blue-200' : ''}`}
          >
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-3xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gray-50 transition-colors group-hover:bg-slate-900 group-hover:text-white`}>
              {idx === 0 ? '💰' : idx === 1 ? '🔥' : '🔔'}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          {activeTab === 'tables' && (
            <div className="space-y-10">
              <div className="flex justify-end -mb-6 relative z-10 pr-2">
                <button 
                  onClick={() => setIsQuickSelling(true)}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-[28px] font-black text-sm shadow-xl shadow-indigo-100 flex items-center gap-3 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Quick Sell / Take Away
                </button>
              </div>

              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="font-black text-slate-800">Table Management</h2>
                <div className="flex gap-2">
                  <button onClick={() => setIsManagingTables(!isManagingTables)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${isManagingTables ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                    {isManagingTables ? 'Finish Setup' : 'Manage Setup'}
                  </button>
                  {isManagingTables && <button onClick={() => setIsAddingTable(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-200">+ Add Table</button>}
                </div>
              </div>

              {areas.length === 0 && <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-slate-400 font-bold uppercase tracking-widest">No areas defined. Add a table to begin.</div>}

              {areas.map(area => (
                <section key={area} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-6 group/header">
                    <h2 className="text-xl font-black flex items-center gap-3 text-slate-700 uppercase tracking-wider text-sm">
                      <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>{area} Floor
                    </h2>
                    {isManagingTables && (
                      <div className="flex gap-2 opacity-0 group-hover/header:opacity-100 transition-opacity">
                         <button onClick={() => { setSelectedAreaToEdit(area); setNewAreaName(area); setIsEditingArea(true); }} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-200">Rename</button>
                         <button onClick={() => { if(confirm(`Delete floor and ALL tables in it?`)) onDeleteArea(area); }} className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-100">Delete</button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {tables.filter(t => t.area === area).map(table => (
                      <div key={table.id} className="relative group">
                        <div className={`w-full aspect-square rounded-[32px] border-4 p-4 flex flex-col items-center justify-center transition-all shadow-sm relative overflow-hidden
                          ${table.status === TableStatus.Available ? 'bg-white border-green-50 text-green-700' : 
                            table.status === TableStatus.Occupied ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 
                            'bg-blue-50 border-blue-200 text-blue-700'}`}>
                          <span className="text-3xl font-black">{table.number}</span>
                          <span className="text-[10px] uppercase font-black mt-1 opacity-50 tracking-widest">{table.status}</span>
                          {table.status !== TableStatus.Available && !isManagingTables && (
                            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity p-4">
                              <button onClick={() => setSelectedTableForBilling(table)} className="w-full bg-slate-900 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Billing</button>
                            </div>
                          )}
                        </div>
                        {isManagingTables && (
                          <button onClick={() => onDeleteTable(table.id)} className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center font-bold hover:bg-red-600 animate-in zoom-in">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-black text-slate-800">Menu Catalog</h2>
                <div className="flex gap-2">
                  <button onClick={() => setIsAddingCategory(true)} className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-black hover:bg-slate-200 transition-all">📁 Categories</button>
                  <button onClick={() => setIsAddingItem(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-blue-200">+ New Item</button>
                </div>
              </div>
              {categories.map(cat => (
                <div key={cat.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                   <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="font-black text-slate-700 uppercase tracking-widest text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></span>{cat.name}
                      </h3>
                      <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{menu.filter(m => m.categoryId === cat.id).length} ITEMS</span>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-white border-b uppercase text-slate-400 text-[10px] font-black tracking-widest">
                         <tr><th className="p-5">Name</th><th className="p-5">Price</th><th className="p-5 text-center">Stock</th><th className="p-5">Code</th><th className="p-5 text-right">Action</th></tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                         {menu.filter(m => m.categoryId === cat.id).map(item => (
                           <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                             <td className="p-5 flex items-center gap-3 font-bold text-slate-800"><span className={`w-2 h-2 rounded-full ${item.vegType === VegType.Veg ? 'bg-green-500' : 'bg-red-500'}`}></span>{item.name}</td>
                             <td className="p-5 font-black text-slate-900">₹{item.price}</td>
                             <td className="p-5"><div className="flex items-center justify-center gap-3"><button onClick={() => handleQuickStockUpdate(item.id, -1)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">-</button><span className="font-black text-xs">{item.inventoryCount}</span><button onClick={() => handleQuickStockUpdate(item.id, 1)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">+</button></div></td>
                             <td className="p-5 font-mono font-bold text-blue-600">{item.shortcut}</td>
                             <td className="p-5 text-right flex items-center justify-end gap-2"><button onClick={() => { setEditingItem(item); setIsEditingItem(true); }} className="opacity-0 group-hover:opacity-100 text-blue-500 font-bold p-2 text-xs">Edit</button><button onClick={() => onDeleteMenuItem(item.id)} className="opacity-0 group-hover:opacity-100 text-red-400 font-bold p-2 text-xs">Delete</button></td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in fade-in duration-700 pb-12">
               <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                 <div>
                   <h2 className="text-xl font-black text-slate-800">Business Intelligence</h2>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Performance data for {timeRange}</p>
                 </div>
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                   {(['today', '7days', 'month'] as TimeRange[]).map(range => (
                     <button
                       key={range}
                       onClick={() => setTimeRange(range)}
                       className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                       {range}
                     </button>
                   ))}
                 </div>
               </header>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sales Trend Chart */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col h-[400px]">
                  <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs mb-8 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-blue-500 rounded-full"></span> Sales Trend
                  </h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesTrendData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Category Performance Chart */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col h-[400px]">
                  <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs mb-8 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-indigo-500 rounded-full"></span> Category Performance
                  </h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryRevenueData} innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value">
                          {categoryRevenueData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tax Composition Chart */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col h-[400px]">
                  <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs mb-8 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span> Tax Composition
                  </h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={taxCompositionData} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                          {taxCompositionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Items Chart */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col h-[400px]">
                  <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs mb-8 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-amber-500 rounded-full"></span> Top Selling Items
                  </h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topSellingData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                        <Bar dataKey="sales" fill="#f59e0b" radius={[0, 8, 8, 0]}>
                           {topSellingData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#fbbf24'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Performance Breakdown Table */}
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                   <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs">Performance Breakdown</h3>
                   <div className="flex gap-8">
                     <div className="text-right">
                       <p className="text-[10px] text-slate-400 font-bold uppercase">Net Revenue</p>
                       <p className="text-xl font-black text-slate-900">₹{periodTotals.subtotal.toFixed(2)}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] text-slate-400 font-bold uppercase">Total Discount</p>
                       <p className="text-xl font-black text-rose-500">₹{periodTotals.discount.toFixed(2)}</p>
                     </div>
                   </div>
                </div>
                <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                   {[
                     { label: 'GST Collected', value: periodTotals.gst, color: 'text-emerald-600' },
                     { label: 'Service Charges', value: periodTotals.serviceTax, color: 'text-amber-600' },
                     { label: 'Orders Processed', value: periodOrders.length, color: 'text-blue-600' },
                     { label: 'Avg Order Value', value: periodOrders.length ? periodTotals.grandTotal / periodOrders.length : 0, color: 'text-indigo-600' }
                   ].map((item, idx) => (
                     <div key={idx} className="bg-slate-50 p-6 rounded-3xl">
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{item.label}</p>
                       <p className={`text-2xl font-black ${item.color}`}>
                         {typeof item.value === 'number' && item.label !== 'Orders Processed' ? `₹${item.value.toFixed(2)}` : item.value}
                       </p>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="w-full lg:w-80 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
            <div className="p-5 border-b bg-rose-50/50 flex items-center justify-between">
              <h3 className="font-black text-rose-800 uppercase tracking-widest text-xs">Alerts</h3>
              <span className="bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">{serviceRequests.length}</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[400px] overflow-auto">
              {serviceRequests.length === 0 ? (
                <div className="p-10 text-center"><p className="text-slate-300 font-bold text-sm">All clear</p></div>
              ) : (
                serviceRequests.map(req => (
                  <div key={req.id} className="p-5 flex items-center justify-between hover:bg-slate-50">
                    <div><p className="text-sm font-black text-slate-800">T{req.tableNumber}</p><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{req.type}</p></div>
                    <button onClick={() => onResolveRequest(req.id)} className="text-[10px] bg-slate-900 text-white px-3 py-1.5 rounded-lg font-black">OK</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* --- MODALS --- */}

      {/* Active Orders Modal */}
      <Modal isOpen={isShowingActiveOrders} onClose={() => setIsShowingActiveOrders(false)} title="Ongoing Orders" maxWidth="max-w-4xl">
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 no-scrollbar">
          {activeOrders.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-gray-200">
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No active kitchen orders</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeOrders.map(order => (
                <div key={order.id} className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm flex flex-col hover:border-blue-100 transition-colors">
                  <header className="flex justify-between items-start mb-4 border-b border-gray-50 pb-3">
                    <div>
                      <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                        {order.tableId === 0 ? '🥡 TAKE AWAY' : `🪑 TABLE ${tables.find(t => t.id === order.tableId)?.number}`}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Order ID: #{order.id.toString().slice(-6)}</p>
                    </div>
                    <button 
                      onClick={() => { if(confirm('Void entire order?')) onCancelOrder(order.id); }}
                      className="bg-red-50 text-red-500 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                    >
                      Void Order
                    </button>
                  </header>
                  <div className="space-y-3 flex-1">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center group/item">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.quantity} units</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-slate-900">₹{item.price * item.quantity}</span>
                          <button 
                            onClick={() => onCancelOrderItem(order.id, item.id)}
                            className="w-8 h-8 rounded-lg bg-gray-50 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Running Total</span>
                    <span className="font-black text-blue-600 text-lg">₹{order.totalAmount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Other Modals ... */}
      <Modal isOpen={isAddingTable} onClose={() => setIsAddingTable(false)} title="Create New Table">
        <form onSubmit={handleAddTableSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Table Number</label>
            <input 
              required 
              type="text" 
              className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" 
              placeholder="e.g. G5" 
              value={newTable.number} 
              onChange={(e) => {
                const value = e.target.value;
                setNewTable(prev => ({...prev, number: value}));
              }} 
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Assign to Floor/Area</label>
            <div className="flex flex-col gap-3">
              <select 
                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold disabled:opacity-50"
                disabled={newTable.isNewArea}
                value={newTable.area}
                onChange={e => setNewTable({...newTable, area: e.target.value})}
              >
                <option value="">Select Existing Area</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="newAreaCheck" checked={newTable.isNewArea} onChange={e => setNewTable({...newTable, isNewArea: e.target.checked})} className="w-4 h-4 rounded text-blue-600" />
                <label htmlFor="newAreaCheck" className="text-xs font-bold text-slate-600">Create new area instead</label>
              </div>
              {newTable.isNewArea && (
                <input 
                  required 
                  type="text" 
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold animate-in slide-in-from-top-2" 
                  placeholder="Floor Name (e.g. Terrace)" 
                  value={newTable.customArea} 
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewTable(prev => ({...prev, customArea: value}));
                  }} 
                />
              )}
            </div>
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl">SAVE TABLE</button>
        </form>
      </Modal>

      <Modal isOpen={isEditingArea} onClose={() => setIsEditingArea(false)} title="Rename Area">
        <form onSubmit={handleEditAreaSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">New Name</label>
            <input required type="text" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={newAreaName} onChange={e => setNewAreaName(e.target.value)} />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl">UPDATE ALL TABLES</button>
        </form>
      </Modal>

      <Modal isOpen={isAddingItem} onClose={() => setIsAddingItem(false)} title="Add Menu Item">
        <form onSubmit={handleAddItemSubmit} className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Item Name</label>
              <input 
                required 
                type="text" 
                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" 
                value={newItem.name} 
                onChange={(e) => {
                  const value = e.target.value;
                  setNewItem(prev => ({...prev, name: value}));
                }} 
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Price (₹)</label>
              <input 
                required 
                type="number" 
                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" 
                value={newItem.price} 
                onChange={(e) => {
                  const value = Number(e.target.value) || 0;
                  setNewItem(prev => ({...prev, price: value}));
                }} 
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Code/Shortcut</label>
              <input 
                type="text" 
                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold uppercase" 
                value={newItem.shortcut} 
                onChange={(e) => {
                  const value = e.target.value;
                  setNewItem(prev => ({...prev, shortcut: value}));
                }} 
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Category</label>
              <select 
                required
                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" 
                value={newItem.categoryId || (categories.length > 0 ? categories[0].id : '')} 
                onChange={e => setNewItem({...newItem, categoryId: Number(e.target.value)})}
              >
                {categories.length === 0 ? (
                  <option value="">No categories available</option>
                ) : (
                  categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                )}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Food Type</label>
              <div className="flex gap-2">
                {Object.values(VegType).map(type => (
                  <button key={type} type="button" onClick={() => setNewItem({...newItem, vegType: type})} className={`flex-1 py-3 rounded-xl font-bold text-xs border ${newItem.vegType === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-100 text-slate-400'}`}>{type}</button>
                ))}
              </div>
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl">ADD TO MENU</button>
        </form>
      </Modal>

      <Modal isOpen={isEditingItem} onClose={() => setIsEditingItem(false)} title="Edit Item">
        {editingItem && (
          <form onSubmit={handleEditItemSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Item Name</label>
                <input required type="text" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Price (₹)</label>
                <input required type="number" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Stock Count</label>
                <input required type="number" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={editingItem.inventoryCount} onChange={e => setEditingItem({...editingItem, inventoryCount: Number(e.target.value)})} />
              </div>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl">UPDATE ITEM</button>
          </form>
        )}
      </Modal>

      <Modal isOpen={isAddingCategory} onClose={() => setIsAddingCategory(false)} title="New Category">
        <form onSubmit={handleAddCategorySubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Category Name</label>
            <input 
              required 
              type="text" 
              className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" 
              placeholder="e.g. Main Course" 
              value={newCategory.name} 
              onChange={(e) => {
                const value = e.target.value;
                setNewCategory(prev => ({...prev, name: value}));
              }} 
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Brand Color</label>
            <input type="color" className="w-full h-12 rounded-xl cursor-pointer" value={newCategory.color} onChange={e => setNewCategory({...newCategory, color: e.target.value})} />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl">CREATE CATEGORY</button>
        </form>
      </Modal>

      {isQuickSelling && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
            <header className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Quick Sell</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Rapid Counter Order</p>
              </div>
              <button onClick={() => setIsQuickSelling(false)} className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center font-bold text-slate-400 hover:text-red-500 transition-all border border-gray-100">✕</button>
            </header>
            
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
                <div className="mb-6 sticky top-0 bg-white z-10 pb-4">
                  <input 
                    type="text" 
                    placeholder="Search name or code..."
                    className="w-full p-5 bg-slate-50 rounded-[24px] border-none font-black text-lg focus:ring-4 focus:ring-indigo-100 transition-all shadow-inner"
                    value={quickSellSearch}
                    onChange={(e) => setQuickSellSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menu.filter(m => 
                    m.name.toLowerCase().includes(quickSellSearch.toLowerCase()) || 
                    m.shortcut?.toLowerCase().includes(quickSellSearch.toLowerCase())
                  ).map(item => (
                    <button
                      key={item.id}
                      onClick={() => addToQuickSellCart(item)}
                      disabled={item.inventoryCount <= 0}
                      className={`p-5 rounded-[32px] border-2 text-left transition-all active:scale-95 group relative overflow-hidden
                        ${item.inventoryCount <= 0 ? 'bg-gray-50 border-gray-100 opacity-50 grayscale' : 'bg-white border-gray-50 hover:border-indigo-300 shadow-sm'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`w-3 h-3 rounded-full ${item.vegType === VegType.Veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest">{item.shortcut}</span>
                      </div>
                      <p className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{item.name}</p>
                      <p className="text-indigo-600 font-black mt-1">₹{item.price}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-96 bg-slate-50 border-l border-gray-100 p-8 flex flex-col">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-6">Current Selection</h3>
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                  {quickSellCart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30">
                      <p className="text-4xl mb-4">🛍️</p>
                      <p className="font-black text-xs uppercase tracking-widest text-center">Empty Basket</p>
                    </div>
                  ) : (
                    quickSellCart.map(item => (
                      <div key={item.id} className="bg-white p-5 rounded-[24px] shadow-sm flex justify-between items-center group animate-in slide-in-from-right-4">
                        <div>
                          <p className="font-black text-slate-800 text-sm leading-tight">{item.name}</p>
                          <p className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-widest">{item.quantity} units</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-900 text-sm">₹{item.price * item.quantity}</span>
                          <button onClick={() => removeFromQuickSellCart(item.id)} className="text-red-400 hover:text-red-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="pt-6 mt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Amount</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{quickSellCart.reduce((acc, i) => acc + (i.price * i.quantity), 0)}</span>
                  </div>
                  <button 
                    onClick={handleQuickSellProceed}
                    disabled={quickSellCart.length === 0}
                    className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg shadow-2xl active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                  >
                    PROCEED TO BILLING
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(selectedTableForBilling || quickSellOrderId) && (
        <BillingModule 
          table={selectedTableForBilling || { id: 0, number: 'Take Away', area: 'Counter', status: TableStatus.Available, token: '' }} 
          // Provide both merged order (for bill) and latest order (for KOT)
          order={billingContext?.mergedOrder || orders.find(o => o.id === quickSellOrderId)}
          latestOrder={billingContext?.latestOrder || orders.find(o => o.id === quickSellOrderId)}
          onClose={() => {
            setSelectedTableForBilling(null);
            setQuickSellOrderId(null);
          }}
          onSettle={onSettleBill}
          showKOT={!!quickSellOrderId}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
