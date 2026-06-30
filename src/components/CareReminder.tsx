"use client";

import { useState, useCallback, useEffect } from "react";
import type { CareReminderResult, ParsedReminderItem } from "@/lib/types";
import { scenariosByCategory } from "@/lib/scenarios";
import type { DemoScenario } from "@/lib/scenarios";

const STORAGE_KEY = "silver-guard-last-reminder";

interface LastReminder {
  input: string;
  result: CareReminderResult;
}

function loadLastReminder(): LastReminder | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastReminder;
  } catch {
    return null;
  }
}

function saveLastReminder(data: LastReminder) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded, ignore */ }
}

interface CareReminderProps {
  onScenarioSelect: (scenario: DemoScenario) => void;
  result: CareReminderResult | null;
  isLoading: boolean;
}

const quickScenario = scenariosByCategory.reminder[0];

const typeMeta: Record<string, { icon: string; label: string; accent: string; bg: string }> = {
  medication:  { icon: "💊", label: "用药", accent: "#2f7dd1", bg: "#eef6ff" },
  appointment: { icon: "🏥", label: "复查", accent: "#146c78", bg: "#ecf7f5" },
  exercise:    { icon: "🚶", label: "运动", accent: "#16875a", bg: "#ecf8f1" },
  diet:        { icon: "🍎", label: "饮食", accent: "#b46b09", bg: "#fff7e8" },
  other:       { icon: "🔔", label: "提醒", accent: "#66757d", bg: "#f3f6f5" },
};

function guessType(what: string, note: string): string {
  const s = what + note;
  if (/药|片|粒|胶囊|口服|冲剂|丸|浆/.test(s)) return "medication";
  if (/复查|复诊|体检|检查|挂号|医院|门诊|科/.test(s)) return "appointment";
  if (/运动|走路|散步|太极|广场舞|慢跑|快走|游泳/.test(s)) return "exercise";
  if (/吃|饮食|少油|少盐|忌口|喝水|空腹|饭后|饭前|随餐/.test(s)) return "diet";
  return "other";
}

