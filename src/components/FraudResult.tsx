"use client";

import { useEffect, useMemo, useState } from "react";
import type { FraudDetectionResult } from "@/lib/types";

interface FraudResultProps {
  result: FraudDetectionResult;
  analysisMode?: "real" | "mock" | "fallback";
}

const riskMeta = {
  high: { cls: "risk-high", icon: "!", label: "高危骗局", headline: "立即停止，不要转账", reassurance: "先别怕，现在停下来还来得及" },
  medium: { cls: "risk-medium", icon: "?", label: "高度可疑", headline: "先不要操作，找家人核实", reassurance: "多确认一次，就少一分风险" },
  low: { cls: "risk-low", icon: "i", label: "低风险", headline: "暂未发现明显骗局", reassurance: "仍不要随意透露验证码和密码" },
  safe: { cls: "risk-safe", icon: "✓", label: "基本安全", headline: "可以放心，但仍需保护隐私", reassurance: "这条消息没有明显诈骗特征" },
  unknown: { cls: "risk-medium", icon: "?", label: "信息不足", headline: "暂时不要操作", reassurance: "请让家人或官方客服再确认" },
} as const;

export default function FraudResult({ result, analysisMode = "mock" }: FraudResultProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const m = riskMeta[result.risk_level] ?? riskMeta.unknown;
  const speechText = useMemo(() => {
    const stops = result.next_actions.dont.slice(0, 2).join("。不要");
    const actions = result.next_actions.do.slice(0, 2).join("。然后");
    return `${m.label}。${m.headline}。${result.plain_explain.title}。${result.plain_explain.what_happened}。${stops ? `不要${stops}。` : ""}${actions ? `建议${actions}。` : ""}`;
  }, [m, result]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const toggleSpeak = () => {
    if (!("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "zh-CN";
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <section className={`result-experience result-${result.risk_level}`} aria-live="polite">
      <div className="result-hero">
        <div className={`risk-orb ${m.cls}`} aria-hidden="true">{m.icon}</div>
        <span className="result-step">第 2 步 · AI 判断完成</span>
        <h2>{m.headline}</h2>
        <p className="risk-reassurance">{m.reassurance}</p>
        <div className="result-meta-row">
          <span className={`risk-pill ${m.cls}`}>{m.label}</span>
          {result.scene_type !== "其他" && <span className="scene-pill">像是：{result.scene_type}</span>}
          <span className="confidence-pill">可信度 {result.confidence}%</span>
        </div>
        <button className={`speak-button ${isSpeaking ? "is-speaking" : ""}`} type="button" onClick={toggleSpeak}>
          <span>{isSpeaking ? "◼" : "🔊"}</span>{isSpeaking ? "停止朗读" : "大声读给我听"}
        </button>
      </div>

      <div className="analysis-source">
        <span className={`source-dot source-${analysisMode}`} />
        {analysisMode === "real" ? "真实 AI 已完成在线分析，并经过本地安全规则复核" : analysisMode === "fallback" ? "真实 AI 未连接，本结果来自本地核验规则" : "离线演示引擎已完成分析"}
      </div>

      <div className="result-grid">
        <article className="result-card explain-card">
          <span className="card-label">一句话说明</span>
          <h3>{result.plain_explain.title}</h3>
          <p>{result.plain_explain.what_happened}</p>
          {["high", "medium", "unknown"].includes(result.risk_level) && (
            <p className="danger-reason">{result.plain_explain.why_dangerous}</p>
          )}
          {result.risk_level === "low" && <p className="low-risk-note">{result.plain_explain.why_dangerous}</p>}
        </article>

        {result.red_flags.length > 0 && (
          <article className="result-card flag-card">
            <span className="card-label">发现 {result.red_flags.length} 个危险信号</span>
            <div className="flag-list">
              {result.red_flags.map((flag, i) => <div key={flag}><span>{i + 1}</span><p>{flag}</p></div>)}
            </div>
          </article>
        )}
      </div>

      <article className="action-command-card">
        <div className="action-command-heading">
          <span className="step-kicker">第 3 步</span>
          <h3>现在照着做</h3>
        </div>
        <div className="action-columns">
          {result.next_actions.dont.length > 0 && (
            <div className="action-column stop-column"><h4>马上停止</h4>{result.next_actions.dont.map((item) => <div className="command-item" key={item}><span>×</span>{item}</div>)}</div>
          )}
          {result.next_actions.do.length > 0 && (
            <div className="action-column go-column"><h4>安全做法</h4>{result.next_actions.do.map((item) => <div className="command-item" key={item}><span>✓</span>{item}</div>)}</div>
          )}
        </div>
      </article>

      {result.family_message && <FamilyShareCard message={result.family_message} riskLabel={m.label} />}
    </section>
  );
}

function FamilyShareCard({ message, riskLabel }: { message: string; riskLabel: string }) {
  const [copied, setCopied] = useState(false);
  const completeMessage = `【银发守护求助】风险判断：${riskLabel}\n${message}\n\n我还没有转账或点击链接，请帮我核实一下。`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(completeMessage);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = completeMessage;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "银发守护求助卡", text: completeMessage }); } catch { /* user cancelled */ }
    } else {
      await handleCopy();
    }
  };

  return (
    <article className="family-help-card">
      <div className="family-help-heading">
        <div className="family-avatar-group"><span>👵</span><span>👨‍👩‍👧</span></div>
        <div><span className="step-kicker light">第 4 步 · 请家人把关</span><h3>一键发给家人求助</h3></div>
      </div>
      <div className="help-message"><span>已帮你写好：</span><p>{completeMessage}</p></div>
      <div className="family-help-actions">
        <button className="btn help-primary" onClick={handleCopy}>{copied ? "✓ 已复制，可去微信粘贴" : "📋 一键复制家属文案"}</button>
        <button className="btn help-secondary" onClick={handleShare}>📤 直接转发</button>
      </div>
      <p className="copy-hint">复制后打开微信，粘贴给子女或可信任的人</p>
    </article>
  );
}