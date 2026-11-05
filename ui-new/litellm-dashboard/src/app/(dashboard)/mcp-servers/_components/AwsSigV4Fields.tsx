import { Info } from "lucide-react";
import React from "react";
import { SimpleTooltip } from "@/components/ui/tooltip";

import { MountedFormField } from "@/components/common_components/MountedFormField";
import { requiredRule } from "@/components/common_components/formRules";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Input } from "@/components/ui/input";
import { requiredWhenSiblingSet, textControl } from "./mcpFieldRules";

const fieldClassName = "rounded-lg border-border focus:border-info focus:ring-ring";

const FieldLabel: React.FC<{ label: string; tooltip: string }> = ({ label, tooltip }) => (
  <span className="text-sm font-medium text-foreground flex items-center">
    {label}
    <SimpleTooltip content={tooltip}>
      <Info className="ml-2 size-4 text-info hover:text-info/80 cursor-help" />
    </SimpleTooltip>
  </span>
);

const ACCESS_KEY_PATH = ["credentials", "aws_access_key_id"] as const;
const SECRET_KEY_PATH = ["credentials", "aws_secret_access_key"] as const;

const AwsSigV4Fields: React.FC = () => (
  <>
    <p className="text-sm text-muted-foreground mb-2">
      For MCP servers hosted on AWS Bedrock AgentCore.{" "}
      <a
        href="https://docs.litellm.ai/docs/mcp_aws_sigv4"
        target="_blank"
        rel="noopener noreferrer"
        className="text-info hover:text-info/80"
      >
        View docs &rarr;
      </a>
    </p>
    <MountedFormField
      label={<FieldLabel label="AWS Region" tooltip="用于 SigV4 签名的 AWS 区域（例如 us-east-1）" />}
      name={["credentials", "aws_region_name"]}
      required
      rules={{ validate: { required: requiredRule("SigV4 认证需要 AWS 区域") } }}
    >
      {(control) => <Input {...textControl(control)} placeholder="us-east-1" className={fieldClassName} />}
    </MountedFormField>
    <MountedFormField
      label={
        <FieldLabel
          label="AWS 服务名称"
          tooltip="用于 SigV4 签名的 AWS 服务名称。默认为 'bedrock-agentcore'。"
        />
      }
      name={["credentials", "aws_service_name"]}
    >
      {(control) => <Input {...textControl(control)} placeholder="bedrock-agentcore" className={fieldClassName} />}
    </MountedFormField>
    <MountedFormField
      label={
        <FieldLabel
          label="AWS Access Key ID"
          tooltip="可选。未提供时回退到 boto3 凭据链（IAM 角色、环境变量等）。"
        />
      }
      name={ACCESS_KEY_PATH}
      rules={{
        deps: ["credentials.aws_secret_access_key"],
        validate: {
          pairedWithSecret: requiredWhenSiblingSet(
            SECRET_KEY_PATH,
            "提供 Secret Access Key 时必须提供 Access Key ID",
          ),
        },
      }}
    >
      {(control) => (
        <PasswordInput
          {...textControl(control)}
          placeholder="AKIA...（可选，留空则使用 IAM 角色）"
          groupClassName={fieldClassName}
        />
      )}
    </MountedFormField>
    <MountedFormField
      label={
        <FieldLabel label="AWS Secret Access Key" tooltip="可选。提供 AWS Access Key ID 时必填。" />
      }
      name={SECRET_KEY_PATH}
      rules={{
        deps: ["credentials.aws_access_key_id"],
        validate: {
          pairedWithAccessKey: requiredWhenSiblingSet(
            ACCESS_KEY_PATH,
            "提供 Access Key ID 时必须提供 Secret Access Key",
          ),
        },
      }}
    >
      {(control) => (
        <PasswordInput
          {...textControl(control)}
          placeholder="输入密钥（可选，留空则使用 IAM 角色）"
          groupClassName={fieldClassName}
        />
      )}
    </MountedFormField>
    <MountedFormField
      label={<FieldLabel label="AWS Session Token" tooltip="可选。仅临时 STS 凭据需要。" />}
      name={["credentials", "aws_session_token"]}
    >
      {(control) => (
        <PasswordInput
          {...textControl(control)}
          placeholder="输入会话 Token（可选）"
          groupClassName={fieldClassName}
        />
      )}
    </MountedFormField>
    <MountedFormField
      label={
        <FieldLabel
          label="AWS Role ARN"
          tooltip="可选。签名前通过 STS 担任的 IAM 角色 ARN。设置后，LiteLLM 会调用 sts:AssumeRole 获取临时凭据。除非同时提供显式密钥，否则使用环境凭据（IAM 角色、环境变量）作为源身份。"
        />
      }
      name={["credentials", "aws_role_name"]}
    >
      {(control) => (
        <Input
          {...textControl(control)}
          placeholder="arn:aws:iam::123456789012:role/MyRole (optional)"
          className={fieldClassName}
        />
      )}
    </MountedFormField>
    <MountedFormField
      label={
        <FieldLabel
          label="AWS 会话名称"
          tooltip="可选。AssumeRole 调用的会话名称，会出现在 CloudTrail 日志中。留空则自动生成。"
        />
      }
      name={["credentials", "aws_session_name"]}
    >
      {(control) => (
        <Input
          {...textControl(control)}
          placeholder="litellm-prod (optional, auto-generated if blank)"
          className={fieldClassName}
        />
      )}
    </MountedFormField>
  </>
);

export default AwsSigV4Fields;
