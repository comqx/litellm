import React, { useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { ArrowLeft, MoreVertical, Plus } from "lucide-react";
import {
  GuardrailPipeline,
  PipelineStep,
  PipelineTestResult,
  PolicyCreateRequest,
  PolicyUpdateRequest,
  Policy,
} from "@/components/policies/types";
import { Guardrail } from "@/components/guardrails/types";
import {
  testPipelineCall,
  listPolicyVersions,
  createPolicyVersion,
  updatePolicyVersionStatus,
} from "@/components/networking";
import { getComplianceDatasetPrompts, getFrameworks } from "@/data/compliancePrompts";
import type { CompliancePrompt } from "@/data/compliancePrompts";

const TEST_SOURCE_QUICK = "quick_chat";
const TEST_SOURCE_ALL = "__all__";

function getPromptsForTestSource(source: string): CompliancePrompt[] {
  if (source === TEST_SOURCE_QUICK) return [];
  if (source === TEST_SOURCE_ALL) return getComplianceDatasetPrompts();
  const fw = getFrameworks().find((f) => f.name === source);
  return fw ? fw.categories.flatMap((c) => c.prompts) : [];
}

const ACTION_OPTIONS = [
  { label: "下一步", value: "next" },
  { label: "允许", value: "allow" },
  { label: "拦截", value: "block" },
  { label: "自定义响应", value: "modify_response" },
];

const ACTION_LABELS: Record<string, string> = {
  allow: "允许",
  block: "拦截",
  next: "下一步",
  modify_response: "自定义响应",
};

const VERSION_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  published: "已发布",
  production: "生产",
};

const formatTerminalActionLabel = (action: string): string => {
  if (action === "modify_response") return "自定义响应";
  return ACTION_LABELS[action] || action;
};

function createDefaultStep(): PipelineStep {
  return {
    guardrail: "",
    on_pass: "next",
    on_fail: "block",
    pass_data: false,
    modify_response_message: null,
  };
}

function insertStep(steps: PipelineStep[], atIndex: number): PipelineStep[] {
  const newSteps = [...steps];
  newSteps.splice(atIndex, 0, createDefaultStep());
  return newSteps;
}

function removeStep(steps: PipelineStep[], index: number): PipelineStep[] {
  if (steps.length <= 1) return steps;
  const newSteps = [...steps];
  newSteps.splice(index, 1);
  return newSteps;
}

function updateStepAtIndex(steps: PipelineStep[], index: number, updated: Partial<PipelineStep>): PipelineStep[] {
  return steps.map((s, i) => (i === index ? { ...s, ...updated } : s));
}

/**
 * Derives a pipeline from a policy. When the policy has a pipeline, use it.
 * When it only has guardrails_add (legacy/simple form), convert those guardrails
 * into pipeline steps in order.
 */
function derivePipelineFromPolicy(policy: Policy | null | undefined): GuardrailPipeline {
  if (!policy) {
    return { mode: "pre_call", steps: [createDefaultStep()] };
  }
  if (policy.pipeline?.steps?.length) {
    return policy.pipeline;
  }
  const guardrails = policy.guardrails_add || [];
  if (guardrails.length > 0) {
    return {
      mode: policy.pipeline?.mode ?? "pre_call",
      steps: guardrails.map((g) => ({
        guardrail: g,
        on_pass: "next" as const,
        on_fail: "block" as const,
        pass_data: false,
        modify_response_message: null,
      })),
    };
  }
  return { mode: "pre_call", steps: [createDefaultStep()] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons (matching the reference image)
// ─────────────────────────────────────────────────────────────────────────────

const GuardrailIcon: React.FC = () => (
  <div
    style={{
      width: 28,
      height: 28,
      borderRadius: "50%",
      backgroundColor: "color-mix(in oklab, var(--color-info) 10%, transparent)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ color: "var(--color-info)" }}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
    </svg>
  </div>
);

const PlayIcon: React.FC = () => (
  <div
    style={{
      width: 28,
      height: 28,
      borderRadius: "50%",
      backgroundColor: "var(--color-muted)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      style={{ color: "var(--color-muted-foreground)" }}
    >
      <polygon points="6,3 20,12 6,21" />
    </svg>
  </div>
);

const PassIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, color: "var(--color-success)" }}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const FailIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, color: "var(--color-destructive)" }}
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const ApiFailureIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, color: "var(--color-warning)" }}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Connector
// ─────────────────────────────────────────────────────────────────────────────

interface ConnectorProps {
  onInsert: () => void;
}

