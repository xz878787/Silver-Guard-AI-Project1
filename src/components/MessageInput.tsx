"use client";

import { useState, useEffect } from "react";
import type { DemoScenario } from "@/lib/scenarios";
import { scenariosByCategory } from "@/lib/scenarios";

interface MessageInputProps {
  onSubmit: (input: string) => void;
  onScenarioSelect: (scenario: DemoScenario) => void;
  isLoading: boolean;
  defaultValue?: string;
}

export default function MessageInput({
  onSubmit,
  onScenarioSelect,
  isLoading,
  defaultValue = "",
}: MessageInputProps) {
  const [input, setInput] = useState(defaultValue);

  useEffect(() => {
    if (defaultValue) setInput(defaultValue);
  }, [defaultValue]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSubmit(input.trim());
    }
  };

  const charsLeft = 500 - input.length;

  return (
    <div>
      <div className="mb-16">
        <label
          htmlFor="message-input"
          className="section-title"
        >
          把收到的消息贴在这里
        </label>
        <textarea
          id="message-input"
          className="input-large"
          placeholder="粘贴短信、微信消息，或写下电话里听到的内容……"
          rows={3}
          maxLength={500}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div className="flex-between mt-8">
          <span className="text-muted" style={{ fontSize: 12 }}>
            {input.length > 0 ? `${charsLeft} 字剩余` : "可直接粘贴整条消息"}
          </span>
        </div>
        <button
          className="btn btn-primary btn-large mt-12"
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? "正在分析…" : "帮我看看是不是骗子"}
        </button>
      </div>

      <div>
        <p className="section-title">或选一个体验 Demo：</p>
        <div className="chip-row">
          {scenariosByCategory.fraud.map((s) => (
            <button
              key={s.id}
              className="scenario-chip"
              onClick={() => onScenarioSelect(s)}
              disabled={isLoading}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
