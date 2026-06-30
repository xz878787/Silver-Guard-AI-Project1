"use client";

import { useCallback, useMemo, useState } from "react";
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

    await new Promise((resolve) => setTimeout(resolve, 900));

    const { detectFraud } = await import("@/lib/ai-service");
    try {
      const result = await detectFraud(text, { provider: "mock" });
      setFraudResult(result);
      addRecord("fraud", text, result);
      setHistoryKey((k) => k + 1);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

            <MessageInput
              onSubmit={handleFraudSubmit}
              onScenarioSelect={handleScenarioSelect}
              isLoading={isLoading}
              defaultValue={input}
            />

            {isLoading && (
              <div className="loading-dots" aria-label="loading">
                <div className="loading-dot" />
                <div className="loading-dot" />
                <div className="loading-dot" />
              </div>
            )}

            {fraudResult && !isLoading && <FraudResult result={fraudResult} />}

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
