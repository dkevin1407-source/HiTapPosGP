
import React, { useState } from 'react';
import { Table, MenuItem, ServiceRequest, Order, OrderItem, OrderStatus, VegType } from '../types';

interface CustomerPortalProps {
  table: Table;
  menu: MenuItem[];
  currentOrder?: Order;
  onRequestService: (req: Omit<ServiceRequest, 'id' | 'timestamp' | 'status'>) => void;
  onCreateOrder: (order: Order) => void;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ table, menu, currentOrder, onRequestService, onCreateOrder }) => {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'status' | 'bill_summary'>('home');
  const [wifiStatus, setWifiStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const addToCart = (item: MenuItem) => {
    if (item.inventoryCount <= 0) {
      alert(`Sorry, ${item.name} is now out of stock!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) {
        if (existing.quantity >= item.inventoryCount) {
          alert(`You've added the maximum available stock for ${item.name}.`);
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

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      const menuItem = menu.find(m => m.id === item?.menuItemId);
      
      if (delta > 0 && item && menuItem && item.quantity >= menuItem.inventoryCount) {
          alert(`Only ${menuItem.inventoryCount} units of ${menuItem.name} left in stock.`);
          return prev;
      }

      return prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0);
    });
  };

  const handleOrder = () => {
    if (cart.length === 0) return;
    const newOrder: Order = {
      id: Date.now(),
      tableId: table.id,
      status: OrderStatus.Pending,
      items: cart,
      totalAmount: cart.reduce((acc, i) => acc + (i.price * i.quantity), 0),
      discount: 0,
      createdAt: new Date()
    };
    onCreateOrder(newOrder);
    setCart([]);
    setActiveTab('status');
  };

  const handleWifiConnect = () => {
    if (wifiStatus === 'connected') return;
    setWifiStatus('connecting');
    setTimeout(() => {
      setWifiStatus('connected');
    }, 2500);
  };

  const handleServiceClick = (type: 'Water' | 'Call Waiter' | 'Bill') => {
    if (type === 'Bill') {
      setActiveTab('bill_summary');
      return;
    }
    if (pendingRequests.has(type)) return;
    onRequestService({ tableId: table.id, tableNumber: table.number, type });
    setPendingRequests(prev => new Set(prev).add(type));
  };

  const confirmBillRequest = () => {
    onRequestService({ tableId: table.id, tableNumber: table.number, type: 'Bill' });
    setPendingRequests(prev => new Set(prev).add('Bill'));
    setActiveTab('home');
  };

  const clearRequest = (e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    setPendingRequests(prev => {
      const next = new Set(prev);
      next.delete(type);
      return next;
    });
  };

  const filteredMenu = menu.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subTotal = currentOrder?.items.reduce((acc, i) => acc + (i.price * i.quantity), 0) || 0;
  const tax = subTotal * 0.05;
  const grandTotal = subTotal + tax;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl overflow-hidden flex flex-col relative">
      <header className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 pb-20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {(activeTab !== 'home' && activeTab !== 'status') && (
              <button onClick={() => setActiveTab('home')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-2xl font-black italic tracking-tighter">Gourmet POS</h1>
          </div>
          <span className="bg-blue-600/30 px-3 py-1 rounded-full text-xs font-bold border border-blue-400">Table {table.number}</span>
        </div>
        <p className="text-slate-400 text-sm">
          {activeTab === 'home' ? 'Welcome! How can we help you today?' : 
           activeTab === 'menu' ? 'Discover our delicious flavors.' : 
           activeTab === 'bill_summary' ? 'Review your order summary.' : 'Your order is on the way!'}
        </p>
      </header>

      <div className="flex-1 -mt-12 bg-gray-50 rounded-t-[40px] px-6 pt-10 pb-32 overflow-y-auto">
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleWifiConnect}
                className={`p-5 rounded-[32px] shadow-sm border transition-all active:scale-95 flex flex-col items-center justify-center relative overflow-hidden h-32 ${
                  wifiStatus === 'connected' ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'
                }`}
              >
                {wifiStatus === 'connecting' && <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>}
                <span className="text-3xl mb-1">{wifiStatus === 'idle' ? '📶' : wifiStatus === 'connecting' ? '⏳' : '✅'}</span>
                <span className={`text-[10px] font-black uppercase tracking-tight text-center ${wifiStatus === 'connected' ? 'text-green-600' : 'text-gray-500'}`}>
                  {wifiStatus === 'idle' ? 'Connect Wifi' : wifiStatus === 'connecting' ? 'Connecting...' : 'Wifi Connected'}
                </span>
              </button>

              {[
                { label: 'Water', type: 'Water' as const, emoji: '💧' },
                { label: 'Waiter', type: 'Call Waiter' as const, emoji: '🙋‍♂️' },
                { label: 'Bill', type: 'Bill' as const, emoji: '🧾' }
              ].map(action => {
                const isPending = pendingRequests.has(action.type);
                return (
                  <button
                    key={action.type}
                    onClick={() => handleServiceClick(action.type)}
                    className={`p-5 rounded-[32px] shadow-sm border transition-all relative flex flex-col items-center justify-center h-32 ${
                      isPending ? 'bg-orange-50 border-orange-200 active:scale-95' : 'bg-white border-gray-100 active:scale-95'
                    }`}
                  >
                    <span className={`text-3xl mb-1 ${isPending ? 'animate-bounce' : ''}`}>{action.emoji}</span>
                    <span className={`text-[10px] font-black uppercase tracking-tight ${isPending ? 'text-orange-600' : 'text-gray-500'}`}>
                      {isPending ? 'Pending...' : action.label}
                    </span>
                    {isPending && (
                      <div onClick={(e) => clearRequest(e, action.type)} className="absolute -top-1 -right-1 bg-white border border-orange-200 text-orange-500 text-[8px] px-2 py-0.5 rounded-full font-black shadow-sm uppercase cursor-pointer hover:bg-orange-500 hover:text-white transition-colors">
                        Clear
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => setActiveTab('menu')}
              className="w-full bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl flex items-center justify-between group active:scale-95 transition-all overflow-hidden relative"
            >
              <div className="relative z-10 text-left">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Hungry?</p>
                <h3 className="text-2xl font-black">Order Food</h3>
              </div>
              <div className="relative z-10 bg-white/20 p-4 rounded-3xl group-hover:bg-blue-600 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/30 transition-all"></div>
            </button>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="relative">
              <input 
                type="text" 
                placeholder="What are you craving?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-none shadow-sm rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500"
              />
              <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="space-y-4">
              {filteredMenu.length > 0 ? filteredMenu.map(item => {
                const isOutOfStock = item.inventoryCount <= 0;
                return (
                  <div key={item.id} className={`bg-white p-4 rounded-3xl shadow-sm border border-gray-50 flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 relative overflow-hidden ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}>
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden shrink-0">
                      <img src={`https://picsum.photos/seed/${item.id}/200`} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-2 h-2 rounded-full ${item.vegType === VegType.Veg ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-sm font-bold text-slate-800">{item.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium line-clamp-1">
                           {isOutOfStock ? 'Currently unavailable.' : `Prepared fresh for you.`}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-blue-600">₹{item.price}</span>
                        {isOutOfStock ? (
                          <span className="bg-red-50 text-red-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100">
                             Sold Out
                          </span>
                        ) : (
                          <button 
                            onClick={() => addToCart(item)}
                            className="bg-slate-900 text-white w-8 h-8 rounded-xl flex items-center justify-center font-bold active:scale-90 transition-transform shadow-lg"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-10 text-gray-400">
                  <p className="font-bold">No items found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bill_summary' && (
          <div className="animate-in slide-in-from-right duration-300 space-y-6">
            <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <span className="bg-blue-600 w-2 h-8 rounded-full"></span>
              Order Summary
            </h3>
            
            {currentOrder && currentOrder.items.length > 0 ? (
              <div className="space-y-6">
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
                  <div className="space-y-4 mb-6 border-b border-gray-50 pb-6">
                    {currentOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-400 font-semibold">{item.quantity} x ₹{item.price}</p>
                        </div>
                        <span className="font-black text-slate-900 ml-4 text-right">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-400 font-bold uppercase tracking-wider">
                      <span>Subtotal</span>
                      <span>₹{subTotal}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-400 font-bold uppercase tracking-wider">
                      <span>GST (5%)</span>
                      <span>₹{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-2xl font-black text-slate-900 pt-4 border-t border-gray-50 mt-4">
                      <span>Grand Total</span>
                      <span>₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  {pendingRequests.has('Bill') ? (
                    <div className="bg-blue-50 border border-blue-100 p-6 rounded-[32px] text-center">
                      <p className="text-blue-600 font-black uppercase text-xs tracking-widest mb-2">Request Active</p>
                      <p className="text-slate-600 text-sm font-medium">A waiter is bringing your bill to Table {table.number}.</p>
                    </div>
                  ) : (
                    <button 
                      onClick={confirmBillRequest}
                      className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      REQUEST BILL NOW
                    </button>
                  )}
                  <p className="text-center text-slate-400 text-[10px] font-bold uppercase mt-6 tracking-widest leading-relaxed">
                    Once requested, you can still view this summary<br/>until payment is settled
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🫙</div>
                <h4 className="text-lg font-black text-slate-400 mb-2">Nothing ordered yet</h4>
                <p className="text-slate-300 text-sm mb-8 px-10">Start by exploring our menu and adding items to your cart.</p>
                <button 
                  onClick={() => setActiveTab('menu')}
                  className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95"
                >
                  Go to Menu
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'status' && (
          <div className="text-center py-20 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner">✓</div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">Order Placed!</h3>
            <p className="text-slate-500 mt-3 px-8 leading-relaxed">Our master chefs are now preparing your meal with care. Sit back and relax!</p>
            <div className="mt-12 flex flex-col gap-3">
              <button 
                onClick={() => setActiveTab('menu')}
                className="bg-blue-600 text-white px-10 py-4 rounded-full font-black shadow-xl hover:shadow-2xl transition-all active:scale-95"
              >
                Order More Items
              </button>
              <button 
                onClick={() => setActiveTab('home')}
                className="text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>

      {cart.length > 0 && activeTab === 'menu' && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[40px] shadow-[0_-15px_50px_rgba(0,0,0,0.15)] p-8 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-black text-slate-800">Your Basket</h4>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full">{cart.length} ITEMS</span>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto mb-6 space-y-4 no-scrollbar border-b border-gray-50 pb-4">
            {cart.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="font-bold text-slate-700">{item.name}</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 gap-4">
                    <button onClick={() => updateQuantity(item.id, -1)} className="font-black text-slate-400 hover:text-red-500 transition-colors">−</button>
                    <span className="font-black text-slate-700 text-xs">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="font-black text-slate-400 hover:text-blue-500 transition-colors">+</button>
                  </div>
                  <span className="font-black text-slate-900 w-16 text-right">₹{item.price * item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={handleOrder}
            className="w-full bg-slate-900 text-white py-5 rounded-[28px] font-black text-lg shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95 bg-gradient-to-r from-slate-900 to-slate-800"
          >
            CONFIRM ORDER
            <span className="bg-white/20 px-4 py-1 rounded-2xl text-sm">₹{cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;
