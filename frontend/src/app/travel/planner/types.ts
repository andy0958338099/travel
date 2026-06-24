// Planner page shared types
// 票種（每個活動可以有多個票種，如全票/早鳥票/優惠票）
export interface TicketType {
  id: string;       // local id within the activity (e.g., "t1")
  name: string;    // e.g., "全票", "早鳥票", "優惠票"
  price: number;   // 票種價格 (TWD)
  purchasedBy: string[]; // 已購買此票種的成員 ID 清單
}

export interface Activity {
  id: string;
  title: string;
  day: number;       // 1-8
  startHour: number; // 0-23 (內部用，不顯示)
  duration: number;  // 小時數（內部用）
  color: string;
  notes?: string;
  cost?: number;     // 每人花費 (TWD) — 預設參考（第一個票種價格）
  costType?: 'ticket' | 'food' | 'transport' | 'accommodation' | 'flight' | 'spot' | 'shopping';
  tickets?: TicketType[];
}

export interface Member {
  id: string;
  name: string;
  color: string; // 頭像背景色
}

export interface BudgetSummaryProps {
  activities: Activity[];
  memberCount: number;
  onPersonCountChange: (n: number) => void;
}

export interface MemberManagerProps {
  members: Member[];
  onUpdate: (members: Member[]) => void;
  onClose: () => void;
}