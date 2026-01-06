
import React, { useState, useEffect } from 'react';
import { Table, MenuItem, Order, ServiceRequest, Role, TableStatus, OrderStatus, Category } from './types';
import { MOCK_CATEGORIES, MOCK_MENU, MOCK_TABLES } from './mockData';
import AdminDashboard from './components/AdminDashboard';
import WaiterApp from './components/WaiterApp';
import CustomerPortal from './components/CustomerPortal';

const App: React.FC = () => {
  const [activeRole, setActiveRole] = useState<Role | 'Customer'>(Role.Admin);
  const [tables, setTables] = useState<Table[]>(MOCK_TABLES);
  const [menu, setMenu] = useState<MenuItem[]>(MOCK_MENU);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [orders, setOrders] = useState<Order[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  const playDing = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
  };

  useEffect(() => {
    if (notification) {
      playDing();
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleCreateOrder = (newOrder: Order) => {
    setOrders(prev => [...prev, newOrder]);
    
    if (newOrder.tableId !== 0) {
      setTables(prev => prev.map(t => 
        t.id === newOrder.tableId 
          ? { ...t, status: TableStatus.Occupied, currentOrderId: newOrder.id } 
          : t
      ));
    }

    // Update Inventory
    setMenu(prev => prev.map(item => {
      const orderedItem = newOrder.items.find(oi => oi.menuItemId === item.id);
      if (orderedItem) {
        return { ...item, inventoryCount: item.inventoryCount - orderedItem.quantity };
      }
      return item;
    }));

    setNotification("Order Placed Successfully!");
  };

  const handleServiceRequest = (req: Omit<ServiceRequest, 'id' | 'timestamp' | 'status'>) => {
    const newRequest: ServiceRequest = {
      ...req,
      id: Date.now(),
      timestamp: new Date(),
      status: 'Active'
    };
    setServiceRequests(prev => [...prev, newRequest]);
    
    if (req.type === 'Bill' && req.tableId !== 0) {
      setTables(prev => prev.map(t => t.id === req.tableId ? { ...t, status: TableStatus.Billed } : t));
    }
    
    setNotification(`${req.type} requested for Table ${req.tableNumber}`);
  };

  const handleSettleBill = (orderId: number, tableId: number, finalAmount: number, gstAmount: number, serviceTaxAmount: number, paymentMethod: string) => {
    // When settling, find ALL unpaid orders for this table and mark them as paid
    setOrders(prev => prev.map(o => {
        const isTargetOrder = o.id === orderId;
        const isRunningOrderForTable = tableId !== 0 && o.tableId === tableId && o.status !== OrderStatus.Paid;
        
        if (isTargetOrder || isRunningOrderForTable) {
            return { 
                ...o, 
                status: OrderStatus.Paid, 
                // Only the "primary" order stores the final financial breakdown for simplicity in reporting
                totalAmount: isTargetOrder ? finalAmount : o.totalAmount, 
                gstAmount: isTargetOrder ? gstAmount : 0, 
                serviceTaxAmount: isTargetOrder ? serviceTaxAmount : 0, 
                paymentMethod 
            };
        }
        return o;
    }));
    
    if (tableId !== 0) {
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: TableStatus.Available, currentOrderId: undefined } : t));
    }
    
    setNotification(`Bill Settled via ${paymentMethod}`);
  };

  const handleUpdateMenuItem = (updatedItem: MenuItem) => {
    setMenu(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    setNotification(`Item '${updatedItem.name}' updated.`);
  };

  const handleAddMenuItem = (item: MenuItem) => {
    setMenu(prev => [...prev, item]);
    setNotification(`New item '${item.name}' added.`);
  };

  const handleCancelOrderItem = (orderId: number, itemId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const itemToCancel = order.items.find(i => i.id === itemId);
    if (!itemToCancel) return;

    // 1. Put inventory back
    setMenu(prev => prev.map(m => m.id === itemToCancel.menuItemId ? { ...m, inventoryCount: m.inventoryCount + itemToCancel.quantity } : m));

    // 2. Update Order Items
    const updatedItems = order.items.filter(i => i.id !== itemId);
    
    if (updatedItems.length === 0) {
      // If no items left, cancel the whole order
      handleCancelOrder(orderId);
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { 
        ...o, 
        items: updatedItems, 
        totalAmount: updatedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0) 
      } : o));
      setNotification(`Item '${itemToCancel.name}' cancelled.`);
    }
  };

  const handleCancelOrder = (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // 1. Put all inventory back
    setMenu(prev => {
      let nextMenu = [...prev];
      order.items.forEach(item => {
        nextMenu = nextMenu.map(m => m.id === item.menuItemId ? { ...m, inventoryCount: m.inventoryCount + item.quantity } : m);
      });
      return nextMenu;
    });

    // 2. Free Table
    if (order.tableId !== 0) {
      const tableOrders = orders.filter(o => o.tableId === order.tableId && o.status !== OrderStatus.Paid && o.id !== orderId);
      if (tableOrders.length === 0) {
        setTables(prev => prev.map(t => t.id === order.tableId ? { ...t, status: TableStatus.Available, currentOrderId: undefined } : t));
      } else {
        // If there are other orders still running, update the pointer to the next newest one
        setTables(prev => prev.map(t => t.id === order.tableId ? { ...t, currentOrderId: tableOrders[tableOrders.length - 1].id } : t));
      }
    }

    // 3. Remove Order
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setNotification(`Order #${orderId.toString().slice(-6)} voided.`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-slate-900 text-white p-2 flex justify-center gap-4 text-xs sticky top-0 z-50 shadow-md">
        <button onClick={() => setActiveRole(Role.Admin)} className={`px-4 py-1.5 rounded-lg transition-all ${activeRole === Role.Admin ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}>ADMIN</button>
        <button onClick={() => setActiveRole(Role.Waiter)} className={`px-4 py-1.5 rounded-lg transition-all ${activeRole === Role.Waiter ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}>WAITER</button>
        <button onClick={() => setActiveRole('Customer')} className={`px-4 py-1.5 rounded-lg transition-all ${activeRole === 'Customer' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}>CUSTOMER</button>
      </div>

      {notification && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[200] bg-blue-600 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <span className="font-black">🔔 {notification}</span>
        </div>
      )}

      <main className="flex-1 overflow-auto bg-gray-50">
        {activeRole === Role.Admin && (
          <AdminDashboard 
            tables={tables} 
            menu={menu} 
            categories={categories}
            serviceRequests={serviceRequests}
            orders={orders}
            onResolveRequest={(id) => setServiceRequests(prev => prev.filter(r => r.id !== id))}
            onSettleBill={handleSettleBill}
            onAddMenuItem={handleAddMenuItem}
            onUpdateMenuItem={handleUpdateMenuItem}
            onDeleteMenuItem={(id) => setMenu(prev => prev.filter(m => m.id !== id))}
            onAddCategory={(cat) => setCategories(prev => [...prev, cat])}
            onAddTable={(table) => setTables(prev => [...prev, table])}
            onDeleteTable={(id) => setTables(prev => prev.filter(t => t.id !== id))}
            onUpdateArea={(old, newArea) => setTables(prev => prev.map(t => t.area === old ? { ...t, area: newArea } : t))}
            onDeleteArea={(area) => setTables(prev => prev.filter(t => t.area !== area))}
            onCreateOrder={handleCreateOrder}
            onCancelOrderItem={handleCancelOrderItem}
            onCancelOrder={handleCancelOrder}
          />
        )}
        {activeRole === Role.Waiter && (
          <WaiterApp 
            tables={tables} 
            menu={menu} 
            onCreateOrder={handleCreateOrder} 
          />
        )}
        {activeRole === 'Customer' && (
          <CustomerPortal 
            table={tables[0]} 
            menu={menu} 
            currentOrder={orders.find(o => o.tableId === tables[0].id && o.status !== OrderStatus.Paid)}
            onRequestService={handleServiceRequest}
            onCreateOrder={handleCreateOrder}
          />
        )}
      </main>
    </div>
  );
};

export default App;
