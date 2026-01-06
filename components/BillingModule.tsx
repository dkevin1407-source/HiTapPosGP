
import React, { useState } from 'react';
import { Table, Order, OrderStatus } from '../types';

interface BillingModuleProps {
  table: Table;
  order?: Order; // This is the merged (full) order for the bill
  latestOrder?: Order; // This is only the newest transaction for KOT printing
  onClose: () => void;
  onSettle: (orderId: number, tableId: number, finalAmount: number, gstAmount: number, serviceTaxAmount: number, paymentMethod: string) => void;
  showKOT?: boolean;
}

const BillingModule: React.FC<BillingModuleProps> = ({ table, order, latestOrder, onClose, onSettle, showKOT = false }) => {
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI'>('Cash');
  const [splitCount, setSplitCount] = useState(1);
  
  // Custom Tax States
  const [gstRate, setGstRate] = useState(5); // Default 5%
  const [serviceTaxRate, setServiceTaxRate] = useState(0); // Default 0%
  const [isServiceTaxEnabled, setIsServiceTaxEnabled] = useState(false);

  if (!order) return null;

  const subTotal = order.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const gstAmount = subTotal * (gstRate / 100);
  const serviceTaxAmount = isServiceTaxEnabled ? subTotal * (serviceTaxRate / 100) : 0;
  const grandTotal = subTotal + gstAmount + serviceTaxAmount - discount;

  // Uses 'latestOrder' to print ONLY the most recent additions for the kitchen
  const handlePrintKOT = () => {
    const printEl = document.getElementById('print-section');
    if (!printEl) return;
    
    // Fallback to full order if latestOrder isn't specifically provided
    const targetOrder = latestOrder || order;

    printEl.innerHTML = `
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
        <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">KITCHEN TICKET</h2>
        <p style="margin: 5px 0; font-size: 22px; font-weight: bold;">${table.id === 0 ? 'TAKE AWAY' : `TABLE: ${table.number}`}</p>
        <p style="margin: 0; font-size: 12px;">Batch ID: #${targetOrder.id.toString().slice(-6)}</p>
        <p style="margin: 0; font-size: 12px;">Time: ${new Date().toLocaleTimeString()}</p>
      </div>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align: left; padding: 5px 0;">ITEM</th>
            <th style="text-align: right; padding: 5px 0;">QTY</th>
          </tr>
        </thead>
        <tbody>
          ${targetOrder.items.map(item => `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 0.5px solid #eee;">${item.name}</td>
              <td style="text-align: right; padding: 8px 0; font-size: 18px; font-weight: bold; border-bottom: 0.5px solid #eee;">${item.quantity}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 20px; text-align: center; border-top: 1px dashed #000; padding-top: 10px;">
        <p style="font-size: 10px;">Latest Order Batch Only</p>
      </div>
    `;

    setTimeout(() => {
        window.print();
        printEl.innerHTML = '';
    }, 50);
  };

  const handlePrintBill = () => {
    const printEl = document.getElementById('print-section');
    if (!printEl) return;

    printEl.innerHTML = `
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 900;">HiTap POS</h1>
        <p style="margin: 5px 0; font-size: 14px; letter-spacing: 2px;">INVOICE</p>
        <p style="margin: 0; font-size: 14px; font-weight: bold;">Table: ${table.number}</p>
        <p style="margin: 0; font-size: 12px;">Bill ID: #${order.id.toString().slice(-6)}</p>
        <p style="margin: 0; font-size: 12px;">Date: ${new Date().toLocaleString()}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align: left; padding: 5px 0;">ITEM</th>
            <th style="text-align: right; padding: 5px 0;">QTY</th>
            <th style="text-align: right; padding: 5px 0;">PRICE</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td style="padding: 6px 0;">${item.name}</td>
              <td style="text-align: right; padding: 6px 0;">${item.quantity}</td>
              <td style="text-align: right; padding: 6px 0;">₹${item.price * item.quantity}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="border-top: 1px dashed #000; padding-top: 10px; font-size: 13px; line-height: 1.8;">
        <div style="display: flex; justify-content: space-between;">
          <span>Subtotal:</span>
          <span>₹${subTotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>GST (${gstRate}%):</span>
          <span>₹${gstAmount.toFixed(2)}</span>
        </div>
        ${isServiceTaxEnabled ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Service Tax (${serviceTaxRate}%):</span>
            <span>₹${serviceTaxAmount.toFixed(2)}</span>
          </div>
        ` : ''}
        ${discount > 0 ? `
          <div style="display: flex; justify-content: space-between; font-weight: bold; color: black;">
            <span>Discount:</span>
            <span>-₹${discount.toFixed(2)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: 900; border-top: 2px solid #000; margin-top: 10px; padding-top: 5px;">
          <span>GRAND TOTAL:</span>
          <span>₹${grandTotal.toFixed(2)}</span>
        </div>
      </div>
      <div style="text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
        <p style="font-size: 12px; font-weight: bold; margin: 0;">THANK YOU!</p>
        <p style="font-size: 10px; margin-top: 4px;">Visit us again</p>
        <p style="font-size: 8px; color: #666; margin-top: 10px;">HiTap POS System</p>
      </div>
    `;

    setTimeout(() => {
        window.print();
        printEl.innerHTML = '';
    }, 50);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in duration-200 h-[90vh]">
        {/* Bill Summary */}
        <div className="flex-1 p-10 bg-gray-50 overflow-y-auto no-scrollbar flex flex-col">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h3 className="text-3xl font-black text-slate-800">{table.number}</h3>
              <p className="text-xs text-gray-400 font-black uppercase tracking-widest mt-1">Full Running Bill</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 transition-all">✕</button>
          </header>

          <div className="space-y-4 mb-8">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center group">
                <div className="flex-1">
                  <p className="font-black text-slate-700">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{item.quantity} x ₹{item.price}</p>
                </div>
                <span className="font-black text-slate-900">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto border-t border-dashed border-gray-200 pt-8 space-y-3">
            <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
              <span>Subtotal</span>
              <span>₹{subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
              <span>GST (${gstRate}%)</span>
              <span>₹{gstAmount.toFixed(2)}</span>
            </div>
            {isServiceTaxEnabled && (
              <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                <span>Service Tax (${serviceTaxRate}%)</span>
                <span>₹{serviceTaxAmount.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-xs font-black text-rose-500 uppercase tracking-widest">
                <span>Discount Applied</span>
                <span>-₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-4xl font-black text-slate-900 pt-6 border-t border-gray-200 mt-6 tracking-tighter">
              <span>Total</span>
              <span className="text-blue-600">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment & Tax Controls */}
        <div className="w-full md:w-96 bg-white p-8 border-l border-gray-100 flex flex-col gap-6 overflow-y-auto no-scrollbar">
          
          {/* Tax Section */}
          <section className="space-y-4">
             <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
               <span className="w-1.5 h-3 bg-blue-600 rounded-full"></span>
               Tax & Charges
             </h4>
             
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">GST (%)</label>
                   <div className="relative">
                      <input 
                        type="number" 
                        step="0.1"
                        className="w-full p-3 bg-slate-50 rounded-xl border-none font-black text-sm text-slate-700"
                        value={gstRate}
                        onChange={(e) => setGstRate(Number(e.target.value))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 font-black">%</span>
                   </div>
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 flex items-center justify-between">
                     Service Tax
                     <button 
                       onClick={() => setIsServiceTaxEnabled(!isServiceTaxEnabled)}
                       className={`w-8 h-4 rounded-full transition-colors relative ${isServiceTaxEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                     >
                       <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isServiceTaxEnabled ? 'left-4.5' : 'left-0.5'}`}></div>
                     </button>
                   </label>
                   <div className="relative">
                      <input 
                        type="number" 
                        step="0.1"
                        disabled={!isServiceTaxEnabled}
                        className={`w-full p-3 bg-slate-50 rounded-xl border-none font-black text-sm text-slate-700 ${!isServiceTaxEnabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                        value={serviceTaxRate}
                        onChange={(e) => setServiceTaxRate(Number(e.target.value))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 font-black">%</span>
                   </div>
                </div>
             </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
               <span className="w-1.5 h-3 bg-rose-600 rounded-full"></span>
               Reductions
             </h4>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">Custom Discount (₹)</label>
              <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                  <input 
                      type="number" 
                      className="w-full pl-8 p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-black text-xl text-blue-600 shadow-inner"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                  />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">Split Bill</label>
            <div className="flex items-center bg-slate-50 rounded-2xl p-2 gap-2 shadow-inner">
               <button onClick={() => setSplitCount(Math.max(1, splitCount - 1))} className="w-12 h-12 rounded-xl bg-white shadow-sm font-black text-slate-400 hover:text-blue-600 transition-colors">−</button>
               <span className="flex-1 text-center font-black text-xl">{splitCount}</span>
               <button onClick={() => setSplitCount(splitCount + 1)} className="w-12 h-12 rounded-xl bg-white shadow-sm font-black text-slate-400 hover:text-blue-600 transition-colors">+</button>
            </div>
          </section>

          <section className="space-y-4 mt-auto pt-6 border-t border-gray-50">
            <div className="grid grid-cols-3 gap-2">
              {['Cash', 'Card', 'UPI'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setPaymentMethod(mode as any)}
                  className={`py-4 rounded-xl text-[10px] font-black tracking-widest transition-all border-2
                    ${paymentMethod === mode ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handlePrintBill}
                className="bg-blue-50 text-blue-600 py-4 rounded-[24px] font-black flex items-center justify-center gap-2 hover:bg-blue-100 transition-all active:scale-95 text-[10px] tracking-widest"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                PRINT BILL
              </button>
              <button 
                onClick={handlePrintKOT}
                className="bg-orange-50 text-orange-600 py-4 rounded-[24px] font-black flex items-center justify-center gap-2 hover:bg-orange-100 transition-all active:scale-95 text-[10px] tracking-widest"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                PRINT KOT
              </button>
            </div>
            
            <button 
              onClick={() => onSettle(order.id, table.id, grandTotal, gstAmount, serviceTaxAmount, paymentMethod)}
              className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg shadow-2xl active:scale-95 transition-transform hover:bg-slate-800"
            >
              SETTLE BILL
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BillingModule;
