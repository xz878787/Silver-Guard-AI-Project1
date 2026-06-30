"use client";

import { useState } from "react";
import type { ServiceGuideResult } from "@/lib/types";
import { scenariosByCategory } from "@/lib/scenarios";
import type { DemoScenario } from "@/lib/scenarios";

interface ServiceGuideProps {
  onScenarioSelect: (scenario: DemoScenario) => void;
  result: ServiceGuideResult | null;
  isLoading: boolean;
}

const serviceScenarios = scenariosByCategory.service;

export default function ServiceGuide({
  onScenarioSelect,
  result,
  isLoading,
}: ServiceGuideProps) {
  const [showInput, setShowInput] = useState(false);
  const [customInput, setCustomInput] = useState("");

  return (
    <div className="stack">
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>办事陪练</h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
          选一件事，我一步一步教你怎么办
        </p>
      </div>

      {/* Service grid */}
      <div className="service-grid">
        {serviceScenarios.map((s) => (
          <button
            key={s.id}
            className="card service-card"
            onClick={() => onScenarioSelect(s)}
            disabled={isLoading}
          >
            <div className="service-card-icon">{s.icon}</div>
            <div className="service-card-title">{s.title}</div>
            <div className="service-card-desc">
              {s.description}
            </div>
          </button>
        ))}
      </div>

      {/* Custom input */}
      {!showInput ? (
        <button className="btn btn-outline btn-large" onClick={() => setShowInput(true)}>
          写一个我想学的事
        </button>
      ) : (
        <div>
          <textarea
            className="input-large"
            placeholder="比如：怎么用手机交水电费、怎么挂专家号……"
            rows={2}
            style={{ minHeight: 80 }}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn btn-outline" onClick={() => setShowInput(false)}>
              取消
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!customInput.trim()}
              onClick={() => {
                if (customInput.trim() && result) {
                  onScenarioSelect({
                    id: "custom",
                    category: "service",
                    icon: "📝",
                    title: "自定义",
                    description: "",
                    input: customInput.trim(),
                    mockResult: result,
                  });
                }
              }}
            >
              生成步骤
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="loading-dots">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      )}

      {/* Result */}
      {result && !isLoading && <ServiceSteps result={result} />}
    </div>
  );
}

function ServiceSteps({ result }: { result: ServiceGuideResult }) {
  return (
    <div className="stack">
      {/* Header */}
      <div className="card card-brand">
        <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>
          {result.service_name}
        </h3>
        <p style={{ margin: 0, fontSize: 15, color: "var(--muted)" }}>
          一共 <strong style={{ color: "var(--text)" }}>{result.total_steps}</strong> 步，照着做就行
        </p>
      </div>

      {/* What to bring */}
      {result.what_to_bring.length > 0 && (
        <div className="card">
          <h4 className="section-title">需要准备的东西</h4>
          <div className="chip-row">
            {result.what_to_bring.map((item, i) => (
              <span
                key={i}
                style={{
                  background: "rgba(255,181,71,0.1)",
                  color: "var(--warn)",
                  padding: "8px 16px",
                  borderRadius: 999,
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="card">
        <h4 className="section-title">操作步骤</h4>
        {result.steps.map((step) => (
          <div key={step.step_number} className="step-item">
            <div className="step-number">{step.step_number}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                {step.title}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 4 }}>
                {step.instruction}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                📍 {step.where_to_go}
              </div>
              {step.tip && (
                <div style={{ fontSize: 13, color: "var(--brand)", marginTop: 4 }}>
                  💡 {step.tip}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Common mistakes */}
      {result.common_mistakes.length > 0 && (
        <div className="card card-warning">
          <h4 className="section-title" style={{ color: "var(--warn)" }}>容易出错的地方</h4>
          {result.common_mistakes.map((m, i) => (
            <div
              key={i}
              style={{
                fontSize: 15,
                padding: "8px 0",
                borderBottom:
                  i < result.common_mistakes.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              {i + 1}. {m}
            </div>
          ))}
        </div>
      )}

      {/* Family note */}
      {result.family_note && (
        <div className="family-card">
          <h4 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>给子女的话</h4>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>{result.family_note}</p>
        </div>
      )}
    </div>
  );
}
