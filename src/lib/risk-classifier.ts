import type { FraudDetectionResult, RiskLevel } from "./types";
import { MOCK_FRAUD_RESULTS } from "./mock-data";

const TRUSTED_DOMAINS: Array<{ domain: string; organization: string }> = [
  { domain: "10086.cn", organization: "中国移动" },
  { domain: "10010.com", organization: "中国联通" },
  { domain: "189.cn", organization: "中国电信" },
  { domain: "12306.cn", organization: "中国铁路12306" },
  { domain: "gov.cn", organization: "中国政府网站" },
];

const HIGH_RISK_REQUEST = /转账|汇款|安全账户|屏幕共享|远程控制|提供.{0,6}(验证码|密码|银行卡)|填写.{0,6}(验证码|密码|银行卡)|上传.{0,6}身份证|下载.{0,8}(app|软件)|垫付|保证金|解冻金/i;
const URL_PATTERN = /https?:\/\/[^\s<>"'，。；！？【】]+/gi;

interface TrustedLink { hostname: string; organization: string; }

function extractHostnames(input: string): string[] {
  return (input.match(URL_PATTERN) ?? []).flatMap((rawUrl) => {
    try {
      return [new URL(rawUrl.replace(/[),.;]+$/g, "")).hostname.toLowerCase().replace(/\.$/, "")];
    } catch {
      return [];
    }
  });
}

function domainMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function findTrustedLink(input: string): TrustedLink | null {
  const hostnames = extractHostnames(input);
  if (hostnames.length === 0) return null;
  const matches = hostnames.map((hostname) => {
    const owner = TRUSTED_DOMAINS.find(({ domain }) => domainMatches(hostname, domain));
    return owner ? { hostname, organization: owner.organization } : null;
  });
  if (matches.some((match) => match === null)) return null;
  return matches[0];
}

function findDeceptiveOfficialLookalike(input: string): string | null {
  if (/(10086\.cn|10010\.com|12306\.cn|gov\.cn)@/i.test(input)) {
    return extractHostnames(input)[0] || "伪装链接";
  }
  for (const hostname of extractHostnames(input)) {
    const mentionsOfficialBrand = /10086|10010|12306|gov|中国移动|中国联通/.test(hostname);
    const isTrusted = TRUSTED_DOMAINS.some(({ domain }) => domainMatches(hostname, domain));
    if (mentionsOfficialBrand && !isTrusted) return hostname;
  }
  return null;
}

function trustedOfficialResult(link: TrustedLink): FraudDetectionResult {
  return {
    risk_level: "low",
    risk_label: "低风险",
    scene_type: "正常通知",
    confidence: 90,
    red_flags: [],
    plain_explain: {
      title: `链接属于${link.organization}官方域名`,
      what_happened: `消息中的网址主机名是 ${link.hostname}，域名归属与${link.organization}一致，当前没有发现明显诈骗要求。`,
      why_dangerous: "仅凭短信仍不能百分之百确认发送者身份，操作前可再通过官方 App 或客服电话核实。",
    },
    next_actions: {
      dont: ["不要在任何页面透露短信验证码、银行卡密码"],
      do: [`可以通过${link.organization}官方 App 或客服电话再次确认`, "确认页面域名没有跳转变化后再操作"],
    },
    family_message: `我收到一条带有 ${link.hostname} 链接的通知，系统判断域名属于${link.organization}，暂未发现明显风险。`,
    need_more_info: false,
    follow_up_question: "不用补充了。",
  };
}

function deceptiveDomainResult(hostname: string): FraudDetectionResult {
  return {
    risk_level: "high",
    risk_label: "高危",
    scene_type: "钓鱼网页",
    confidence: 94,
    red_flags: ["网址看起来像官方名称，但真实主机名并非官方域名", `实际网址是 ${hostname}`],
    plain_explain: {
      title: "这是仿冒官方域名的高风险链接",
      what_happened: "网址故意加入了官方名称或号码，让人误以为是官方网站。",
      why_dangerous: "打开后可能诱导填写账号、银行卡或验证码。",
    },
    next_actions: {
      dont: ["不要打开链接", "不要输入账号、密码或验证码"],
      do: ["从官方 App 进入相关服务", "拨打官方客服电话核实"],
    },
    family_message: `我收到一个疑似仿冒官网的链接 ${hostname}，还没有点击，请帮我核实。`,
    need_more_info: false,
    follow_up_question: "不用补充了。",
  };
}

