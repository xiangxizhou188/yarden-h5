# Yarden H5

面向微信分享的 Yarden 异常详情与处理页面，部署到 Cloudflare Workers。

## 当前能力

- `/issues/:id`：登录后直接查看现有异常。
- `/s/:shareToken`：服务端注入分享 Meta，登录后解析并查看异常。
- HttpOnly Cookie 会话，浏览器不接触后端访问令牌。
- 查看异常、确认处理、填写并提交处理结果。
- Web Share API；不支持时复制链接。

## 本地运行

```bash
npm install
npm run cf-typegen
npm run dev
```

在 `wrangler.jsonc` 中设置本地 `FACILITY_NAME`。访问令牌只存入安全的 HttpOnly Cookie，不会写入前端存储。

## 后端分享接口契约

现有 `/auth/*` 和 `/issues/*` 接口直接复用。富卡片分享需要后端新增：

### 创建分享

`POST /issues/:id/share`（需要 Bearer 登录）

```json
{ "success": true, "data": { "token": "7Fs92KqX", "url": "https://h5.yarden.com/s/7Fs92KqX" } }
```

### 匿名分享摘要

`GET /issue-shares/:token/preview`（无需登录）

```json
{
  "success": true,
  "data": {
    "title": "【高优先级异常】开花房温度持续偏高",
    "description": "开花房 A101 · 待处理 · 08/31 14:30 上报",
    "imageUrl": "https://h5.yarden.com/share-cover.svg"
  }
}
```

只能返回脱敏摘要，不返回完整描述、人员或处理记录。

### 登录后解析分享

`GET /issue-shares/:token`（需要 Bearer 登录）

返回与 `GET /issues/:id` 相同的 `IssueRecord`，并重新校验设施与查看权限。

## 部署

先将 `FACILITY_NAME` 和域名改为真实值，再执行：

```bash
npm run deploy:staging
npm run deploy:production
```

生产环境应绑定 `h5.yarden.com`，测试环境绑定 `h5-test.yarden.com`。不要提交 `.dev.vars`。
