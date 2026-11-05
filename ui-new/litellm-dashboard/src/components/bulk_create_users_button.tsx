import React, { useState, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  NUMERIC_CELL_CLASS,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileText, FileWarning, Trash2, TriangleAlert, Upload } from "lucide-react";
import { userCreateCall, invitationCreateCall, getProxyUISettings } from "./networking";
import Papa from "papaparse";
import { CheckCircleIcon, XCircleIcon, ExclamationIcon } from "@heroicons/react/outline";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { toast } from "@/lib/toast";

interface BulkCreateUsersProps {
  accessToken: string;
  teams: any[] | null;
  possibleUIRoles: null | Record<string, Record<string, string>>;
  onUsersCreated?: () => void;
}

interface UserData {
  user_email: string;
  user_role: string;
  teams?: string | string[];
  metadata?: string;
  max_budget?: string | number;
  budget_duration?: string;
  models?: string | string[];
  status?: string;
  error?: string;
  rowNumber?: number;
  isValid?: boolean;
  key?: string;
  invitation_link?: string;
}

const PREVIEW_PAGE_SIZE = 5;

// Define an interface for the UI settings
interface UISettings {
  PROXY_BASE_URL: string | null;
  PROXY_LOGOUT_URL: string | null;
  DEFAULT_TEAM_DISABLED: boolean;
  SSO_ENABLED: boolean;
}