function parseReminderText(raw: string): CareReminderResult {
  const segments = raw
    .replace(/[，。；、！？\n]+/g, "|")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const items: ParsedReminderItem[] = [];
  const warnings: string[] = [];

  const timePatterns: [RegExp, string][] = [
    [/每天早上/, "早上"],
    [/每天上午/, "上午"],
    [/每天中午/, "中午"],
    [/每天下午/, "下午"],
    [/每天晚上/, "晚上"],
    [/每日早上/, "早上"],
    [/每日晚上/, "晚上"],
    [/每晚/, "晚上"],
    [/每早/, "早上"],
    [/每天早起/, "早上"],
    [/每天饭后/, "饭后"],
    [/每天睡前/, "睡前"],
    [/睡觉前/, "睡前"],
    [/起床后/, "早上"],
    [/早饭前/, "早上"],
    [/早饭时/, "早上"],
    [/早饭后/, "早上"],
    [/午饭前/, "中午"],
    [/午饭后/, "中午"],
    [/晚饭前/, "晚上"],
    [/晚饭后/, "晚上"],
    [/饭前/, "饭前"],
    [/饭后/, "饭后"],
    [/空腹/, "早上"],
    [/下周一/, "下周一"],
    [/下周二/, "下周二"],
    [/下周三/, "下周三"],
    [/下周四/, "下周四"],
    [/下周五/, "下周五"],
    [/下周六/, "下周六"],
    [/下周日/, "下周日"],
    [/下周/, "下周"],
    [/明天/, "明天"],
    [/后天/, "后天"],
    [/今天/, "今天"],
    [/每两?天/, "每两天"],
    [/每周/, "每周"],
    [/隔天/, "隔天"],
  ];

  for (const seg of segments) {
    if (seg.length <= 2) continue;

    let when = "";
    for (const [re, label] of timePatterns) {
      if (re.test(seg)) {
        when = label;
        break;
      }
    }
    if (!when) when = "每天";

    let frequency = "每天1次";
    if (/每天[二两三2-3]次/.test(seg)) frequency = "每天" + (seg.match(/[二两三2-3]次/)![0]);
    else if (/早晚各/.test(seg)) frequency = "每天2次";
    else if (/一次/.test(seg) || /一回/.test(seg)) frequency = "一次";
    else if (/每[天日]/.test(seg)) frequency = "每天1次";
    else if (/每周/.test(seg)) frequency = "每周1次";
    else if (/隔天/.test(seg)) frequency = "隔天1次";

    const medMatch = seg.match(
      /([一-鿿]{2,6}(?:药|片|粒|胶囊|丸|冲剂|口服液|浆))/
    );
    const checkMatch = seg.match(
      /(?:去|到)?([一-鿿]{2,8}(?:医院|卫生院|诊所|体检中心|科室))(?:复查|检查|体检|复诊|看)?/
    );
    const exerciseMatch = seg.match(
      /((?:散步|走路|慢跑|快走|太极|广场舞|游泳|骑车|打球|健身)[一-鿿]*)/
    );
    const foodMatch = seg.match(
      /(?:吃|喝|饮食)([一-鿿]{1,10}(?:菜|饭|水果|粥|汤|奶|蛋|鱼|肉)?)/
    );

    let what = seg.slice(0, 12);
    let note = "";

    if (medMatch) {
      what = medMatch[1];
      if (/[一二两2-3]片|[一二两2-3]粒|[一二两2-3]颗/.test(seg)) {
        note = seg.match(/[一二两2-3][片粒颗]/)![0];
      }
      if (/饭后/.test(seg)) { note += (note ? "，" : "") + "饭后吃"; }
      if (/饭前/.test(seg)) { note += (note ? "，" : "") + "饭前吃"; }
      if (/空腹/.test(seg)) { note += (note ? "，" : "") + "空腹吃"; warnings.push(what + "建议确认是否能空腹服用"); }
      if (/睡前/.test(seg)) { note += (note ? "，" : "") + "睡前吃"; }
    } else if (checkMatch) {
      what = checkMatch[1] + (checkMatch[2] || "复查");
      note = "";
    } else if (exerciseMatch) {
      what = exerciseMatch[1];
      if (/(\d+)分钟/.test(seg)) note = seg.match(/(\d+)分钟/)![0];
      if (/(\d+)小时/.test(seg)) note = seg.match(/(\d+)小时/)![0];
    } else if (foodMatch) {
      what = foodMatch[0];
    }

    if (seg.length > 12 && !note) {
      const rest = seg.replace(what, "").replace(when, "").replace(/每天|次|要|的|了|去/g, "").trim();
      if (rest.length > 0 && rest.length < 10) note = rest;
    }

    items.push({
      what: what.length > 15 ? what.slice(0, 15) : what,
      when,
      frequency,
      note: note || "",
    });
  }

  if (items.length === 0) {
    items.push({ what: raw.slice(0, 15), when: "每天", frequency: "每天1次", note: "" });
  }

  return {
    reminder_type: "mixed",
    parsed_items: items,
    daily_schedule: items.map((it) => `${it.when}：${it.what}`).join("\n"),
    family_view: items.map((it, i) => `${i + 1}. ${it.what} — ${it.when}，${it.frequency}${it.note ? "，" + it.note : ""}`).join("\n"),
    warnings,
  };
}

