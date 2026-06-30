"use client";

import type { AppTab } from "@/lib/types";

interface TabBarProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const tabs: { key: AppTab; icon: string; label: string }[] = [
  { key: "home", icon: "🏠", label: "首页" },
  { key: "service", icon: "📋", label: "办事" },
  { key: "reminder", icon: "⏰", label: "提醒" },
  { key: "history", icon: "📝", label: "记录" },
];

export default function TabBar({ currentTab, onTabChange }: TabBarProps) {
  return (
    <nav className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tab-item ${currentTab === tab.key ? "active" : ""}`}
          onClick={() => onTabChange(tab.key)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
