export type CoordinationFieldType = "string" | "password" | "integer" | "boolean" | "list";

export type CoordinationRedisType = "node" | "cluster" | "sentinel";

export type CoordinationSection = "connection" | "cluster" | "sentinel" | "ssl";

export type CoordinationFieldRule = (value: unknown) => string | null;

export interface CoordinationField {
  readonly name: string;
  readonly label: string;
  readonly type: CoordinationFieldType;
  readonly section: CoordinationSection;
  readonly helpText: string;
  readonly redisType: CoordinationRedisType | null;
  readonly secret: boolean;
  readonly defaultValue?: string | number | boolean;
  readonly rules?: CoordinationFieldRule[];
}

export const COORDINATION_REDIS_TYPES: readonly CoordinationRedisType[] = ["node", "cluster", "sentinel"];

export const COORDINATION_REDIS_TYPE_DESCRIPTIONS: Readonly<Record<CoordinationRedisType, string>> = {
  node: "Standard Redis node/single instance",
  cluster: "Redis Cluster 模式，提供高可用和水平扩展",
  sentinel: "Redis Sentinel 模式，提供自动故障转移的高可用",
};

export const COORDINATION_REDIS_TYPE_LABELS: Readonly<Record<CoordinationRedisType, string>> = {
  node: "Node（单实例）",
  cluster: "Redis Cluster 模式，提供高可用和水平扩展",
  sentinel: "Redis Sentinel 模式，提供自动故障转移的高可用",
};

const isBlank = (value: unknown): boolean => value === undefined || value === null || String(value).trim() === "";

const portRule: CoordinationFieldRule = (value) => {
  if (isBlank(value)) {
    return null;
  }
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? null : "端口必须是 1 到 65535 之间的整数";
};

const jsonListRule: CoordinationFieldRule = (value) => {
  if (isBlank(value)) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(value));
  } catch {
    return "必须是合法的 JSON 数组（使用双引号）";
  }
  return Array.isArray(parsed) ? null : "必须是 JSON 数组";
};

export const COORDINATION_FIELDS: readonly CoordinationField[] = [
  {
    name: "url",
    label: "Redis URL",
    type: "password",
    section: "connection",
    helpText:
      "Full Redis/Valkey connection URL (e.g. redis://:password@host:6379/1). When set, it takes precedence over Host, Port, Username, and Password.",
    redisType: null,
    secret: true,
  },
  {
    name: "host",
    label: "主机",
    type: "string",
    section: "connection",
    helpText: "Redis 服务器主机名或 IP 地址",
    redisType: null,
    secret: false,
  },
  {
    name: "port",
    label: "端口",
    type: "integer",
    section: "connection",
    helpText: "Redis 服务器端口号",
    redisType: null,
    secret: false,
    defaultValue: "6379",
    rules: [portRule],
  },
  {
    name: "username",
    label: "用户名",
    type: "string",
    section: "connection",
    helpText: "Redis 服务器用户名（如需要）",
    redisType: null,
    secret: false,
  },
  {
    name: "password",
    label: "密码",
    type: "password",
    section: "connection",
    helpText: "Redis 服务器密码",
    redisType: null,
    secret: true,
  },
  {
    name: "startup_nodes",
    label: "启动节点",
    type: "list",
    section: "cluster",
    helpText: 'List of startup nodes for Redis Cluster (e.g., [{"host": "127.0.0.1", "port": 7001}])',
    redisType: "cluster",
    secret: false,
    rules: [jsonListRule],
  },
  {
    name: "sentinel_nodes",
    label: "Sentinel 节点",
    type: "list",
    section: "sentinel",
    helpText: 'Sentinel 节点列表（如 [["localhost", 26379]]）',
    redisType: "sentinel",
    secret: false,
    rules: [jsonListRule],
  },
  {
    name: "service_name",
    label: "服务名称",
    type: "string",
    section: "sentinel",
    helpText: "Redis Sentinel 的主服务名称",
    redisType: "sentinel",
    secret: false,
  },
  {
    name: "sentinel_password",
    label: "Sentinel 密码",
    type: "password",
    section: "sentinel",
    helpText: "Redis Sentinel 认证密码",
    redisType: "sentinel",
    secret: true,
  },
  {
    name: "ssl",
    label: "SSL",
    type: "boolean",
    section: "ssl",
    helpText: "启用 SSL/TLS 连接",
    redisType: null,
    secret: false,
    defaultValue: false,
  },
];
