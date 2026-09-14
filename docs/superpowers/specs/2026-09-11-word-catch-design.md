# 单词抓抓乐 — 产品设计规格

**日期：** 2026-09-11  
**形态：** 可部署 PWA（域名 / IP 访问）  
**架构：** Next.js 单体全栈 + SQLite（Docker Compose / 本地文件）

---

## 1. 目标与约束

**目标：** 小学生用手机/平板，轻松高效掌握约 800 核心词；把《英语盗机学习法》做成可每天执行的操作系统。

**用户：** 孩子自学为主；可选家长模式介入。

**硬约束：**
- 一源：唯一核心词库（来自 `docs/stud_materials.md`）+ 一套复习系统
- 三返昼夜：早建立 / 午提取 / 晚句型
- 错词优先、间隔打捞（0 / 当天晚 / 2 / 4 / 7 / 14 / 30 天）
- 主题成群 + 一句型带多词
- 轻量跟读：播标准音 → 跟读 → 自判「我会了」；家长可听录音点过/再练
- 账号云同步，自托管部署

**非目标（V1 不做）：** 语音自动评分、学校教材对齐、社交排行榜、付费订阅、多语言界面。

---

## 2. 产品信息架构

**产品名：** 单词抓抓乐

**底部导航（4 Tab）：**
| Tab | 职责 |
|-----|------|
| 今日 | 三返任务入口、今日星星进度 |
| 词库 | 按主题浏览，掌握度可视化 |
| 错词 | 薄弱词再抓 |
| 我的 | 进度、家长模式、账号、每日新词数 |

**每日主线：**
1. **早晨 · 建立**（~10 分）：新词 听→看→说→意/图→进句型
2. **下午 · 打捞**（~5 分）：中文→英文主动提取，含 3 秒思考窗；不会则闪看后立刻再测
3. **晚上 · 句型**（~10 分）：英→中 + 套主题句型 + 轻量跟读；错词优先

新词关开始前插入到期复习（打捞），非重新讲解。

---

## 3. 学习规则

### 3.1 单词五信息
音（TTS）、意、图（emoji/插画映射）、搭配、句子。

### 3.2 每日新词
默认 20，家长可调 10～20。按主题队列推进；不足一主题则拼下一主题。

### 3.3 间隔重复（SRS）
状态：`new` → `learning` → `reviewing` → `mastered`。

复习间隔（天）：答对推进 `[0, 1, 2, 4, 7, 14, 30]`；答错回到更早档并进入错词本。

「打捞」= 主动回忆测试，不是重新看卡片。

### 3.4 句型模板
主题绑定默认句型，例如食物：`I like _____.` / `Do you like _____?`。晚上关用当日词填空输出。

### 3.5 轻量跟读
浏览器 Web Speech API 播读；MediaRecorder 可选录音存服务端（短音频）；孩子点「我会了/再练」；家长模式可评。

### 3.6 家长模式
「我的」里用 4 位 PIN 解锁：看正确率/薄弱主题、评录音、调每日新词数。

---

## 4. 界面与互动

**设备：** 手机竖屏优先，平板自适应大触控区。

**视觉方向：**
- 明亮天空/草地感（天蓝 + 草绿 + 暖黄高亮），避免紫靛渐变、奶白衬赤陶、报纸风
- 字体：Fredoka / Nunito（Google Fonts），大字号、高对比
- 大圆角按钮、明确反馈动画（抓到词弹星、答错轻抖）
- 文案游戏化：「今天来抓 20 个词」，禁止「背单词」话术

**关键交互：**
- 3 秒思考倒计时环（下午打捞）
- 任务卡三色时段（晨/午/晚）
- 完成一关发星星；错词进「错词岛」

---

## 5. 技术架构

```text
Browser (PWA)
    ↓
Next.js App Router (UI + API Routes)
    ↓
Prisma ORM
    ↓
SQLite
```

**栈：** TypeScript、Next.js、Prisma、SQLite、NextAuth（Credentials）、Tailwind、Docker Compose。

**部署：** `docker compose up`；访问 `http://IP:3000` 或反代域名。库文件挂在 volume。

**账号：** 用户名 + 密码；一个账号可建多个孩子档案（ChildProfile），进度按档案隔离。

---

## 6. 数据模型（核心）

- `User`：账号、家长 PIN 哈希
- `ChildProfile`：昵称、每日新词数、当前主题进度
- `Word`：en、zh、phonetic、emoji、themeId、collocation、example、level(1|2|3)
- `Theme`：name、slug、sentenceTemplate、order
- `SentencePattern`：template、zh、order
- `WordProgress`：childId、wordId、status、srsStep、nextReviewAt、wrongCount、correctStreak
- `StudySession`：childId、date、phase(morning|afternoon|evening)、wordIds、score、completedAt
- `Recording`：可选，跟读音频元数据 + 家长评分

---

## 7. API 轮廓

- `POST /api/auth/*` — 注册/登录
- `GET/POST /api/profiles` — 孩子档案
- `GET /api/today` — 今日三关状态与词表
- `POST /api/session/start` — 开始某关
- `POST /api/session/answer` — 提交对错，更新 SRS
- `POST /api/session/complete` — 完关
- `GET /api/words?theme=` — 词库
- `GET /api/wrong-words` — 错词
- `POST /api/parent/verify-pin` — 家长解锁
- `PATCH /api/parent/settings` — 调新词数等

---

## 8. 词库导入

从结构化 seed（由 `stud_materials.md` 提炼）导入主题词；去重；Level 1/2/3 按资料三级体系标注。短语与 50 句型作为附属 seed，V1 句型练习优先用主题模板 + 50 核心句型浏览。

---

## 9. 成功标准

1. 新用户注册后可选档案，立即能走完早/午/晚一闭环  
2. 换设备登录进度仍在  
3. Docker 一键起服，局域网 IP 可打开  
4. 触控友好，小学生无需阅读说明书即可完成一关  
5. 错词与到期复习会自动进入后续关卡  

---

## 10. 决策记录

| 决策 | 选择 |
|------|------|
| 使用角色 | 孩子为主，家长可选 |
| 客户端 | PWA 网页 |
| 范围 | 进阶：整库 + 句型 + 轻量跟读 |
| 跟读 | 自判 + 可选家长评录音 |
| 同步 | 账号 + SQLite |
| 架构 | Next.js 单体 + Docker |