const Connector: React.FC<ConnectorProps> = ({ onInsert }) => (
  <div className="flex flex-col items-center" style={{ height: 56 }}>
    <div style={{ width: 1, flex: 1, backgroundColor: "var(--color-border)" }} />
    <button
      onClick={onInsert}
      className="z-raised flex items-center justify-center"
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-card)",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-info)";
        e.currentTarget.style.backgroundColor = "color-mix(in oklab, var(--color-info) 10%, transparent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border)";
        e.currentTarget.style.backgroundColor = "var(--color-card)";
      }}
      title="插入步骤"
    >
      <Plus style={{ width: 12, height: 12, color: "var(--color-muted-foreground)" }} />
    </button>
    <div style={{ width: 1, flex: 1, backgroundColor: "var(--color-border)" }} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Step Card (editable)
// ─────────────────────────────────────────────────────────────────────────────

interface StepCardProps {
  step: PipelineStep;
  stepIndex: number;
  totalSteps: number;
  onChange: (updated: Partial<PipelineStep>) => void;
  onDelete: () => void;
  availableGuardrails: Guardrail[];
}

const StepCard: React.FC<StepCardProps> = ({
  step,
  stepIndex,
  totalSteps,
  onChange,
  onDelete,
  availableGuardrails,
}) => {
  const guardrailOptions = availableGuardrails.map((g) => ({
    label: g.guardrail_name || g.guardrail_id,
    value: g.guardrail_name || g.guardrail_id,
  }));

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        backgroundColor: "var(--color-card)",
        maxWidth: 720,
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between" style={{ padding: "14px 20px 0 20px" }}>
        <div className="flex items-center gap-2">
          <GuardrailIcon />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--color-info)",
              letterSpacing: "0.06em",
            }}
          >
            护栏
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13, color: "var(--color-muted-foreground)" }}>步骤 {stepIndex + 1}</span>
          <button
            onClick={onDelete}
            disabled={totalSteps <= 1}
            style={{
              background: "none",
              border: "none",
              cursor: totalSteps <= 1 ? "not-allowed" : "pointer",
              opacity: totalSteps <= 1 ? 0.3 : 1,
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
            title="删除步骤"
          >
            <MoreVertical style={{ width: 16, height: 16, color: "var(--color-muted-foreground)" }} />
          </button>
        </div>
      </div>

      {/* Guardrail selector */}
      <div style={{ padding: "12px 20px 16px 20px" }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-muted-foreground)",
            display: "block",
            marginBottom: 6,
          }}
        >
          护栏
        </label>
        <SearchSelect
          options={guardrailOptions}
          value={step.guardrail || undefined}
          onValueChange={(value) => onChange({ guardrail: value ?? undefined })}
          placeholder="选择护栏"
          emptyText="未找到护栏"
        />
      </div>

      {/* ON PASS section */}
      <div style={{ borderTop: "1px solid var(--color-border)", padding: "14px 20px" }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <PassIcon />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-foreground)" }}>通过时</span>
        </div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-muted-foreground)",
            display: "block",
            marginBottom: 6,
          }}
        >
          动作
        </label>
        <Select value={step.on_pass} onValueChange={(value) => onChange({ on_pass: value as PipelineStep["on_pass"] })}>
          <SelectTrigger className="w-full">
            <SelectValue>{ACTION_LABELS[step.on_pass] || step.on_pass}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {step.on_pass === "modify_response" && (
          <div style={{ marginTop: 8 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-muted-foreground)",
                display: "block",
                marginBottom: 6,
              }}
            >
              自定义响应消息
            </label>
            <Input
              placeholder="输入自定义响应…"
              value={step.modify_response_message || ""}
              onChange={(e) => onChange({ modify_response_message: e.target.value || null })}
            />
          </div>
        )}
      </div>

      {/* ON FAIL section */}
      <div style={{ borderTop: "1px solid var(--color-border)", padding: "14px 20px" }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <FailIcon />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-foreground)" }}>失败时</span>
        </div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-muted-foreground)",
            display: "block",
            marginBottom: 6,
          }}
        >
          动作
        </label>
        <Select value={step.on_fail} onValueChange={(value) => onChange({ on_fail: value as PipelineStep["on_fail"] })}>
          <SelectTrigger className="w-full">
            <SelectValue>{ACTION_LABELS[step.on_fail] || step.on_fail}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {step.on_fail === "modify_response" && (
          <div style={{ marginTop: 8 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-muted-foreground)",
                display: "block",
                marginBottom: 6,
              }}
            >
              自定义响应消息
            </label>
            <Input
              placeholder="输入自定义响应…"
              value={step.modify_response_message || ""}
              onChange={(e) => onChange({ modify_response_message: e.target.value || null })}
            />
          </div>
        )}
      </div>

      {/* ON API FAILURE (technical / provider outage) — optional; defaults to ON FAIL */}
      <div style={{ borderTop: "1px solid var(--color-border)", padding: "14px 20px" }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <ApiFailureIcon />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-foreground)" }}>API 失败时</span>
        </div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-muted-foreground)",
            display: "block",
            marginBottom: 6,
          }}
        >
          动作
        </label>
        <Select
          value={step.on_error ?? null}
          onValueChange={(value) =>
            onChange({ on_error: value === null ? undefined : (value as PipelineStep["on_error"]) })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {step.on_error != null ? ACTION_LABELS[step.on_error] || step.on_error : "与失败时相同"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>与失败时相同</SelectItem>
            {ACTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {step.on_error === "modify_response" && step.on_fail !== "modify_response" && (
          <div style={{ marginTop: 8 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-muted-foreground)",
                display: "block",
                marginBottom: 6,
              }}
            >
              自定义响应消息
            </label>
            <Input
              placeholder="输入自定义响应…"
              value={step.modify_response_message || ""}
              onChange={(e) => onChange({ modify_response_message: e.target.value || null })}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface PipelineFlowBuilderProps {
  pipeline: GuardrailPipeline;
  onChange: (pipeline: GuardrailPipeline) => void;
  availableGuardrails: Guardrail[];
}

const PipelineFlowBuilder: React.FC<PipelineFlowBuilderProps> = ({ pipeline, onChange, availableGuardrails }) => {
  const handleInsertStep = (atIndex: number) => {
    onChange({ ...pipeline, steps: insertStep(pipeline.steps, atIndex) });
  };

  const handleRemoveStep = (index: number) => {
    onChange({ ...pipeline, steps: removeStep(pipeline.steps, index) });
  };

  const handleUpdateStep = (index: number, updated: Partial<PipelineStep>) => {
    onChange({
      ...pipeline,
      steps: updateStepAtIndex(pipeline.steps, index, updated),
    });
  };

  return (
    <div className="flex flex-col items-center" style={{ padding: "16px 0" }}>
      {/* Trigger Card */}
      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: 10,
          padding: "16px 20px",
          backgroundColor: "var(--color-card)",
          maxWidth: 720,
          width: "100%",
        }}
      >
        <div className="flex items-center gap-3">
          <PlayIcon />
          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.06em",
                display: "block",
                marginBottom: 2,
              }}
            >
              触发
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-foreground)", display: "block" }}>
              传入 LLM 请求
            </span>
            <span style={{ fontSize: 13, color: "var(--color-muted-foreground)" }}>
              当请求匹配此 Policy 时运行此流程
            </span>
          </div>
        </div>
      </div>

      {/* Steps */}
      {pipeline.steps.map((step, index) => (
        <React.Fragment key={index}>
          <Connector onInsert={() => handleInsertStep(index)} />
          <StepCard
            step={step}
            stepIndex={index}
            totalSteps={pipeline.steps.length}
            onChange={(updated) => handleUpdateStep(index, updated)}
            onDelete={() => handleRemoveStep(index)}
            availableGuardrails={availableGuardrails}
          />
        </React.Fragment>
      ))}

      {/* Bottom connector */}
      <Connector onInsert={() => handleInsertStep(pipeline.steps.length)} />

      {/* End card */}
      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: 10,
          padding: "14px 20px",
          backgroundColor: "var(--color-card)",
          maxWidth: 720,
          width: "100%",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: "var(--color-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.06em",
                display: "block",
                marginBottom: 2,
              }}
            >
              结束
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-foreground)", display: "block" }}>
              继续到 LLM
            </span>
            <span style={{ fontSize: 13, color: "var(--color-muted-foreground)" }}>请求继续发往 Model</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Read-only display for policy info view
