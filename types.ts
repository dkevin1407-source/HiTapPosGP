
export enum Role {
  Admin = 'Admin',
  Waiter = 'Waiter',
  Kitchen = 'Kitchen'
}

export enum TableStatus {
  Available = 'Available',
  Occupied = 'Occupied',
  Billed = 'Billed'
}

// Changed to string to allow dynamic floor management
export type TableArea = string;

export enum VegType {
  Veg = 'Veg',
  NonVeg = 'Non-veg',
  Egg = 'Egg'
}

export enum OrderStatus {
  Pending = 'Pending',
  Kitchen = 'Kitchen',
  Served = 'Served',
  Paid = 'Paid'
}

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  price: number;
  vegType: VegType;
  shortcut?: string;
  inventoryCount: number;
  isAvailable: boolean;
}

export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface Table {
  id: number;
  number: string;
  area: TableArea;
  status: TableStatus;
  token: string;
  currentOrderId?: number;
}

export interface OrderItem {
  id: number;
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
  instructions?: string;
  isOpenItem?: boolean;
}

export interface Order {
  id: number;
  tableId: number;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  discount: number;
  gstAmount?: number;
  serviceTaxAmount?: number;
  paymentMethod?: string;
  createdAt: Date;
}

export interface ServiceRequest {
  id: number;
  tableId: number;
  tableNumber: string;
  type: 'Call Waiter' | 'Water' | 'Bill';
  status: 'Active' | 'Resolved';
  timestamp: Date;
}
