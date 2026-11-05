export type CacheFieldType =
  | "string"
  | "password"
  | "integer"
  | "float"
  | "boolean"
  | "list"
  | "model-select"
  | "select";

export interface CacheFieldOption {
  readonly value: string;
  readonly label: string;
}

export type RedisType = "node" | "cluster" | "sentinel" | "semantic";

export type CacheSection = "connection" | "cluster" | "sentinel" | "semantic" | "ssl" | "cacheManagement" | "gcp";

export type CacheFieldRule = (value: unknown) => string | null;

// Marker the backend returns for a configured credential and maps back to the
// stored secret on save, so the plaintext never round-trips through the form.
export const REDACTED_VALUE = "***REDACTED***";

export interface CacheField {
  readonly name: string;
  readonly label: string;
  readonly type: CacheFieldType;
  readonly section: CacheSection;
  readonly helpText: string;
  readonly redisType: RedisType | null;
  readonly defaultValue?: string | number | boolean;
  readonly options?: readonly CacheFieldOption[];
  readonly rules?: CacheFieldRule[];
  // Credential field: never prefilled into the form, and dropped from the save
  // payload when left untouched so the redacted marker is never persisted.
  readonly secret?: boolean;
}

export const REDIS_TYPES: readonly RedisType[] = ["node", "cluster", "sentinel", "semantic"];

export const REDIS_TYPE_DESCRIPTIONS: Readonly<Record<RedisType, string>> = {
  node: "Standard Redis node/single instance",
  cluster: "Redis Cluster 模式，提供高可用和水平扩展",
  sentinel: "Redis Sentinel 模式，提供自动故障转移的高可用",
  semantic: "语义缓存，为相似提示复用响应",
};

const isBlank = (value: unknown): boolean => value === undefined || value === null || String(value).trim() === "";

const portRule: CacheFieldRule = (value) => {
  if (isBlank(value)) {
    return null;
  }
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? null : "端口必须是 1 到 65535 之间的整数";
};

const jsonListRule: CacheFieldRule = (value) => {
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

const nonNegativeIntegerRule: CacheFieldRule = (value) => {
  if (isBlank(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? null : "必须是非负整数";
};

const numberRule: CacheFieldRule = (value) => {
  if (isBlank(value)) {
    return null;
  }
  return Number.isNaN(Number(value)) ? "必须是数字" : null;
};

export const CACHE_FIELDS: readonly CacheField[] = [
  {
    name: "url",
    label: "Redis URL",
    type: "string",
    section: "connection",
    helpText:
      "Full Redis/Valkey connection URL (e.g. redis://:password@host:6379/1). When set, it takes precedence over Host, Port, Password, and Database Index.",
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
  },
  {
    name: "port",
    label: "端口",
    type: "string",
    section: "connection",
    helpText: "Redis 服务器端口号",
    redisType: null,
    defaultValue: "6379",
    rules: [portRule],
  },
  {
    name: "db",
    label: "数据库索引",
    type: "integer",
    section: "connection",
    helpText: "Logical database index to isolate the cache (e.g. 1 for redis://host:6379/1)",
    redisType: null,
    rules: [nonNegativeIntegerRule],
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
    name: "username",
    label: "用户名",
    type: "string",
    section: "connection",
    helpText: "Redis 服务器用户名（如需要）",
    redisType: null,
  },
  {
    name: "redis_startup_nodes",
    label: "启动节点",
    type: "list",
    section: "cluster",
    helpText: 'List of startup nodes for Redis Cluster (e.g., [{"host": "127.0.0.1", "port": "7001"}])',
    redisType: "cluster",
    rules: [jsonListRule],
  },
  {
    name: "sentinel_nodes",
    label: "Sentinel 节点",
    type: "list",
    section: "sentinel",
    helpText: 'Sentinel 节点列表（如 [["localhost", 26379]]）',
    redisType: "sentinel",
    rules: [jsonListRule],
  },
  {
    name: "service_name",
    label: "服务名称",
    type: "string",
    section: "sentinel",
    helpText: "Redis Sentinel 的主服务名称",
    redisType: "sentinel",
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
    name: "similarity_threshold",
    label: "相似度阈值",
    type: "float",
    section: "semantic",
    helpText: "语义 Cache 的相似度阈值",
    redisType: "semantic",
    defaultValue: 0.8,
    rules: [numberRule],
  },
  {
    name: "redis_semantic_cache_embedding_model",
    label: "Embedding Model",
    type: "model-select",
    section: "semantic",
    helpText: "语义 Cache 的 Embedding Model",
    redisType: "semantic",
  },
  {
    name: "semantic_cache_scope",
    label: "语义 Cache 作用域",
    type: "select",
    section: "semantic",
    helpText:
      "谁可以共享语义 Cache 命中。Key 在该 Key/Team/Org 的所有最终用户间共享命中；「最终用户」还会按最终用户隔离；没有最终用户的请求回退到 Key 作用域。",
    redisType: "semantic",
    defaultValue: "key",
    options: [
      { value: "key", label: "Key（该 Key/Team/Org 下所有最终用户共享）" },
      { value: "end_user", label: "最终用户（按最终用户隔离）" },
    ],
  },
  {
    name: "ssl",
    label: "SSL",
    type: "boolean",
    section: "ssl",
    helpText: "启用 SSL/TLS 连接",
    redisType: null,
    defaultValue: false,
  },
  {
    name: "ssl_cert_reqs",
    label: "SSL 证书要求",
    type: "string",
    section: "ssl",
    helpText: "SSL certificate requirements (None, CERT_REQUIRED, CERT_OPTIONAL)",
    redisType: null,
  },
  {
    name: "ssl_check_hostname",
    label: "SSL 主机名检查",
    type: "boolean",
    section: "ssl",
    helpText: "启用 SSL 主机名验证",
    redisType: null,
    defaultValue: false,
  },
  {
    name: "namespace",
    label: "Namespace",
    type: "string",
    section: "cacheManagement",
    helpText: "Cache Key 的 Namespace 前缀",
    redisType: null,
  },
  {
    name: "ttl",
    label: "TTL（秒）",
    type: "float",
    section: "cacheManagement",
    helpText: "缓存项的存活时间（秒）",
    redisType: null,
    rules: [numberRule],
  },
  {
    name: "max_connections",
    label: "最大连接数",
    type: "integer",
    section: "cacheManagement",
    helpText: "连接池中的最大连接数",
    redisType: null,
    rules: [nonNegativeIntegerRule],
  },
  {
    name: "gcp_service_account",
    label: "GCP 服务账号",
    type: "string",
    section: "gcp",
    helpText:
      "GCP service account for IAM authentication (e.g., projects/-/serviceAccounts/your-sa@project.iam.gserviceaccount.com)",
    redisType: null,
  },
  {
    name: "gcp_ssl_ca_certs",
    label: "GCP SSL CA 证书",
    type: "string",
    section: "gcp",
    helpText: "GCP Memorystore Redis 的 SSL CA 证书文件路径",
    redisType: null,
  },
];
