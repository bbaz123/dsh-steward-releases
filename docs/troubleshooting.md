# 故障处理顺序（救援手册）

> 本机 DSH 环境出问题时的**逐级救援手册**。
> 原则：**从最轻的一级开始，能不动就不动；上一级没解决才进下一级。**

---

## 0. 先分清：是「红项」还是「真坏了」

**大部分情况是前者，不用修。**

| 你看到的 | 性质 | 该做什么 |
| --- | --- | --- |
| 体检里的「插件兼容性自检 / 插件与主程序配对」报红 | **静态警告**，多数不影响运行 | 先什么都不做，见 §6 |
| 「仓库相对官方远端：落后于官方」 | 真实提示，上游有新提交 | 可选：在维护中心拉取更新 |
| 「工具自身更新：跳过 / 已是最新」 | 正常 | 什么都不做 |
| **网页打不开 / 白屏 / 一直转圈 / 弹报错** | **真坏了** | 进 §2 的 L2 |
| **DSH 启动就报插件错误 / 模块找不到** | **真坏了** | 从 L1 开始 |
| **配套服务（如本地工作台）打不开** | **真坏了** | 直接跳 §2 的 L3 |

> 判据：**看服务端口和网页，不看体检红项。** 体检红项 ≠ 坏了。

---

## 1. 三条纪律（预防比救援更重要）

1. **升级只走管家**（维护中心的「检查更新 / 立即更新」），**不要手动** `npm i -g @deepseek-ai/dsh`。
   原因：管家按**插件声明的实测主程序版本**安装 dsh，不会被 registry 的预览版带走。
2. **不要为了「消红」去折腾**：不要盲目升级预览版主程序，也不要随手删 profile 的 `node_modules`。
3. **动过任何东西后，用管家「重新体检」复核**核心几项：Node.js / npm / 全局 dsh / 关键插件 /
   源码仓库 / 配套服务。

---

## 2. 救援顺序（L1 → L5）

### L1 —— 诊断与「一键修复」〔最轻，先试这个〕

**适用**：DSH 能开但报插件 / 依赖 / 版本类错误；刚重启过环境想对齐；想拉仓库新提交。

**做法**：

1. 运行 `DSH管家.exe`；
2. 点 **【启动 / 诊断 DSH】** 先看结论 —— 是哪个规则、什么等级、证据是什么；
3. 只有结论里出现可自动修复的规则时，才点 **【一键修复】** 或单条卡片的「修复」；
4. 结束后会自动重新体检。

**先看不动手**（推荐在点修复前跑一次）：

```powershell
.\DSH管家.exe --diagnose     # 只读诊断，不改任何被检查的文件
.\DSH管家.exe --repair       # 预演：只显示"打算改什么"
```

**没解决** → 进 L2。

### L2 —— 重启 DSH 本体〔最常用的一招〕

**适用**：网页打不开 / 白屏 / 转圈 / 连不上本机端口。

```powershell
# 1) 找到占用端口的进程（把 3080 换成你的 DSH 端口）
$p = (Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue).OwningProcess
if ($p) { "PID $p 正在监听 3080" } else { "3080 未占用" }

# 2) 确认为 DSH 进程后再结束它
Get-Process -Id $p | Select-Object Id, ProcessName, Path

# 3) 用你平时的方式重新启动 DSH
```

**注意**：先确认 PID 归属再结束进程；管家只停止「它自己启动的」进程树（`--stop-dsh`），不会误杀别人的实例。

**没解决** → 进 L3（配套服务问题）或 L4。

### L3 —— 重启配套服务

**适用**：本地的配套服务（工作台、记忆服务等）打不开、接口无响应。

用服务自己的启动脚本重启，并按它的健康地址验证：

```powershell
Get-NetTCPConnection -LocalPort <服务端口> -State Listen
```

**数据安全**：正常重启不影响数据文件；但不要在服务正在写入时强杀进程。

**没解决** → 进 L4。

### L4 —— 重建 profile 的 `node_modules`〔较慢，会打断会话〕

**适用**：L1 报「插件装不上 / 模块找不到 / `node_modules` 损坏」，或插件版本彻底错乱。

**注意**：这会删除并重装 DSH 插件依赖，**务必先停掉 DSH 本体**。

```powershell
# 1) 先停 DSH（见 L2）

# 2) 备份 profile 清单
$prof = "$env:USERPROFILE\.dsh\profiles\web"
Copy-Item "$prof\package.json" "$prof\package.json.bak" -Force

# 3) 删除损坏的依赖
Remove-Item "$prof\node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# 4) 用 dsh 自己重装 profile 全部插件
$dsh = (Get-Command dsh).Source   # 或你的全局 dsh 的 lib\bin.js
node $dsh plugin --profile web install
```

**预期**：插件按 `package.json` 重新装好。
**重要预期管理**：若上游子包版本范围本身有漂移，重装后 `doctor` **仍可能报红** —— 这是上游版本策略问题，
不代表 L4 失败。L4 只负责修「依赖损坏」，不负责消红（见 §6）。

