
import React, { useState, useEffect } from 'react';
import { Table, MenuItem, Order, ServiceRequest, Role, TableStatus, OrderStatus, Category } from './types';
import AdminDashboard from './components/AdminDashboard';
import WaiterApp from './components/WaiterApp';
import CustomerPortal from './components/CustomerPortal';

// API base URL - can be set via VITE_API_BASE_URL; empty string means same domain (relative URLs)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const App: React.FC = () => {
  const [activeRole, setActiveRole] = useState<Role | 'Customer'>(Role.Admin);
  const [tables, setTables] = useState<Table[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const playDing = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
  };

  const parseJSONSafely = async (response: Response) => {
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON received from ${response.url}: ${text.slice(0,200)}`);
      }
    }
    throw new Error(`Expected JSON but received: ${text.slice(0,200)}`);
  };

  // Fetch initial data from API
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/initial-data`);
        const responseData = await parseJSONSafely(response);
        
        if (!response.ok) {
          // Response contains error details
          const errorMessage = responseData.details || responseData.error || responseData.message || 'Failed to fetch data';
          const errorCode = responseData.code || 'UNKNOWN';
          throw new Error(`${errorMessage} (Code: ${errorCode})`);
        }
        
        // Transform data to match frontend types
        setCategories(responseData.categories || []);
        setMenu(responseData.menu || []);
        setTables(responseData.tables || []);
        setOrders((responseData.orders || []).map((order: any) => ({
          ...order,
          createdAt: new Date(order.createdAt)
        })));
        setServiceRequests((responseData.serviceRequests || []).map((req: any) => ({
          ...req,
          timestamp: new Date(req.timestamp)
        })));
      } catch (error: any) {
        console.error('Failed to fetch initial data:', error);
        
        // Extract error message
        let errorMessage = 'Failed to load data';
        if (error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          errorMessage = error.toString() || 'Unknown error occurred';
        }
        
        setNotification(`⚠️ ${errorMessage}`);
        console.error('Full error details:', {
          message: error.message,
          stack: error.stack,
          error: error
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (notification) {
      playDing();
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleCreateOrder = async (newOrder: Order) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: newOrder.tableId,
          items: newOrder.items,
          totalAmount: newOrder.totalAmount
        })
      });
      
      if (!response.ok) throw new Error('Failed to create order');
      
      const { orderId } = await parseJSONSafely(response);
      const createdOrder = { ...newOrder, id: orderId };
      
      setOrders((prev: Order[]) => [...prev, createdOrder]);
      
      // Refresh menu to get updated inventory
      const menuResponse = await fetch(`${API_BASE_URL}/api/initial-data`);
      const menuData = await parseJSONSafely(menuResponse);
      setMenu(menuData.menu || []);
      
      // Refresh tables
      const tablesResponse = await fetch(`${API_BASE_URL}/api/tables`);
      const tablesData = await parseJSONSafely(tablesResponse);
      setTables(tablesData || []);
      
      setNotification("Order Placed Successfully!");
    } catch (error) {
      console.error('Failed to create order:', error);
      setNotification('Failed to place order. Please try again.');
    }
  };

  const handleServiceRequest = async (req: Omit<ServiceRequest, 'id' | 'timestamp' | 'status'>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/service-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });
      
      if (!response.ok) throw new Error('Failed to create service request');
      
      // Refresh service requests and tables
      const dataResponse = await fetch(`${API_BASE_URL}/api/initial-data`);
      const data = await parseJSONSafely(dataResponse);
      setServiceRequests((data.serviceRequests || []).map((sr: any) => ({
        ...sr,
        timestamp: new Date(sr.timestamp)
      })));
      setTables(data.tables || []);
      
      setNotification(`${req.type} requested for Table ${req.tableNumber}`);
    } catch (error) {
      console.error('Failed to create service request:', error);
      setNotification('Failed to send request. Please try again.');
    }
  };

  const handleSettleBill = async (orderId: number, tableId: number, finalAmount: number, gstAmount: number, serviceTaxAmount: number, paymentMethod: string) => {
    try {
      // Settle the primary order and all other unpaid orders for this table
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/settle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          totalAmount: finalAmount,
          gstAmount,
          serviceTaxAmount,
          paymentMethod,
          discount: 0,
          settleAllTableOrders: true // Flag to settle all orders for this table
        })
      });
      
      if (!response.ok) throw new Error('Failed to settle bill');
      
      // Refresh data
      const dataResponse = await fetch(`${API_BASE_URL}/api/initial-data`);
      const data = await parseJSONSafely(dataResponse);
      setOrders((data.orders || []).map((o: any) => ({
        ...o,
        createdAt: new Date(o.createdAt)
      })));
      setTables(data.tables || []);
      
      setNotification(`Bill Settled via ${paymentMethod}`);
    } catch (error) {
      console.error('Failed to settle bill:', error);
      setNotification('Failed to settle bill. Please try again.');
    }
  };

  const handleUpdateMenuItem = async (updatedItem: MenuItem) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/menu/${updatedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updatedItem.name,
          price: updatedItem.price,
          inventoryCount: updatedItem.inventoryCount,
          isAvailable: updatedItem.isAvailable
        })
      });
      
      if (!response.ok) throw new Error('Failed to update menu item');
      
      // Refresh menu
      const menuResponse = await fetch(`${API_BASE_URL}/api/initial-data`);
      const menuData = await parseJSONSafely(menuResponse);
      setMenu(menuData.menu || []);
      
      setNotification(`Item '${updatedItem.name}' updated.`);
    } catch (error) {
      console.error('Failed to update menu item:', error);
      setNotification('Failed to update item. Please try again.');
    }
  };

  const handleAddMenuItem = async (item: MenuItem) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: item.categoryId,
          name: item.name,
          price: item.price,
          vegType: item.vegType,
          shortcut: item.shortcut,
          inventoryCount: item.inventoryCount
        })
      });
      
      if (!response.ok) {
        let errorData: any = { error: 'Unknown error' };
        try { errorData = await parseJSONSafely(response); } catch(e) { /* keep fallback */ }
        throw new Error(errorData.error || errorData.details || 'Failed to add menu item');
      }
      
      // Refresh menu
      const menuResponse = await fetch(`${API_BASE_URL}/api/initial-data`);
      const menuData = await parseJSONSafely(menuResponse);
      setMenu(menuData.menu || []);
      
      setNotification(`New item '${item.name}' added.`);
    } catch (error: any) {
      console.error('Failed to add menu item:', error);
      setNotification(`Failed to add item: ${error.message || 'Please try again.'}`);
    }
  };

  const handleCancelOrderItem = async (orderId: number, itemId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/item/${itemId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to cancel order item');
      
      // Refresh data
      const dataResponse = await fetch(`${API_BASE_URL}/api/initial-data`);
      const data = await parseJSONSafely(dataResponse);
      setOrders((data.orders || []).map((o: any) => ({
        ...o,
        createdAt: new Date(o.createdAt)
      })));
      setMenu(data.menu || []);
      setTables(data.tables || []);
      
      setNotification('Item cancelled successfully.');
    } catch (error) {
      console.error('Failed to cancel order item:', error);
      setNotification('Failed to cancel item. Please try again.');
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to cancel order');
      
      // Refresh data
      const dataResponse = await fetch(`${API_BASE_URL}/api/initial-data`);
      const data = await parseJSONSafely(dataResponse);
      setOrders((data.orders || []).map((o: any) => ({
        ...o,
        createdAt: new Date(o.createdAt)
      })));
      setMenu(data.menu || []);
      setTables(data.tables || []);
      
      setNotification(`Order #${orderId.toString().slice(-6)} voided.`);
    } catch (error) {
      console.error('Failed to cancel order:', error);
      setNotification('Failed to cancel order. Please try again.');
    }
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

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 font-bold">Loading POS System...</p>
          </div>
        </div>
      ) : (
      <main className="flex-1 overflow-auto bg-gray-50">
        {activeRole === Role.Admin && (
          <AdminDashboard 
            tables={tables} 
            menu={menu} 
            categories={categories}
            serviceRequests={serviceRequests}
            orders={orders}
            onResolveRequest={async (id: number) => {
              try {
                const response = await fetch(`${API_BASE_URL}/api/service-requests/${id}`, {
                  method: 'DELETE'
                });
                if (!response.ok) throw new Error('Failed to resolve request');
                
                // Refresh service requests
                const dataResponse = await fetch(`${API_BASE_URL}/api/initial-data`);
                const data = await parseJSONSafely(dataResponse);
                setServiceRequests((data.serviceRequests || []).map((sr: any) => ({
                  ...sr,
                  timestamp: new Date(sr.timestamp)
                })));
              } catch (error) {
                console.error('Failed to resolve request:', error);
                setNotification('Failed to resolve request. Please try again.');
              }
            }}
            onSettleBill={handleSettleBill}
            onAddMenuItem={handleAddMenuItem}
            onUpdateMenuItem={handleUpdateMenuItem}
            onDeleteMenuItem={async (id: number) => {
              try {
                const response = await fetch(`${API_BASE_URL}/api/menu/${id}`, {
                  method: 'DELETE'
                });
                if (!response.ok) throw new Error('Failed to delete menu item');
                
                const menuResponse = await fetch(`${API_BASE_URL}/api/initial-data`);
                const menuData = await parseJSONSafely(menuResponse);
                setMenu(menuData.menu || []);
              } catch (error) {
                console.error('Failed to delete menu item:', error);
                setNotification('Failed to delete item. Please try again.');
              }
            }}
            onAddCategory={async (cat: { name: string; color?: string }) => {
              try {
                const response = await fetch(`${API_BASE_URL}/api/categories`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: cat.name, color: cat.color })
                });
                if (!response.ok) {
                  let errorData: any = { error: 'Unknown error' };
                  try { errorData = await parseJSONSafely(response); } catch(e) { /* keep fallback */ }
                  throw new Error(errorData.error || errorData.details || 'Failed to add category');
                }
                
                const catResponse = await fetch(`${API_BASE_URL}/api/categories`);
                const catData = await parseJSONSafely(catResponse);
                setCategories(catData || []);
                setNotification(`Category '${cat.name}' added successfully.`);
              } catch (error: any) {
                console.error('Failed to add category:', error);
                setNotification(`Failed to add category: ${error.message || 'Please try again.'}`);
              }
            }}
            onAddTable={async (table: { number: string; area: string; status?: string; token?: string }) => {
              try {
                const response = await fetch(`${API_BASE_URL}/api/tables`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    number: table.number,
                    area: table.area,
                    status: table.status,
                    token: table.token
                  })
                });
                if (!response.ok) {
                  let errorData: any = { error: 'Unknown error' };
                  try { errorData = await parseJSONSafely(response); } catch(e) { /* keep fallback */ }
                  throw new Error(errorData.error || errorData.details || 'Failed to add table');
                }
                
                const tablesResponse = await fetch(`${API_BASE_URL}/api/tables`);
                const tablesData = await parseJSONSafely(tablesResponse);
                setTables(tablesData || []);
                setNotification(`Table '${table.number}' added successfully.`);
              } catch (error: any) {
                console.error('Failed to add table:', error);
                setNotification(`Failed to add table: ${error.message || 'Please try again.'}`);
              }
            }}
            onDeleteTable={async (id: number) => {
              try {
                const response = await fetch(`${API_BASE_URL}/api/tables/${id}`, {
                  method: 'DELETE'
                });
                if (!response.ok) throw new Error('Failed to delete table');
                
                const tablesResponse = await fetch(`${API_BASE_URL}/api/tables`);
                const tablesData = await parseJSONSafely(tablesResponse);
                setTables(tablesData || []);
              } catch (error) {
                console.error('Failed to delete table:', error);
                setNotification('Failed to delete table. Please try again.');
              }
            }}
            onUpdateArea={async (old: string, newArea: string) => {
              try {
                const response = await fetch(`${API_BASE_URL}/api/tables/area/update`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ oldArea: old, newArea })
                });
                if (!response.ok) throw new Error('Failed to update area');
                
                const tablesResponse = await fetch(`${API_BASE_URL}/api/tables`);
                const tablesData = await parseJSONSafely(tablesResponse);
                setTables(tablesData || []);
              } catch (error) {
                console.error('Failed to update area:', error);
                setNotification('Failed to update area. Please try again.');
              }
            }}
            onDeleteArea={async (area: string) => {
              try {
                const response = await fetch(`${API_BASE_URL}/api/tables/area/${area}`, {
                  method: 'DELETE'
                });
                if (!response.ok) throw new Error('Failed to delete area');
                
                const tablesResponse = await fetch(`${API_BASE_URL}/api/tables`);
                const tablesData = await parseJSONSafely(tablesResponse);
                setTables(tablesData || []);
              } catch (error) {
                console.error('Failed to delete area:', error);
                setNotification('Failed to delete area. Please try again.');
              }
            }}
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
            currentOrder={orders.find((o: Order) => o.tableId === tables[0].id && o.status !== OrderStatus.Paid)}
            onRequestService={handleServiceRequest}
            onCreateOrder={handleCreateOrder}
          />
        )}
      </main>
      )}
    </div>
  );
};

export default App;
