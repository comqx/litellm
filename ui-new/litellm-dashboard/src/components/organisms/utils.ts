/**
 * Helper function to simplify /key/generate permission errors
 * Extracts a user-friendly error message from team member permission errors
 * @param error - The error object or message
 * @returns A simplified error message string
 */
export const simplifyKeyGenerateError = (error: any): string => {
  // Handle plain objects by stringifying them first
  let errorString: string;
  if (error && typeof error === "object" && !(error instanceof Error)) {
    errorString = JSON.stringify(error);
  } else {
    errorString = String(error);
  }

  // Check if this is a /key/generate team member permission error
  if (!errorString.includes("/key/generate") && !errorString.includes("KeyManagementRoutes.KEY_GENERATE")) {
    return `创建 Key 出错：${error}`;
  }

  // Try to parse JSON if the message contains JSON or extract from object
  let errorMessage = errorString;
  try {
    // If error is already an object, extract message directly
    if (error && typeof error === "object" && !(error instanceof Error)) {
      const errorObj = error?.error || error;
      if (errorObj?.message) {
        errorMessage = errorObj.message;
      }
    } else {
      // Try to parse JSON from string
      const jsonMatch = errorString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedError = JSON.parse(jsonMatch[0]);
        const errorObj = parsedError?.error || parsedError;
        if (errorObj?.message) {
          errorMessage = errorObj.message;
        }
      }
    }
  } catch (e) {
    // If parsing fails, use the original message
  }

  // Check if this is a team member permission error
  if (
    errorString.includes("team_member_permission_error") ||
    errorMessage.includes("Team member does not have permissions")
  ) {
    // Return the simplified message
    return "该 Team 成员没有权限为此 Team 生成 Key。请联系 Proxy Admin 配置 Team 成员权限设置。";
  }

  // If it's not a permission error, return the original error message
  return `创建 Key 出错：${error}`;
};
