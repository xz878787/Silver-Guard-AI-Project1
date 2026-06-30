"use client";

import { useState, useEffect } from "react";
import type { HistoryRecord } from "@/lib/types";
import { getHistory, deleteRecord, clearHistory } from "@/lib/storage";

interface HistoryListProps {
  onSelect: (record: HistoryRecord) => void;
  refreshKey: number;
}

export default function HistoryList({ onSelect, refreshKey }: HistoryListProps) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    setRecords(getHistory());
  }, [refreshKey]);

  if (records.length === 0) {
    return (
      <div className="empty-state card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
        <h3>还没有记录</h3>
        <p style={{ margin: "0 0 4px" }}>去首页试试识别一条消息吧</p>
      </div>
    );
  }

  const modeLabel = (m: string) =>
    m === "fraud" ? "诈骗识别" : m === "service" ? "办事陪练" : "关怀提醒";

  return (
    <div>
      <div className="flex-between mb-16">
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>最近记录</h2>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 14, color: "var(--danger)", padding: "6px 12px", minHeight: "auto" }}
          onClick={() => {
            if (confirm("确定删除全部记录？")) {
              clearHistory();
              setRecords([]);
            }
          }}
        >
          清空全部
        </button>
      </div>

      {records.map((record) => (
        <div
          key={record.id}
          className="history-item"
          onClick={() => onSelect(record)}
        >
          <div className="flex-between mb-12" style={{ marginBottom: 6 }}>
            <span className="tag">{modeLabel(record.mode)}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {formatTime(record.createdAt)}
            </span>
          </div>
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            {record.input}
          </div>
          <div className="flex-between">
            {record.mode === "fraud" && "risk_level" in record.result && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color:
                    record.result.risk_level === "high"
                      ? "var(--danger)"
                      : record.result.risk_level === "medium"
                        ? "var(--warn)"
                        : "var(--safe)",
                }}
              >
                {record.result.risk_label}
              </span>
            )}
            <button
              className="btn btn-ghost"
              style={{ fontSize: 13, padding: "4px 8px", minHeight: "auto", marginLeft: "auto" }}
              onClick={(e) => {
                e.stopPropagation();
                deleteRecord(record.id);
                setRecords(getHistory());
              }}
            >
              删除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);

  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  if (h < 24) return `${h} 小时前`;
  if (d < 7) return `${d} 天前`;

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
