import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  DollarSign, 
  ShieldAlert, 
  FileText, 
  Briefcase, 
  Plus, 
  Trash2, 
  Check, 
  Warehouse, 
  PiggyBank, 
  PieChart as PieIcon, 
  Layers 
} from "lucide-react";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  cropCycle: string;
}

interface InventoryItem {
  id: string;
  category: string;
  item: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalValue: number;
  lastUpdated: string;
}

export function FinanceDashboard({ activeFarmerId = "USR-701" }: { activeFarmerId?: string }) {
  const [activeTab, setActiveTab] = useState<"overview" | "expenses" | "inventory" | "loans">("overview");
  
  // Data States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Expense Form States
  const [expenseCategory, setExpenseCategory] = useState<any>("Seeds");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseCycle, setExpenseCycle] = useState("Kharif Chilli 2026");

  // New Inventory Form States
  const [invCategory, setInvCategory] = useState<any>("Seeds");
  const [invItem, setInvItem] = useState("");
  const [invQty, setInvQty] = useState("");
  const [invUnit, setInvUnit] = useState("bags");
  const [invCost, setInvCost] = useState("");

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      const expRes = await fetch(`/api/expenses?farmerId=${activeFarmerId}`);
      const expData = await expRes.json();
      if (expData.success) {
        setExpenses(expData.expenses);
      }

      const invRes = await fetch(`/api/inventory?farmerId=${activeFarmerId}`);
      const invData = await invRes.json();
      if (invData.success) {
        setInventory(invData.inventory);
      }
    } catch (err) {
      console.error("Failed to load financials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, [activeFarmerId]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || Number(expenseAmount) <= 0) return;

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: activeFarmerId,
          category: expenseCategory,
          description: expenseDesc || `${expenseCategory} Purchase`,
          amount: Number(expenseAmount),
          date: expenseDate || new Date().toISOString().split("T")[0],
          cropCycle: expenseCycle
        })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh
        fetchFinancials();
        // Reset
        setExpenseDesc("");
        setExpenseAmount("");
      }
    } catch (err) {
      console.error("Failed to add expense:", err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchFinancials();
      }
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invItem || !invQty || !invCost) return;

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: activeFarmerId,
          category: invCategory,
          item: invItem,
          quantity: Number(invQty),
          unit: invUnit,
          unitCost: Number(invCost)
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchFinancials();
        setInvItem("");
        setInvQty("");
        setInvCost("");
      }
    } catch (err) {
      console.error("Failed to add inventory:", err);
    }
  };

  const handleDeleteInventory = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchFinancials();
      }
    } catch (err) {
      console.error("Failed to delete inventory:", err);
    }
  };

  // Aggregated Calculations
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
  
  // Simulated Revenue projection based on crops (Guntur Chilli average yield is ~1.8 Tons/Acre at ~20,000 INR/Quintal)
  // 1.8 Tons = 18 Quintals = 18 * 20000 = 360,000 INR revenue per acre.
  // Guntur default size is 7.4 acres => ~2,600,000 INR projected revenue
  const projectedRevenue = 360000 * 7.4;
  const projectedProfit = projectedRevenue - totalExpenses;

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E0E5D8] shadow-sm flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0F4E8] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A2E1A] flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#2D5A27]" /> Integrated Farm Ledger &amp; Warehouse Inventory
          </h2>
          <p className="text-xs text-[#8A9A8A] mt-0.5">
            Synchronize crop cycle investment ledger sheets, live seed stock levels, active loans, and crop insurance policies.
          </p>
        </div>

        {/* Navigation Tabs inside Finance */}
        <div className="flex bg-[#F8F9F5] p-1.5 rounded-2xl border border-[#E0E5D8] text-xs font-semibold self-start sm:self-center">
          <button 
            onClick={() => setActiveTab("overview")} 
            className={`px-3 py-1.5 rounded-xl transition-all ${activeTab === "overview" ? "bg-white text-[#2D5A27] shadow-sm font-bold" : "text-[#5C6B5C] hover:text-[#2D5A27]"}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab("expenses")} 
            className={`px-3 py-1.5 rounded-xl transition-all ${activeTab === "expenses" ? "bg-white text-[#2D5A27] shadow-sm font-bold" : "text-[#5C6B5C] hover:text-[#2D5A27]"}`}
          >
            Expenses Tracker
          </button>
          <button 
            onClick={() => setActiveTab("inventory")} 
            className={`px-3 py-1.5 rounded-xl transition-all ${activeTab === "inventory" ? "bg-white text-[#2D5A27] shadow-sm font-bold" : "text-[#5C6B5C] hover:text-[#2D5A27]"}`}
          >
            Warehouse Stock
          </button>
          <button 
            onClick={() => setActiveTab("loans")} 
            className={`px-3 py-1.5 rounded-xl transition-all ${activeTab === "loans" ? "bg-white text-[#2D5A27] shadow-sm font-bold" : "text-[#5C6B5C] hover:text-[#2D5A27]"}`}
          >
            Loans &amp; Insurance
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="animate-spin w-8 h-8 border-3 border-[#2D5A27] border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-xs font-semibold text-[#5C6B5C]">Loading financial ledger database...</p>
        </div>
      ) : (
        <>
          {/* ================= OVERVIEW TAB ================= */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl p-4">
                  <div className="flex justify-between items-center text-xs text-[#8A9A8A] mb-1">
                    <span>Invested Capital</span>
                    <DollarSign className="w-4 h-4 text-[#2D5A27]" />
                  </div>
                  <p className="text-2xl font-black text-[#1A2E1A]">₹{totalExpenses.toLocaleString()}</p>
                  <p className="text-[10px] text-[#2D5A27] font-semibold mt-1">Current crop cycle total</p>
                </div>

                <div className="bg-[#F0F4E8] border border-emerald-200 rounded-2xl p-4">
                  <div className="flex justify-between items-center text-xs text-[#2D5A27] mb-1">
                    <span>Projected Revenue</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-[#2D5A27]">₹{projectedRevenue.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-800 font-semibold mt-1">Yield: 13.32 Tons total</p>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                  <div className="flex justify-between items-center text-xs text-emerald-700 mb-1">
                    <span>Net Margin Forecast</span>
                    <PiggyBank className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-emerald-700">₹{projectedProfit.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-800 font-semibold mt-1">ROI: {Math.round((projectedProfit / (totalExpenses || 1)) * 100)}%</p>
                </div>

                <div className="bg-[#FAFBF9] border border-[#E0E5D8] rounded-2xl p-4">
                  <div className="flex justify-between items-center text-xs text-[#8A9A8A] mb-1">
                    <span>In-Warehouse Value</span>
                    <Warehouse className="w-4 h-4 text-[#8A9A8A]" />
                  </div>
                  <p className="text-2xl font-black text-[#2D3628]">₹{totalInventoryValue.toLocaleString()}</p>
                  <p className="text-[10px] text-[#8A9A8A] font-semibold mt-1">Current asset valuation</p>
                </div>
              </div>

              {/* Bento Row with charts and summaries */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 p-5 bg-[#FAFBF9] border border-[#E0E5D8] rounded-2xl">
                  <h3 className="text-xs font-bold uppercase text-[#8A9A8A] tracking-wider mb-4">Investment Distribution</h3>
                  {expenses.length === 0 ? (
                    <p className="text-xs text-center text-[#8A9A8A] py-10">No expenses recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {["Seeds", "Fertilizer", "Pesticides", "Labour", "Machinery Rental", "Fuel", "Water/Electricity", "Loans & EMIs"].map(cat => {
                        const amount = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
                        const percent = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
                        if (amount === 0) return null;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-[#2D3628]">
                              <span>{cat}</span>
                              <span>₹{amount.toLocaleString()} ({percent}%)</span>
                            </div>
                            <div className="w-full h-2 bg-[#E0E5D8] rounded-full overflow-hidden">
                              <div className="h-full bg-[#2D5A27] rounded-full" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4 bg-[#FFF9E6] border border-[#F5E6B5] p-5 rounded-2xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase text-[#A67C00] flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-[#A67C00]" /> Financial Health Insights
                    </h4>
                    <p className="text-xs text-[#735A0C] leading-relaxed">
                      Your debt-to-capital ratio stands at <strong>14.2%</strong>. This indicates robust loan leverage conditions. We recommend securing PM-FBY Crop Insurance for your high-value red chilli block today to guard against unseasonable rainfall.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-[#F5E6B5] text-[11px] text-[#A67C00] font-bold">
                    PM Kisan Samman Nidhi Subsidy: Eligible
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= EXPENSES TAB ================= */}
          {activeTab === "expenses" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Block */}
              <div className="lg:col-span-4 bg-[#F8F9F5] border border-[#E0E5D8] p-5 rounded-2xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A9A8A] mb-4">Record New Farm Expense</h3>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Expense Category:</label>
                    <select 
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-white font-semibold text-[#2D5A27] outline-none"
                    >
                      <option value="Seeds">Seeds Purchase</option>
                      <option value="Fertilizer">Fertilizers</option>
                      <option value="Pesticides">Pesticides</option>
                      <option value="Labour">Labour Wages</option>
                      <option value="Machinery Rental">Machinery / Tractor Rental</option>
                      <option value="Fuel">Diesel / Fuel</option>
                      <option value="Water/Electricity">Irrigation Water / Power</option>
                      <option value="Loans & EMIs">Loan repayment EMI</option>
                      <option value="Insurance Premium">Insurance Premium</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Amount (INR):</label>
                    <input 
                      type="number" 
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="e.g. 3500"
                      className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-white outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Item Description:</label>
                    <input 
                      type="text" 
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                      placeholder="e.g. Neem Coated Urea (10 bags)"
                      className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Date:</label>
                      <input 
                        type="date" 
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Crop Cycle:</label>
                      <input 
                        type="text" 
                        value={expenseCycle}
                        onChange={(e) => setExpenseCycle(e.target.value)}
                        placeholder="Kharif 2026"
                        className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-white outline-none"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#2D5A27] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#1E3E1A] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Save Expense Record
                  </button>
                </form>
              </div>

              {/* Table Block */}
              <div className="lg:col-span-8 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A9A8A]">Crop Investment Ledger</h3>
                <div className="max-h-96 overflow-y-auto border border-[#E0E5D8] rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F8F9F5] border-b border-[#E0E5D8] sticky top-0 font-bold text-[#5C6B5C]">
                      <tr>
                        <th className="p-3">Category</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F4E8]">
                      {expenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-[#8A9A8A]">No expenses recorded yet.</td>
                        </tr>
                      ) : (
                        expenses.map(e => (
                          <tr key={e.id} className="hover:bg-[#FAFBF9]">
                            <td className="p-3 font-bold text-[#2D5A27]">{e.category}</td>
                            <td className="p-3 text-[#2D3628]">{e.description}</td>
                            <td className="p-3 font-bold">₹{e.amount.toLocaleString()}</td>
                            <td className="p-3 text-[#5C6B5C]">{e.date}</td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => handleDeleteExpense(e.id)}
                                className="p-1 hover:bg-red-50 text-red-600 rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= INVENTORY TAB ================= */}
          {activeTab === "inventory" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Block */}
              <div className="lg:col-span-4 bg-[#F8F9F5] border border-[#E0E5D8] p-5 rounded-2xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A9A8A] mb-4">Add Seeds / Fertilizers Stock</h3>
                <form onSubmit={handleAddInventory} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Item Category:</label>
                    <select 
                      value={invCategory}
                      onChange={(e) => setInvCategory(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-white font-semibold text-[#2D5A27] outline-none"
                    >
                      <option value="Seeds">Seeds Stock</option>
                      <option value="Fertilizer">Fertilizers</option>
                      <option value="Pesticides">Pesticides / Bio-sprays</option>
                      <option value="Machinery">Machinery &amp; Equipment</option>
                      <option value="Fuel">Fuel Storage</option>
                      <option value="Irrigation & Pipes">Pipes &amp; Fittings</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Item Name:</label>
                    <input 
                      type="text" 
                      value={invItem}
                      onChange={(e) => setInvItem(e.target.value)}
                      placeholder="e.g. Neem-Coated Urea"
                      className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-white outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Quantity:</label>
                      <input 
                        type="number" 
                        value={invQty}
                        onChange={(e) => setInvQty(e.target.value)}
                        placeholder="e.g. 15"
                        className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-white outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Unit:</label>
                      <select 
                        value={invUnit}
                        onChange={(e) => setInvUnit(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-white outline-none"
                      >
                        <option value="bags">bags</option>
                        <option value="packets">packets</option>
                        <option value="litres">litres</option>
                        <option value="meters">meters</option>
                        <option value="units">units</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Unit Cost (INR):</label>
                    <input 
                      type="number" 
                      value={invCost}
                      onChange={(e) => setInvCost(e.target.value)}
                      placeholder="e.g. 350"
                      className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-white outline-none"
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#2D5A27] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#1E3E1A] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Warehouse className="w-4 h-4" /> Add to Warehouse
                  </button>
                </form>
              </div>

              {/* Inventory Table List */}
              <div className="lg:col-span-8 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A9A8A]">Warehouse Supplies Inventory</h3>
                <div className="max-h-96 overflow-y-auto border border-[#E0E5D8] rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F8F9F5] border-b border-[#E0E5D8] sticky top-0 font-bold text-[#5C6B5C]">
                      <tr>
                        <th className="p-3">Category</th>
                        <th className="p-3">Supply Item</th>
                        <th className="p-3">Stock Level</th>
                        <th className="p-3">Unit Price</th>
                        <th className="p-3">Total Value</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F4E8]">
                      {inventory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[#8A9A8A]">No items currently stocked in warehouse.</td>
                        </tr>
                      ) : (
                        inventory.map(item => (
                          <tr key={item.id} className="hover:bg-[#FAFBF9]">
                            <td className="p-3 font-semibold text-[#2D5A27]">{item.category}</td>
                            <td className="p-3 font-bold text-[#2D3628]">{item.item}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${item.quantity <= 3 ? "bg-red-100 text-red-800" : "bg-[#F0F4E8] text-[#2D5A27]"}`}>
                                {item.quantity} {item.unit} {item.quantity <= 3 && "(Low)"}
                              </span>
                            </td>
                            <td className="p-3">₹{item.unitCost.toLocaleString()}</td>
                            <td className="p-3 font-bold">₹{item.totalValue.toLocaleString()}</td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => handleDeleteInventory(item.id)}
                                className="p-1 hover:bg-red-50 text-red-600 rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= LOANS TAB ================= */}
          {activeTab === "loans" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#FAFBF9] border border-[#E0E5D8] p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-[#E0E5D8]">
                  <h3 className="font-bold text-sm text-[#1A2E1A]">Outstanding Agri Loans</h3>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded">PM-KISAN KCC</span>
                </div>
                
                <div className="space-y-3">
                  <div className="p-4 bg-white border border-[#E0E5D8] rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs text-[#8A9A8A]">Cooperative Crop Loan</p>
                      <p className="font-black text-lg text-[#1A2E1A]">₹1,20,000</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#2D5A27] font-bold">Rate: 4.0% p.a. (Subsidized)</p>
                      <p className="text-[10px] text-[#8A9A8A]">Next EMI: ₹5,000 / July 15</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-[#E0E5D8] rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs text-[#8A9A8A]">Micro-Irrigation Subsidy Loan</p>
                      <p className="font-black text-lg text-[#1A2E1A]">₹45,000</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#2D5A27] font-bold">Rate: Interest-Free (NABARD)</p>
                      <p className="text-[10px] text-[#8A9A8A]">Next EMI: ₹2,500 / Aug 01</p>
                    </div>
                  </div>
                </div>

                <button className="w-full bg-[#2D5A27] text-white py-2 rounded-xl text-xs font-bold hover:bg-[#1E3E1A] transition-all">
                  Request Loan Restructuring or Subsidy Claim
                </button>
              </div>

              <div className="bg-[#FAFBF9] border border-[#E0E5D8] p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-[#E0E5D8]">
                  <h3 className="font-bold text-sm text-[#1A2E1A]">Crop Insurance Policy (PMFBY)</h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded">Active</span>
                </div>

                <div className="p-4 bg-white border border-[#E0E5D8] rounded-xl space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8A9A8A]">Policy Number:</span>
                    <span className="font-bold">PMFBY-2026-AP-99231</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8A9A8A]">Sum Insured:</span>
                    <span className="font-bold text-[#2D5A27]">₹3,70,000</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8A9A8A]">Annual Premium Paid:</span>
                    <span className="font-bold">₹7,400 (2.0% Farmer share)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8A9A8A]">Risk Covered:</span>
                    <span className="font-bold text-red-600">Monsoon Failure, Inundation, Pest Swarms</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-[#2D5A27]">
                  <strong>Automatic Weather Claim Trigger:</strong> Connected directly to localized RSK IMD weather stations. In the event of unseasonable rains &gt;50mm in 24 hrs, claim evaluations trigger automatically.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
