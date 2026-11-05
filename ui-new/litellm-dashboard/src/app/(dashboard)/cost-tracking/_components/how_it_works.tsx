import React, { useState, useMemo } from "react";
import CodeBlock from "@/components/CodeBlock";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HowItWorks: React.FC = () => {
  const [responseCost, setResponseCost] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");

  const calculatedDiscount = useMemo(() => {
    const cost = parseFloat(responseCost);
    const discount = parseFloat(discountAmount);
    const hasInvalidCost = isNaN(cost) || cost === 0;
    const hasInvalidDiscount = isNaN(discount) || discount === 0;

    if (hasInvalidCost || hasInvalidDiscount) {
      return null;
    }

    const originalCost = cost + discount;
    const discountPercentage = (discount / originalCost) * 100;

    return {
      originalCost: originalCost.toFixed(10),
      finalCost: cost.toFixed(10),
      discountAmount: discount.toFixed(10),
      discountPercentage: discountPercentage.toFixed(2),
    };
  }, [responseCost, discountAmount]);

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h3 className="mb-1 text-sm font-medium text-foreground">成本计算</h3>
        <p className="text-xs text-muted-foreground">
          Discounts are applied to provider costs:{" "}
          <code className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-foreground">
            final_cost = base_cost × (1 - discount%/100)
          </code>
        </p>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-medium text-foreground">示例</h3>
        <p className="text-xs text-muted-foreground">
          A 5% discount on a $10.00 request results in: $10.00 × (1 - 0.05) = $9.50
        </p>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-medium text-foreground">有效范围</h3>
        <p className="text-xs text-muted-foreground">Discount percentages must be between 0% and 100%</p>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="mb-2 text-sm font-medium text-foreground">验证折扣</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          发起一个测试请求并检查响应头，以验证折扣已生效：
        </p>
        <CodeBlock
          language="bash"
          code={`curl -X POST -i http://your-proxy:4000/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <your-master-key>" \\
  -d '{
    "model": "gemini/gemini-2.5-pro",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`}
        />
        <p className="mb-2 mt-3 text-xs text-muted-foreground">在响应中查找以下 header：</p>
        <div className="space-y-1.5">
          <div className="flex items-start gap-3">
            <code className="whitespace-nowrap rounded-sm bg-muted px-2 py-1 font-mono text-xs text-foreground">
              x-litellm-response-cost
            </code>
            <p className="text-xs text-muted-foreground">折扣后的最终成本</p>
          </div>
          <div className="flex items-start gap-3">
            <code className="whitespace-nowrap rounded-sm bg-muted px-2 py-1 font-mono text-xs text-foreground">
              x-litellm-response-cost-original
            </code>
            <p className="text-xs text-muted-foreground">折扣前的原始成本</p>
          </div>
          <div className="flex items-start gap-3">
            <code className="whitespace-nowrap rounded-sm bg-muted px-2 py-1 font-mono text-xs text-foreground">
              x-litellm-response-cost-discount-amount
            </code>
            <p className="text-xs text-muted-foreground">折扣金额</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="mb-3 text-sm font-medium text-foreground">折扣计算器</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          输入响应头中的数值来验证折扣：
        </p>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="response-cost" className="mb-1 block text-xs">
              Response Cost (x-litellm-response-cost)
            </Label>
            <Input
              id="response-cost"
              placeholder="0.0171938125"
              value={responseCost}
              onChange={(event) => setResponseCost(event.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="discount-amount" className="mb-1 block text-xs">
              Discount Amount (x-litellm-response-cost-discount-amount)
            </Label>
            <Input
              id="discount-amount"
              placeholder="0.0009049375"
              value={discountAmount}
              onChange={(event) => setDiscountAmount(event.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        {calculatedDiscount && (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="mb-2 text-sm font-medium text-foreground">计算结果</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">原始成本：</p>
                <code className="font-mono text-xs text-foreground">${calculatedDiscount.originalCost}</code>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">最终成本：</p>
                <code className="font-mono text-xs text-foreground">${calculatedDiscount.finalCost}</code>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">折扣金额：</p>
                <code className="font-mono text-xs text-foreground">${calculatedDiscount.discountAmount}</code>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <p className="text-xs font-semibold text-foreground">实际折扣：</p>
                <p className="text-sm font-bold text-foreground">{calculatedDiscount.discountPercentage}%</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HowItWorks;
