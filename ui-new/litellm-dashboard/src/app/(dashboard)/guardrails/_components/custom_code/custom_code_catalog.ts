export const CODE_TEMPLATES = {
  empty: {
    name: "空白模板",
    code: `async def apply_guardrail(inputs, request_data, input_type):
    # inputs: {texts, images, tools, tool_calls, structured_messages, model}
    # request_data: {model, user_id, team_id, end_user_id, metadata}
    # input_type: "request" or "response"
    return allow()`,
  },
  blockSSN: {
    name: "拦截 SSN",
    code: `def apply_guardrail(inputs, request_data, input_type):
    for text in inputs["texts"]:
        if regex_match(text, r"\\d{3}-\\d{2}-\\d{4}"):
            return block("SSN detected")
    return allow()`,
  },
  redactEmail: {
    name: "脱敏邮箱",
    code: `def apply_guardrail(inputs, request_data, input_type):
    pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
    modified = []
    for text in inputs["texts"]:
        modified.append(regex_replace(text, pattern, "[EMAIL REDACTED]"))
    return modify(texts=modified)`,
  },
  blockSQL: {
    name: "拦截 SQL 注入",
    code: `def apply_guardrail(inputs, request_data, input_type):
    if input_type != "request":
        return allow()
    for text in inputs["texts"]:
        if contains_code_language(text, ["sql"]):
            return block("SQL code not allowed")
    return allow()`,
  },
  validateJSON: {
    name: "校验 JSON",
    code: `def apply_guardrail(inputs, request_data, input_type):
    if input_type != "response":
        return allow()
    
    schema = {"type": "object", "required": ["name", "value"]}
    
    for text in inputs["texts"]:
        obj = json_parse(text)
        if obj is None:
            return block("Invalid JSON response")
        if not json_schema_valid(obj, schema):
            return block("Response missing required fields")
    return allow()`,
  },
  externalAPI: {
    name: "外部 API 检查（async）",
    code: `async def apply_guardrail(inputs, request_data, input_type):
    # Call an external moderation API (async for non-blocking)
    for text in inputs["texts"]:
        response = await http_post(
            "https://api.example.com/moderate",
            body={"text": text, "user_id": request_data["user_id"]},
            headers={"Authorization": "Bearer YOUR_API_KEY"},
            timeout=10
        )
        
        if not response["success"]:
            # API call failed, allow by default or block
            return allow()
        
        if response["body"].get("flagged"):
            return block(response["body"].get("reason", "Content flagged"))
    
    return allow()`,
  },
};

export const PRIMITIVES = {
  返回值: [
    { name: "allow()", desc: "放行请求/响应" },
    { name: "block(reason)", desc: "拒绝并附带原因消息" },
    { name: "flag(reason, metadata={})", desc: "放行，但记录非阻断违规" },
    { name: "modify(texts=[], images=[], tool_calls=[])", desc: "改写内容" },
  ],
  "HTTP 请求（async）": [
    { name: "await http_request(url, method, headers, body)", desc: "发起异步 HTTP 请求" },
    { name: "await http_get(url, headers)", desc: "异步 GET 请求" },
    { name: "await http_post(url, body, headers)", desc: "异步 POST 请求" },
  ],
  正则函数: [
    { name: "regex_match(text, pattern)", desc: "匹配到 pattern 时返回 True" },
    { name: "regex_replace(text, pattern, replacement)", desc: "替换所有匹配项" },
    { name: "regex_find_all(text, pattern)", desc: "返回所有匹配列表" },
  ],
  "JSON 函数": [
    { name: "json_parse(text)", desc: "解析 JSON 字符串，出错时返回 None" },
    { name: "json_stringify(obj)", desc: "转换为 JSON 字符串" },
    { name: "json_schema_valid(obj, schema)", desc: "按 JSON Schema 校验" },
  ],
  "URL 函数": [
    { name: "extract_urls(text)", desc: "从文本提取全部 URL" },
    { name: "is_valid_url(url)", desc: "检查 URL 是否有效" },
    { name: "all_urls_valid(text)", desc: "检查文本中所有 URL 是否有效" },
  ],
  代码检测: [
    { name: "detect_code(text)", desc: "检测到代码时返回 True" },
    { name: "detect_code_languages(text)", desc: "返回检测到的语言列表" },
    { name: 'contains_code_language(text, ["sql"])', desc: "检查是否包含指定语言" },
  ],
  文本工具: [
    { name: "contains(text, substring)", desc: "检查是否包含子串" },
    { name: "contains_any(text, [substr1, substr2])", desc: "检查是否包含任一子串" },
    { name: "word_count(text)", desc: "统计词数" },
    { name: "char_count(text)", desc: "统计字符数" },
    { name: "lower(text) / upper(text) / trim(text)", desc: "字符串变换" },
  ],
};

export const MODE_OPTIONS = [
  { value: "pre_call", label: "pre_call（请求）" },
  { value: "post_call", label: "post_call（响应）" },
  { value: "during_call", label: "during_call（并行）" },
  { value: "logging_only", label: "logging_only（仅记录）" },
  { value: "pre_mcp_call", label: "pre_mcp_call（MCP Tool 调用前）" },
  { value: "post_mcp_call", label: "post_mcp_call（MCP Tool 调用后）" },
  { value: "during_mcp_call", label: "during_mcp_call（MCP Tool 调用中）" },
];

export const TEMPLATE_ITEMS = Object.entries(CODE_TEMPLATES).map(([key, template]) => ({
  value: key,
  label: template.name,
}));

export type ModeOption = (typeof MODE_OPTIONS)[number];

export const MODE_OPTION_BY_VALUE: Record<string, ModeOption> = Object.fromEntries(
  MODE_OPTIONS.map((option) => [option.value, option]),
);