**没解决** → 进 L5。

### L5 —— 重装全局 dsh 主程序〔终极大招〕

**适用**：`dsh` 命令本身坏了、`--version` 报错、L4 之后仍起不来。

```powershell
# 用插件实测支持的版本，不要用 @latest / @next
npm install -g @deepseek-ai/dsh@<你的插件支持的版本>

# 或直接用管家的一键更新脚本（走国内镜像）
.\dsh-update.cmd
```

**⚠️ 不要** `npm i -g @deepseek-ai/dsh@next` —— 会把主程序换成插件尚未支持的预览版。
**做完后**：回 L1 再诊断一次，再按 L2 重启。

---

## 3. 端口 / 路径速查

| 项 | 说明 |
| --- | --- |
| DSH 网页 | 默认 `127.0.0.1:3080`（可在配置里指定） |
| 管家程序 | `DSH管家.exe` |
| 管家日志 | 同级目录 `DSH管家.log`（超 2 MB 轮转为 `.log.old`） |
| 体检快照 | 同级目录 `DSH管家-health.json`（供外部程序读取） |
| 管家配置 | 同级目录 `DSH管家.config.json` |
| 诊断数据 | 同级目录 `diagnostics-data\`（现场 / 结论 / 恢复点） |
| DSH profile | `%USERPROFILE%\.dsh\profiles\<profile>` |
| 全局 dsh | npm 全局目录下的 `@deepseek-ai\dsh` |

---

## 4. 出问题时先看哪里

| 想看什么 | 位置 |
| --- | --- |
| 管家干了什么 / 哪一步失败 | `DSH管家.log` 末尾 |
| 上次体检的完整结论 | `DSH管家-health.json` |
| 某次诊断的现场与证据 | `diagnostics-data\captures\<会话ID>\combined.log` 与 `diagnostics\<会话ID>\findings.json` |
| 自动修复改了哪个文件、怎么还原 | `diagnostics-data\recovery\<会话ID>\manifest.json` 与 `backup\` |

---

## 5. 救援时**不要**做的事

- ❌ 不要手动把全局 dsh 升级到预览版（尤其 `@next`）——会被 registry 的 `next` 带走；
- ❌ 不要为了消红而升级主程序或删 `node_modules`；
- ❌ 不要重装到一半又把 DSH 打开——L4 必须先停 DSH；
- ❌ 不要先杀进程再确认归属——先看端口占用者是谁；
- ❌ 不要在服务正在写入数据时强杀进程。

---

## 6. 关于「插件兼容性自检 / 配对」常年报红

**结论：多数情况下不用管，它不影响运行。**

- **现象**：`doctor` 报 `N resolved DSH packages differ from host <版本>`。
- **根因**：上游版本策略 —— 源码内部依赖统一写 `workspace:^`，发布时变成 `^x.y.z-rc.N`，
  这个 caret 范围会匹配到同版本的更新预发布版，于是主程序与子包版本不一致。
- **定性**：这是**上游发布不一致**，不是本机装坏了。普通「重装 / 更新」无法消除。
- **什么时候才需要处理**：等**插件生态采纳新版本**（即目标插件的 peer 范围包含该版本）之后，
  再在维护中心正常升级即可；在那之前，保持与插件实测兼容的版本，忽略这两条红。

---

## 7. 备份与恢复（v1.3.0：动手前先有退路）

**纪律：任何升级 / 改配置 / 重装之前，先有一份校验通过的备份。**

```powershell
# 1) 备份（默认全量；也可只备份某几类）
.\DSH管家.exe --backup
.\DSH管家.exe --backup --types sessions,settings,profiles

# 2) 列出并校验（缺 .sha256 一律算「无法确认」，不当通过）
.\DSH管家.exe --backups
.\DSH管家.exe --verify all

# 3) 恢复：先预演（零改动），确认无误再执行
.\DSH管家.exe --restore latest --dry-run
.\DSH管家.exe --restore latest --yes
```

要点：

- **恢复前会自动拍「恢复前快照」**，并把现有数据改名挪旁（`dsh-home.pre-restore-*`），**不删除**任何东西；
- **凭据默认不进归档**：`.credentials.yaml` / `.env` 等按规则剔除，明文只写本机 `vault\`，
  恢复时按真实剔除清单从 vault 补回；关闭脱敏需自己改配置 `backupRedactOn`（默认开）；
- **归档只落本机磁盘**（默认桌面下的 `dsh-backups`，可用 `backupDir` 改），不涉及云端；
- **会话文件损坏**（打不开 / 报错）用会话体检与定点修复，不要手删：
  `.\DSH管家.exe --sessions` 先看结论，`--sessions --repair` 从已验证归档原样修回，
  损坏现场会留档为 `*.corrupt-<时间戳>`；
- 轮换：用户归档默认保留 7 份（`backupKeep` 可调，0 = 不自动删除）；升级前 / 恢复前快照受保护，
  不参与用户份数轮换。

---

*本手册与 DSH 管家 v1.3.0 配套。*
