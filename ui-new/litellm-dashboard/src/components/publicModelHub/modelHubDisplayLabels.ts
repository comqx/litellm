const MODE_LABELS: Readonly<Record<string, string>> = {
  chat: "对话",
  embedding: "嵌入",
  rerank: "重排序",
  video_generation: "视频生成",
  image_generation: "图片生成",
  audio_speech: "语音",
};

const FEATURE_LABELS: Readonly<Record<string, string>> = {
  function_calling: "函数调用",
  parallel_function_calling: "并行函数调用",
  reasoning: "推理",
  vision: "视觉",
  web_search: "网络搜索",
};

export const modeLabel = (mode: string): string => MODE_LABELS[mode] ?? mode;

export const featureLabel = (feature: string): string => FEATURE_LABELS[feature] ?? feature;

export const capabilityLabel = (supportsKey: string): string =>
  featureLabel(supportsKey.replace(/^supports_/, ""));
