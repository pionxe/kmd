# KMD Community API 第三阶段规划

> 项目阶段：Android 课程项目第三阶段支撑后端
> 文档状态：草案
> 最近更新：2026-05-13

## 1. 目标

`kmd-community-api` 是一个很小的 KMD 社区 API mock 后端，用于支撑 KMD Reader Android 第三阶段的网络层、Repository 和 Room 缓存实现。

当前目标不是搭建完整社区，而是提供一组真实形状的接口，让 Android 端可以完成：

- Retrofit `@GET` / `@POST` API 定义。
- Room 本地缓存。
- Repository 先读数据库、再请求网络、再更新数据库。
- 与 KMD 业务一致的 DTO 和数据转换测试。

## 2. 技术栈选择

推荐技术栈：

| 类别 | 选择 | 理由 |
|------|------|------|
| Runtime | Node.js | 与 KMD Web/Editor 的 TypeScript 生态一致 |
| Language | TypeScript | 类型约束清晰，便于未来和前端/接口模型共享 |
| HTTP | Express | 轻量、直观，适合小型 API |
| Validation | Zod | 请求体校验和 DTO 类型推断方便 |
| Storage | 本地 JSON / 内存 store | 第三阶段不需要真实数据库 |
| Dev runner | tsx | 直接运行 TypeScript |
| Test | Vitest | 与 TS 生态一致，轻量 |

暂不选择：

- Ktor：技术上适合，但会让后端进入 Kotlin/Gradle 生态，当前与 KMD Web 方向不如 TS 顺滑。
- Spring Boot：可靠但过重。
- FastAPI：开发快，但会引入 Python 第三套生态。

## 3. 仓库命名与职责

推荐仓库名：

```text
kmd-community-api
```

当前孵化位置：

```text
apps/community-api
```

在课程第三阶段与接口契约稳定前，API 先作为 KMD 主仓库的 workspace app 维护；后续需要独立部署或开源协作时，再拆出为 `kmd-community-api` 独立仓库。

职责：

- 提供 KMD 作品列表、作品详情、脚本问题和审阅提交接口。
- 使用本地 seed 数据模拟社区。
- 保持接口稳定，方便 Android 端 Retrofit 对接。

非职责：

- 不实现真实登录。
- 不实现真实权限系统。
- 不保存真实用户数据。
- 不托管 KMD Reader Runtime。
- 不实现社区 Web 前端。

## 4. 推荐目录结构

```text
kmd-community-api/
  src/
    index.ts
    app.ts
    routes/
      works.ts
      reviews.ts
    data/
      seed.ts
      store.ts
    domain/
      types.ts
    dto/
      workDto.ts
      reviewDto.ts
  docs/
    api.md
  package.json
  tsconfig.json
  README.md
```

## 5. 最小 API

### 5.1 Health Check

```http
GET /health
```

响应：

```json
{
  "status": "ok",
  "service": "kmd-community-api"
}
```

### 5.2 获取作品列表

```http
GET /works
```

可选 query：

```text
mode=scroll|paged|stage|interactive
status=published|submitted|draft
q=keyword
```

响应：

```json
[
  {
    "id": "rain-city",
    "title": "雨城慢镜",
    "authorName": "Mira",
    "description": "一段在雨夜街灯下展开的动态诗。",
    "tags": ["诗", "雨夜", "竖屏"],
    "presentationMode": "scroll",
    "orientationHint": "portrait",
    "aspectRatio": "9:16",
    "lifecycleStatus": "published",
    "estimatedDurationSec": 210
  }
]
```

### 5.3 获取作品详情

```http
GET /works/:id
```

响应包含：

- 作品基础信息。
- 作品呈现形态。
- 属性统计。
- 评论摘要。

### 5.4 获取脚本检查问题

```http
GET /works/:id/issues
```

响应：

```json
[
  {
    "id": "issue-1",
    "workId": "glass-rail",
    "severity": "warning",
    "source": "performance",
    "location": "scene: bridge",
    "message": "同一段落内存在多个高强度舞台移动。",
    "suggestion": "建议压缩预览片段，或降低移动端默认动效。"
  }
]
```

### 5.5 提交审阅意见

```http
POST /reviews
```

请求：

```json
{
  "workId": "glass-rail",
  "reviewerName": "demo-reviewer",
  "decision": "needs_changes",
  "note": "移动端预览有轻微卡顿，建议降低动效强度。"
}
```

响应：

```json
{
  "id": "review-001",
  "workId": "glass-rail",
  "decision": "needs_changes",
  "accepted": true
}
```

## 6. Android 对接约定

Android 模拟器访问本机 API：

```text
http://10.0.2.2:3000/
```

真实设备调试时使用局域网 IP：

```text
http://<host-lan-ip>:3000/
```

Android 第三阶段只依赖这些接口，不依赖后端数据库或登录系统。

## 7. 数据策略

第三阶段使用本地 seed 数据：

```text
seed works
seed issues
in-memory reviews
```

重启服务后 review 数据可以丢失。Android 端的 Room 缓存才是课程阶段重点。

## 8. 开发命令建议

```bash
pnpm install
pnpm dev
pnpm test
```

推荐脚本：

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run"
  }
}
```

## 9. 阶段验收

完成第三阶段支撑即可：

- 能启动本地 API。
- Android Retrofit 能请求 `GET /works`。
- Android Retrofit 能请求 `GET /works/:id/issues`。
- Android Retrofit 能提交 `POST /reviews`。
- API 返回结构与 Android DTO 一致。

## 10. 后续演进

```text
第三阶段：TypeScript + Express + JSON seed
第四阶段：补 OpenAPI 文档和错误码
第五阶段：接 PostgreSQL / Prisma
未来：扩展为 kmd-community-web 或社区后台
```
