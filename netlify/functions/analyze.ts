const SYSTEM_PROMPT = `你是面向老年人的信息安全助手。请判断消息是否存在诈骗风险。
规则：
1. 不能因为消息含有链接就直接判为高危，必须核对真实主机名和具体行为要求。
2. 对信息不足的内容使用 unknown，不要为了谨慎而一律判为 high。
3. 官方域名只能作为降低风险的证据，不能单独证明发送者身份。
4. 只有出现转账、验证码、银行卡、远程控制、仿冒域名等明确危险证据时才判高危。
5. 使用简单中文，严格输出 JSON，不要输出 Markdown。`;

function userPrompt(input: string) {
  return `分析下面这条消息：\n${input}\n\n严格输出以下 JSON：
{
  "risk_level": "high | medium | low | safe | unknown",
  "risk_label": "高危 | 可疑 | 低风险 | 安全 | 不好判断",
  "scene_type": "冒充客服退款 | 冒充公检法 | 冒充亲友借钱 | 虚假中奖 | 虚假投资 | 医保社保诈骗 | 快递理赔 | 刷单返利 | 钓鱼网页 | 虚假通知 | 推销骚扰 | 正常通知 | 其他",
  "confidence": 0,
  "red_flags": [],
  "plain_explain": { "title": "", "what_happened": "", "why_dangerous": "" },
  "next_actions": { "dont": [], "do": [] },
  "family_message": "",
  "need_more_info": false,
  "follow_up_question": ""
}`;
}

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
}

function json(statusCode: number, data: unknown) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(data),
  };
}

function parseModelJSON(raw: string) {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  return JSON.parse(cleaned.trim());
}

export const handler = async (event: NetlifyEvent) => {
  if (event.httpMethod !== "POST") return json(405, { error: "仅支持 POST 请求" });

  let input = "";
  try {
    const body = JSON.parse(event.body || "{}") as { input?: unknown };
    if (typeof body.input === "string") input = body.input.trim();
  } catch {
    return json(400, { error: "请求格式不正确" });
  }
  if (!input || input.length > 500) return json(400, { error: "请输入 1 到 500 字的消息" });

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;
  if (!apiKey) return json(503, { error: "真实 AI 服务尚未配置" });

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt(input) },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      console.error("DeepSeek request failed", response.status, await response.text());
      return json(502, { error: `真实 AI 请求失败（${response.status}）` });
    }
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return json(502, { error: "真实 AI 没有返回有效结果" });
    return json(200, { result: parseModelJSON(content) });
  } catch (error) {
    console.error("DeepSeek function error", error);
    return json(502, { error: "真实 AI 连接超时或返回格式异常" });
  }
};
