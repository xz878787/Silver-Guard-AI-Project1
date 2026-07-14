"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { DemoScenario } from "@/lib/scenarios";
import { scenariosByCategory } from "@/lib/scenarios";

interface MessageInputProps {
  onSubmit: (input: string) => void;
  onScenarioSelect: (scenario: DemoScenario) => void;
  isLoading: boolean;
  defaultValue?: string;
}

interface SpeechRecognitionEventLike extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } }; length: number };
}
interface SpeechRecognitionErrorEventLike extends Event { error: string; }
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export default function MessageInput({ onSubmit, onScenarioSelect, isLoading, defaultValue = "" }: MessageInputProps) {
  const [input, setInput] = useState(defaultValue);
  const [isListening, setIsListening] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [toolMessage, setToolMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setInput(defaultValue); }, [defaultValue]);
  useEffect(() => () => recognitionRef.current?.stop(), []);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) onSubmit(input.trim());
  };

  const toggleSpeechInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setToolMessage("当前浏览器不支持语音输入，请使用最新版 Chrome 或 Edge");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript).join("");
      setInput((current) => `${current}${current ? "\n" : ""}${transcript}`.slice(0, 500));
      setToolMessage("已把你说的话填入输入框");
    };
    recognition.onerror = (event) => {
      setToolMessage(event.error === "not-allowed" ? "请允许麦克风权限后再试" : "没有听清，请靠近手机再说一次");
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setToolMessage("请说出短信或电话里的内容…");
    setIsListening(true);
    recognition.start();
  };

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToolMessage("请选择短信截图或照片");
      return;
    }
    setIsScanning(true);
    setScanProgress(2);
    setToolMessage("正在识别图片文字，首次使用约需十几秒…");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("chi_sim+eng", 1, {
        workerPath: "/ocr/worker.min.js",
        corePath: "/ocr/tesseract-core-simd-lstm.wasm.js",
        langPath: "/ocr/lang",
        logger: (message) => {
          if (typeof message.progress === "number") setScanProgress(Math.round(message.progress * 100));
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const text = data.text.replace(/\s*\n\s*/g, "\n").trim().slice(0, 500);
      if (!text) throw new Error("empty ocr result");
      setInput(text);
      setToolMessage(`识别完成，已读出 ${text.length} 个字，请确认后开始分析`);
    } catch (error) {
      console.error("OCR failed", error);
      setToolMessage("图片文字没有识别清楚，请重新拍近一点、拍正一点");
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const charsLeft = 500 - input.length;
  return (
    <section className="input-studio" aria-labelledby="message-input-label">
      <div className="input-heading-row">
        <div>
          <span className="step-kicker">第 1 步</span>
          <label id="message-input-label" htmlFor="message-input" className="section-title input-title">把可疑消息交给我</label>
        </div>
        <span className="privacy-note">🔒 图片仅在本机识别</span>
      </div>
      <div className="capture-grid">
        <button className="capture-button capture-camera" type="button" onClick={() => cameraInputRef.current?.click()} disabled={isScanning || isLoading}>
          <span className="capture-icon">📷</span>
          <span><strong>拍照识别短信</strong><small>对准手机或纸质通知</small></span>
        </button>
        <button className={`capture-button ${isListening ? "is-listening" : ""}`} type="button" onClick={toggleSpeechInput} disabled={isScanning || isLoading}>
          <span className="capture-icon">{isListening ? "〰️" : "🎙️"}</span>
          <span><strong>{isListening ? "正在听，请说话…" : "点一下，说给我听"}</strong><small>{isListening ? "再次点击可停止" : "适合复述电话内容"}</small></span>
        </button>
      </div>
      <input ref={cameraInputRef} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={handleImage} />
      <input ref={albumInputRef} className="visually-hidden" type="file" accept="image/*" onChange={handleImage} />
      <button className="album-link" type="button" onClick={() => albumInputRef.current?.click()} disabled={isScanning || isLoading}>或从相册选择短信截图</button>
      {(toolMessage || isScanning) && (
        <div className={`tool-status ${isScanning ? "is-working" : ""}`} role="status" aria-live="polite">
          {isScanning && <span className="scanner-spinner" />}
          <span>{isScanning ? `${toolMessage} ${scanProgress}%` : toolMessage}</span>
          {isScanning && <span className="scan-progress"><span style={{ width: `${scanProgress}%` }} /></span>}
        </div>
      )}
      <div className="input-divider"><span>也可以直接粘贴或输入</span></div>
      <textarea id="message-input" className="input-large" placeholder="例如：医保中心通知，点击链接上传身份证，否则账户将被冻结……" rows={4} maxLength={500} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} />
      <div className="flex-between mt-8"><span className="text-muted" style={{ fontSize: 12 }}>{input.length > 0 ? `${charsLeft} 字剩余` : "不会保存原始照片"}</span></div>
      <button className="btn btn-primary btn-large analyze-button mt-12" onClick={handleSubmit} disabled={isLoading || isScanning || !input.trim()}>
        {isLoading ? <><span className="button-spinner" /> AI 正在仔细判断</> : <>🛡️ 立即分析风险</>}
      </button>
      <div className="demo-scenes">
        <p className="section-title">现场演示 · 一键触发</p>
        <div className="chip-row">
          {scenariosByCategory.fraud.map((scenario) => <button key={scenario.id} className="scenario-chip" onClick={() => onScenarioSelect(scenario)} disabled={isLoading}>{scenario.title}</button>)}
        </div>
      </div>
    </section>
  );
}