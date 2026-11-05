"use client";

import { useId } from "react";

const VIEW = { w: 160, h: 100 };
const HUB = { x: 80, y: 48 };
const ORBIT = 28;

const CLIENTS = [
  { label: "SaaS 应用", x: 14, y: 26 },
  { label: "Agent / IDE", x: 12, y: 48 },
  { label: "后端服务", x: 14, y: 70 },
] as const;

const MODELS = [
  { label: "商业 API", x: 146, y: 26 },
  { label: "云厂商", x: 148, y: 48 },
  { label: "自托管", x: 146, y: 70 },
] as const;

const CAPABILITY_RING_START = -100;
const CAPABILITY_RING_STEP = 60;

const CAPABILITIES = (
  ["秘钥", "计量", "护栏", "MCP", "技能", "路由与端点"] as const
).map((label, index) => ({
  label,
  angle: CAPABILITY_RING_START + index * CAPABILITY_RING_STEP,
}));

/** 控制面能力：与能力环互补，不重复环上节点 */
const CONSOLE_HIGHLIGHTS = ["预算与额度", "用量与成本", "故障切换", "团队与权限"] as const;

function polar(angle: number, radius: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return { x: HUB.x + radius * Math.cos(rad), y: HUB.y + radius * Math.sin(rad) };
}

function hexPoints(cx: number, cy: number, radius: number): string {
  return Array.from({ length: 6 }, (_, index) => {
    const rad = ((60 * index - 30) * Math.PI) / 180;
    return `${cx + radius * Math.cos(rad)},${cy + radius * Math.sin(rad)}`;
  }).join(" ");
}

function flow(fromX: number, fromY: number, toX: number, toY: number, lift: number): string {
  const mx = (fromX + toX) / 2;
  const my = (fromY + toY) / 2 + lift;
  return `M ${fromX} ${fromY} Q ${mx} ${my} ${toX} ${toY}`;
}

function pct(x: number, y: number): { left: string; top: string } {
  return { left: `${(x / VIEW.w) * 100}%`, top: `${(y / VIEW.h) * 100}%` };
}

const DUST = [
  [22, 14],
  [36, 10],
  [54, 16],
  [98, 12],
  [118, 18],
  [132, 11],
  [28, 86],
  [48, 90],
  [110, 88],
  [128, 84],
  [68, 8],
  [92, 92],
] as const;