// ─────────────────────────────────────────────────────────────────────────────

interface PipelineInfoDisplayProps {
  pipeline: GuardrailPipeline;
}

export const PipelineInfoDisplay: React.FC<PipelineInfoDisplayProps> = ({ pipeline }) => (
  <div className="flex flex-col items-center" style={{ padding: "16px 0" }}>
    {/* Trigger */}
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        padding: "14px 20px",
        backgroundColor: "var(--color-card)",
        maxWidth: 720,
        width: "100%",
      }}
    >
      <div className="flex items-center gap-3">
        <PlayIcon />
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--color-muted-foreground)",
              letterSpacing: "0.06em",
              display: "block",
              marginBottom: 2,
            }}
          >
            触发
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-foreground)" }}>传入 LLM 请求</span>
        </div>
      </div>
    </div>

    {/* Steps */}
    {pipeline.steps.map((step, index) => (
      <React.Fragment key={index}>
        {/* Connector */}
        <div style={{ width: 1, height: 32, backgroundColor: "var(--color-border)" }} />

        {/* Step card */}
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            padding: "14px 20px",
            backgroundColor: "var(--color-card)",
            maxWidth: 720,
            width: "100%",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <div className="flex items-center gap-2">
              <GuardrailIcon />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--color-info)",
                  letterSpacing: "0.06em",
                }}
              >
                护栏
              </span>
            </div>
            <span style={{ fontSize: 13, color: "var(--color-muted-foreground)" }}>步骤 {index + 1}</span>
          </div>

          {/* Name */}
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-foreground)", marginBottom: 8 }}>
            {step.guardrail}
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--color-muted)", marginBottom: 10 }} />

          {/* Pass / Fail / API failure */}
          <div className="flex flex-col gap-2" style={{ fontSize: 13, color: "var(--color-foreground)" }}>
            <span className="flex items-center gap-1.5">
              <PassIcon /> 通过 → {ACTION_LABELS[step.on_pass] || step.on_pass}
            </span>
            <span className="flex items-center gap-1.5">
              <FailIcon /> 失败时 → {ACTION_LABELS[step.on_fail] || step.on_fail}
            </span>
            <span className="flex items-center gap-1.5">
              <ApiFailureIcon /> API 失败时 →{" "}
              {step.on_error != null
                ? ACTION_LABELS[step.on_error] || step.on_error
                : `${ACTION_LABELS[step.on_fail] || step.on_fail}（与失败时相同）`}
            </span>
          </div>
        </div>
      </React.Fragment>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Test Panel (right drawer)
