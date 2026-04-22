"use client";

import { useState } from "react";
import {
  LayoutDashboard, LineChart, BarChart3, ListOrdered,
  Moon, Sun, ChevronLeft, ChevronRight, TrendingUp,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "trades", label: "Trade Log", icon: ListOrdered },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "equity", label: "Equity Curve", icon: LineChart },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);

  return (
    <aside
      className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-200 ${collapsed ? "w-14" : "w-52"}`}
      style={{ minHeight: "100vh" }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2 px-4 py-4 border-b border-gray-100 ${collapsed ? "justify-center px-0" : ""}`}>
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-900 leading-none tracking-tight">PACS</p>
            <p className="text-[9px] text-gray-400 tracking-widest uppercase mt-0.5">Trade Studio</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
                active
                  ? "bg-gray-100 text-gray-900 font-semibold"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? label : undefined}
            >
              <Icon className={`flex-shrink-0 ${active ? "w-4 h-4 text-gray-900" : "w-4 h-4 text-gray-400"}`} />
              {!collapsed && <span className="text-[13px]">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className={`border-t border-gray-100 px-2 py-3 space-y-1`}>
        {/* Dark mode toggle */}
        <button
          onClick={() => setDark(!dark)}
          className={`w-full flex items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? (dark ? "Light mode" : "Dark mode") : undefined}
        >
          {dark ? <Sun className="w-4 h-4 text-gray-400" /> : <Moon className="w-4 h-4 text-gray-400" />}
          {!collapsed && <span className="text-[13px]">{dark ? "Light mode" : "Dark mode"}</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-400 hover:bg-gray-50 transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-[13px]">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
