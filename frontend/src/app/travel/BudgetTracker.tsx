"use client";
import { useState, useEffect } from "react";

interface Expense {
  id: string;
  category: string;
  item: string;
  amount: number;      // NT$
  paidIn: "TWD" | "CNY";
  date?: string;
}

interface BudgetCategory {
  key: string;
  emoji: string;
  label: string;
  color: string;
}

const CATEGORIES: BudgetCategory[] = [
  { key: "flight", emoji: "✈️", label: "機票", color: "#3b82f6" },
  { key: "hotel", emoji: "🏨", label: "住宿", color: "#8b5cf6" },
  { key: "ticket", emoji: "🎫", label: "門票/活動", color: "#10b981" },
  { key: "food", emoji: "🍜", label: "餐食", color: "#f59e0b" },
  { key: "transport", emoji: "🚗", label: "交通", color: "#6366f1" },
  { key: "shopping", emoji: "🛍️", label: "購物", color: "#ec4899" },
  { key: "other", emoji: "📦", label: "其他", color: "#6b7280" },
];

const PRESET_EXPENSES: Expense[] = [
  { id: "1", category: "flight", item: "CI 581 來回機票（2人）", amount: 30000, paidIn: "TWD" },
  { id: "2", category: "hotel", item: "杭州凱悅酒店（7晚）", amount: 14000, paidIn: "TWD" },
  { id: "3", category: "ticket", item: "烏鎮西柵門票（2人）", amount: 900, paidIn: "CNY" },
  { id: "4", category: "ticket", item: "西湖遊船 + 三潭印月（2人）", amount: 400, paidIn: "CNY" },
  { id: "5", category: "ticket", item: "靈隱寺 + 飛來峰（2人）", amount: 600, paidIn: "CNY" },
  { id: "6", category: "food", item: "龍井茶園品茶體驗（2人）", amount: 200, paidIn: "CNY" },
];

const STORAGE_KEY = "hangzhou-trip-budget";
const CNY_RATE = 4.5; // 1 CNY ≈ 4.5 TWD

