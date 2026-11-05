// Define the available test modes
export const TEST_MODES = [
  { value: "chat", label: "Chat - /chat/completions" },
  { value: "completion", label: "Completion - /completions" },
  { value: "embedding", label: "Embedding - /embeddings" },
  { value: "audio_speech", label: "Audio Speech - /audio/speech" },
  { value: "audio_transcription", label: "Audio Transcription - /audio/transcriptions" },
  { value: "image_generation", label: "Image Generation - /images/generations" },
  { value: "image_edit", label: "Image Edit - /images/edits" },
  { value: "video_generation", label: "Video Generation - /videos" },
  { value: "rerank", label: "Rerank - /rerank" },
  { value: "realtime", label: "Realtime - /realtime" },
  { value: "batch", label: "Batch - /batch" },
  { value: "anthropic_messages", label: "Anthropic Messages - /v1/messages" },
  { value: "ocr", label: "OCR - /ocr" },
  { value: "evaluation", label: "Evaluation - /v1/decisions" },
];

// Define the available auto router routing strategies
export const AUTO_ROUTER_MODES = [
  { value: "simple-shuffle", label: "Simple Shuffle - 从可用 Models 中随机选择" },
  { value: "least-busy", label: "Least Busy - 路由到当前负载最低的 Model" },
  { value: "latency-based", label: "Latency Based - 路由到响应时间最优的 Model" },
  { value: "cost-based", label: "Cost Based - 路由到最具成本效益的 Model" },
  { value: "usage-based", label: "Usage Based - 基于历史使用模式路由" },
  { value: "custom", label: "Custom - 使用配置中定义的自定义路由逻辑" },
];
