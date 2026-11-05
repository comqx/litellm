const CALL_TYPE_LABELS: Readonly<Record<string, string>> = {
  acompletion: "异步补全",
  arerank: "异步重排序",
};

export const formatCacheCallTypeLabel = (callType: string): string => CALL_TYPE_LABELS[callType] ?? callType;
