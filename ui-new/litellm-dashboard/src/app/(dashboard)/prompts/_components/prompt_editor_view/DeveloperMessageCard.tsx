import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import VariableTextArea from "../variable_textarea";

interface DeveloperMessageCardProps {
  value: string;
  onChange: (value: string) => void;
}

const DeveloperMessageCard: React.FC<DeveloperMessageCardProps> = ({ value, onChange }) => {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="mb-2 text-sm font-medium text-foreground">开发者消息</p>
        <p className="mb-2 text-xs text-muted-foreground">可选的 Model 系统指令</p>
        <VariableTextArea
          value={value}
          onChange={onChange}
          rows={3}
          placeholder="例如：你是一个乐于助人的助手…"
        />
      </CardContent>
    </Card>
  );
};

export default DeveloperMessageCard;
