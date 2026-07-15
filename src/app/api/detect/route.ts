import { NextRequest, NextResponse } from "next/server";
import { detectFraud } from "@/lib/ai-service";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "请提供要分析的文本" },
        { status: 400 }
      );
    }

    const result = await detectFraud(text, { provider: "deepseek" });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] 分析失败:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "AI 分析服务暂时不可用"
      },
      { status: 503 }
    );
  }
}
