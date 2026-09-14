# 单词抓抓乐 Implementation Plan

> **For agentic workers:** Execute task-by-task. User waived per-step confirmation; implement continuously. Do not commit unless user asks.

**Goal:** 可部署的小学英语 PWA：三返昼夜 + 800 词库 + SRS + 轻量跟读 + 家长模式。

**Architecture:** Next.js App Router 单体全栈，Prisma + PostgreSQL，Docker Compose 暴露 3000 端口。

**Tech Stack:** Next.js 15、TypeScript、Prisma、PostgreSQL、NextAuth Credentials、Tailwind CSS、Web Speech API、MediaRecorder。

**Spec:** `docs/superpowers/specs/2026-09-11-word-catch-design.md`

## Global Constraints

- 产品名「单词抓抓乐」；文案用「抓词」不用「背单词」
- 视觉：天蓝+草绿+暖黄；字体 Fredoka；禁止紫靛默认风
- 每日默认新词 20；SRS 间隔 0,1,2,4,7,14,30 天
- 跟读仅自判 + 可选录音家长评；不做自动 ASR 打分
- 用户未要求则不 git commit

---

## File Structure

```text
app/
  layout.tsx, page.tsx, globals.css
  (auth)/login/page.tsx, register/page.tsx
  (app)/today/page.tsx, library/page.tsx, wrong/page.tsx, me/page.tsx
  (app)/session/[phase]/page.tsx
  (app)/parent/page.tsx
  api/auth/[...nextauth]/route.ts
  api/register/route.ts
  api/today/route.ts
  api/session/answer/route.ts
  api/session/complete/route.ts
  api/wrong-words/route.ts
  api/parent/route.ts
  api/profiles/route.ts
components/  # UI: TaskCard, WordCard, ThinkTimer, BottomNav, StarBurst
lib/
  prisma.ts, auth.ts, srs.ts, today.ts, session-engine.ts
prisma/schema.prisma, seed.ts
data/words-seed.json
Dockerfile, docker-compose.yml, README.md
```

---

### Task 1: Scaffold Next.js + Docker + Prisma schema

**Files:**
- Create: project root via `create-next-app`, `prisma/schema.prisma`, `docker-compose.yml`, `Dockerfile`, `.env.example`

- [ ] **Step 1:** `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm --turbopack`（若目录非空则用临时目录再移入）
- [ ] **Step 2:** 安装 `prisma @prisma/client next-auth@4 bcryptjs zod` 与 types
- [ ] **Step 3:** 写 Prisma schema（User, ChildProfile, Theme, Word, WordProgress, StudySession, Recording）
- [ ] **Step 4:** docker-compose：`db` (postgres:16) + `web`；`.env` 含 `DATABASE_URL`、`NEXTAUTH_SECRET`、`NEXTAUTH_URL`
- [ ] **Step 5:** `npx prisma migrate dev --name init`（本地或 compose 内）验证迁移成功

---

### Task 2: Seed 词库与句型

**Files:**
- Create: `data/words-seed.json`, `prisma/seed.ts`

- [ ] **Step 1:** 从资料提炼主题 JSON（人物、数字、时间、学校、家庭、身体、食物、动物、自然、颜色、衣服、交通、运动、动词、形容词、地点、位置、疑问、连接、助动、日常、购物、节日、情感、短语）+ 默认 `sentenceTemplate`
- [ ] **Step 2:** seed 脚本写入 Theme/Word；去重 English 小写
- [ ] **Step 3:** `npx prisma db seed` 验证词数 > 500

---

### Task 3: Auth + 孩子档案

**Files:**
- Create: `lib/auth.ts`, `lib/prisma.ts`, `app/api/register/route.ts`, `app/api/auth/[...nextauth]/route.ts`, login/register pages, `app/api/profiles/route.ts`

- [ ] **Step 1:** Credentials Provider；注册创建 User + 默认 ChildProfile
- [ ] **Step 2:** 登录后进 `/today`；未登录重定向 `/login`
- [ ] **Step 3:** 手动测：注册 → 登录 → 看到今日页壳

---

### Task 4: SRS + 今日任务引擎

**Files:**
- Create: `lib/srs.ts`, `lib/today.ts`, `app/api/today/route.ts`, `app/api/session/answer/route.ts`, `app/api/session/complete/route.ts`
- Test: `lib/srs.test.ts`（可用 node:test 或 vitest）

**Interfaces:**
- `nextReviewDate(step: number, from: Date): Date`
- `applyAnswer(progress, correct: boolean): WordProgressUpdate`
- `buildTodayPlan(childId: string, date: Date): TodayPlan`

- [ ] **Step 1:** 实现 SRS 步进与答错回退；单测覆盖答对推进、答错回退
- [ ] **Step 2:** `buildTodayPlan`：到期复习词 + 新词配额；三关词表
- [ ] **Step 3:** API 接通；完关写 StudySession

---

### Task 5: 三关会话 UI

**Files:**
- Create: `app/(app)/today/page.tsx`, `app/(app)/session/[phase]/page.tsx`, components

- [ ] **Step 1:** 今日三张任务卡（晨/午/晚）状态
- [ ] **Step 2:** morning：展示五信息 + TTS + 「抓住了」
- [ ] **Step 3:** afternoon：中→英选择/输入 + 3 秒 ThinkTimer
- [ ] **Step 4:** evening：英→中 + 句型填空 + 跟读自判（可选录音）
- [ ] **Step 5:** 响应式底栏导航

---

### Task 6: 词库 / 错词 / 家长模式

**Files:**
- Create: library, wrong, me, parent pages + APIs

- [ ] **Step 1:** 词库按主题网格，掌握度着色
- [ ] **Step 2:** 错词列表「再抓一次」进入短会话
- [ ] **Step 3:** PIN 设置/验证；调 dailyNewWords；看薄弱统计

---

### Task 7: PWA + 部署打磨

**Files:**
- Create: `public/manifest.webmanifest`, icons, `README.md`

- [ ] **Step 1:** manifest + theme-color；可「添加到主屏幕」
- [ ] **Step 2:** Docker 构建可运行；README 写清 `docker compose up --build` 与 IP 访问
- [ ] **Step 3:** 端到端走通注册→三关→错词→家长调配额

---

## Execution

User requested continuous implementation without confirmations. Execute Tasks 1→7 inline in this session; skip git commits unless asked.