export function GatewayHub() {
  const rawId = useId();
  const gid = rawId.replaceAll(":", "");
  const capabilities = CAPABILITIES.map((item) => ({
    ...item,
    ...polar(item.angle, ORBIT),
    labelAt: polar(item.angle, ORBIT + (item.label.length > 4 ? 9.5 : 8.5)),
  }));

  return (
    <div className="login-hub-wrap">
    <div className="login-hub" aria-hidden>
      <svg className="login-hub-svg" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id={`${gid}-glow`} cx="50%" cy="50%" r="50%">
            <stop stopColor="rgb(0 102 230 / 0.5)" />
            <stop offset="1" stopColor="rgb(0 102 230 / 0)" />
          </radialGradient>
          <linearGradient id={`${gid}-in`} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="rgb(61 184 255 / 0.12)" />
            <stop offset="1" stopColor="rgb(61 184 255 / 0.78)" />
          </linearGradient>
          <linearGradient id={`${gid}-out`} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="rgb(0 179 107 / 0.75)" />
            <stop offset="1" stopColor="rgb(0 179 107 / 0.12)" />
          </linearGradient>
          <linearGradient id={`${gid}-cap`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="rgb(77 168 255 / 0.2)" />
            <stop offset="1" stopColor="rgb(0 102 230 / 0.85)" />
          </linearGradient>
          <filter id={`${gid}-soft`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.1" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse className="login-hub-ground" cx={HUB.x} cy="78" rx="34" ry="5.5" fill="rgb(0 102 230 / 0.12)" />

        {DUST.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.35" fill="rgb(186 214 255 / 0.28)" />
        ))}

        <circle className="login-hub-ring" cx={HUB.x} cy={HUB.y} r="38" fill="none" stroke="rgb(77 168 255 / 0.1)" strokeWidth="0.35" />
        <circle
          className="login-hub-ring"
          cx={HUB.x}
          cy={HUB.y}
          r={ORBIT}
          fill="none"
          stroke="rgb(77 168 255 / 0.28)"
          strokeWidth="0.4"
          strokeDasharray="1.4 1.6"
        />
        <circle cx={HUB.x} cy={HUB.y} r="16" fill={`url(#${gid}-glow)`} />
        <circle cx={HUB.x} cy={HUB.y} r="13.5" fill="none" stroke="rgb(77 168 255 / 0.18)" strokeWidth="0.3" />

        {CLIENTS.map((node, index) => (
          <path
            key={node.label}
            id={`${gid}-in${index}`}
            d={flow(node.x, node.y, HUB.x - 10, HUB.y, index === 1 ? 0 : index === 0 ? -7 : 7)}
            fill="none"
            stroke={`url(#${gid}-in)`}
            strokeWidth="0.55"
          />
        ))}

        {MODELS.map((node, index) => (
          <path
            key={node.label}
            id={`${gid}-out${index}`}
            d={flow(HUB.x + 10, HUB.y, node.x, node.y, index === 1 ? 0 : index === 0 ? -7 : 7)}
            fill="none"
            stroke={`url(#${gid}-out)`}
            strokeWidth="0.55"
          />
        ))}

        {capabilities.map((node) => (
          <path
            key={node.label}
            d={`M ${HUB.x} ${HUB.y} L ${node.x} ${node.y}`}
            fill="none"
            stroke={`url(#${gid}-cap)`}
            strokeWidth="0.45"
          />
        ))}

        {CLIENTS.map((node, index) => (
          <circle key={`in-pkt-${node.label}`} className="login-hub-packet" r="0.75" fill="#8fd0ff" filter={`url(#${gid}-soft)`}>
            <animateMotion dur={`${4.6 + index * 0.55}s`} begin={`${index * 0.7}s`} repeatCount="indefinite">
              <mpath href={`#${gid}-in${index}`} />
            </animateMotion>
          </circle>
        ))}

        {MODELS.map((node, index) => (
          <circle key={`out-pkt-${node.label}`} className="login-hub-packet" r="0.7" fill="#5ee0a8" filter={`url(#${gid}-soft)`}>
            <animateMotion dur={`${5 + index * 0.5}s`} begin={`${0.4 + index * 0.65}s`} repeatCount="indefinite">
              <mpath href={`#${gid}-out${index}`} />
            </animateMotion>
          </circle>
        ))}

        {[...CLIENTS, ...MODELS].map((node) => (
          <g key={`term-${node.label}`}>
            <circle cx={node.x} cy={node.y} r="2.4" fill="#0b1f3a" stroke="rgb(186 214 255 / 0.45)" strokeWidth="0.4" />
            <circle cx={node.x} cy={node.y} r="0.7" fill="#8fd0ff" />
          </g>
        ))}

        {capabilities.map((node) => (
          <g key={`cap-${node.label}`}>
            <circle cx={node.x} cy={node.y} r="2.15" fill="#10243c" stroke="#4c94f0" strokeWidth="0.4" />
            <circle cx={node.x} cy={node.y} r="0.65" fill="#7ec8ff" />
          </g>
        ))}

        <polygon points={hexPoints(HUB.x + 0.8, HUB.y + 1.4, 10.2)} fill="#071422" stroke="rgb(0 77 176 / 0.55)" strokeWidth="0.45" />
        <polygon
          points={hexPoints(HUB.x, HUB.y, 10.2)}
          fill="#0b1f3a"
          stroke="#4c94f0"
          strokeWidth="0.7"
          filter={`url(#${gid}-soft)`}
        />
        <path
          d="M73.8 48.4c0-3.7 3-6.7 6.6-6.7 3.6 0 6.6 3 6.6 6.7s-3 6.7-6.6 6.7c-1.85 0-3.5-.75-4.75-2"
          fill="none"
          stroke="#2EE0F0"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <path d="M80.4 48.4h5.8" fill="none" stroke="#14C48A" strokeWidth="1.35" strokeLinecap="round" />
      </svg>

      <span className="login-hub-lane" style={pct(14, 12)}>
        调用方
      </span>
      <span className="login-hub-lane" style={pct(146, 12)}>
        模型
      </span>

      {CLIENTS.map((node) => (
        <span key={node.label} className="login-hub-edge" style={pct(node.x, node.y - 5.2)}>
          {node.label}
        </span>
      ))}
      {MODELS.map((node) => (
        <span key={node.label} className="login-hub-edge" style={pct(node.x, node.y - 5.2)}>
          {node.label}
        </span>
      ))}
      {capabilities.map((node) => (
        <span key={node.label} className="login-hub-node" style={pct(node.labelAt.x, node.labelAt.y)}>
          {node.label}
        </span>
      ))}
    </div>
    <div className="login-hub-highlights" aria-hidden>
      <span className="login-hub-highlights-kicker">控制台</span>
      {CONSOLE_HIGHLIGHTS.map((label) => (
        <span key={label} className="login-hub-highlight">
          {label}
        </span>
      ))}
    </div>
    </div>
  );
}
