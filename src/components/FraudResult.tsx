"use client";

import { useState } from "react";
import type { FraudDetectionResult } from "@/lib/types";

interface FraudResultProps {
  result: FraudDetectionResult;
}

const riskMeta: Record<string, { cls: string; icon: string; label: string }> = {
  high:    { cls: "risk-high",   icon: "⚠️", label: "高危" },
  medium:  { cls: "risk-medium", icon: "⚡", label: "可疑" },
  low:     { cls: "risk-low",    icon: "👀", label: "低风险" },
  safe:    { cls: "risk-safe",   icon: "✅", label: "安全" },
  unknown: { cls: "risk-medium", icon: "❓", label: "不好判断" },
};

const confCls = (v: number) =>
  v >= 85 ? "confidence-high" : v >= 60 ? "confidence-medium" : "confidence-low";

export default function FraudResult({ result }: FraudResultProps) {
  const m = riskMeta[result.risk_level] ?? riskMeta.unknown;
  const cardTone =
    result.risk_level === "high" ? "card-danger"
    : result.risk_level === "medium" ? "card-warning"
    : "card-safe";

  return (
    <div className="stack">
      {/* ── Risk Banner ── */}
      <div className="card" style={{ textAlign: "center", padding: "24px 20px" }}>
        <span className={`risk-badge ${m.cls}`}>
          <span style={{ fontSize: 22 }}>{m.icon}</span>
          <span style={{ fontSize: 22 }}>{m.label}</span>
        </span>

        {result.scene_type !== "其他" && (
          <p className="mt-12 mb-0" style={{ fontSize: 15, color: "var(--muted)" }}>
            这很像：<strong style={{ color: "var(--text)" }}>{result.scene_type}</strong>
          </p>
        )}

        <div className="confidence-bar" style={{ marginTop: 14 }}>
          <div
            className={`confidence-fill ${confCls(result.confidence)}`}
            style={{ width: `${result.confidence}%` }}
          />
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
          AI 置信度 {result.confidence}%
        </p>
      </div>

      {/* ── Plain Explain ── */}
      <div className={`card ${cardTone}`}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          大白话解释
        </h3>
        <p style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px", lineHeight: 1.3 }}>
          {result.plain_explain.title}
        </p>
        <div style={{
          padding: "14px 16px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.03)",
          lineHeight: 1.8,
          fontSize: 16,
        }}>
          <p style={{ margin: "0 0 8px" }}>{result.plain_explain.what_happened}</p>
          {result.risk_level !== "safe" && (
            <p className="text-danger fw-700" style={{ margin: 0 }}>
              {result.plain_explain.why_dangerous}
            </p>
          )}
        </div>
      </div>

      {/* ── Red Flags ── */}
      {result.red_flags.length > 0 && (
        <div className="card">
          <h3 className="section-title">可疑信号</h3>
          {result.red_flags.map((flag, i) => (
            <div key={i} className="red-flag-item">
              <span style={{ color: "var(--danger)", fontWeight: 700, flexShrink: 0 }}>
                {i + 1}.
              </span>
              <span>{flag}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Next Actions ── */}
      <div className="card">
        <h3 className="section-title">接下来怎么做</h3>

        {result.next_actions.dont.length > 0 && (
          <div className="mb-12">
            <p className="text-danger fw-700 mb-12" style={{ fontSize: 14 }}>
              千万不要：
            </p>
            {result.next_actions.dont.map((item, i) => (
              <div key={i} className="action-card action-dont">
                ❌ {item}
              </div>
            ))}
          </div>
        )}

        {result.next_actions.do.length > 0 && (
          <div>
            <p className="text-safe fw-700 mb-12" style={{ fontSize: 14 }}>
              应该这样做：
            </p>
            {result.next_actions.do.map((item, i) => (
              <div key={i} className="action-card action-do">
                ✅ {item}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Family Card ── */}
      {result.family_message && <FamilyShareCard message={result.family_message} />}
    </div>
  );
}

function FamilyShareCard({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "银发守护 — 帮我看一条消息", text: message });
      } catch { /* cancelled */ }
    } else {
      handleCopy();
    }
  };

  const handleSms = () => {
    const body = encodeURIComponent(message);
    const mobileLink = `sms:?&body=${body}`;
    window.location.href = mobileLink;
  };

  return (
    <div className="family-card">
      <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>
        发给子女确认
      </h3>
      <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--muted)" }}>
        一键转发，让家人帮你一起判断
      </p>
      <div className="family-card-message">{message}</div>
      <div className="family-actions">
        <button className="btn btn-primary btn-large" onClick={handleShare}>
          📤 转发给子女
        </button>
        <button
          className="btn btn-outline"
          onClick={handleCopy}
        >
          {copied ? "✅ 已复制" : "📋 复制"}
        </button>
        <button className="btn btn-outline" onClick={handleSms}>
          短信发送
        </button>
      </div>
    </div>
  );
}
