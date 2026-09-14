# 单词抓抓乐

小学生英语学习 PWA：三返昼夜（早建立 / 午打捞 / 晚句型）+ 间隔复习 + 错词优先。

## 快速启动（Docker）

在项目根目录：

```bash
export NEXTAUTH_URL=http://你的IP或域名:3000
export NEXTAUTH_SECRET=请换成随机长字符串
docker compose up --build -d
```

浏览器打开：`http://你的IP:3000`

注册账号后即可使用。默认家长 PIN：`1234`。

数据文件保存在 Docker volume `sqlite_data`（容器内 `/app/sqlite/wordcatch.db`）。

## 本地开发

```bash
cd web
cp .env.example .env   # 按需修改
npm install --legacy-peer-deps
npx prisma migrate dev
npm run db:seed
npm run dev
```

打开 http://localhost:3000

SQLite 文件默认在 `web/sqlite/wordcatch.db`（已 gitignore）。

## 功能

- 今日三关任务（晨/午/晚）
- 主题词库地图 + 掌握进度
- 错词岛
- 家长模式（调每日新词数 10–20）
- 账号本地持久化（SQLite）
- 内置约 400+ 核心词（按主题成群，可继续往 800 扩展）

设计说明见 `docs/superpowers/specs/2026-09-11-word-catch-design.md`。

开发服务默认：`http://localhost:3000`（本机已可直接打开试用）。