// ─────────────────────────────────────────────────────────────────────────────

interface PipelineTestPanelProps {
  pipeline: GuardrailPipeline;
  accessToken: string | null;
  onClose: () => void;
}

const OUTCOME_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pass: {
    bg: "color-mix(in oklab, var(--color-success) 10%, transparent)",
    color: "var(--color-success)",
    label: "通过",
  },
  fail: {
    bg: "color-mix(in oklab, var(--color-destructive) 10%, transparent)",
    color: "var(--color-destructive)",
    label: "失败",
  },
  error: {
    bg: "color-mix(in oklab, var(--color-warning) 10%, transparent)",
    color: "var(--color-warning)",
    label: "错误",
  },
};

const TERMINAL_STYLES: Record<string, { bg: string; color: string }> = {
  allow: { bg: "color-mix(in oklab, var(--color-success) 10%, transparent)", color: "var(--color-success)" },
  block: { bg: "color-mix(in oklab, var(--color-destructive) 10%, transparent)", color: "var(--color-destructive)" },
  modify_response: { bg: "color-mix(in oklab, var(--color-info) 10%, transparent)", color: "var(--color-info)" },
};

interface ComplianceRunEntry {
  prompt: CompliancePrompt;
  result: PipelineTestResult | null;
  error?: string;
  matched: boolean;
}

function complianceMatchExpected(expected: "pass" | "fail", terminalAction: string): boolean {
  if (expected === "pass") {
    return terminalAction === "allow" || terminalAction === "modify_response";
  }
  return terminalAction === "block";
}

const testSourceOptions = [
  { value: TEST_SOURCE_QUICK, label: "快速对话（自定义消息）" },
  ...getFrameworks().map((f) => ({ value: f.name, label: f.name })),
  { value: TEST_SOURCE_ALL, label: "全部合规数据集" },
];