const BulkCreateUsersButton: React.FC<BulkCreateUsersProps> = ({
  accessToken,
  teams,
  possibleUIRoles,
  onUsersCreated,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [parsedData, setParsedData] = useState<UserData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [csvStructureError, setCsvStructureError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uiSettings, setUISettings] = useState<UISettings | null>(null);
  const [baseUrl, setBaseUrl] = useState("http://localhost:4000");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const csvInputId = React.useId();

  useEffect(() => {
    // Get UI settings
    const fetchUISettings = async () => {
      try {
        const uiSettingsResponse = await getProxyUISettings(accessToken);
        setUISettings(uiSettingsResponse);
      } catch (error) {
        console.error("Error fetching UI settings:", error);
      }
    };

    fetchUISettings();

    // Set base URL
    const base = new URL("/", window.location.href);
    setBaseUrl(base.toString());
  }, [accessToken]);

  const handleFileUpload = (file: File) => {
    // Reset all error states
    setParseError(null);
    setCsvStructureError(null);
    setFileError(null);

    // Set the selected file - always show the file even if it's invalid
    setSelectedFile(file);

    // Check file type
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setFileError(`文件类型无效：${file.name}。请上传 CSV 文件（.csv 扩展名）。`);
      toast.fromError("文件类型无效。请上传 CSV 文件。");
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFileError(
        `文件过大（${(file.size / (1024 * 1024)).toFixed(1)} MB）。请上传小于 5MB 的 CSV 文件。`,
      );
      return;
    }

    Papa.parse(file, {
      complete: (results) => {
        // Check if file is empty
        if (!results.data || results.data.length === 0) {
          setCsvStructureError("CSV 文件似乎是空的。请上传包含数据的文件。");
          setParsedData([]);
          return;
        }

        // Check if there's only header row
        if (results.data.length === 1) {
          setCsvStructureError(
            "CSV 文件只有表头，没有用户数据。请在 CSV 中添加用户数据。",
          );
          setParsedData([]);
          return;
        }

        const headers = results.data[0] as string[];

        // Check if headers exist
        if (headers.length === 0 || (headers.length === 1 && headers[0] === "")) {
          setCsvStructureError(
            "CSV 文件不包含任何列标题。请确保 CSV 带有表头。",
          );
          setParsedData([]);
          return;
        }

        const requiredColumns = ["user_email", "user_role"];

        // Check if all required columns are present
        const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
        if (missingColumns.length > 0) {
          setCsvStructureError(
            `CSV 缺少以下必需列：${missingColumns.join(", ")}。请将这些列添加到 CSV 文件中。`,
          );
          setParsedData([]);
          return;
        }

        try {
          const userData = results.data
            .slice(1)
            .map((row: any, index: number) => {
              // Skip empty rows
              if (row.length === 0 || (row.length === 1 && row[0] === "")) {
                return null;
              }

              // Check if row has enough columns
              if (row.length < headers.length) {
                return {
                  rowNumber: index + 2,
                  isValid: false,
                  error: `第 ${index + 2} 行的列数少于表头行。请确保所有数据格式正确。`,
                  user_email: "",
                  user_role: "",
                } as UserData;
              }

              const user: UserData = {
                user_email: row[headers.indexOf("user_email")]?.trim() || "",
                user_role: row[headers.indexOf("user_role")]?.trim() || "",
                teams: row[headers.indexOf("teams")]?.trim(),
                max_budget: row[headers.indexOf("max_budget")]?.trim(),
                budget_duration: row[headers.indexOf("budget_duration")]?.trim(),
                models: row[headers.indexOf("models")]?.trim(),
                rowNumber: index + 2,
                isValid: true,
                error: "",
              };

              // Validate the row
              const errors: string[] = [];

              // Email validation
              if (!user.user_email) {
                errors.push("邮箱为必填项");
              } else if (!user.user_email.includes("@") || !user.user_email.includes(".")) {
                errors.push("邮箱格式无效（须包含 @ 和域名）");
              }

              // Role validation
              if (!user.user_role) {
                errors.push("角色为必填项");
              } else {
                // Validate user role
                const validRoles = ["proxy_admin", "proxy_admin_viewer", "internal_user", "internal_user_viewer"];
                if (!validRoles.includes(user.user_role)) {
                  errors.push(`角色 "${user.user_role}" 无效。必须是以下之一：${validRoles.join(", ")}`);
                }
              }

              // Budget validation
              if (user.max_budget && user.max_budget.toString().trim() !== "") {
                if (isNaN(parseFloat(user.max_budget.toString()))) {
                  errors.push(`最大 Budget "${user.max_budget}" 必须是数字`);
                } else if (parseFloat(user.max_budget.toString()) <= 0) {
                  errors.push("最大 Budget 必须大于 0");
                }
              }

              // Budget duration validation
              if (user.budget_duration && !user.budget_duration.match(/^\d+[dhmwy]$|^\d+mo$/)) {
                errors.push(
                  `Budget 周期格式 "${user.budget_duration}" 无效。请使用类似 "30d"、"1mo"、"2w"、"6h" 的格式`,
                );
              }

              // Teams validation
              if (user.teams && typeof user.teams === "string") {
                // Check if teams exist (if teams data is available)
                if (teams && teams.length > 0) {
                  const teamIds = teams.map((t) => t.team_id);
                  const userTeams = user.teams.split(",").map((t) => t.trim());
                  const invalidTeams = userTeams.filter((t) => !teamIds.includes(t));
                  if (invalidTeams.length > 0) {
                    errors.push(`未知 Team：${invalidTeams.join(", ")}`);
                  }
                }
              }

              if (errors.length > 0) {
                user.isValid = false;
                user.error = errors.join(", ");
              }

              return user;
            })
            .filter(Boolean) as UserData[]; // Filter out null values (empty rows)

          const validData = userData.filter((user) => user.isValid);
          setParsedData(userData);

          if (userData.length === 0) {
            setCsvStructureError("CSV 文件中未找到有效数据行。请检查文件格式。");
          } else if (validData.length === 0) {
            setParseError("CSV 中没有有效用户。请检查下方错误并修复 CSV 文件。");
          } else if (validData.length < userData.length) {
            setParseError(
              `共 ${userData.length} 行中有 ${userData.length - validData.length} 行存在错误，请先修正后再继续。`,
            );
          } else {
            toast.success(`成功解析 ${validData.length} 个用户`);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "未知错误";
          setParseError(`解析 CSV 出错：${errorMessage}`);
          setParsedData([]);
        }
      },
      error: (error) => {
        setParseError(`解析 CSV 文件失败：${error.message}`);
        setParsedData([]);
      },
      header: false,
    });
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setParsedData([]);
    setParseError(null);
    setCsvStructureError(null);
    setFileError(null);
  };

  const resetParsedData = () => {
    setParsedData([]);
    setParseError(null);
    setPageIndex(0);
  };

  const handleBulkCreate = async () => {
    setIsProcessing(true);
    const updatedData = parsedData.map((user) => ({ ...user, status: "pending" }));
    setParsedData(updatedData);

    let anySuccessful = false;

    for (let index = 0; index < updatedData.length; index++) {
      const user = updatedData[index];
      try {
        // Create a clean user object with only non-empty values
        const cleanUser: Partial<UserData> = {
          user_email: user.user_email,
          user_role: user.user_role,
        };

        // Only add optional fields if they have values
        if (user.teams && typeof user.teams === "string" && user.teams.trim() !== "") {
          cleanUser.teams = user.teams
            .split(",")
            .map((team) => team.trim())
            .filter(Boolean);
          // Only include teams if there's at least one valid team
          if (cleanUser.teams.length === 0) {
            delete cleanUser.teams;
          }
        }

        // Only add models if provided and non-empty
        if (user.models && typeof user.models === "string" && user.models.trim() !== "") {
          cleanUser.models = user.models
            .split(",")
            .map((model) => model.trim())
            .filter(Boolean);
          // Only include models if there's at least one valid model
          if (cleanUser.models.length === 0) {
            delete cleanUser.models;
          }
        }

        // Only add max_budget if it's a valid number
        if (user.max_budget && user.max_budget.toString().trim() !== "") {
          const budgetValue = parseFloat(user.max_budget.toString());
          if (!isNaN(budgetValue) && budgetValue > 0) {
            cleanUser.max_budget = budgetValue;
          }
        }

        // Only add budget_duration if provided and non-empty
        if (user.budget_duration && user.budget_duration.trim() !== "") {
          cleanUser.budget_duration = user.budget_duration.trim();
        }

        // Only add metadata if provided and non-empty
        if (user.metadata && typeof user.metadata === "string" && user.metadata.trim() !== "") {
          cleanUser.metadata = user.metadata.trim();
        }

        const response = await userCreateCall(accessToken, null, cleanUser);

        // Check if response has key or user_id, indicating success
        if (response && (response.key || response.user_id)) {
          anySuccessful = true;
          const user_id = response.data?.user_id || response.user_id;

          // Create invitation link for the user
          try {
            if (!uiSettings?.SSO_ENABLED) {
              // Regular invitation flow
              const invitationData = await invitationCreateCall(accessToken, user_id);
              const invitationUrl = new URL(`/ui/onboarding?invitation_id=${invitationData.id}`, baseUrl).toString();

              setParsedData((current) =>
                current.map((u, i) =>
                  i === index
                    ? {
                        ...u,
                        status: "success",
                        key: response.key || response.user_id,
                        invitation_link: invitationUrl,
                      }
                    : u,
                ),
              );
            } else {
              // SSO flow - just use the base URL
              const invitationUrl = new URL("/ui", baseUrl).toString();

              setParsedData((current) =>
                current.map((u, i) =>
                  i === index
                    ? {
                        ...u,
                        status: "success",
                        key: response.key || response.user_id,
                        invitation_link: invitationUrl,
                      }
                    : u,
                ),
              );
            }
          } catch (inviteError) {
            console.error("Error creating invitation:", inviteError);
            setParsedData((current) =>
              current.map((u, i) =>
                i === index
                  ? {
                      ...u,
                      status: "success",
                      key: response.key || response.user_id,
                      error: "用户已创建，但生成Invitation Link失败",
                    }
                  : u,
              ),
            );
          }
        } else {
          const errorMessage = response?.error || "创建用户失败";
          setParsedData((current) =>
            current.map((u, i) => (i === index ? { ...u, status: "failed", error: errorMessage } : u)),
          );
        }
      } catch (error) {
        console.error("Caught error:", error);
        const errorMessage = (error as any)?.response?.data?.error || (error as Error)?.message || String(error);
        setParsedData((current) =>
          current.map((u, i) => (i === index ? { ...u, status: "failed", error: errorMessage } : u)),
        );
      }
    }

    setIsProcessing(false);

    // Call the callback if any users were successfully created
    if (anySuccessful && onUsersCreated) {
      onUsersCreated();
    }
  };

  const downloadResults = () => {
    const results = parsedData.map((user) => ({
      user_email: user.user_email,
      user_role: user.user_role,
      status: user.status,
      key: user.key || "",
      invitation_link: user.invitation_link || "",
      error: user.error || "",
    }));

    const csv = Papa.unparse(results);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_users_results.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const renderStatusCell = (record: UserData) => {
    if (!record.isValid) {
      return (
        <div>
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-destructive mr-2" />
            <span className="text-destructive">无效</span>
          </div>
          {record.error && <span className="text-sm text-destructive ml-7">{record.error}</span>}
        </div>
      );
    }
    if (!record.status || record.status === "pending") {
      return <span className="text-muted-foreground">待处理</span>;
    }
    if (record.status === "success") {
      return (
        <div>
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-success mr-2" />
            <span className="text-success">成功</span>
          </div>
          {record.invitation_link && (
            <div className="mt-1">
              <div className="flex items-center">
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{record.invitation_link}</span>
                <CopyToClipboard text={record.invitation_link} onCopy={() => toast.success("邀请链接已复制")}>
                  <button className="ml-1 text-info text-xs hover:text-info/80">复制</button>
                </CopyToClipboard>
              </div>
            </div>
          )}
        </div>
      );
    }
    return (
      <div>
        <div className="flex items-center">
          <XCircleIcon className="h-5 w-5 text-destructive mr-2" />
          <span className="text-destructive">失败</span>
        </div>
        {record.error && <span className="text-sm text-destructive ml-7">{JSON.stringify(record.error)}</span>}
      </div>
    );
  };

  const pageCount = Math.max(1, Math.ceil(parsedData.length / PREVIEW_PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const visibleRows = parsedData.slice(currentPage * PREVIEW_PAGE_SIZE, (currentPage + 1) * PREVIEW_PAGE_SIZE);

  return (
    <>
      <Button className="mb-0" onClick={() => setIsModalVisible(true)}>
        + 批量邀请用户
      </Button>

      <Dialog open={isModalVisible} onOpenChange={(open) => !open && setIsModalVisible(false)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>批量邀请用户</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col">
            {/* Step indicator */}
            {parsedData.length === 0 ? (
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-info text-info-foreground flex items-center justify-center mr-3">
                    1
                  </div>
                  <h3 className="text-lg font-medium">下载并填写模板</h3>
                </div>

                <div className="ml-11 mb-6">
                  <p className="mb-4">按以下步骤一次添加多个用户：</p>
                  <ol className="list-decimal list-inside space-y-2 ml-2 mb-4">
                    <li>下载 CSV 模板</li>
                    <li>在表格中填写用户信息</li>
                    <li>保存文件并在此处上传</li>
                    <li>创建完成后，下载包含每个用户 Virtual Key 的结果文件</li>
                  </ol>

                  <div className="bg-muted p-4 rounded-md border border-border mb-4">
                    <h4 className="font-medium mb-2">模板列名</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-start">
                        <div className="w-3 h-3 rounded-full bg-destructive mt-1.5 mr-2 shrink-0"></div>
                        <div>
                          <p className="font-medium">user_email</p>
                          <p className="text-sm text-muted-foreground">用户的邮箱地址（必填）</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="w-3 h-3 rounded-full bg-destructive mt-1.5 mr-2 shrink-0"></div>
                        <div>
                          <p className="font-medium">user_role</p>
                          <p className="text-sm text-muted-foreground">
                            User&apos;s role (one of: &quot;proxy_admin&quot;, &quot;proxy_admin_viewer&quot;,
                            &quot;internal_user&quot;, &quot;internal_user_viewer&quot;)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="w-3 h-3 rounded-full bg-border mt-1.5 mr-2 shrink-0"></div>
                        <div>
                          <p className="font-medium">teams</p>
                          <p className="text-sm text-muted-foreground">
                            Comma-separated team IDs (e.g., &quot;team-1,team-2&quot;)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="w-3 h-3 rounded-full bg-border mt-1.5 mr-2 shrink-0"></div>
                        <div>
                          <p className="font-medium">max_budget</p>
                          <p className="text-sm text-muted-foreground">
                            Maximum budget as a number (e.g., &quot;100&quot;)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="w-3 h-3 rounded-full bg-border mt-1.5 mr-2 shrink-0"></div>
                        <div>
                          <p className="font-medium">budget_duration</p>
                          <p className="text-sm text-muted-foreground">
                            Budget reset period (e.g., &quot;30d&quot;, &quot;1mo&quot;)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="w-3 h-3 rounded-full bg-border mt-1.5 mr-2 shrink-0"></div>
                        <div>
                          <p className="font-medium">models</p>
                          <p className="text-sm text-muted-foreground">
                            Comma-separated allowed models (e.g., &quot;gpt-3.5-turbo,gpt-4&quot;)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button size="lg" className="w-full md:w-auto">
                    <Download className="size-4" />
                    下载 CSV 模板
                  </Button>
                </div>

                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-info text-info-foreground flex items-center justify-center mr-3">
                    2
                  </div>
                  <h3 className="text-lg font-medium">上传填写完成的 CSV</h3>
                </div>

                <div className="ml-11">
                  {selectedFile ? (
                    <div
                      className={`mb-4 p-4 rounded-md border ${fileError ? "bg-destructive/10 border-destructive/20" : "bg-info/10 border-info/20"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0">
                          {fileError ? (
                            <FileWarning className="size-5 shrink-0 text-destructive mr-3" />
                          ) : (
                            <FileText className="size-5 shrink-0 text-info mr-3" />
                          )}
                          <div className="min-w-0">
                            <strong className={`break-words ${fileError ? "text-destructive" : "text-info"}`}>
                              {selectedFile.name}
                            </strong>
                            <span className={`block text-xs ${fileError ? "text-destructive" : "text-info"}`}>
                              {(selectedFile.size / 1024).toFixed(1)} KB • {new Date().toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={removeSelectedFile} className="flex items-center">
                          <Trash2 className="size-4" />
                          移除
                        </Button>
                      </div>

                      {fileError ? (
                        <div className="mt-3 text-destructive text-sm flex items-start">
                          <TriangleAlert className="size-3.5 shrink-0 mr-2 mt-0.5" />
                          <span className="min-w-0 break-words">{fileError}</span>
                        </div>
                      ) : (
                        !csvStructureError && (
                          <div className="mt-3 flex items-center">
                            <div className="w-full bg-border rounded-full h-1.5">
                              <div className="bg-info h-1.5 rounded-full w-full animate-pulse"></div>
                            </div>
                            <span className="ml-2 text-xs text-info">处理中…</span>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <label
                      htmlFor={csvInputId}
                      className="block"
                      onDragOver={handleDragOver}
                      onDragLeave={() => setIsDraggingOver(false)}
                      onDrop={handleDrop}
                    >
                      <div
                        className={`border-2 border-dashed ${isDraggingOver ? "border-info" : "border-border"} rounded-lg p-8 text-center hover:border-info focus-within:border-info transition-colors cursor-pointer`}
                      >
                        <input
                          id={csvInputId}
                          type="file"
                          accept=".csv"
                          className="sr-only"
                          onChange={handleFileInputChange}
                        />
                        <Upload className="size-[30px] text-muted-foreground mb-2" />
                        <p className="mb-1">将 CSV 文件拖放到此处</p>
                        <p className="text-sm text-muted-foreground mb-3">or</p>
                        <span className={buttonVariants({ variant: "outline", size: "sm" })}>浏览文件</span>
                        <p className="text-xs text-muted-foreground mt-4">仅支持 CSV 文件（.csv）</p>
                      </div>
                    </label>
                  )}

                  {csvStructureError && (
                    <div className="mb-4 p-4 bg-warning/10 border border-warning/20 rounded-md">
                      <div className="flex items-start">
                        <ExclamationIcon className="h-5 w-5 shrink-0 text-warning mr-2 mt-0.5" />
                        <div className="min-w-0">
                          <strong className="text-warning">CSV 结构错误</strong>
                          <p className="text-warning mt-1 mb-0 break-words">{csvStructureError}</p>
                          <p className="text-warning mt-2 mb-0">
                            请下载我们的模板，并确保 CSV 符合要求的格式。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-info text-info-foreground flex items-center justify-center mr-3">
                    3
                  </div>
                  <h3 className="text-lg font-medium">
                    {parsedData.some((user) => user.status === "success" || user.status === "failed")
                      ? "用户创建结果"
                      : "检查并创建用户"}
                  </h3>
                </div>

                {parseError && (
                  <div className="ml-11 mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <div className="flex items-start">
                      <TriangleAlert className="size-4 shrink-0 text-destructive mr-2 mt-1" />
                      <div className="min-w-0">
                        <p className="text-destructive font-medium break-words">{parseError}</p>
                        {parsedData.some((user) => !user.isValid) && (
                          <ul className="mt-2 list-disc list-inside text-destructive text-sm">
                            <li>查看下方表格中每一行的具体错误</li>
                            <li>
                              常见问题包括邮箱格式无效、缺少必填字段或角色值不正确
                              values
                            </li>
                            <li>在 CSV 文件中修复这些问题后重新上传</li>
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="ml-11">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center">
                      {parsedData.some((user) => user.status === "success" || user.status === "failed") ? (
                        <div className="flex items-center">
                          <p className="text-lg font-medium mr-3">创建Summary</p>
                          <p className="text-sm bg-success/15 text-success px-2 py-1 rounded-sm mr-2">
                            {parsedData.filter((d) => d.status === "success").length} Successful
                          </p>
                          {parsedData.some((d) => d.status === "failed") && (
                            <p className="text-sm bg-destructive/15 text-destructive px-2 py-1 rounded-sm">
                              {parsedData.filter((d) => d.status === "failed").length} Failed
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <p className="text-lg font-medium mr-3">用户预览</p>
                          <p className="text-sm bg-info/15 text-info px-2 py-1 rounded-sm">
                            {parsedData.filter((d) => d.isValid).length} of {parsedData.length} users valid
                          </p>
                        </div>
                      )}
                    </div>

                    {!parsedData.some((user) => user.status === "success" || user.status === "failed") && (
                      <div className="flex space-x-3">
                        <Button variant="outline" onClick={resetParsedData}>
                          返回
                        </Button>
                        <Button
                          onClick={handleBulkCreate}
                          disabled={parsedData.filter((d) => d.isValid).length === 0 || isProcessing}
                        >
                          {isProcessing
                            ? "创建中…"
                            : `创建 ${parsedData.filter((d) => d.isValid).length} 个用户`}
                        </Button>
                      </div>
                    )}
                  </div>

                  {parsedData.some((user) => user.status === "success") && (
                    <div className="mb-4 p-4 bg-info/10 border border-info/20 rounded-md">
                      <div className="flex items-start">
                        <div className="mr-3 mt-1">
                          <CheckCircleIcon className="h-5 w-5 text-info" />
                        </div>
                        <div>
                          <p className="font-medium text-info">用户创建完成</p>
                          <p className="block text-sm text-info mt-1">
                            <span className="font-medium">Next step:</span> Download the credentials file containing
                            虚拟密钥 and invitation links. Users will need these 虚拟密钥 to make LLM requests
                            至 LiteLLM.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">行</TableHead>
                          <TableHead>邮箱</TableHead>
                          <TableHead>角色</TableHead>
                          <TableHead>Teams</TableHead>
                          <TableHead className={NUMERIC_CELL_CLASS}>Budget</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleRows.map((record) => (
                          <TableRow key={record.rowNumber} className={!record.isValid ? "bg-destructive/10" : ""}>
                            <TableCell>{record.rowNumber}</TableCell>
                            <TableCell className="whitespace-normal break-words">{record.user_email}</TableCell>
                            <TableCell className="whitespace-normal break-words">{record.user_role}</TableCell>
                            <TableCell className="whitespace-normal break-words">{record.teams}</TableCell>
                            <TableCell className={NUMERIC_CELL_CLASS}>{record.max_budget}</TableCell>
                            <TableCell className="whitespace-normal break-words">{renderStatusCell(record)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {pageCount > 1 && (
                    <div className="flex items-center justify-end gap-3 mt-2">
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage + 1} of {pageCount}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPageIndex(currentPage - 1)}
                        disabled={currentPage === 0}
                      >
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPageIndex(currentPage + 1)}
                        disabled={currentPage >= pageCount - 1}
                      >
                        下一页
                      </Button>
                    </div>
                  )}

                  {!parsedData.some((user) => user.status === "success" || user.status === "failed") && (
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" onClick={resetParsedData} className="mr-3">
                        返回
                      </Button>
                      <Button
                        onClick={handleBulkCreate}
                        disabled={parsedData.filter((d) => d.isValid).length === 0 || isProcessing}
                      >
                        {isProcessing
                          ? "创建中…"
                          : `创建 ${parsedData.filter((d) => d.isValid).length} 个用户`}
                      </Button>
                    </div>
                  )}

                  {parsedData.some((user) => user.status === "success" || user.status === "failed") && (
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" onClick={resetParsedData} className="mr-3">
                        开始新的批量导入
                      </Button>
                      <Button onClick={downloadResults}>
                        <Download className="size-4" />
                        下载用户凭据
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BulkCreateUsersButton;