function unknownResult(): FraudDetectionResult {
  return {
    risk_level: "unknown",
    risk_label: "不好判断",
    scene_type: "其他",
    confidence: 35,
    red_flags: [],
    plain_explain: {
      title: "信息不足，暂时不能确认真伪",
      what_happened: "这段内容没有足够的诈骗特征，也没有足够信息证明它一定安全。",
      why_dangerous: "不要因为系统暂时看不出来，就直接提供个人信息或转账。",
    },
    next_actions: {
      dont: ["暂时不要转账或提供验证码"],
      do: ["补充完整短信、电话号码或网址", "通过官方 App、官网或客服电话核实"],
    },
    family_message: "我收到一条信息，当前资料不足，系统无法确认真伪，请帮我一起核实。",
    need_more_info: true,
    follow_up_question: "请把完整短信、发送号码或网址一起发来。",
  };
}

export function classifyFraudOffline(input: string): FraudDetectionResult {
  const text = input.trim().toLowerCase();
  const trustedLink = findTrustedLink(text);
  if (trustedLink && !HIGH_RISK_REQUEST.test(text)) return trustedOfficialResult(trustedLink);

  const deceptiveHostname = findDeceptiveOfficialLookalike(text);
  if (deceptiveHostname) return deceptiveDomainResult(deceptiveHostname);

  if (/安全账户|涉嫌洗钱|涉嫌犯罪|公安局|检察院/.test(text)) return MOCK_FRAUD_RESULTS.police_scam;
  if (/刷单|日入|做任务|返佣/.test(text)) return MOCK_FRAUD_RESULTS.brushing_scam;
  if (/中奖|恭喜.{0,6}获奖|领奖.{0,8}(运费|保证金)/.test(text)) return MOCK_FRAUD_RESULTS.fake_prize;
  if (/稳赚|内部消息|投资群|带单/.test(text)) return MOCK_FRAUD_RESULTS.investment_scam;
  if (/换号|借钱|转钱/.test(text) && /爸|妈|儿子|女儿|家人|亲友/.test(text)) return MOCK_FRAUD_RESULTS.fake_relative;
  if (/退款|理赔|快递丢失|客服/.test(text) && /链接|加微信|银行卡|验证码|转账/.test(text)) return MOCK_FRAUD_RESULTS.fake_customer_service;
  if (/医保|社保/.test(text) && /失效|冻结|停用|链接|认证|银行卡|验证码/.test(text)) return MOCK_FRAUD_RESULTS.healthcare;
  if (/社区/.test(text) && /上传.{0,6}身份证|银行卡|验证码/.test(text)) return MOCK_FRAUD_RESULTS.fake_community;

  if (HIGH_RISK_REQUEST.test(text)) return MOCK_FRAUD_RESULTS.generic_suspicious;
  if (/会议提醒|天气预报|取件通知|缴费成功|预约成功|服务评价|问卷调研/.test(text) && extractHostnames(text).length === 0) return MOCK_FRAUD_RESULTS.safe_notification;
  return unknownResult();
}

export function reconcileFraudResult(input: string, aiResult: FraudDetectionResult): FraudDetectionResult {
  const trustedLink = findTrustedLink(input);
  if (trustedLink && !HIGH_RISK_REQUEST.test(input)) return trustedOfficialResult(trustedLink);

  const deceptiveHostname = findDeceptiveOfficialLookalike(input);
  if (deceptiveHostname) return deceptiveDomainResult(deceptiveHostname);

  const normalized = normalizeFraudResult(aiResult);
  
  if (normalized.risk_level === "unknown" || normalized.confidence < 50) {
    return classifyFraudOffline(input);
  }

  return normalized;
}

function normalizeFraudResult(result: FraudDetectionResult): FraudDetectionResult {
  const levels: RiskLevel[] = ["high", "medium", "low", "safe", "unknown"];
  if (!result || !levels.includes(result.risk_level)) return unknownResult();
  return {
    ...result,
    confidence: Math.max(0, Math.min(100, Number(result.confidence) || 0)),
    red_flags: Array.isArray(result.red_flags) ? result.red_flags.filter(Boolean).slice(0, 6) : [],
    next_actions: {
      dont: Array.isArray(result.next_actions?.dont) ? result.next_actions.dont.filter(Boolean).slice(0, 5) : [],
      do: Array.isArray(result.next_actions?.do) ? result.next_actions.do.filter(Boolean).slice(0, 5) : [],
    },
  };
}