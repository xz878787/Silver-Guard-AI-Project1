/**
 * 银发守护 AI — AI服务层
 *
 * 支持 DeepSeek / OpenAI / Claude 三套后端
 * 内置 Mock 模式用于 Demo 展示
 */

import type {
  AIProvider,
  AIConfig,
  FraudDetectionResult,
  ServiceGuideResult,
  CareReminderResult,
  FamilyBridgeResult,
} from "./types";
import {
  MASTER_SYSTEM_PROMPT,
  FRAUD_DETECTION_USER_PROMPT,
  SERVICE_GUIDE_SYSTEM_PROMPT,
  SERVICE_GUIDE_USER_PROMPT,
  CARE_REMINDER_SYSTEM_PROMPT,
  CARE_REMINDER_USER_PROMPT,
  FAMILY_BRIDGE_PROMPT,
} from "./prompts";
import { MOCK_FRAUD_RESULTS } from "./mock-data";
import { classifyFraudOffline, reconcileFraudResult } from "./risk-classifier";

// ═══════════════════════════════════════
// 配置
// ═══════════════════════════════════════

const DEFAULT_CONFIG: AIConfig = {
  provider: "deepseek",
  // 密钥仅供服务端调用，绝不能通过 NEXT_PUBLIC 打进浏览器代码。
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseUrl:
    process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  maxTokens: 1024,
  temperature: 0.1, // 低温度保证输出稳定
};

// ═══════════════════════════════════════
// 核心调用函数
// ═══════════════════════════════════════

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  config: Partial<AIConfig> = {}
): Promise<string> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Mock 模式只在用户明确选择时使用，不能把真实 AI 失败伪装成真实调用。
  if (cfg.provider === "mock") {
    console.log("[银发守护] 使用 Mock 模式");
    return mockResponse(userPrompt);
  }
  if (!cfg.apiKey) throw new Error("未配置 AI API Key");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let url: string;
  let body: Record<string, unknown>;

  if (cfg.provider === "claude") {
    // Anthropic API
    url = "https://api.anthropic.com/v1/messages";
    headers["x-api-key"] = cfg.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    body = {
      model: cfg.model || "claude-sonnet-4-6",
      max_tokens: cfg.maxTokens,
      temperature: cfg.temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    };
  } else {
    // OpenAI 兼容 API（DeepSeek / OpenAI / 其他）
    url = `${cfg.baseUrl}/v1/chat/completions`;
    headers["Authorization"] = `Bearer ${cfg.apiKey}`;
    body = {
      model: cfg.model,
      max_tokens: cfg.maxTokens,
      temperature: cfg.temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI 调用失败: ${response.status} — ${errorText}`);
  }

  const data = await response.json();

  if (cfg.provider === "claude") {
    return data.content[0].text;
  }
  return data.choices[0].message.content;
}

// ═══════════════════════════════════════
// 公开 API
// ═══════════════════════════════════════

/**
 * 诈骗识别 — 核心功能
 */
export async function detectFraud(
  input: string,
  config?: Partial<AIConfig>
): Promise<FraudDetectionResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  if (cfg.provider === "mock") return classifyFraudOffline(input);

  if (typeof window !== "undefined" && cfg.provider === "deepseek") {
    const result = await callFraudProxy(input);
    return reconcileFraudResult(input, result);
  }

  const response = await callAI(
    MASTER_SYSTEM_PROMPT,
    FRAUD_DETECTION_USER_PROMPT(input),
    cfg
  );
  return reconcileFraudResult(input, parseJSON<FraudDetectionResult>(response));
}

async function callFraudProxy(input: string): Promise<FraudDetectionResult> {
  const response = await fetch("/api/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: input }),
  });
  const payload = await response.json().catch(() => null) as
    | FraudDetectionResult
    | { error?: string }
    | null;
  if (!response.ok || !payload || "error" in payload) {
    throw new Error(payload?.error || `AI 服务连接失败（${response.status}）`);
  }
  return payload;
}

/**
 * 办事陪练
 */
export async function getServiceGuide(
  serviceName: string,
  userContext?: string,
  config?: Partial<AIConfig>
): Promise<ServiceGuideResult> {
  const response = await callAI(
    SERVICE_GUIDE_SYSTEM_PROMPT,
    SERVICE_GUIDE_USER_PROMPT(serviceName, userContext),
    config
  );
  return parseJSON<ServiceGuideResult>(response);
}

/**
 * 关怀提醒解析
 */
export async function parseCareReminder(
  input: string,
  config?: Partial<AIConfig>
): Promise<CareReminderResult> {
  const response = await callAI(
    CARE_REMINDER_SYSTEM_PROMPT,
    CARE_REMINDER_USER_PROMPT(input),
    config
  );
  return parseJSON<CareReminderResult>(response);
}

/**
 * 家属沟通桥梁
 */
export async function generateFamilyMessage(
  situation: string,
  urgency: "high" | "normal" | "low" = "normal",
  config?: Partial<AIConfig>
): Promise<FamilyBridgeResult> {
  const response = await callAI(
    MASTER_SYSTEM_PROMPT,
    FAMILY_BRIDGE_PROMPT(situation, urgency),
    config
  );
  return parseJSON<FamilyBridgeResult>(response);
}

// ═══════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════

function parseJSON<T>(raw: string): T {
  // 清理可能的 markdown 代码块标记
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error("[银发守护] JSON 解析失败，原始输出:", raw);
    throw new Error("AI 返回格式异常，请重试");
  }
}

// ═══════════════════════════════════════
// Mock 模式 — 离线 Demo
// ═══════════════════════════════════════

function mockResponse(userPrompt: string): string {
  // 根据用户输入的关键词匹配合适的 Mock 结果
  const input = userPrompt.toLowerCase();

  // 医保相关
  if (input.includes("医保") || input.includes("社保")) {
    return JSON.stringify(MOCK_FRAUD_RESULTS.healthcare);
  }
  // 冒充客服/退款/快递
  if (
    input.includes("退款") ||
    input.includes("客服") ||
    input.includes("理赔") ||
    input.includes("快递")
  ) {
    return JSON.stringify(MOCK_FRAUD_RESULTS.fake_customer_service);
  }
  // 冒充亲友/借钱/换号
  if (
    input.includes("爸") ||
    input.includes("妈") ||
    input.includes("借钱") ||
    input.includes("换号") ||
    input.includes("转钱")
  ) {
    return JSON.stringify(MOCK_FRAUD_RESULTS.fake_relative);
  }
  // 中奖
  if (input.includes("中奖") || input.includes("恭喜")) {
    return JSON.stringify(MOCK_FRAUD_RESULTS.fake_prize);
  }
  // 公检法
  if (input.includes("公安") || input.includes("涉嫌") || input.includes("安全账户")) {
    return JSON.stringify(MOCK_FRAUD_RESULTS.police_scam);
  }
  // 刷单/赚钱
  if (input.includes("刷单") || input.includes("日入") || input.includes("做任务")) {
    return JSON.stringify(MOCK_FRAUD_RESULTS.brushing_scam);
  }
  // 投资
  if (input.includes("投资") || input.includes("股票") || input.includes("稳赚")) {
    return JSON.stringify(MOCK_FRAUD_RESULTS.investment_scam);
  }
  // 社区通知/上传身份证
  if (input.includes("社区") || input.includes("身份证")) {
    return JSON.stringify(MOCK_FRAUD_RESULTS.fake_community);
  }
  // 默认：可疑消息
  return JSON.stringify(MOCK_FRAUD_RESULTS.generic_suspicious);
}
