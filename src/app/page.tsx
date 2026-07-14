"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AppTab,
  FraudDetectionResult,
  ServiceGuideResult,
  CareReminderResult,
  HistoryRecord,
} from "@/lib/types";
import type { DemoScenario } from "@/lib/scenarios";
import { addRecord } from "@/lib/storage";
import Header from "@/components/Header";
import TabBar from "@/components/TabBar";
import MessageInput from "@/components/MessageInput";
import FraudResult from "@/components/FraudResult";
import ServiceGuide from "@/components/ServiceGuide";
import CareReminder from "@/components/CareReminder";
import HistoryList from "@/components/HistoryList";
import { scenariosByCategory } from "@/lib/scenarios";

const scenePhotos = [
  {
    src: "/sg-elder-phone.jpg",
    title: "可疑短信识别",
    desc: "老人收到医保、快递、亲友借钱等消息时，先停下来判断。",
  },
  {
    src: "/sg-family-care.jpg",
    title: "家属远程确认",
    desc: "把复杂情况生成一句话，发给子女快速核实。",
  },
  {
    src: "/sg-doctor-home.jpg",
    title: "用药复诊提醒",
    desc: "用药、复诊、运动和饮食整理成家庭可读提醒。",
  },
];

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState<AppTab>("home");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fraudResult, setFraudResult] = useState<FraudDetectionResult | null>(null);
  const [serviceResult, setServiceResult] = useState<ServiceGuideResult | null>(null);
  const [reminderResult, setReminderResult] = useState<CareReminderResult | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [aiMode, setAiMode] = useState<"real" | "mock">("real");
  const [analysisMode, setAnalysisMode] = useState<"real" | "mock" | "fallback">("mock");
  const [analysisError, setAnalysisError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("silver-guard-ai-mode");
    if (saved === "real" || saved === "mock") setAiMode(saved);
  }, []);

  const changeAiMode = (mode: "real" | "mock") => {
    setAiMode(mode);
    setAnalysisError("");
  };

  const summary = useMemo(() => {
    return [
      { label: "防骗识别", value: "AI 识别" },
      { label: "办事陪练", value: "一步一步" },
      { label: "关怀提醒", value: "家庭可读" },
    ];
  }, []);

  const handleFraudSubmit = useCallback(async (text: string) => {
    setInput(text);
    setIsLoading(true);
    setFraudResult(null);
    setServiceResult(null);
    setReminderResult(null);
    setAnalysisError("");

    const { detectFraud } = await import("@/lib/ai-service");
    try {
      let result: FraudDetectionResult;
      if (aiMode === "real") {
        if (!process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY) throw new Error("未配置真实 AI 密钥");
        result = await Promise.race([
          detectFraud(text, { provider: "deepseek" }),
          new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("AI 分析超时")), 12000)),
        ]);
        setAnalysisMode("real");
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1300));
        result = await detectFraud(text, { provider: "mock" });
        setAnalysisMode("mock");
      }
      setFraudResult(result);
      addRecord("fraud", text, result);
      setHistoryKey((k) => k + 1);
    } catch (error) {
      console.error("Real AI unavailable, using safe fallback", error);
      const fallback = await detectFraud(text, { provider: "mock" });
      setFraudResult(fallback);
      setAnalysisMode("fallback");
      setAnalysisError("真实 AI 暂时无法连接，已自动切换安全分析，结果仍可正常使用。");
      addRecord("fraud", text, fallback);
      setHistoryKey((k) => k + 1);
    } finally {
      setIsLoading(false);
    }
  }, [aiMode]);

  const handleScenarioSelect = useCallback(async (scenario: DemoScenario) => {
    setInput(scenario.input);
    setIsLoading(true);
    setFraudResult(null);
    setServiceResult(null);
    setReminderResult(null);

    await new Promise((resolve) => setTimeout(resolve, 900));

    if (scenario.category === "fraud") {
      const result = scenario.mockResult as FraudDetectionResult;
      setFraudResult(result);
      addRecord("fraud", scenario.input, result);
      setCurrentTab("home");
    }

    if (scenario.category === "service") {
      const result = scenario.mockResult as ServiceGuideResult;
      setServiceResult(result);
      addRecord("service", scenario.input, result);
      setCurrentTab("service");
    }

    if (scenario.category === "reminder") {
      const result = scenario.mockResult as CareReminderResult;
      setReminderResult(result);
      addRecord("reminder", scenario.input, result);
      setCurrentTab("reminder");
    }

    setHistoryKey((k) => k + 1);
    setIsLoading(false);
  }, []);

  const handleHistorySelect = useCallback((record: HistoryRecord) => {
    setInput(record.input);
    if (record.mode === "fraud") {
      setFraudResult(record.result as FraudDetectionResult);
      setCurrentTab("home");
    }
    if (record.mode === "service") {
      setServiceResult(record.result as ServiceGuideResult);
      setCurrentTab("service");
    }
    if (record.mode === "reminder") {
      setReminderResult(record.result as CareReminderResult);
      setCurrentTab("reminder");
    }
  }, []);

  return (
    <div className="app-shell">
      <Header
        title="银发守护 AI"
        subtitle="面向老人信息安全、办事和健康提醒的全链路助手"
      />

      <main className="main-content scroll-area">
        {currentTab === "home" && (
          <div className="stack">
            <section className="hero-band">
              <div className="hero-copy">
                <p className="eyebrow">TRAE 竞赛级 Demo · 银发安全 AI</p>
                <h2>让老人看得懂、办得成、转得出。</h2>
                <p className="hero-text">
                  一次输入，完成识别、解释、行动和转发四步闭环。
                </p>
                <div className="hero-tags" aria-label="核心能力">
                  <span>诈骗识别</span>
                  <span>大字解释</span>
                  <span>家属确认</span>
                  <span>办事陪练</span>
                  <span>关怀提醒</span>
                </div>
              </div>
              <div className="hero-grid">
                {summary.map((item) => (
                  <div key={item.label} className="metric-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="scene-gallery" aria-label="真实使用场景">
              {scenePhotos.map((item, index) => (
                <article className="scene-card" key={item.title}>
                  <img src={item.src} alt={item.title} />
                  <div>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="ai-mode-panel" aria-label="AI 分析模式">
              <div><span className="mode-title">分析引擎</span><small>{aiMode === "real" ? "联网调用 DeepSeek，失败自动降级" : "离线稳定运行，适合现场演示"}</small></div>
              <div className="mode-switch" role="group" aria-label="选择分析引擎">
                <button className={aiMode === "mock" ? "active" : ""} onClick={() => changeAiMode("mock")}><span className="mode-dot offline" />稳定演示</button>
                <button className={aiMode === "real" ? "active" : ""} onClick={() => changeAiMode("real")}><span className="mode-dot online" />真实 AI</button>
              </div>
            </section>

            <MessageInput onSubmit={handleFraudSubmit} onScenarioSelect={handleScenarioSelect} isLoading={isLoading} defaultValue={input} />

            {isLoading && <AnalysisLoading mode={aiMode} />}
            {analysisError && !isLoading && <div className="fallback-notice" role="status">🛟 {analysisError}</div>}
            {fraudResult && !isLoading && <FraudResult result={fraudResult} analysisMode={analysisMode} />}

            {!fraudResult && !isLoading && (
              <section className="empty-state card">
                <h3>贴一条短信、电话内容或通知，我来帮你判断。</h3>
                <p>下面这些样例，最适合现场演示。</p>
                <div className="chip-row">
                  {scenariosByCategory.fraud.slice(0, 4).map((s) => (
                    <button
                      key={s.id}
                      className="scenario-chip"
                      onClick={() => handleScenarioSelect(s)}
                      disabled={isLoading}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {currentTab === "service" && (
          <ServiceGuide
            onScenarioSelect={handleScenarioSelect}
            result={serviceResult}
            isLoading={isLoading}
          />
        )}

        {currentTab === "reminder" && (
          <CareReminder
            onScenarioSelect={handleScenarioSelect}
            result={reminderResult}
            isLoading={isLoading}
          />
        )}

        {currentTab === "history" && (
          <HistoryList onSelect={handleHistorySelect} refreshKey={historyKey} />
        )}
      </main>

      <TabBar currentTab={currentTab} onTabChange={setCurrentTab} />
    </div>
  );
}

function AnalysisLoading({ mode }: { mode: "real" | "mock" }) {
  const [step, setStep] = useState(0);
  const messages = ["正在读懂消息内容…", "正在查找转账、链接和冒充话术…", "正在生成最安全的下一步…"];
  useEffect(() => {
    const timer = window.setInterval(() => setStep((value) => Math.min(value + 1, messages.length - 1)), 700);
    return () => window.clearInterval(timer);
  }, [messages.length]);
  return (
    <div className="analysis-loading" role="status" aria-live="polite">
      <div className="thinking-core"><span /><span /><span /></div>
      <div><strong>{mode === "real" ? "真实 AI 正在分析" : "守护引擎正在分析"}</strong><p key={step} className="typing-line">{messages[step]}</p></div>
      <span className="loading-shield">🛡️</span>
    </div>
  );
}