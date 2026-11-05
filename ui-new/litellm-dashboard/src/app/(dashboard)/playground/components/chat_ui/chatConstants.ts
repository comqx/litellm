import { EndpointType } from "@/components/chat_ui/mode_endpoint_mapping";

export const OPEN_AI_VOICES = {
  ALLOY: "alloy",
  ASH: "ash",
  BALAD: "ballad",
  CORAL: "coral",
  ECHO: "echo",
  FABLE: "fable",
  NOVA: "nova",
  ONYX: "onyx",
  SAGE: "sage",
  SHIMMER: "shimmer",
} as const;

export type OpenAIVoice = (typeof OPEN_AI_VOICES)[keyof typeof OPEN_AI_VOICES];

export const OPEN_AI_VOICE_LABELS = {
  ALLOY: "Alloy - 专业自信",
  ASH: "Ash - 随性放松",
  BALAD: "Ballad - 柔和悦耳",
  CORAL: "Coral - 温暖亲切",
  ECHO: "Echo - 友好健谈",
  FABLE: "Fable - 睿智沉稳",
  NOVA: "Nova - 友好健谈",
  ONYX: "Onyx - 低沉权威",
  SAGE: "Sage - 睿智沉稳",
  SHIMMER: "Shimmer - 明快开朗",
};

export const OPEN_AI_VOICE_SELECT_OPTIONS = Object.entries(OPEN_AI_VOICES).map(([key, voice]) => ({
  value: voice,
  label: OPEN_AI_VOICE_LABELS[key as keyof typeof OPEN_AI_VOICE_LABELS],
}));

export const ENDPOINT_OPTIONS = [
  { value: EndpointType.CHAT, label: "/v1/chat/completions" },
  { value: EndpointType.RESPONSES, label: "/v1/responses" },
  { value: EndpointType.ANTHROPIC_MESSAGES, label: "/v1/messages" },
  { value: EndpointType.IMAGE, label: "/v1/images/generations" },
  { value: EndpointType.IMAGE_EDITS, label: "/v1/images/edits" },
  { value: EndpointType.EMBEDDINGS, label: "/v1/embeddings" },
  { value: EndpointType.SPEECH, label: "/v1/audio/speech" },
  { value: EndpointType.TRANSCRIPTION, label: "/v1/audio/transcriptions" },
  { value: EndpointType.A2A_AGENTS, label: "/v1/a2a/message/send" },
  { value: EndpointType.MCP, label: "/mcp-rest/tools/call" },
  { value: EndpointType.REALTIME, label: "/v1/realtime" },
  { value: EndpointType.INTERACTIONS, label: "/v1beta/interactions" },
];
