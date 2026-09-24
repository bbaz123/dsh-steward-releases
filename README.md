# DSH 管家 · dsh-steward

![version](https://img.shields.io/badge/version-1.3.0-blue)
![platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078D6)
![runtime](https://img.shields.io/badge/.NET%20Framework-4.x-512BD4)
![license](https://img.shields.io/badge/license-Apache--2.0-green)

**Windows 桌面工具：把「DSH 起不来」变成一条有证据、可回滚的处理链路。**

本地 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）启动失败时，你通常只拿到一句
`Cannot find module` 或者一个白屏。DSH 管家负责 **受管启动 → 采集真实现场 → 按规则给出带证据的结论 →
只对能改回来的故障动手**，并把体检、插件管理、升级维护收进同一个窗口。

单文件 exe，解压即用，不需要 Python、不需要安装程序。

> **In English** — DSH Steward is a single-file Windows (C#/WinForms) operations tool for a local
> DeepSeek Harness install: it starts DSH under management, captures the real launch evidence
> (stdout/stderr/ports/process tree/health probe), turns it into evidence-backed findings, applies only
> rollback-safe repairs, and keeps health checks, plugin management and updates in one GUI.

---

## 30 秒了解

**它解决什么问题**：DSH 装在本机、插件一堆、版本还会漂移，出问题时没有现场、没有证据，只能靠猜。

**它只在什么阶段生效**：DSH **起不来或跑得不正常**时（诊断链路），以及你**主动点击**维护按钮时（维护链路）。
诊断链路是只读的，除下面写明的两条可自动修复规则（剥离 JSON 清单 BOM、会话日志定点修复）外，
不改任何被检查的文件。

**它明确不做什么**：

- 不自动升级任何东西 —— 升级 / 安装 / 构建只在你手动点击时执行；
- 不推断无法推断的内容 —— 普通 JSON 损坏、依赖漂移、插件不匹配一律只诊断、给建议；
- 不自动删除任何用户数据 —— 恢复前一律把现有数据改名挪旁，会话修复只覆盖并留档；
- 不上传任何数据 —— 现场、结论、恢复点、备份归档都只落本地磁盘；
- 不重复启动 DSH —— 已经在跑就接管，不会再起第二个实例。

**Before / After**

```text
不用管家：白屏 → 翻日志 → 猜是 Node / 插件 / 端口 / BOM → 试着重装 → 又坏了
用管家：  点「启动 / 诊断 DSH」→ 拿到 P0~P4 + 规则号 + 证据 + 涉及文件 + 建议 →
          可自动修的直接修（改前备份、改后用 Node 复验、失败自动回滚）
```

---

## ⭐ 功能特性

- **现场采集**：受管启动时把 stdout / stderr 直接落盘，记录启动方式、命令行、进程树、端口占用者、
  健康探针结果与退出码 —— 报错现场不再丢。
- **证据化诊断**：19 条规则（`DSH-JSON-BOM-001` … `DSH-NPMRC-ALLOWLIST-120`），每条结论都必须带证据
  （输出片段、堆栈帧、端口占用者、文件路径 + 行号），没有证据不下结论。
- **两条可回滚自动修复**：① `DSH-JSON-BOM-001` 剥离 JSON 清单的 BOM；② `DSH-SESSION-BATCH-031`
  用你自己**已验证的归档**把损坏的会话文件**原样**修回。两条都固定走「前置校验 → 留档 / 备份 →
  最小改动 → 复验 → 提交或自动回滚」。
- **备份中心**：全量 / 分类备份（`tar.gz` + `.sha256` + `.meta.json`）、逐份校验（缺校验文件一律算
  「无法确认」）、预演恢复、执行恢复（**校验通过才动手**，现有数据改名挪旁而不是删除）、
  凭据默认脱敏且明文只落本机 vault、分级轮换（升级前 / 恢复前快照受保护）、升级前自动快照。
- **会话体检**：zstd 帧结构 + 首帧契约 + seq 连续性三项判定，能指出是哪个文件、坏在哪里。
- **插件兼容性预检**：安装 / 升级前按 `peerDependencies` 数值窗口 + `engines.node` 判定，
  三种结论 `OK` / `FAIL` / **未知** —— **未知绝不当通过**，不通过就拦下并说明原因。
- **环境体检**：21 项（Node.js / npm / 全局 dsh / 插件与配对 / 插件更新 / 镜像源 / 仓库与产物 /
  配套项目与服务 / 备份 / 会话 / 兼容性 / 工具自身更新…），写出 `DSH管家-health.json` 供外部程序读取。
- **维护中心**：切国内 npm 镜像源、按插件实测版本对齐全局 dsh、对齐插件版本、更新 profile 全部插件、
  `git pull --ff-only` + 装依赖 + 构建仓库、拉起配套服务 —— 全部手动触发。
- **插件管理**：列出已装插件与版本、更新状态；「修复」按当前版本重装，「升级」装最新版，「卸载」走官方
  `dsh plugin --profile web remove` 通道（二次确认 + 卸载前快照 + 复读校验，没卸掉就如实说「未生效」）。
- **托盘常驻 / 单实例 / 崩溃日志**：关窗口最小化到托盘；重复双击把已有窗口唤到前台；未捕获异常写
  `DSH管家-crash.log` 并继续运行。
- **自带更新通道**：启动时检查本仓库的 `manifest.json`，走 jsDelivr CDN（国内可直连），
  下载后校验 SHA256 再替换。
- **离线自测**：`--selftest` 在临时沙箱里跑 77 项断言（假 DSH、假 npm），覆盖规则命中、误报防护、
  BOM 字节处理、回滚、SHA 变化拒绝修复、插件卸载等，不碰你的真实环境。

---

## 🚀 快速开始

### 手动下载

1. 下载程序（约 310 KB，单文件）：

   ```powershell
   Invoke-WebRequest 'https://cdn.jsdelivr.net/gh/bbaz123/dsh-steward-releases@main/DSH管家.exe' -OutFile 'DSH管家.exe'
   ```

2. 校验完整性（哈希应与 [`manifest.json`](./manifest.json) 里的 `sha256` 完全一致）：

   ```powershell
   (Get-FileHash .\DSH管家.exe -Algorithm SHA256).Hash
   ```

3. 双击运行。第一次打开只做体检，不会改任何东西。

### 什么都不改，先看诊断

```powershell
# 只读诊断：启动或接管 DSH，采集现场并给出结论（不修改被检查的文件）
.\DSH管家.exe --diagnose

# 预演修复：只显示"打算改什么"，不写任何文件
.\DSH管家.exe --repair
```

> **安装位置提示**：程序默认按「exe 所在目录的同级目录」自动探测 DSH 仓库、配套项目与启动脚本；
> 把它放到别处前，请先在 `DSH管家.config.json` 里把这些路径写成绝对路径。

---

## 📦 安装

本工具是绿色单文件程序，**没有安装程序**：

- 下载 `DSH管家.exe` 放到任意目录（建议单独建一个文件夹，例如 `D:\Tools\dsh-steward\`）；
- 首次运行会在同目录生成 `DSH管家.config.json`、`DSH管家.log` 与 `diagnostics-data\`；
- 升级 = 用新版 exe 覆盖旧版（配置文件与数据目录都不会被覆盖）。

**自动更新**：程序读取本仓库的 `manifest.json` 判断是否有新版，确认后从 CDN 下载并校验 SHA256 再替换。
仓库里三个文件的分工：

- `manifest.json` —— 更新清单（版本号 + SHA256 + 下载地址 + 更新说明）；
- `DSH管家.bin` —— 供程序自动下载的副本（**内容就是 exe，只是后缀不同**，因为 jsDelivr 不接受 `.exe`）；
- `DSH管家.exe` —— 供人手动下载的原文件。

**卸载**：删除 exe、`DSH管家.config.json`、`DSH管家.log`（及 `.log.old`）、`DSH管家-health.json`
与 `diagnostics-data\` 目录即可 —— 程序不写注册表、不开机自启、不注册服务。

---

## 💻 使用

### 图形界面

顶部工具栏：

```text
[启动 / 诊断 DSH] [一键修复] [重新体检] [打开 DSH 网页] [配置文件] ｜ [故障中心] [维护中心] [备份中心] [运行日志]
```

- **启动 / 诊断 DSH**：已经跑着就接管（绝不重复启动第二个）；没跑就受管启动、采集现场，然后出诊断结论。
- **一键修复**：先诊断，再只修「有证据且能自动改回来」的故障；没有可自动修的故障时，只给建议、明确告诉你「未执行任何写入」。
- **故障中心**：每条故障一张卡片 —— 等级 `P0~P4`、自动化级别 `A0~A3`、规则号、影响、证据、涉及文件、风险、建议；
  每条可单独修复、查看文件、查看输出、打开恢复点目录。
- **维护中心**：全套维护、检查更新、立即更新、启动配套服务、逐项体检卡片（每项独立「修复 / 升级」）。
- **备份中心**（v1.3.0，独立窗口）：新建全量备份、分类备份、校验选中 / 校验全部、预演恢复、执行恢复、
  打开备份目录 / vault、会话体检、定点修复会话、放行原生模块、版本信息、打开配置。
- **托盘常驻**：关窗口 = 最小化到托盘（右键：打开主界面 / 启动·诊断 DSH / 备份中心 / 退出）；
  单实例 —— 重复双击会把已有窗口唤到前台。
- **插件管理 / 运行日志**：插件版本与更新状态一览；日志实时输出（超 2 MB 自动轮转为 `.log.old`）。

### 命令行

```text
DSH管家.exe --diagnose        启动或接管 DSH，采集现场并输出诊断（只读，不改文件）
DSH管家.exe --repair          预演：只显示要修什么，不写任何文件
DSH管家.exe --repair --yes    先诊断，再对可自动修复的故障做最小可逆修复
DSH管家.exe --health          体检并写出 DSH管家-health.json（21 项）
DSH管家.exe --selftest        离线自测（沙箱 + 假 DSH，77 项断言）
DSH管家.exe --versions        版本信息（管家 / 系统 / Node / npm / dsh / 插件 / 备份 / 会话 / 网络）
DSH管家.exe --backup          新建备份（--types sessions,settings,... 可只备份部分分类）
DSH管家.exe --backups         列出全部备份（含升级前 / 恢复前快照与校验状态）
DSH管家.exe --verify all      校验归档完整性与 SHA256（缺 .sha256 一律算「无法确认」）
DSH管家.exe --restore latest --dry-run      恢复预演：只列计划，零改动
DSH管家.exe --restore latest --yes          执行恢复：先拍恢复前快照，旧数据改名挪旁
DSH管家.exe --sessions        会话日志体检
DSH管家.exe --sessions --repair             从已验证归档定点修复损坏会话（改前留档）
DSH管家.exe --compat <插件>@<版本>          兼容性预检：0 通过 / 1 不兼容 / 3 未知
DSH管家.exe --stop-dsh        只停止「管家自己启动的」DSH 进程树
DSH管家.exe --help            帮助
```

退出码：`0` = 无 P0/P1 故障（或命令成功）；`1` = 存在 P0/P1 故障；`2` = 执行异常；`3` = 预演（未执行修复）。

适合接进脚本或 CI（例如发布前跑一次 `--selftest`，或定时跑 `--health` 并读取 JSON）：

```powershell
.\DSH管家.exe --health
$items = Get-Content .\DSH管家-health.json -Raw | ConvertFrom-Json
$items | Where-Object { -not $_.ok } | Select-Object name, status, detail
```

---

## 🔍 诊断能力

### 等级与自动化级别

- **等级 P0~P4**：P0 = 起不来（阻断）；P1 = 跑得不正常；P2 及以下 = 参考信息。
- **自动化 A0~A3**：A0 = 已具备闭环能力；A1 = 闭环能力开发中；A2 = 存在技术前提，暂不自动；A3 = 信息不足，只诊断。

### 19 条规则

| 规则号 | 等级 | 自动化 | 能否自动修 |
| --- | --- | --- | --- |
| `DSH-JSON-BOM-001` JSON 清单含 BOM | P0 | A0 | **能**（自动修复第一条） |
| `DSH-JSON-BROKEN-002` 普通 JSON 损坏 | P0 | A3 | 不能，只诊断 |
| `DSH-MODULE-NOT-FOUND-003` 缺模块 | P0 | A2 | 不能，只诊断 |
| `DSH-PLUGIN-MISMATCH-010` 插件与主程序不匹配 | P1 | A2 | 不能，只诊断 |
| `DSH-DEP-DRIFT-020` 核心子包版本漂移 | P2 | A3 | 不能，只诊断 |
| `DSH-SESSION-CORRUPT-030` 会话日志损坏 | P0 | A1 | 第一版只诊断 |
| `DSH-NODE-INCOMPAT-040` Node 版本不兼容 | P0 | A2 | 不能（升级属于维护） |
| `DSH-NPX-CACHE-050` npx 缓存/内存问题 | P1 | A0 | 第一版只诊断 |
| `DSH-PORT-BLOCKED-060` 端口被占用 | P1 / P2 | A0 | 不能，只诊断 |
| `DSH-LAUNCH-BACKGROUND-070` 后台启动被误判 | P1 | A1 | 不能，只诊断 |
| `DSH-ENOENT-SUBPROC-080` 子进程日志缺失 | P0 | A2 | 不能（上游问题） |
| `DSH-BACKUP-MISSING-090` 一个备份都没有 | P2 | A3 | 不能 → 去【备份中心】建第一份 |
| `DSH-BACKUP-STALE-091` 最近的备份过期 | P2 | A3 | 不能 → 去【备份中心】补一份 |
| `DSH-BACKUP-CORRUPT-092` 备份缺校验 / 边车损坏 | P1 | A3 | 不能（诊断不改文件） |
| `DSH-PLUGIN-COMPAT-100` 插件要求的宿主版本不符 | P1 / P2 | A3 | 不能（安装 / 升级前会拦） |
| `DSH-NODE-ENGINE-101` 插件要求的 Node 不符 | P1 | A3 | 不能（换 Node 影响面大） |
| `DSH-PLUGIN-DEPS-110` 插件依赖三层都解析不到 | P2 | A3 | 不能（改 profile 需你确认） |
| `DSH-NPMRC-ALLOWLIST-120` 原生模块白名单没覆盖 | P2 | A3 | 不能 →【备份中心】一键放行 |
| `DSH-SESSION-BATCH-031` 会话日志批量损坏 | P1 | A1 | **能**（从已验证归档定点修复，自动修复第二条） |

> 规则 12~19 是 v1.3.0 新增的**环境层规则**：只用本机已有文件判定（备份目录 / `package.json` /
> `.npmrc` / 会话目录），**不走网络**，离线跑 `--diagnose` 也能得到可复现的数据与插件健康结论。

> **端口规则的两条硬约定**：管家自己启动的 DSH 正在监听属于**正面证据**，不算故障；
> 只有别的进程占用了你习惯用的端口才提示，且 DSH 本身健康时降为 P2 参考信息。

### 自动修复闭环（一）剥离 JSON 清单的 BOM

`DSH-JSON-BOM-001` 是两条可自动修复规则中的第一条，流程固定为：

```text
1. 前置校验   文件存在、仍含 BOM、SHA256 与诊断时一致（不一致 → 拒绝修复，要求重新诊断）
2. Recovery   备份原文件到 recovery\<会话ID>\backup\，manifest 记录 backupPath
3. 剥离 BOM   只删除开头 3 个字节 EF BB BF，其余内容一字不改
4. JSON 验证  用本机 Node 执行 JSON.parse 做等价校验（不靠正则猜）
5. 重启 DSH   受管启动，重新采集现场
6. 服务验证   健康探针确认服务真的起来了
7. 提交/回滚  全部通过 → 提交；任何一步失败 → 自动回滚，并如实报告"已回滚"
```

**没有诊断证据不自动改；没有恢复点不写文件；没有验证通过不报"修复成功"；失败必须回滚。**

### 自动修复闭环（二）会话日志定点修复

`DSH-SESSION-BATCH-031` 只做一件事：**把损坏的会话文件，用你自己归档里的那一份原样覆盖回来。**

```text
1. 体检判定   验 zstd 帧结构（含尾部垃圾字节）+ 首帧契约（一行 SessionHeader）+ seq 连续性
2. 选归档     只从「校验通过」的归档里取副本；归档校验不过 → 拒绝修复
3. 留档       覆盖前把损坏现场改名 *.corrupt-<时间戳>，绝不删除任何内容
4. 覆盖       把归档里的同路径文件解出来落地
5. 复检       重新体检；复检不通过 → 自动回滚返回现场
6. 报数       如实报告修了几个、留档在哪、复检结果
```

实测口径：修复后的文件 SHA256 与**原始**文件逐字节一致（不是"重建"出来的近似文件）。
管家**永远不会删除**会话：它只会覆盖、留档、回滚。

---

## 🔒 数据与隐私

- 全部数据留在本机 exe 同级的 `diagnostics-data\` 下，默认只保留最近 30 份现场（`captureKeep` 可调）：

  ```text
  diagnostics-data\
    captures\<会话ID>\       stdout.log / stderr.log / combined.log / launch.json / process.json / probe.json
    diagnostics\<会话ID>\    session.json / environment.json / packages.json / findings.json / candidates.json
    recovery\<会话ID>\       恢复点：manifest.json + backup\（修复前的原文件）
    selftest-report.txt      最近一次离线自测报告
  ```

- 程序**不上传**任何数据。联网只发生在两个明确场景：查询 npm 镜像源（`registry.npmmirror.com`）
  和检查本仓库的更新清单（jsDelivr CDN）。
- **备份与凭据**（v1.3.0）：归档只落本机磁盘（默认桌面下的 `dsh-backups`，可用 `backupDir` 改）；
  归档内**默认不含凭据**（`.credentials.yaml` / `.env` / `qq-bridge/config.json` 等按规则剔除，
  剔除清单写进 `.redacted.json`），明文只写本机 `vault\` 目录；恢复时按真实剔除清单把凭据补回。
  关闭脱敏需要自己改配置（`backupRedactOn`），默认是开的。
- 反馈问题时，`diagnostics\<会话ID>\findings.json` 与 `captures\<会话ID>\combined.log` 就是完整的证据链；
  提交前请自行检查其中是否含不想公开的路径信息。

---

## ⚙️ 配置

配置文件 `DSH管家.config.json`（**只在文件不存在时生成**，手工编辑不会被覆盖）：

```json
{
  "selfUpdateManifestUrl": "https://cdn.jsdelivr.net/gh/bbaz123/dsh-steward-releases@main/manifest.json",
  "checkUpdatesOnLaunch": true,
  "novelStudioDir": "",
  "harnessRepoDir": "",
  "startWebCmd": "",
  "startNovelCmd": ""
}
```

| 字段 | 说明 |
| --- | --- |
| `selfUpdateManifestUrl` | 自更新清单地址（默认走 jsDelivr CDN，国内可直连） |
| `checkUpdatesOnLaunch` | 启动时是否自动检查新版本 |
| `harnessRepoDir` | DSH 源码仓库目录；留空则按「exe 同级目录」探测 |
| `novelStudioDir` | 配套项目目录；留空则按「exe 同级目录」探测 |
| `startWebCmd` / `startNovelCmd` | 启动脚本路径；留空则按「exe 同级目录」探测 |
| `dshBinJs` | 可选：直接用 `node <dsh>/lib/bin.js web` 启动（留空则优先用启动脚本） |
| `dshWebUrl` | 可选：DSH 网页地址；留空则从启动输出 / 配置文件 / 候选端口自动解析 |
| `startupTimeoutSec` | 受管启动等待健康探针的秒数，默认 180 |
| `preferDirectBin` | 是否优先直启 `bin.js` 而不是启动脚本，默认 false |
| `captureKeep` | 现场（captures）保留份数，默认 30 |

---

## 🏗 工作原理

```text
DSH管家.exe (C# / WinForms, 单文件)
├── 启动层   受管启动（CreateProcess，不继承句柄）或接管已在运行的 DSH
├── 采集层   stdout/stderr → captures\<会话ID>\，进程树 / 端口 / 健康探针
├── 证据层   输出片段、堆栈帧、端口占用者、文件路径+行号 → 结构化证据
├── 规则层   19 条诊断规则 → findings（等级 P0~P4 / 自动化 A0~A3 / 证据）
├── 修复层   Recovery 备份 → 最小改动 → Node JSON.parse 复验 → 重启 → 探针 → 提交/回滚
├── 备份层   归档（tar.gz + .sha256 + .meta.json + .redacted.json）→ 校验 → 挪旁 → 恢复 → 复算指纹
├── 维护层   npm 镜像 / 全局 dsh / 插件版本 / 仓库拉取构建 / 配套服务（全部手动触发）
└── 自更新   manifest.json（jsDelivr）→ 下载 .bin → 校验 SHA256 → 替换
```

设计取向只有一条：**宁可少修，也不误修。** 因此 A0 的规则极少，但每一条都有可验证的闭环。

---

## ✅ 兼容性

- **系统**：Windows 10 / 11（64 位），依赖系统自带的 .NET Framework 4.x；不需要管理员权限、
  不写注册表、不开机自启。关窗口默认最小化到托盘（`minimizeToTray: false` 可还原为直接退出）。
- **磁盘**：程序本体约 310 KB；备份归档大小取决于 DSH 数据目录，默认保留 7 份（`backupKeep` 可调）。
- **外部工具**：诊断与维护依赖本机已有的 `node` / `npm`（可选 `git`，用于仓库更新）；
  仅做诊断时，缺哪个工具会作为一条体检结论报出来，而不是静默失败。
- **DSH 版本**：按插件声明的实测兼容版本对齐主程序，可避免被 registry 的预览版带走；
  版本漂移会被 `DSH-DEP-DRIFT-020` 如实报出（这类问题只诊断，不自动"消除红项"）。
- **配置兼容**：配置文件项向后兼容，新增字段有默认值；版本升级不改变文件名与启动方式。

---

## 🛠 从源码构建

源码为自包含单文件 C#（WinForms + GDI+），用系统自带的编译器即可构建，无需 Visual Studio：

```powershell
$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
& $csc /target:winexe /optimize+ /codepage:65001 `
    /r:System.Windows.Forms.dll /r:System.Drawing.dll `
    /out:DSH管家.exe DSH管家.cs
```

> `/codepage:65001` 是必需的（源码含中文字面量）；编译前请先退出正在运行的管家，否则 exe 被占用。

构建后的自检：

```powershell
.\DSH管家.exe --selftest      # 77 项断言，离线沙箱
.\DSH管家.exe --health        # 真实环境体检
```

---

## 📡 更新通道与发布

本仓库同时是**更新通道**。发布一个新版本 = 让三个文件保持一致：

1. 覆盖 `DSH管家.exe`，并同步复制一份为 `DSH管家.bin`（内容相同，仅后缀不同）；
2. 更新 `manifest.json` 的 `version` 与 `sha256`（`manifest.json` 的 `url` 指向 `.bin`）；
3. 推送后触发 [`verify-manifest`](./.github/workflows/verify-manifest.yml) 工作流：
   它逐项校验清单字段、`.exe` 与 `.bin` 的实际 SHA256、PE 头与版本一致性 —— 通道不一致会被 CI 拦下。

发布流程的完整说明（含 CDN 缓存刷新）见 [`docs/publishing.md`](./docs/publishing.md)。

---

## 🗺 路线图

- 备份归档支持导出到外部介质 / 网络位置（当前只落本机磁盘）；
- 诊断结论支持一键导出可分享的脱敏报告（现场 + 结论）；
- 界面截图与演示 GIF；
- 多 profile / 多 DSH 实例并存时的诊断隔离；
- 发布产物签名（同时提供 SHA256 与签名文件）。

---

## 🤝 贡献与反馈

- **发现 Bug / 诊断不准**：请提 [Issue](https://github.com/bbaz123/dsh-steward-releases/issues/new/choose)，
  模板会要求你附上 `版本 + 诊断会话目录 + findings.json 摘要`——有了现场，问题通常一轮就能定位。
- **本仓库是发布与反馈通道**：源码由作者维护，二进制与更新清单在此发布。
- 提交问题时请先跑一次 `DSH管家.exe --selftest`，它的输出能快速区分「环境问题」和「程序问题」。
- 详细诊断能力与常见故障的逐级处理方式：见 [`docs/diagnostics.md`](./docs/diagnostics.md) 与
  [`docs/troubleshooting.md`](./docs/troubleshooting.md)。

### 相关关键词

`DeepSeek Harness` · `DSH` · `本地部署` · `插件版本对齐` · `故障诊断` · `证据链` · `可回滚修复` ·
`环境体检` · `Windows 桌面工具` · `C#` · `WinForms` · `单文件 exe` · `自更新通道` · `jsDelivr`

---

## 📄 许可证

[Apache License 2.0](./LICENSE) © 2026 bbaz123

版本变更记录见 [`CHANGELOG.md`](./CHANGELOG.md)。当前版本 **1.3.0**。
