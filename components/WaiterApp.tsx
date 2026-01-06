
import React, { useState, useEffect } from 'react';
import { Table, MenuItem, Order, OrderItem, TableStatus, OrderStatus, VegType, Category } from '../types';

// API base URL - empty string means same domain (relative URLs)
const API_BASE_URL = '';

interface WaiterAppProps {
  tables: Table[];
  menu: MenuItem[];
  onCreateOrder: (order: Order) => void;
}

const WaiterApp: React.FC<WaiterAppProps> = ({ tables, menu, onCreateOrder }) => {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<Order | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/categories`);
        const data = await response.json();
        setCategories(data || []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const filteredMenu = menu.filter(item => 
    (!activeCategory || item.categoryId === activeCategory) &&
    (item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     item.shortcut?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addToCart = (item: MenuItem) => {
    if (item.inventoryCount <= 0) {
      alert(`⚠️ STOCK FINISHED: ${item.name} is no longer available.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) {
        // Double check against current inventory vs what's already in cart
        if (existing.quantity >= item.inventoryCount) {
          alert(`⚠️ MAX STOCK REACHED: Only ${item.inventoryCount} units of ${item.name} available.`);
          return prev;
        }
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

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleKOT = () => {
    if (!selectedTable || cart.length === 0) return;
    
    const newOrder: Order = {
      id: Date.now(),
      tableId: selectedTable.id,
      status: OrderStatus.Kitchen,
      items: [...cart],
      totalAmount: cart.reduce((acc, i) => acc + (i.price * i.quantity), 0),
      discount: 0,
      createdAt: new Date()
    };

    onCreateOrder(newOrder);
    setOrderSuccess(newOrder);
    setCart([]);
  };

  const handlePrintKOT = (order: Order) => {
    const printEl = document.getElementById('print-section');
    if (!printEl) return;
    
    const tableNum = tables.find(t => t.id === order.tableId)?.number || '?';
    
    printEl.innerHTML = `
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
        <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">KITCHEN ORDER</h2>
        <p style="margin: 5px 0; font-size: 22px; font-weight: bold;">TABLE: ${tableNum}</p>
        <p style="margin: 0; font-size: 12px;">Order: #${order.id.toString().slice(-6)}</p>
        <p style="margin: 0; font-size: 12px;">Time: ${order.createdAt.toLocaleTimeString()}</p>
      </div>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align: left; padding: 5px 0;">ITEM</th>
            <th style="text-align: right; padding: 5px 0;">QTY</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 0.5px solid #eee;">${item.name}</td>
              <td style="text-align: right; padding: 8px 0; font-size: 18px; font-weight: bold; border-bottom: 0.5px solid #eee;">${item.quantity}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 20px; text-align: center; border-top: 1px dashed #000; padding-top: 10px;">
        <p style="font-size: 10px;">End of KOT</p>
      </div>
    `;

    setTimeout(() => {
        window.print();
        printEl.innerHTML = '';
    }, 50);
  };

  if (orderSuccess) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center p-8 text-white">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-4xl mb-6 animate-bounce shadow-lg shadow-green-500/20">✓</div>
        <h2 className="text-3xl font-black mb-2">Order Sent!</h2>
        <p className="text-slate-400 mb-8 text-center">Kitchen Order Ticket (KOT) has been transmitted.</p>
        
        <div className="w-full max-w-xs space-y-3">
          <button 
            onClick={() => handlePrintKOT(orderSuccess)}
            className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            PRINT PHYSICAL KOT
          </button>
          <button 
            onClick={() => {
              setOrderSuccess(null);
              setSelectedTable(null);
            }}
            className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black active:scale-95 transition-all"
          >
            RETURN TO TABLES
          </button>
        </div>
      </div>
    );
  }

  if (!selectedTable) {
    return (
      <div className="p-4 min-h-screen bg-gray-50 pb-24">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Select Table</h2>
            <div className="flex gap-2">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Free</span>
                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Running</span>
            </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {tables.map(table => (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table)}
              className={`aspect-square rounded-3xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 shadow-sm
                ${table.status === TableStatus.Available ? 'bg-white border-green-100 text-green-700' : 'bg-yellow-400 border-yellow-500 text-white'}`}
            >
              <span className="text-3xl font-black">{table.number}</span>
              <span className="text-[10px] uppercase font-black opacity-60 tracking-widest">{table.status === 'Available' ? 'Ready' : 'In Use'}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedTable(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">←</button>
          <div>
            <h2 className="font-black text-lg">Table ${selectedTable.number}</h2>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">${selectedTable.area} Area</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase opacity-60 font-black">Subtotal</p>
          <p className="font-black text-blue-400 text-xl">₹{cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)}</p>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Menu Section */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-3 border-b space-y-3 shadow-sm z-10">
            <input 
              type="text" 
              placeholder="Search by name or code (e.g. P1)..."
              className="w-full p-4 bg-gray-100 rounded-2xl text-sm border-none focus:ring-2 focus:ring-blue-500 font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button 
                onClick={() => setActiveCategory(null)}
                className={`px-6 py-2 rounded-xl text-xs font-black whitespace-nowrap border transition-all ${!activeCategory ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 border-gray-200 text-slate-400'}`}
              >
                ALL
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-6 py-2 rounded-xl text-xs font-black whitespace-nowrap border transition-all ${activeCategory === cat.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 border-gray-200 text-slate-400'}`}
                >
                  {cat.name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 no-scrollbar">
            {filteredMenu.map(item => {
              const isOutOfStock = item.inventoryCount <= 0;
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={isOutOfStock}
                  className={`flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-all group relative overflow-hidden
                    ${isOutOfStock ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:border-blue-200'}`}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${item.vegType === VegType.Veg ? 'bg-green-500 shadow-sm' : 'bg-red-500 shadow-sm'}`}></span>
                      <span className="font-black text-slate-800">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-blue-600">₹{item.price}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isOutOfStock ? 'text-red-500' : 'text-slate-300'}`}>
                        {isOutOfStock ? 'Sold Out' : item.shortcut}
                      </span>
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border border-gray-100 transition-colors
                    ${isOutOfStock ? 'bg-gray-100 text-gray-400' : 'bg-slate-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                    {isOutOfStock ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop Cart Sidebar */}
        <div className="hidden lg:flex w-96 bg-slate-50 border-l flex-col shadow-2xl z-20">
          <div className="p-6 border-b flex justify-between items-center bg-white">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Current Selection</h3>
            <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-md">{cart.length}</span>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3 no-scrollbar">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <span className="text-4xl mb-4">🛒</span>
                    <p className="font-black text-sm uppercase tracking-widest">Cart is empty</p>
                </div>
            ) : (
                cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <p className="font-black text-slate-800 leading-tight">{item.name}</p>
                            <p className="text-xs font-bold text-blue-600 mt-1">₹{item.price} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-black text-slate-900">₹{item.price * item.quantity}</span>
                            <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-2 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))
            )}
          </div>
          <div className="p-6 border-t bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
             <div className="flex justify-between mb-6">
               <span className="font-black text-slate-400 uppercase text-xs tracking-widest">Payable Amount</span>
               <span className="font-black text-3xl text-slate-900 tracking-tight">₹{cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)}</span>
             </div>
             <button 
               onClick={handleKOT}
               className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale"
               disabled={cart.length === 0}
             >
               TRANSMIT TO KITCHEN
             </button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Order Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-5 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-40 rounded-t-[32px]">
        <div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Order Value</p>
          <p className="text-2xl font-black text-slate-900">₹{cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)}</p>
        </div>
        <button 
          onClick={handleKOT}
          disabled={cart.length === 0}
          className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl disabled:opacity-50 active:scale-95 transition-all flex items-center gap-3"
        >
          PLACE KOT
          <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs">{cart.length}</span>
        </button>
      </div>
    </div>
  );
};

export default WaiterApp;
