import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatNumberWithCommas } from "@/utils/dataUtils";
import type { MemberBudgetResetState } from "./useMemberBudgetReset";

interface ResetMemberBudgetsDialogProps {
  state: MemberBudgetResetState;
  onReset: () => void;
  onRetry: () => void;
  onKeep: () => void;
  onDismiss: () => void;
}

export default function ResetMemberBudgetsDialog({
  state,
  onReset,
  onRetry,
  onKeep,
  onDismiss,
}: ResetMemberBudgetsDialogProps) {
  const open = state.phase !== "idle";
  const busy = state.phase === "resetting";
  const failed = state.phase === "resetFailed";
  const memberCount = state.phase === "idle" ? 0 : state.pending.userIds.length;
  const newBudget = state.phase === "idle" ? 0 : state.pending.newBudget;
  const budgetLabel = `$${formatNumberWithCommas(newBudget, 2)}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onDismiss();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重置成员预算？</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {memberCount} 名成员使用自定义预算，新的团队默认预算 {budgetLabel} 不会自动应用到这些成员。是否将其重置为默认值，还是保留自定义预算？
        </p>
        <DialogFooter>
          {failed ? (
            <>
              <Button variant="outline" onClick={onDismiss}>
                取消
              </Button>
              <Button onClick={onRetry}>重试</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onDismiss} disabled={busy}>
                取消
              </Button>
              <Button variant="outline" onClick={onKeep} disabled={busy}>
                保留自定义预算
              </Button>
              <Button onClick={onReset} disabled={busy}>
                {memberCount > 1 ? "全部重置" : "重置"}为 {budgetLabel}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
