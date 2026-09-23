# 发布流程（维护者用）

本仓库同时是**更新通道**：用户的 DSH 管家启动时读取 `manifest.json`，发现新版本后从 jsDelivr CDN
下载 `DSH管家.bin` 并校验 SHA256，通过才替换本地 exe。

因此发布一个版本，本质是让**三个文件互相自洽**，并让 CDN 尽快刷到新内容。

---

## 1. 仓库里三个文件的分工

| 文件 | 作用 | 谁在用它 |
| --- | --- | --- |
| `manifest.json` | 更新清单：`version` / `sha256` / `url` / `name` / `notes` | 程序检查更新 |
| `DSH管家.bin` | **内容就是 exe**，只换后缀（jsDelivr 不接受 `.exe`） | 程序自动下载 |
| `DSH管家.exe` | 给人手动下载的原文件 | 用户浏览器 |

清单样例：

```json
{
  "sha256": "007d9ed5...18a7f",
  "version": "1.2.1",
  "notes": "v1.2.1：故障诊断中心 + 现场采集 + BOM 自动修复（可回滚）+ 维护隔离",
  "name": "DSH管家",
  "url": "https://cdn.jsdelivr.net/gh/bbaz123/dsh-steward-releases@main/DSH管家.bin"
}
```

> `url` 指向 `.bin` 而不是 `.exe`：jsDelivr 对 `.exe` 后缀有限制，而对 `raw.githubusercontent.com`
> 的直链在国内经常超时，所以走 CDN + 换后缀。

---

## 2. 发布一个新版本

### 第 1 步：替换两个二进制

1. 构建出新的 `DSH管家.exe`（构建命令见 README「从源码构建」）；
2. 用新版覆盖仓库里的 `DSH管家.exe`；
3. 复制一份改名为 `DSH管家.bin`（内容完全一致，只是后缀不同）。

### 第 2 步：算出真实哈希

```powershell
$exe = (Get-FileHash .\DSH管家.exe -Algorithm SHA256).Hash
$bin = (Get-FileHash .\DSH管家.bin -Algorithm SHA256).Hash
"exe=$exe"; "bin=$bin"       # 两者必须相同
```

### 第 3 步：更新 `manifest.json`

- `version` → 新版本号（语义化版本，例如 `1.2.2`）
- `sha256` → 上一步算出的值（小写十六进制）
- `notes` → 一句话更新说明
- `url` → 不动（始终指向 `.bin`）

同时把 README 的版本徽章与 `CHANGELOG.md` 的对应条目一起改掉 ——
`verify-manifest` 工作流会检查这两处是否与 `manifest.json` 一致。

### 第 4 步：本地自检（推之前就能发现问题）

```powershell
# 更新通道自洽性：清单字段、两个二进制的 SHA256、PE 头、README/CHANGELOG 版本一致性
node .\.github\verify-manifest.mjs
```

### 第 5 步：提交并推送

```powershell
git add -A
git commit -m "release v1.2.2"
git push origin main
```

推送后会触发 `.github/workflows/verify-manifest.yml`：清单与二进制不一致会被 CI 直接拦下。

### 第 6 步：刷新 CDN 缓存（重要）

jsDelivr 对 `@main` 分支文件有缓存，**推送成功不等于用户立刻能拿到新版本**。强制刷新：

```powershell
$bin = [System.Uri]::EscapeDataString('DSH管家.bin')
Invoke-RestMethod "https://purge.jsdelivr.net/gh/bbaz123/dsh-steward-releases@main/manifest.json"
Invoke-RestMethod "https://purge.jsdelivr.net/gh/bbaz123/dsh-steward-releases@main/$bin"
```

刷新后用真实下载做端到端验证：

```powershell
$m = Invoke-RestMethod 'https://cdn.jsdelivr.net/gh/bbaz123/dsh-steward-releases@main/manifest.json'
"CDN 版本：$($m.version)"
Invoke-WebRequest $m.url -OutFile "$env:TEMP\dsh-steward.bin"
$h = (Get-FileHash "$env:TEMP\dsh-steward.bin" -Algorithm SHA256).Hash
"下载件哈希与清单一一致：$($h -eq $m.sha256.ToUpper())"
```

---

## 3. 当 `git push` 走不通时（网络受限环境的备选路径）

有些网络环境到 `github.com:443` 的 git 传输会被重置，而 `api.github.com` **仍然可用**。
此时可以用 GitHub Git Data API 完成同样的发布，判定标准不变：**远端拿到的提交应与本地提交完全一致**。

要点：

1. 先在本地正常 `git add` + `git commit`，得到本地提交与 tree；
2. 用 API 依次创建 blob（`POST /git/blobs`，base64 内容）→ tree（`POST /git/trees`）→
   commit（`POST /git/commits`）→ 移动引用（`PATCH /git/refs/heads/main`）；
3. **提交消息必须带结尾换行**：API 会原样保存消息，而 `git commit` 生成的对象消息以换行结尾；
   少了这个换行，得到的 commit SHA 会与本地不同（tree 相同、只是 hash 不同）；
4. 每一步都对比 API 返回的 SHA 与本地 `git rev-parse` / `git show -s --format=%T`，一致后再动引用；
5. 推送完成后再做一次内容级校验：按 blob SHA 取回 `manifest.json` 与二进制，重新计算 SHA256 是否等于清单声明值。

> 用 Git Credential Manager 里的令牌即可，无需把令牌写进任何文件。

---

## 4. 发布检查清单

- [ ] `DSH管家.exe` 与 `DSH管家.bin` 内容一致（哈希相同）
- [ ] `manifest.json` 的 `version` / `sha256` / `notes` 已更新，`url` 指向 `.bin`
- [ ] README 版本徽章与 `CHANGELOG.md` 已同步
- [ ] 本地跑 `node .\.github\verify-manifest.mjs` 通过
- [ ] 推送后 `verify-manifest` 工作流为绿色
- [ ] 已 purge jsDelivr 缓存，并用真实下载校验过一次 SHA256
- [ ] 打过 tag（可选但推荐：`v<版本号>`），便于对照发布记录