export default function BudgetTracker() {
  const [budget, setBudget] = useState(50000); // 預設總預算 NT$
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [currencyMode, setCurrencyMode] = useState<"TWD" | "CNY">("TWD");
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    category: "food",
    item: "",
    amount: 0,
    paidIn: "TWD",
  });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setBudget(data.budget || 50000);
        setExpenses(data.expenses || []);
      } catch {
        setExpenses(PRESET_EXPENSES);
      }
    } else {
      setExpenses(PRESET_EXPENSES);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ budget, expenses }));
  }, [budget, expenses]);

  // Calculate totals
  const totalSpent = expenses.reduce((sum, e) => {
    const amount = e.paidIn === "CNY" ? e.amount * CNY_RATE : e.amount;
    return sum + amount;
  }, 0);
  
  const remaining = budget - totalSpent;
  const percentUsed = budget > 0 ? (totalSpent / budget) * 100 : 0;

  // Group by category
  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses
      .filter(e => e.category === cat.key)
      .reduce((sum, e) => sum + (e.paidIn === "CNY" ? e.amount * CNY_RATE : e.amount), 0),
  }));

  const handleAddExpense = () => {
    if (!newExpense.item || !newExpense.amount) {
      alert("請填寫項目和金額");
      return;
    }
    setExpenses(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        category: newExpense.category || "other",
        item: newExpense.item || "",
        amount: newExpense.amount || 0,
        paidIn: newExpense.paidIn || "TWD",
      } as Expense,
    ]);
    setNewExpense({ category: "food", item: "", amount: 0, paidIn: "TWD" });
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const getProgressColor = () => {
    if (percentUsed >= 100) return "#ef4444";
    if (percentUsed >= 80) return "#f59e0b";
    return "#10b981";
  };

  const fmt = (nt: number) => {
    if (currencyMode === "CNY") return `¥ ${Math.round(nt / CNY_RATE).toLocaleString()}`;
    return `NT$ ${Math.round(nt).toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-bold">💰 即時預算追蹤</h3>
        <div className="flex gap-2">
          {/* Currency toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setCurrencyMode("TWD")}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${currencyMode === "TWD" ? "bg-white shadow font-medium text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
            >
              NT$
            </button>
            <button
              onClick={() => setCurrencyMode("CNY")}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${currencyMode === "CNY" ? "bg-white shadow font-medium text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
            >
              ¥ CNY
            </button>
          </div>
          <button
            onClick={() => setEditingBudget(true)}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
          >
            調整預算
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors"
          >
            + 新增支出
          </button>
        </div>
      </div>

      {/* Budget Edit */}
      {editingBudget && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium mb-3">調整總預算</h4>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(Number(e.target.value))}
              className="border rounded px-3 py-2 text-sm w-32"
            />
            <span className="text-gray-600">{currencyMode === "CNY" ? "¥ CNY（人民幣）" : "NT$（新台幣）"}</span>
            <button
              onClick={() => setEditingBudget(false)}
              className="px-4 py-2 bg-teal-500 text-white text-sm rounded hover:bg-teal-600"
            >
              確認
            </button>
          </div>
        </div>
      )}

      {/* Add Expense Form */}
      {showAdd && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <h4 className="font-medium mb-3">新增支出</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newExpense.category}
                onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                className="border rounded px-3 py-2 text-sm"
              >
                {CATEGORIES.map(c => (
                  <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
                ))}
              </select>
              <select
                value={newExpense.paidIn}
                onChange={e => setNewExpense({ ...newExpense, paidIn: e.target.value as "TWD" | "CNY" })}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="TWD">NT$ 台幣</option>
                <option value="CNY">¥ 人民幣</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="項目名稱"
              value={newExpense.item}
              onChange={e => setNewExpense({ ...newExpense, item: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="金額"
                value={newExpense.amount || ""}
                onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                className="border rounded px-3 py-2 text-sm w-32"
              />
              <span className="text-gray-600">{newExpense.paidIn === "TWD" ? "NT$" : "¥"}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddExpense}
                className="px-4 py-2 bg-teal-500 text-white text-sm rounded hover:bg-teal-600"
              >
                確認新增
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewExpense({ category: "food", item: "", amount: 0, paidIn: "TWD" }); }}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">總預算</div>
          <div className="text-lg font-bold text-blue-600">{fmt(budget)}</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-600 mb-1">已花費</div>
          <div className="text-lg font-bold text-orange-600">{fmt(Math.round(totalSpent))}</div>
        </div>
        <div className={`border rounded-lg p-4 text-center ${remaining < 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
          <div className="text-xs text-gray-600 mb-1">剩餘</div>
          <div className={`text-lg font-bold ${remaining < 0 ? "text-red-600" : "text-green-600"}`}>
            {fmt(Math.round(remaining))}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${Math.min(percentUsed, 100)}%`,
            backgroundColor: getProgressColor(),
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>0%</span>
        <span>{Math.round(percentUsed)}% 已使用</span>
        <span>100%</span>
      </div>

      {/* Category Breakdown */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 font-medium text-sm">📊 分類支出</div>
        <div className="divide-y">
          {byCategory.map(cat => (
            <div key={cat.key} className="px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{cat.emoji}</span>
                <span className="text-sm">{cat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: cat.color }}>
                  {fmt(Math.round(cat.total))}
                </span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expense List */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 font-medium text-sm">📝 支出明細</div>
        <div className="divide-y max-h-64 overflow-y-auto">
          {expenses.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              還沒有支出記錄，點擊「新增支出」開始記帳
            </div>
          ) : (
            expenses.map(expense => {
              const cat = CATEGORIES.find(c => c.key === expense.category);
              const displayAmount = currencyMode === "CNY"
                ? `¥${expense.paidIn === "CNY" ? expense.amount.toLocaleString() : Math.round(expense.amount / CNY_RATE).toLocaleString()}`
                : expense.paidIn === "CNY"
                  ? `¥${expense.amount.toLocaleString()} (~NT$ ${Math.round(expense.amount * CNY_RATE).toLocaleString()})`
                  : `NT$ ${expense.amount.toLocaleString()}`;
              return (
                <div key={expense.id} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span>{cat?.emoji || "📦"}</span>
                    <div>
                      <div className="text-sm">{expense.item}</div>
                      <div className="text-xs text-gray-500">{cat?.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">{displayAmount}</span>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-gray-400 hover:text-red-500 text-sm"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Currency Note */}
      <div className="text-xs text-gray-400 text-center">
        💡 目前顯示：{currencyMode === "CNY" ? "¥ 人民幣" : "NT$ 新台幣"}（{currencyMode === "CNY" ? `1 TWD ≈ ${(1/CNY_RATE).toFixed(2)} CNY` : `1 CNY ≈ ${CNY_RATE} TWD`}）
      </div>
    </div>
  );
}
