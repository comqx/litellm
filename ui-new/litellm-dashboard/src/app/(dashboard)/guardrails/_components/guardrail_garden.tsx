import React, { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { GuardrailCardInfo, ALL_CARDS } from "./guardrail_garden_data";
import GuardrailCard from "./guardrail_garden_card";
import GuardrailDetailView from "./guardrail_garden_detail";

interface GuardrailGardenProps {
  accessToken: string | null;
  onGuardrailCreated: () => void;
}

const GuardrailGarden: React.FC<GuardrailGardenProps> = ({ accessToken, onGuardrailCreated }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<GuardrailCardInfo | null>(null);
  const [showAllLitellm, setShowAllLitellm] = useState(false);
  const CARDS_PER_ROW = 5;
  const VISIBLE_ROWS = 2;

  const filteredCards = ALL_CARDS.filter((card) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      card.name.toLowerCase().includes(q) ||
      card.description.toLowerCase().includes(q) ||
      card.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const litellmCards = filteredCards.filter((c) => c.category === "litellm");
  const decisionModelCards = filteredCards.filter((c) => c.category === "decision_model");
  const partnerCards = filteredCards.filter((c) => c.category === "partner");

  if (selectedCard) {
    return (
      <GuardrailDetailView
        card={selectedCard}
        onBack={() => setSelectedCard(null)}
        accessToken={accessToken}
        onGuardrailCreated={onGuardrailCreated}
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <InputGroup>
          <InputGroupAddon>
            <Search className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="搜索 Guardrails"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>
      </div>

      <section className="mb-10" aria-labelledby="guardrail-garden-litellm">
        <div className="mb-1 flex items-center justify-between">
          <h2 id="guardrail-garden-litellm" className="m-0 text-xl font-semibold text-foreground">
            LiteLLM Content Filter
          </h2>
          <span
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-primary"
            onClick={() => setShowAllLitellm(!showAllLitellm)}
          >
            {showAllLitellm ? (
              <>收起</>
            ) : (
              <>
                <ArrowRight className="size-3" />
                {`查看全部（${litellmCards.length}）`}
              </>
            )}
          </span>
        </div>
        <p className="mt-1 mb-5 text-[13px] text-muted-foreground">
          LiteLLM 内置 Guardrail。零额外延迟、无外部依赖、无额外成本。
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {(showAllLitellm ? litellmCards : litellmCards.slice(0, CARDS_PER_ROW * VISIBLE_ROWS)).map((card) => (
            <GuardrailCard key={card.id} card={card} onClick={() => setSelectedCard(card)} />
          ))}
        </div>
      </section>

      <section className="mb-10" aria-labelledby="guardrail-garden-decision-model">
        <h2 id="guardrail-garden-decision-model" className="mt-0 mb-1 text-xl font-semibold text-foreground">
          决策模型
        </h2>
        <p className="mt-1 mb-5 text-[13px] text-muted-foreground">
          对每次请求或响应向决策模型提出是/否问题，分数达到阈值时阻止或仅记录。
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {decisionModelCards.map((card) => (
            <GuardrailCard key={card.id} card={card} onClick={() => setSelectedCard(card)} />
          ))}
        </div>
      </section>

      <section className="mb-10" aria-labelledby="guardrail-garden-partner">
        <h2 id="guardrail-garden-partner" className="mt-0 mb-1 text-xl font-semibold text-foreground">
          合作伙伴 Guardrail
        </h2>
        <p className="mt-1 mb-5 text-[13px] text-muted-foreground">来自主流 AI 安全厂商的第三方 Guardrail 集成。</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {partnerCards.map((card) => (
            <GuardrailCard key={card.id} card={card} onClick={() => setSelectedCard(card)} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default GuardrailGarden;
