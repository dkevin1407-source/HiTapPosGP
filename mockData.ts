
import { MenuItem, Category, Table, TableStatus, VegType, TableArea } from './types';

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: 'Pizza', color: '#ef4444' },
  { id: 2, name: 'Beverages', color: '#3b82f6' },
  { id: 3, name: 'Sides', color: '#10b981' },
  { id: 4, name: 'Desserts', color: '#f59e0b' }
];

export const MOCK_MENU: MenuItem[] = [
  { id: 101, categoryId: 1, name: 'Margherita Pizza', price: 299, vegType: VegType.Veg, shortcut: 'P1', inventoryCount: 50, isAvailable: true },
  { id: 102, categoryId: 1, name: 'Pepperoni Feast', price: 449, vegType: VegType.NonVeg, shortcut: 'P2', inventoryCount: 30, isAvailable: true },
  { id: 201, categoryId: 2, name: 'Cold Coffee', price: 120, vegType: VegType.Veg, shortcut: 'B1', inventoryCount: 100, isAvailable: true },
  { id: 202, categoryId: 2, name: 'Fresh Lime Soda', price: 80, vegType: VegType.Veg, shortcut: 'B2', inventoryCount: 80, isAvailable: true },
  { id: 301, categoryId: 3, name: 'Garlic Breadstix', price: 149, vegType: VegType.Veg, shortcut: 'S1', inventoryCount: 40, isAvailable: true },
  { id: 401, categoryId: 4, name: 'Choco Lava Cake', price: 99, vegType: VegType.Veg, shortcut: 'D1', inventoryCount: 25, isAvailable: true }
];

export const MOCK_TABLES: Table[] = [
  { id: 1, number: 'G1', area: 'Ground', status: TableStatus.Available, token: 't1' },
  { id: 2, number: 'G2', area: 'Ground', status: TableStatus.Available, token: 't2' },
  { id: 3, number: 'G3', area: 'Ground', status: TableStatus.Available, token: 't3' },
  { id: 4, number: 'G4', area: 'Ground', status: TableStatus.Available, token: 't4' },
  { id: 5, number: 'F1', area: 'First', status: TableStatus.Available, token: 't5' },
  { id: 6, number: 'F2', area: 'First', status: TableStatus.Available, token: 't6' },
  { id: 7, number: 'F3', area: 'First', status: TableStatus.Available, token: 't7' },
  { id: 8, number: 'F4', area: 'First', status: TableStatus.Available, token: 't8' },
];