export default function CareReminder({
  onScenarioSelect,
  result,
  isLoading,
}: CareReminderProps) {
  const [localInput, setLocalInput] = useState("");
  const [lastSubmitted, setLastSubmitted] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [localResult, setLocalResult] = useState<CareReminderResult | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    const saved = loadLastReminder();
    if (saved) {
      setLastSubmitted(saved.input);
      setLocalResult(saved.result);
      setIsDemo(false);
    }
  }, []);

  const handleQuickTry = useCallback(() => {
    if (!quickScenario) return;
    setLastSubmitted(quickScenario.input);
    setIsDemo(true);
    setLocalResult(null);
    onScenarioSelect(quickScenario);
  }, [onScenarioSelect]);

  const handleCustomSubmit = useCallback(async () => {
    if (!localInput.trim() || localLoading) return;
    const text = localInput.trim();
    setLastSubmitted(text);
    setIsDemo(false);
    setLocalLoading(true);
    setLocalResult(null);

    await new Promise((r) => setTimeout(r, 600));
    const parsed = parseReminderText(text);
    setLocalResult(parsed);
    saveLastReminder({ input: text, result: parsed });
    setLocalLoading(false);
    setLocalInput("");
  }, [localInput, localLoading]);

  const displayResult = localResult ?? result;
  const displayLoading = localResult ? false : localLoading || isLoading;
  const showDemoLabel = isDemo && !localResult;

  return (
    <div className="stack">
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>关怀提醒</h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
          告诉我你吃什么药、什么时候复查，我帮你整理
        </p>
      </div>

      <div>
        <textarea
          className="input-large"
          placeholder="比如：降压药每天早上吃一片，降血脂药晚上吃一片，下周三去社区医院复查……"
          rows={3}
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
        />
        <button
          className="btn btn-primary btn-large mt-12"
          onClick={handleCustomSubmit}
          disabled={displayLoading || !localInput.trim()}
        >
          {displayLoading ? "正在整理…" : "帮我整理提醒"}
        </button>
      </div>

      {quickScenario && localInput.length === 0 && !lastSubmitted && (
        <div>
          <p className="section-title">快速体验：</p>
          <button
            className="scenario-chip"
            onClick={handleQuickTry}
            disabled={isLoading}
          >
            {quickScenario.title}
          </button>
        </div>
      )}

      {lastSubmitted && (
        <div className="card" style={{ borderColor: "var(--line-strong)" }}>
          <p className="section-title">你输入的内容</p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--muted)" }}>
            {lastSubmitted}
          </p>
        </div>
      )}

      {displayLoading && (
        <div className="loading-dots">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      )}

      {displayResult && !displayLoading && (
        <ReminderDisplay result={displayResult} isDemo={showDemoLabel} />
      )}
    </div>
  );
}

function ReminderDisplay({
  result,
  isDemo,
}: {
  result: CareReminderResult;
  isDemo: boolean;
}) {
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared">("idle");

  const copyFamilyText = useCallback(async () => {
    const text = result.family_view;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setShareStatus("copied");
    window.setTimeout(() => setShareStatus("idle"), 2000);
  }, [result.family_view]);

  const shareFamilyText = useCallback(async () => {
    const text = result.family_view;
    if (navigator.share) {
      try {
        await navigator.share({ title: "银发守护提醒", text });
        setShareStatus("shared");
        window.setTimeout(() => setShareStatus("idle"), 2000);
        return;
      } catch {
        return;
      }
    }
    await copyFamilyText();
  }, [copyFamilyText, result.family_view]);

  const sendFamilySms = useCallback(() => {
    const body = encodeURIComponent(result.family_view);
    window.location.href = `sms:?&body=${body}`;
  }, [result.family_view]);

  return (
    <div className="stack">
      {isDemo && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>
            仅为举例子
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>
      )}

      {result.parsed_items.map((item, i) => {
        const t = typeMeta[guessType(item.what, item.note ?? "")] ?? typeMeta.other;
        return (
          <div
            key={i}
            className="card reminder-result-card"
            style={{
              ["--reminder-accent" as string]: t.accent,
              ["--reminder-bg" as string]: t.bg,
            }}
          >
            <div className="reminder-icon">
              {t.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="reminder-title-row">
                <span className="reminder-title">{item.what}</span>
                <span className="reminder-pill">
                  {t.label}
                </span>
              </div>
              <div className="reminder-meta">
                <span>
                  ⏰ {item.when}
                </span>
                <span>
                  🔁 {item.frequency}
                </span>
                {item.note && (
                  <span>
                    💡 {item.note}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {result.warnings.length > 0 && (
        <div className="card card-warning">
          <h3 className="section-title" style={{ color: "var(--warn)" }}>
            ⚠️ 特别提醒
          </h3>
          {result.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 15, padding: "6px 0" }}>
              • {w}
            </div>
          ))}
        </div>
      )}

      {result.family_view && (
        <div className="family-card">
          <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>
            👨‍👩‍👦 给子女看
          </h3>
          <div className="family-card-message" style={{ whiteSpace: "pre-line" }}>
            {result.family_view}
          </div>
          <div className="family-actions">
            <button className="btn btn-primary btn-large" onClick={shareFamilyText}>
              {shareStatus === "shared" ? "已打开转发" : shareStatus === "copied" ? "已复制，可发给子女" : "转发给子女"}
            </button>
            <button className="btn btn-outline" onClick={copyFamilyText}>
              {shareStatus === "copied" ? "已复制" : "复制文案"}
            </button>
            <button className="btn btn-outline" onClick={sendFamilySms}>
              短信发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