const PipelineTestPanel: React.FC<PipelineTestPanelProps> = ({ pipeline, accessToken, onClose }) => {
  const [testSource, setTestSource] = useState<string>(TEST_SOURCE_QUICK);
  const [testMessage, setTestMessage] = useState("你好，能帮我一下吗？");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<PipelineTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [complianceResults, setComplianceResults] = useState<ComplianceRunEntry[]>([]);

  const isQuickChat = testSource === TEST_SOURCE_QUICK;
  const promptsForSource = getPromptsForTestSource(testSource);
  const isDataset = promptsForSource.length > 0;

  const handleRunTest = async () => {
    if (!accessToken) return;

    const emptySteps = pipeline.steps.filter((s) => !s.guardrail);
    if (emptySteps.length > 0) {
      setError("所有步骤都必须选择护栏");
      return;
    }

    setError(null);
    setIsRunning(true);
    setResult(null);
    setComplianceResults([]);

    if (isQuickChat) {
      try {
        const data = await testPipelineCall(accessToken, pipeline, [{ role: "user", content: testMessage }]);
        setResult(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsRunning(false);
      }
      return;
    }

    const entries: ComplianceRunEntry[] = [];
    for (const prompt of promptsForSource) {
      try {
        const data = await testPipelineCall(accessToken, pipeline, [{ role: "user", content: prompt.prompt }]);
        const matched = complianceMatchExpected(prompt.expectedResult, data.terminal_action);
        entries.push({ prompt, result: data, matched });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        entries.push({
          prompt,
          result: null,
          error: errMsg,
          matched: false,
        });
      }
    }
    setComplianceResults(entries);
    setIsRunning(false);
  };

  return (
    <div
      style={{
        width: 400,
        borderLeft: "1px solid var(--color-border)",
        backgroundColor: "var(--color-card)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-foreground)" }}>测试 Pipeline</span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            color: "var(--color-muted-foreground)",
            padding: "0 4px",
          }}
        >
          x
        </button>
      </div>

      {/* Input section */}
      <div style={{ padding: 16, borderBottom: "1px solid var(--color-border)" }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-muted-foreground)",
            display: "block",
            marginBottom: 6,
          }}
        >
          测试来源
        </label>
        <Select value={testSource} onValueChange={(value) => value !== null && setTestSource(value)}>
          <SelectTrigger className="mb-3 w-full">
            <SelectValue>
              {testSourceOptions.find((option) => option.value === testSource)?.label ?? testSource}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {testSourceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isQuickChat && (
          <>
            <label
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-muted-foreground)",
                display: "block",
                marginBottom: 6,
              }}
            >
              消息
            </label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="输入测试消息…"
              rows={3}
              style={{
                width: "100%",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 13,
                resize: "vertical",
                fontFamily: "inherit",
                backgroundColor: "var(--color-card)",
                color: "var(--color-foreground)",
              }}
            />
          </>
        )}
        {isDataset && (
          <div
            style={{
              fontSize: 12,
              color: "var(--color-muted-foreground)",
              padding: "8px 10px",
              backgroundColor: "var(--color-muted)",
              borderRadius: 6,
              marginBottom: 8,
            }}
          >
            {testSource === TEST_SOURCE_ALL
              ? "针对全部合规提示词运行 Pipeline（EU AI Act、GDPR、Topic Blocking、Airline 等）。"
              : `将 Pipeline 针对「${testSource}」中的 ${promptsForSource.length} 条提示词运行测试。`}
          </div>
        )}
        <Button onClick={handleRunTest} disabled={isRunning} style={{ marginTop: 8, width: "100%" }}>
          运行测试
        </Button>
      </div>

      {/* Results section */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {error && (
          <div
            style={{
              padding: "10px 12px",
              backgroundColor: "color-mix(in oklab, var(--color-destructive) 10%, transparent)",
              border: "1px solid color-mix(in oklab, var(--color-destructive) 30%, transparent)",
              borderRadius: 6,
              fontSize: 13,
              color: "var(--color-destructive)",
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <div>
            {/* Step results */}
            {result.step_results.map((step, i) => {
              const style = OUTCOME_STYLES[step.outcome] || OUTCOME_STYLES.error;
              return (
                <div
                  key={i}
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    marginBottom: 8,
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-foreground)" }}>
                      步骤 {i + 1}：{step.guardrail_name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: style.bg,
                        color: style.color,
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {style.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>
                    动作：{ACTION_LABELS[step.action_taken] || step.action_taken}
                    {step.duration_seconds != null && (
                      <span style={{ marginLeft: 8 }}>({(step.duration_seconds * 1000).toFixed(0)}ms)</span>
                    )}
                  </div>
                  {step.error_detail && (
                    <div style={{ fontSize: 12, color: "var(--color-destructive)", marginTop: 4 }}>
                      {step.error_detail}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Terminal result */}
            <div
              style={{
                borderTop: "1px solid var(--color-border)",
                paddingTop: 12,
                marginTop: 4,
              }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-foreground)" }}>结果</span>
                {(() => {
                  const ts = TERMINAL_STYLES[result.terminal_action] || TERMINAL_STYLES.block;
                  return (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        backgroundColor: ts.bg,
                        color: ts.color,
                        padding: "3px 10px",
                        borderRadius: 4,
                        textTransform: "uppercase",
                      }}
                    >
                      {formatTerminalActionLabel(result.terminal_action)}
                    </span>
                  );
                })()}
              </div>
              {result.error_message && (
                <div style={{ fontSize: 12, color: "var(--color-destructive)", marginTop: 6 }}>
                  {result.error_message}
                </div>
              )}
              {result.modify_response_message && (
                <div style={{ fontSize: 12, color: "var(--color-info)", marginTop: 6 }}>
                  响应：{result.modify_response_message}
                </div>
              )}
            </div>
          </div>
        )}

        {complianceResults.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-foreground)",
                marginBottom: 8,
              }}
            >
              合规数据集
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--color-muted-foreground)",
                marginBottom: 10,
              }}
            >
              {complianceResults.filter((e) => e.matched).length} / {complianceResults.length} 条符合预期
            </div>
            <div
              style={{
                maxHeight: 320,
                overflowY: "auto",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
            >
              {complianceResults.map((entry, i) => {
                const actual = entry.result?.terminal_action ?? (entry.error ? "error" : "—");
                const matchStyle = entry.matched
                  ? { bg: "color-mix(in oklab, var(--color-success) 10%, transparent)", color: "var(--color-success)" }
                  : {
                      bg: "color-mix(in oklab, var(--color-destructive) 10%, transparent)",
                      color: "var(--color-destructive)",
                    };
                return (
                  <div
                    key={entry.prompt.id ?? i}
                    style={{
                      padding: "8px 10px",
                      borderBottom: i < complianceResults.length - 1 ? "1px solid var(--color-border)" : "none",
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        color: "var(--color-foreground)",
                        marginBottom: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={entry.prompt.prompt}
                    >
                      {entry.prompt.prompt}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ color: "var(--color-muted-foreground)" }}>
                        预期：{entry.prompt.expectedResult === "pass" ? "通过" : "失败"}
                      </span>
                      <span style={{ color: "var(--color-muted-foreground)" }}>→</span>
                      <span style={{ color: "var(--color-muted-foreground)" }}>
                        实际：{actual === "error" ? "错误" : formatTerminalActionLabel(actual)}
                      </span>
                      <span
                        style={{
                          backgroundColor: matchStyle.bg,
                          color: matchStyle.color,
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        {entry.matched ? "✓" : "✗"}
                      </span>
                    </div>
                    {entry.error && (
                      <div style={{ color: "var(--color-destructive)", marginTop: 4 }}>{entry.error}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!result && !error && complianceResults.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--color-muted-foreground)", fontSize: 13, marginTop: 24 }}>
            请在上方选择测试来源（快速对话或合规数据集），然后点击「运行测试」
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Policy Versions Sidebar (left sidebar when editing a policy)
// ─────────────────────────────────────────────────────────────────────────────

const VERSION_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft: { bg: "var(--color-muted)", color: "var(--color-muted-foreground)" },
  published: { bg: "color-mix(in oklab, var(--color-info) 10%, transparent)", color: "var(--color-info)" },
  production: { bg: "color-mix(in oklab, var(--color-success) 10%, transparent)", color: "var(--color-success)" },
};

interface PolicyVersionsSidebarProps {
  policyName: string;
  editingPolicyId: string | null;
  editingVersionStatus?: "draft" | "published" | "production";
  accessToken: string | null;
  versions: Policy[];
  isLoading: boolean;
  isCreatingVersion?: boolean;
  isUpdatingStatus?: boolean;
  onNewVersion: () => void;
  onSelectVersion: (policy: Policy) => void;
  onPublish?: () => void;
  onPromoteToProduction?: () => void;
}

const PolicyVersionsSidebar: React.FC<PolicyVersionsSidebarProps> = ({
  policyName,
  editingPolicyId,
  editingVersionStatus,
  accessToken,
  versions,
  isLoading,
  isCreatingVersion = false,
  isUpdatingStatus = false,
  onNewVersion,
  onSelectVersion,
  onPublish,
  onPromoteToProduction,
}) => {
  const canPublish = editingVersionStatus === "draft" && onPublish;
  const canPromote = editingVersionStatus === "published" && onPromoteToProduction;

  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        backgroundColor: "var(--color-card)",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
        {/* Versions section */}
        <div style={{ marginBottom: 24 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--color-muted-foreground)",
              letterSpacing: "0.06em",
              display: "block",
              marginBottom: 4,
            }}
          >
            版本
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--color-muted-foreground)",
              lineHeight: 1.4,
              display: "block",
              marginBottom: 12,
            }}
          >
            生产环境版本：按名称调用此 Policy 时使用的版本。
          </span>
          <Button
            onClick={onNewVersion}
            disabled={!accessToken || isCreatingVersion}
            style={{ width: "100%", marginBottom: 12 }}
          >
            + 新建版本
          </Button>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
              <UiLoadingSpinner className="size-4" />
            </div>
          ) : versions.length === 0 ? (
            <span style={{ fontSize: 13, color: "var(--color-muted-foreground)" }}>未找到版本</span>
          ) : (
            <div className="flex flex-col gap-1">
              {versions.map((v) => {
                const statusStyle = VERSION_STATUS_STYLES[v.version_status ?? "draft"] ?? VERSION_STATUS_STYLES.draft;
                const isActive = v.policy_id === editingPolicyId;
                return (
                  <button
                    key={v.policy_id}
                    type="button"
                    onClick={() => onSelectVersion(v)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: isActive ? "1px solid var(--color-info)" : "1px solid var(--color-border)",
                      backgroundColor: isActive
                        ? "color-mix(in oklab, var(--color-info) 10%, transparent)"
                        : "var(--color-card)",
                      cursor: "pointer",
                    }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-foreground)" }}>
                        v{v.version_number ?? 1}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {VERSION_STATUS_LABELS[v.version_status ?? "draft"] ?? v.version_status ?? "draft"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Publish / Promote to production for selected version */}
          {(canPublish || canPromote) && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
              {canPublish && (
                <>
                  <Button
                    variant="secondary"
                    onClick={onPublish}
                    disabled={!accessToken || isUpdatingStatus}
                    style={{ width: "100%", marginBottom: 8 }}
                  >
                    发布
                  </Button>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-muted-foreground)",
                      lineHeight: 1.4,
                      display: "block",
                      marginBottom: canPromote ? 8 : 0,
                    }}
                  >
                    已发布版本可在 Playground 中测试后再提升到生产环境。
                  </span>
                </>
              )}
              {canPromote && (
                <>
                  <Button
                    onClick={onPromoteToProduction}
                    disabled={!accessToken || isUpdatingStatus}
                    style={{ width: "100%", marginBottom: 8 }}
                  >
                    提升到生产环境
                  </Button>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-muted-foreground)",
                      lineHeight: 1.4,
                      display: "block",
                    }}
                  >
                    按名称调用此 Policy 时将使用此版本。
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Silent Mirroring section */}
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "var(--color-muted-foreground)",
                letterSpacing: "0.06em",
              }}
            >
              静默镜像
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                backgroundColor: "color-mix(in oklab, var(--color-info) 10%, transparent)",
                color: "var(--color-info)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              即将推出
            </span>
          </div>
          <span
            style={{
              fontSize: 12,
              color: "var(--color-muted-foreground)",
              lineHeight: 1.5,
              display: "block",
            }}
          >
            在生产流量上测试 Policy 版本且不会拦截请求。影子测试可在全量发布前验证变更。
          </span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Full-screen Flow Builder Page
// ─────────────────────────────────────────────────────────────────────────────

interface FlowBuilderPageProps {
  onBack: () => void;
  onSuccess: () => void;
  accessToken: string | null;
  editingPolicy?: Policy | null;
  availableGuardrails: Guardrail[];
  createPolicy: (accessToken: string, policyData: any) => Promise<any>;
  updatePolicy: (accessToken: string, policyId: string, policyData: any) => Promise<any>;
  onVersionCreated?: (newPolicy: Policy) => void;
  onSelectVersion?: (policy: Policy) => void;
  onVersionStatusUpdated?: (updatedPolicy: Policy) => void;
}

export const FlowBuilderPage: React.FC<FlowBuilderPageProps> = ({
  onBack,
  onSuccess,
  accessToken,
  editingPolicy,
  availableGuardrails,
  createPolicy,
  updatePolicy,
  onVersionCreated,
  onSelectVersion,
  onVersionStatusUpdated,
}) => {
  const isEditing = !!editingPolicy?.policy_id;
  const showVersionsSidebar = !!editingPolicy?.policy_name;

  const [policyName, setPolicyName] = useState(editingPolicy?.policy_name || "");
  const [description, setDescription] = useState(editingPolicy?.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [pipeline, setPipeline] = useState<GuardrailPipeline>(() => derivePipelineFromPolicy(editingPolicy));
  const [versions, setVersions] = useState<Policy[]>([]);
  const [isVersionsLoading, setIsVersionsLoading] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Sync local state when editingPolicy changes (e.g. user switched version)
  React.useEffect(() => {
    setPolicyName(editingPolicy?.policy_name || "");
    setDescription(editingPolicy?.description || "");
    setPipeline(derivePipelineFromPolicy(editingPolicy));
  }, [
    editingPolicy?.policy_id,
    editingPolicy?.policy_name,
    editingPolicy?.description,
    editingPolicy?.pipeline,
    editingPolicy?.guardrails_add,
  ]);

  // Fetch versions when editing an existing policy by name
  React.useEffect(() => {
    if (!showVersionsSidebar || !editingPolicy?.policy_name || !accessToken) {
      setVersions([]);
      return;
    }
    let cancelled = false;
    setIsVersionsLoading(true);
    listPolicyVersions(accessToken, editingPolicy.policy_name)
      .then((res) => {
        if (!cancelled) setVersions(res.versions || []);
      })
      .catch(() => {
        if (!cancelled) setVersions([]);
      })
      .finally(() => {
        if (!cancelled) setIsVersionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showVersionsSidebar, editingPolicy?.policy_name, accessToken]);

  const handleNewVersion = async () => {
    if (!accessToken || !editingPolicy?.policy_name) return;
    setIsCreatingVersion(true);
    try {
      const newPolicy = await createPolicyVersion(accessToken, editingPolicy.policy_name);
      toast.success("已创建新的草稿版本");
      onVersionCreated?.(newPolicy);
      const list = await listPolicyVersions(accessToken, editingPolicy.policy_name);
      setVersions(list.versions ?? []);
    } catch (error) {
      toast.fromError("创建版本失败：" + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsCreatingVersion(false);
    }
  };

  const handleSelectVersion = (policy: Policy) => {
    onSelectVersion?.(policy);
  };

  const handlePublishVersion = async () => {
    if (!accessToken || !editingPolicy?.policy_id) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await updatePolicyVersionStatus(accessToken, editingPolicy.policy_id, "published");
      toast.success("版本已发布。可在 Playground 的策略下拉框中选择此版本进行测试。");
      const list = await listPolicyVersions(accessToken, editingPolicy.policy_name ?? "");
      setVersions(list.versions ?? []);
      onVersionStatusUpdated?.(updated);
    } catch (error) {
      toast.fromError("发布失败：" + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePromoteToProduction = async () => {
    if (!accessToken || !editingPolicy?.policy_id) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await updatePolicyVersionStatus(accessToken, editingPolicy.policy_id, "production");
      toast.success("版本已提升到生产环境");
      const list = await listPolicyVersions(accessToken, editingPolicy.policy_name ?? "");
      setVersions(list.versions ?? []);
      onVersionStatusUpdated?.(updated);
    } catch (error) {
      toast.fromError("提升到生产环境失败：" + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSave = async () => {
    if (!policyName.trim()) {
      toast.error("请输入 Policy 名称");
      return;
    }
    if (!accessToken) {
      toast.error("无可用访问令牌");
      return;
    }

    const emptySteps = pipeline.steps.filter((s) => !s.guardrail);
    if (emptySteps.length > 0) {
      toast.error("请为所有步骤选择护栏");
      return;
    }

    setIsSubmitting(true);
    try {
      const guardrailsFromPipeline = pipeline.steps.map((s) => s.guardrail).filter(Boolean);

      const data: PolicyCreateRequest | PolicyUpdateRequest = {
        policy_name: policyName,
        description: description || undefined,
        guardrails_add: guardrailsFromPipeline,
        guardrails_remove: [],
        pipeline: pipeline,
      };

      if (isEditing && editingPolicy) {
        await updatePolicy(accessToken, editingPolicy.policy_id, data as PolicyUpdateRequest);
        toast.success("Policy 更新成功");
        onSuccess();
      } else {
        await createPolicy(accessToken, data as PolicyCreateRequest);
        toast.success("Policy 创建成功");
        onSuccess();
        onBack();
      }
    } catch (error) {
      console.error("Failed to save policy:", error);
      toast.fromError("保存 Policy 失败：" + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-muted">
      {/* Header bar */}
      <div
        style={{
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-card)",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowLeft style={{ width: 18, height: 18, color: "var(--color-muted-foreground)" }} />
          </button>
          <span style={{ fontSize: 14, color: "var(--color-muted-foreground)" }}>策略</span>
          <span style={{ fontSize: 14, color: "var(--color-border)" }}>/</span>
          <Input
            placeholder="Policy 名称…"
            value={policyName}
            onChange={(e) => setPolicyName(e.target.value)}
            disabled={isEditing}
            style={{ width: 240 }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: "color-mix(in oklab, var(--color-info) 10%, transparent)",
              color: "var(--color-info)",
              padding: "3px 8px",
              borderRadius: 4,
              letterSpacing: "0.02em",
            }}
          >
            流程
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onBack}>
            取消
          </Button>
          <Button variant="secondary" onClick={() => setShowTestPanel(!showTestPanel)}>
            {showTestPanel ? "隐藏测试" : "测试 Pipeline"}
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isEditing ? "更新 Policy" : "保存 Policy"}
          </Button>
        </div>
      </div>

      {/* Description bar */}
      <div
        style={{
          padding: "8px 24px",
          backgroundColor: "var(--color-card)",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <Input
          placeholder="添加描述（可选）…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ maxWidth: 500 }}
        />
      </div>

      {/* Sidebar (when editing) + Flow builder canvas + test panel */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {showVersionsSidebar && (
          <PolicyVersionsSidebar
            policyName={policyName}
            editingPolicyId={editingPolicy?.policy_id ?? null}
            editingVersionStatus={editingPolicy?.version_status}
            accessToken={accessToken}
            versions={versions}
            isLoading={isVersionsLoading}
            isCreatingVersion={isCreatingVersion}
            isUpdatingStatus={isUpdatingStatus}
            onNewVersion={handleNewVersion}
            onSelectVersion={handleSelectVersion}
            onPublish={handlePublishVersion}
            onPromoteToProduction={handlePromoteToProduction}
          />
        )}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            justifyContent: "center",
            padding: "32px 24px",
          }}
        >
          <div style={{ maxWidth: 760, width: "100%" }}>
            <PipelineFlowBuilder pipeline={pipeline} onChange={setPipeline} availableGuardrails={availableGuardrails} />
          </div>
        </div>

        {showTestPanel && (
          <PipelineTestPanel pipeline={pipeline} accessToken={accessToken} onClose={() => setShowTestPanel(false)} />
        )}
      </div>
    </div>
  );
};

export { createDefaultStep };
export default PipelineFlowBuilder;
