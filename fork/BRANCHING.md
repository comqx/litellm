# 二开分支

`upstream` 只从 `https://github.com/BerriAI/litellm.git` 拉取，push 地址已设成 `DISABLE`。`origin` 是 `https://github.com/comqx/litellm.git`。

`main` 只镜像官方 `main`，只允许快进。二开提交不要放在 `main` 上。

官方仓库自己有 `develop`。二开的长期分支叫 `custom`，不要再用 `develop` 这个名字，避免和官方分支混在一起。日常功能从 `custom` 拉出，做完再合回来。每天 00:20 把当时的 `main` 合并进 `custom`。

功能分支用 `feat/主题`，从 `custom` 拉出，合回 `custom` 后删掉。夜间同步发现当前不在 `custom` 或 `main` 上会直接跳过，避免把正在做的功能分支切走。希望当天的同步执行，收工时回到 `custom`。

上线时在 `custom` 上一个已经解决完冲突的提交打 tag，名字用 `fork-日期`。不要从还留着冲突标记的工作区发布。

同步脚本在 `/Users/liuqixiang/WorkBuddy/定时任务/litellm/litellm-upstream-sync.sh`。WorkBuddy 每天 00:20 执行 `sync`。工作区有未提交内容、合并还没结束，或当前停在功能分支上，这次就跳过。没有冲突时，脚本合并并推到 `origin`。有冲突时，脚本先把说明提交到 `fork/upstream-conflicts/日期.md` 并推送，然后把冲突留在这个工作区。脚本不提交冲突标记，不 rebase，不 force push。脚本不会 checkout，也不会 push `develop`。

第二天打开本仓库，看 `fork/upstream-conflicts` 里最新的说明。解决冲突标记后执行 `git add`、`git commit`、`git push origin custom`。处理完之前不要在这个工作区开新功能。

手动检查用同一个脚本的 `check`。想立刻同步就跑 `sync`。

准备把某个修复送回官方时，从 `main` 拉分支。`custom` 上叠着二开提交，不适合直接给上游。
