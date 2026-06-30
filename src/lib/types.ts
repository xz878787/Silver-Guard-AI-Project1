export type RiskLevel = "high" | "medium" | "low" | "safe" | "unknown";
export type RiskLabel = "高危" | "可疑" | "低风险" | "安全" | "不好判断";
export type SceneType =
  | "冒充客服退款"
  | "冒充公检法"
  | "冒充亲友借钱"
  | "虚假中奖"
  | "虚假投资"
  | "医保社保诈骗"
  | "快递理赔"
  | "刷单返利"
  | "钓鱼网页"
  | "虚假通知"
  | "推销骚扰"
  | "正常通知"
  | "其他";

export interface PlainExplain {
  title: string;
  what_happened: string;
  why_dangerous: string;
}

export interface NextActions {
  dont: string[];
  do: string[];
}

export interface FraudDetectionResult {
  risk_level: RiskLevel;
  risk_label: RiskLabel;
  scene_type: SceneType;
  confidence: number;
  red_flags: string[];
  plain_explain: PlainExplain;
  next_actions: NextActions;
  family_message: string;
  need_more_info: boolean;
  follow_up_question: string;
}

export interface ServiceStep {
  step_number: number;
  title: string;
  instruction: string;
  where_to_go: string;
  tip: string;
}

export interface ServiceGuideResult {
  service_name: string;
  total_steps: number;
  what_to_bring: string[];
  steps: ServiceStep[];
  common_mistakes: string[];
  family_note: string;
}

export type ReminderType =
  | "medication"
  | "appointment"
  | "exercise"
  | "diet"
  | "mixed"
  | "other";

export interface ParsedReminderItem {
  what: string;
  when: string;
  frequency: string;
  note: string;
}

export interface CareReminderResult {
  reminder_type: ReminderType;
  parsed_items: ParsedReminderItem[];
  daily_schedule: string;
  family_view: string;
  warnings: string[];
}

export interface FamilyBridgeResult {
  direct: string;
  help: string;
  urgent: string;
  best_choice: string;
}

export type AppTab = "home" | "service" | "reminder" | "history";
export type AnalysisMode = "fraud" | "service" | "reminder" | "translate";

export interface HistoryRecord {
  id: string;
  createdAt: number;
  mode: AnalysisMode;
  input: string;
  result: FraudDetectionResult | ServiceGuideResult | CareReminderResult;
}

export type AIProvider = "deepseek" | "openai" | "claude" | "mock";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}
