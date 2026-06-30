import type {
  FraudDetectionResult,
  ServiceGuideResult,
  CareReminderResult,
} from "./types";
import { MOCK_FRAUD_RESULTS } from "./mock-data";

export interface DemoScenario {
  id: string;
  category: "fraud" | "service" | "reminder";
  icon: string;
  title: string;
  description: string;
  input: string;
  mockResult: FraudDetectionResult | ServiceGuideResult | CareReminderResult;
}

const fraudScenarios: DemoScenario[] = [
  {
    id: "fraud-1",
    category: "fraud",
    icon: "反诈",
    title: "医保异常短信",
    description: "点链接，马上停用",
    input: "【医保局】您的医保卡出现异常，请立即点击 http://t.cn/xxxxx 验证信息，否则24小时内停用。",
    mockResult: MOCK_FRAUD_RESULTS.healthcare,
  },
  {
    id: "fraud-2",
    category: "fraud",
    icon: "快递",
    title: "快递理赔",
    description: "加微信领赔偿",
    input: "您好，我是申通客服，您的包裹丢失，请添加理赔专员微信 kf8899 领取双倍理赔。",
    mockResult: MOCK_FRAUD_RESULTS.fake_customer_service,
  },
  {
    id: "fraud-3",
    category: "fraud",
    icon: "亲友",
    title: "亲友借钱",
    description: "换号后急着转账",
    input: "爸，我手机掉水里了，这是新号。学校让我交培训费，先转我5000，明天还你。",
    mockResult: MOCK_FRAUD_RESULTS.fake_relative,
  },
  {
    id: "fraud-4",
    category: "fraud",
    icon: "中奖",
    title: "虚假中奖",
    description: "中奖先交运费",
    input: "恭喜您获得 iPhone 16 一台，请先支付199元运费和保险费，3个工作日内发货。",
    mockResult: MOCK_FRAUD_RESULTS.fake_prize,
  },
];

const serviceScenarios: DemoScenario[] = [
  {
    id: "service-1",
    category: "service",
    icon: "挂号",
    title: "医院挂号",
    description: "手机预约医生",
    input: "怎么用手机挂三甲医院的专家号",
    mockResult: {
      service_name: "三甲医院手机挂号",
      total_steps: 5,
      what_to_bring: ["身份证", "医保卡", "手机"],
      steps: [
        { step_number: 1, title: "打开应用", instruction: "在手机上找到微信或医院APP，先登录账号。", where_to_go: "手机上操作", tip: "不会用就让家人先帮你点一次" },
        { step_number: 2, title: "找挂号入口", instruction: "进入服务页面，找到挂号或预约挂号。", where_to_go: "首页服务区", tip: "看不到就直接搜索医院名字" },
        { step_number: 3, title: "选科室医生", instruction: "先选医院，再选科室，再选医生。", where_to_go: "挂号页面", tip: "拿不准就先选症状对应科室" },
        { step_number: 4, title: "选时间", instruction: "挑一个方便的日期和时段，确认信息。", where_to_go: "预约页面", tip: "专家号紧张，尽量早点选" },
        { step_number: 5, title: "完成支付", instruction: "核对姓名、日期和科室后付款。", where_to_go: "医院线上支付页", tip: "提前半小时到医院" },
      ],
      common_mistakes: ["选错院区", "看错上午下午", "挂完号忘记去"],
      family_note: "可以把医院入口放到手机桌面，第一次最好陪着走一遍。",
    },
  },
  {
    id: "service-2",
    category: "service",
    icon: "报销",
    title: "医保报销",
    description: "看完病怎么报销",
    input: "在医院看完病了，怎么报销医保",
    mockResult: {
      service_name: "医保报销",
      total_steps: 4,
      what_to_bring: ["身份证", "医保卡", "发票", "费用清单"],
      steps: [
        { step_number: 1, title: "保留票据", instruction: "先把发票和清单收好，不要扔。", where_to_go: "医院现场", tip: "用文件袋单独装起来" },
        { step_number: 2, title: "问清规则", instruction: "到医院医保窗口问，哪些能报哪些不能报。", where_to_go: "医保窗口", tip: "提前问最省时间" },
        { step_number: 3, title: "提交材料", instruction: "按窗口要求交身份证和票据。", where_to_go: "医院医保办", tip: "材料拍照留底" },
        { step_number: 4, title: "线上补报", instruction: "必要时在医保APP里继续提交。", where_to_go: "手机医保服务", tip: "不会操作就让家人协助" },
      ],
      common_mistakes: ["发票丢了", "超过报销时限", "不知道哪些药不能报"],
      family_note: "报销材料先拍照，家人也留一份。",
    },
  },
];

const reminderScenarios: DemoScenario[] = [
  {
    id: "reminder-1",
    category: "reminder",
    icon: "用药",
    title: "用药提醒",
    description: "把药和时间理清楚",
    input: "降压药每天早上吃一片，降脂药晚上吃一片，下周三去社区医院复查。",
    mockResult: {
      reminder_type: "mixed",
      parsed_items: [
        { what: "降压药", when: "早上", frequency: "每天1次", note: "饭后吃" },
        { what: "降脂药", when: "晚上", frequency: "每天1次", note: "睡前吃" },
        { what: "社区医院复查", when: "下周三", frequency: "一次", note: "带医保卡和检查单" },
      ],
      daily_schedule: "早上饭后：降压药1片\n晚上睡前：降脂药1片\n下周三：去社区医院复查",
      family_view: "1. 降压药每天早上饭后1片。\n2. 降脂药每天晚上睡前1片。\n3. 下周三去社区医院复查，请陪同。",
      warnings: ["阿司匹林一定饭后吃", "不要自己改药量"],
    },
  },
];

export const allScenarios: DemoScenario[] = [...fraudScenarios, ...serviceScenarios, ...reminderScenarios];
export const scenariosByCategory = { fraud: fraudScenarios, service: serviceScenarios, reminder: reminderScenarios };
export function getScenarioById(id: string) { return allScenarios.find((s) => s.id === id); }
