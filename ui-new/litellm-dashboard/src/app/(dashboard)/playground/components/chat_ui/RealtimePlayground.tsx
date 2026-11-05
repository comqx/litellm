"use client";

import { CircleX, Mic, MicOff, Send, Volume2 } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProxyBaseUrl } from "@/components/networking";
import { OPEN_AI_VOICE_SELECT_OPTIONS } from "./chatConstants";

interface RealtimeMessage {
  role: "user" | "assistant" | "system" | "status";
  content: string;
  timestamp: Date;
}

interface RealtimePlaygroundProps {
  accessToken: string;
  selectedModel: string;
  customProxyBaseUrl?: string;
  selectedGuardrails?: string[];
}

const RealtimePlayground: React.FC<RealtimePlaygroundProps> = ({
  accessToken,
  selectedModel,
  customProxyBaseUrl,
  selectedGuardrails,
}) => {
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nextPlayTimeRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const addMessage = useCallback((role: RealtimeMessage["role"], content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
  }, []);

  const appendAssistantText = useCallback((text: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant") {
        return [...prev.slice(0, -1), { ...last, content: last.content + text }];
      }
      return [...prev, { role: "assistant", content: text, timestamp: new Date() }];
    });
  }, []);

  const playAudioChunk = useCallback((base64Audio: string) => {
    const raw = atob(base64Audio);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;

    const ctx = audioContextRef.current;
    if (!ctx) return;

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startTime = Math.max(now, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current) return;
    if (!selectedModel) {
      addMessage("status", "请先选择模型");
      return;
    }
    setIsConnecting(true);

    try {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      const baseUrl = customProxyBaseUrl || getProxyBaseUrl();
      const wsBase = baseUrl.replace(/^http/, "ws");
      let url = `${wsBase}/v1/realtime?model=${encodeURIComponent(selectedModel)}`;
      if (selectedGuardrails && selectedGuardrails.length > 0) {
        url += `&guardrails=${encodeURIComponent(selectedGuardrails.join(","))}`;
      }

      const ws = new WebSocket(url, ["realtime", `openai-insecure-api-key.${accessToken}`]);

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        addMessage("status", "已连接到 Realtime API");
      };

      ws.onmessage = async (event) => {
        try {
          let raw = event.data;
          if (raw instanceof Blob) {
            raw = await raw.text();
          } else if (raw instanceof ArrayBuffer) {
            raw = new TextDecoder().decode(raw);
          }
          const data = JSON.parse(raw);
          const type = data.type;

          if (type === "session.created") {
            // GA: session.type is required ("realtime" | "transcription")
            ws.send(
              JSON.stringify({
                type: "session.update",
                session: {
                  type: "realtime",
                  modalities: ["text", "audio"],
                  voice: selectedVoice,
                  input_audio_format: "pcm16",
                  output_audio_format: "pcm16",
                  input_audio_transcription: { model: "gpt-4o-mini-transcribe" },
                  turn_detection: null,
                },
              }),
            );
          } else if (type === "session.updated") {
            // session configured
          } else if (
            // GA: response.output_audio.delta  |  beta: response.audio.delta
            type === "response.output_audio.delta" ||
            type === "response.audio.delta"
          ) {
            if (data.delta) playAudioChunk(data.delta);
          } else if (
            // GA: response.output_text.delta / response.output_audio_transcript.delta
            // beta: response.text.delta / response.audio_transcript.delta
            type === "response.output_text.delta" ||
            type === "response.output_audio_transcript.delta" ||
            type === "response.audio_transcript.delta" ||
            type === "response.text.delta"
          ) {
            if (data.delta) appendAssistantText(data.delta);
          } else if (type === "conversation.item.input_audio_transcription.completed") {
            if (data.transcript) addMessage("user", data.transcript);
          } else if (type === "response.done") {
            // Ensure we have the full text if deltas were missed.
            // Accept both beta (type=text/audio) and GA (type=output_text/output_audio) content.
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === "assistant" && last.content) return prev;
              const output = data.response?.output || [];
              const texts: string[] = [];
              for (const item of output) {
                for (const c of item.content || []) {
                  // beta: c.text (type=text), c.transcript (type=audio)
                  // GA:   c.text (type=output_text), c.transcript (type=output_audio)
                  const t = c.text || c.transcript;
                  if (t) texts.push(t);
                }
              }
              if (texts.length > 0) {
                return [...prev, { role: "assistant" as const, content: texts.join(""), timestamp: new Date() }];
              }
              return prev;
            });
          } else if (type === "error") {
            addMessage("status", `错误：${data.error?.message || JSON.stringify(data.error)}`);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        addMessage("status", "WebSocket 错误");
        setIsConnected(false);
        setIsConnecting(false);
      };

      ws.onclose = () => {
        addMessage("status", "已断开");
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
      };

      wsRef.current = ws;
    } catch (err: any) {
      addMessage("status", `连接失败：${err.message}`);
      setIsConnecting(false);
    }
  }, [
    accessToken,
    selectedModel,
    selectedVoice,
    customProxyBaseUrl,
    selectedGuardrails,
    addMessage,
    appendAssistantText,
    playAudioChunk,
  ]);

  const disconnect = useCallback(() => {
    stopRecording();
    wsRef.current?.close();
    wsRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    nextPlayTimeRef.current = 0;
    configureSessionRef.current = false;
    setIsConnected(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Switch to server VAD mode for voice input
    // GA: session.type is required
    wsRef.current.send(
      JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          modalities: ["text", "audio"],
          voice: selectedVoice,
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: { model: "gpt-4o-mini-transcribe" },
          turn_detection: { type: "server_vad" },
        },
      }),
    );

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ctx = audioContextRef.current || new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);

        // Resample to 24kHz if needed
        const sampleRate = ctx.sampleRate;
        const targetRate = 24000;
        let samples: Float32Array;
        if (sampleRate !== targetRate) {
          const ratio = sampleRate / targetRate;
          const newLength = Math.round(input.length / ratio);
          samples = new Float32Array(newLength);
          for (let i = 0; i < newLength; i++) {
            samples[i] = input[Math.round(i * ratio)] || 0;
          }
        } else {
          samples = input;
        }

        // Convert to PCM16
        const pcm16 = new Int16Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
          const s = Math.max(-1, Math.min(1, samples[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Base64 encode and send
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);

        wsRef.current!.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }));
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      setIsRecording(true);
      addMessage("status", "🎙️ 正在聆听…");
    } catch (err: any) {
      addMessage("status", `麦克风错误：${err.message}`);
    }
  }, [addMessage]);

  const stopRecording = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setIsRecording(false);
  }, []);

  const configureSessionRef = useRef(false);

  const ensureTextSession = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (configureSessionRef.current) return;
    configureSessionRef.current = true;
    // GA: session.type is required
    wsRef.current.send(
      JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          modalities: ["text", "audio"],
          voice: selectedVoice,
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: { model: "gpt-4o-mini-transcribe" },
          turn_detection: null,
        },
      }),
    );
  }, [selectedVoice]);

  const sendTextMessage = useCallback(() => {
    if (!inputText.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const text = inputText.trim();
    addMessage("user", text);
    setInputText("");

    wsRef.current.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      }),
    );
    wsRef.current.send(JSON.stringify({ type: "response.create" }));
  }, [inputText, addMessage, ensureTextSession]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      audioContextRef.current?.close();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted">
        <div className="flex items-center gap-3">
          <Volume2 className="size-5 text-info" />
          <span className="font-semibold text-foreground">Realtime 语音 Chat</span>
          <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? "bg-success" : "bg-border"}`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? "已连接" : isConnecting ? "连接中…" : "已断开"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedVoice}
            onValueChange={(voice) => setSelectedVoice(voice ?? selectedVoice)}
            disabled={isConnected}
          >
            <SelectTrigger size="sm" className="w-[220px]" aria-label="语音">
              <SelectValue>{OPEN_AI_VOICE_SELECT_OPTIONS.find((v) => v.value === selectedVoice)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {OPEN_AI_VOICE_SELECT_OPTIONS.map((voice) => (
                <SelectItem key={voice.value} value={voice.value}>
                  {voice.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isConnected ? (
            <Button onClick={connect} disabled={isConnecting} size="sm">
              连接
            </Button>
          ) : (
            <Button variant="destructive" onClick={disconnect} size="sm">
              <CircleX />
              断开连接
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !isConnected && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Volume2 className="size-12" />
            <span className="text-lg text-muted-foreground">Realtime 语音调试台</span>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              点击<b>连接</b>开始实时会话。可使用麦克风说话或输入消息。
              AI 会以语音和文字回复。
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : msg.role === "status" ? "justify-center" : "justify-start"}`}
          >
            {msg.role === "status" ? (
              <div className="text-xs text-muted-foreground italic px-3 py-1">{msg.content}</div>
            ) : (
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-info text-info-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <div className="text-xs font-medium mb-0.5 opacity-70">{msg.role === "user" ? "你" : "AI"}</div>
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {isConnected && (
        <div className="border-t border-border p-3 bg-card">
          <div className="flex items-center gap-2">
            <Button
              size="icon-lg"
              variant={isRecording ? "destructive" : "outline"}
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? "停止录音" : "开始录音"}
              className={`rounded-full ${isRecording ? "animate-pulse" : ""}`}
            >
              {isRecording ? <MicOff /> : <Mic />}
            </Button>
            <Input
              placeholder="输入消息或使用麦克风…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendTextMessage();
              }}
              className="h-10 flex-1"
            />
            <Button size="icon-lg" onClick={sendTextMessage} disabled={!inputText.trim()} aria-label="发送">
              <Send />
            </Button>
          </div>
          {isRecording && (
            <div className="mt-2 flex items-center gap-2 text-destructive text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-pulse" />
              正在聆听，请对着麦克风说话。服务端 VAD 会检测你何时停止。
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealtimePlayground;
