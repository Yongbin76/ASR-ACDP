# Prototype

This prototype is a lightweight management backend for ACDP based on Node built-in SQLite.

## Scope

- Clean raw Shanghai roads and government department data
- Generate seed terms for the dictionary platform
- Bootstrap a SQLite management store
- Persist term rules
- Persist pinyin profiles and manual polyphone overrides
- Persist review tasks and audit logs
- Build, publish, rollback, and canary runtime snapshots
- Expose local management, gray policy, pinyin governance, and simulation HTTP APIs
- Serve both the legacy `/admin` MVP page and the newer independent `/console` client

## Commands

Run from `/Codex/ACDP`:

```bash
npm run check:env
npm run prepare:data
npm run bootstrap:db
npm run setup:prototype
npm run import:validation-feeds
npm run build:snapshot -- --summary "manual build"
npm run demo:prototype
npm run smoke:console
npm run local:minio:start
npm run local:minio:status
npm run local:minio:stop
npm run check:control-config
npm run verify:runtime-control -- --artifact-store-mode=configured
npm run verify:runtime-control -- --artifact-store-mode=file
npm run test:console
npm run verify:host:console
npm run simulate -- --text "我想咨询旗顺路和市发改委，还有工商认定"
npm run service:start
npm run service:start:runtime
npm run service:start:admin
npm run service:status
npm run service:status:runtime
npm run service:status:admin
npm run service:stop
npm run service:stop:runtime
npm run service:stop:admin
npm run start:prototype
npm run start:runtime
npm run start:admin
npm run test:concurrency -- --users 5 --iterations 10
npm run test:unit
npm run test:prototype
```

Container / K8S:

```bash
docker build -t acdp-prototype:latest .
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

If you prefer to run from `/Codex`, use:

```bash
npm --prefix /Codex/ACDP run check:env
npm --prefix /Codex/ACDP run test:prototype
```

## Environment

- This prototype depends on the built-in `node:sqlite` module.
- Use Node.js `>= 22.13.0` on Ubuntu/Linux.
- `.nvmrc` is provided at the project root for shell alignment.
- Runtime API auth can be enabled with env var `ACDP_RUNTIME_TOKEN`.

## Config

Prototype runtime settings and project paths are centralized in:

- `prototype/config/app.config.json`
- `prototype/config/artifact_store.config.json`
- `prototype/config/validation_feed_connectors.config.json`

Code reads these settings through:

- `prototype/src/lib/config.js`

Artifact store secret injection stays config-driven:

- `artifact_store.config.json` remains the only config entry
- direct values are supported for local development
- `*Env` fields in the same file can point to environment variables for host/production injection

MinIO helper commands:

- `npm run local:minio:start`
- `npm run local:minio:status`
- `npm run local:minio:stop`
- `npm run check:control-config`
- `npm run check:validation-feeds`
- `npm run verify:validation-feeds`
- `npm run verify:runtime-control -- --artifact-store-mode=configured`
- `npm run verify:runtime-control -- --artifact-store-mode=file`

Reference:

- `docs/41-本地MinIO与制品仓凭据注入说明.md`
- `docs/2026-04-17-v1.0正式文档工作区/11-配置项与部署运行说明.md`

## Browser Entry

Open in Chrome:

- `http://127.0.0.1:8787/admin`
- `http://127.0.0.1:8787/console`
- `http://127.0.0.1:8787/test-client`
- `http://<server-ip>:8787/admin`
- `http://<server-ip>:8787/console`
- `http://<server-ip>:8787/test-client`

Entry-point isolation rule:

- `/admin` and `/console` are dual-track independent entries
- `/admin` keeps serving the MVP page from `prototype/public/test-client.html`
- `/console` serves its own client from `console/client`
- Missing or broken `/console` assets must not block `/admin` or `/api/admin/*`

## Runtime APIs

- `GET /health`
- `GET /api/runtime/current`
- `GET /api/runtime/stats`
- `POST /api/runtime/reload`
- `POST /api/runtime/correct`
- `POST /api/simulate`

## WebSocket Runtime API

- `GET /ws/runtime/correct`

WebSocket message input:

```json
{ "text": "原始ASR文本" }
```

WebSocket message output:

```json
{ "correctedText": "修正后的文本" }
```

## Admin APIs

- `GET /api/admin/me`
- `GET /api/admin/dashboard`

Term APIs:

- `GET /api/admin/terms`
- `GET /api/admin/terms/{termId}`
- `POST /api/admin/terms`
- `PUT /api/admin/terms/{termId}`
- `GET /api/admin/terms/{termId}/rules`
- `PUT /api/admin/terms/{termId}/rules`
- POST /api/admin/terms/{termId}/generate-pinyin-candidates
- `POST /api/admin/terms/{termId}/pinyin-candidates`
- `POST /api/admin/terms/{termId}/submit-review`
- `POST /api/admin/terms/{termId}/approve`
- `POST /api/admin/terms/{termId}/disable`

Pinyin Governance APIs:

- `GET /api/admin/pinyin-profiles`
- `GET /api/admin/pinyin-conflicts`
- `GET /api/admin/pinyin-conflicts/detail`
- `GET /api/admin/pinyin-comparisons`

Review APIs:

- `GET /api/admin/reviews`
- `POST /api/admin/reviews/{taskId}/approve`
- `POST /api/admin/reviews/{taskId}/reject`

Release APIs:

- `GET /api/admin/releases`
- `POST /api/admin/releases/build`
- `POST /api/admin/releases/{releaseId}/submit-review`
- `POST /api/admin/releases/{releaseId}/publish`
- `POST /api/admin/releases/{releaseId}/rollback`

Gray Policy APIs:

- `GET /api/admin/gray-policies`
- `POST /api/admin/gray-policies`
- `POST /api/admin/gray-policies/{policyId}/disable`

Validation Case APIs:

- `GET /api/admin/validation-cases`
- `GET /api/admin/validation-cases/feed-sources`
- `POST /api/admin/validation-cases`
- `POST /api/admin/validation-cases/import`
- `POST /api/admin/validation-cases/import-feeds`
- `POST /api/admin/validation-cases/{caseId}/disable`

Audit APIs:

- `GET /api/admin/audits`

## Console Entry

- `GET /console`

Console verification helpers:

- `npm run test:console`
- `npm run smoke:console`
- `npm run verify:host:console`

Split-process helpers:

- `npm run start:runtime`
- `npm run start:admin`
- `npm run service:start:runtime|status:runtime|stop:runtime`
- `npm run service:start:admin|status:admin|stop:admin`
- `npm run smoke:runtime`
- `npm run smoke:admin`

Split deployment assets:

- `Dockerfile.runtime`
- `Dockerfile.admin`
- `k8s/runtime-deployment.yaml`
- `k8s/runtime-service.yaml`
- `k8s/admin-deployment.yaml`
- `k8s/admin-service.yaml`
- `docs/37-runtime-admin服务运维手册.md`

Console implementation/docs entry points:

- `console/client/index.html`
- `prototype/src/cli/console-e2e.js`
- `prototype/src/cli/console-smoke.js`
- `docs/25-console宿主环境联调与smoke执行说明.md`
- `docs/2026-04-17-v1.0正式文档工作区/00-文档总索引.md`

## Current Rule Model

The prototype currently persists and executes these rule fields:

- `candidateOnly`
- `minTextLen`
- `maxTextLen`
- `boundaryPolicy`
- `leftContextAllow`
- `rightContextAllow`
- `leftContextBlock`
- `rightContextBlock`
- `regexAllow`
- `regexBlock`

## Current Pinyin Governance Model

The prototype currently persists and executes these pinyin-profile fields:

- `fullPinyinNoTone`
- `initials`
- `syllables`
- `runtimeMode`
- `polyphoneMode`
- `customFullPinyinNoTone`
- `alternativeReadings`
- `notes`

Runtime behavior:

- If a term has a custom pinyin profile, snapshot compilation uses the custom full pinyin first.
- Alternative readings are also compiled into the pinyin exact index.
- Browser-side governance supports loading and saving term-level pinyin profiles.
- Generated pinyin candidates can now be submitted into the persisted review queue.
- Approving a candidate review appends the reading into `alternativeReadings`.
- Pinyin comparison detail now includes character-level discrepancy slots.
- Release exposure now follows `build -> submit review -> reviewer approve -> canary/publish`.
- `publish` and `canary` require an approved release review, and reviewer/operator must be different people.
- High-risk releases now require two distinct reviewer approvals before `canary` or `publish`.
- `publish` and `canary` are also blocked when release terms are no longer publishable or when included terms still have pending pinyin-candidate reviews.
- Release gate now also includes automatic validation of snapshot loadability and smoke simulation cases on selected release terms.
- Release gate now supports repo-configured business validation cases from `prototype/config/release_validation_cases.json`.
- Validation cases are now persisted in SQLite and seeded from the repo config on first bootstrap.
- Release validation reads enabled DB cases first and falls back to the repo config only when the DB source is empty.
- Validation cases now support bulk feed import with `upsert` / `insert_only` modes.
- Validation feed connectors are available for `cg3`, `qa_feedback`, and `online_feedback`.
- Feed files are imported from the configured inbox directories and archived after import.
- Invalid or unsupported feed files are moved into the configured error directories instead of blocking the whole batch.
- Feed import now supports source-specific raw payloads:
- `cg3.records[]`
- `qa_feedback.feedbacks[]`
- `online_feedback.events[]`
- A connector can now also use `http_pull_json` instead of only `file_inbox`.
- Remote delivery receipts are stored under the configured `validationFeedReceiptDir`.
- Remote connector imports now support:
  - delivery dedupe by `deliveryId/batchId/cursor/requestId` or stable payload hash
  - cursor-based incremental pull via `cursorQueryKey` + `cursorResponseField`
  - optional `http_post` acknowledgement
  - replay from error payload envelopes
- Example payloads are provided in `prototype/config/validation_feed_examples.json`.

Validation feed directories:

- inbox root: `prototype/workspace/validation_feeds/inbox`
- archive root: `prototype/workspace/validation_feeds/archive`
- error root: `prototype/workspace/validation_feeds/error`

Current connector behavior:

- `POST /api/admin/validation-cases/import-feeds` scans all configured source inboxes
- `npm run import:validation-feeds` runs the same scan/import flow from CLI
- `POST /api/admin/validation-cases/import-feeds` now accepts:
  - `sourceTypes`
  - `replayErrors`
- `npm run import:validation-feeds` now accepts:
  - `--source-type cg3,qa_feedback`
  - `--replay-errors`
- `npm run check:validation-feeds` now supports:
  - `--source-type cg3`
  - `--require-remote-configured`
  - `--require-ack-configured`
- for `http_pull_json`, cursor only advances after import succeeds and ack succeeds, or when ack is disabled
- successful files are archived per source
- invalid files are isolated into per-source error directories
- one bad file does not block the rest of the batch
- `GET /api/admin/validation-cases/feed-sources` now exposes transport mode, receipt count, cursor config/current cursor, pending file names, and error file names per source

Prototype delivery helpers:

- `npm run setup:prototype` prepares seed data, bootstraps SQLite, and builds a fresh release in one step
- `npm run demo:prototype` prints a ready-to-show local demo summary without requiring the browser UI
- `npm run test:concurrency -- --users N --iterations M` runs a basic host-side concurrency/latency check against `/api/runtime/correct`
- `npm run test:concurrency -- --users N --iterations M --target-rps 200` adds an explicit throughput target and reports whether it was met
- `npm run service:start|status|stop` manages a background resident prototype service with PID/log files under `prototype/workspace/service`
- `npm run test:unit` runs the current unit-test suite for pure logic modules and local service helpers
- `GET /api/runtime/stats` exposes in-flight requests, total corrections, error count, active WS connections, and recent latency percentiles for pressure-test observation

Formal runtime correction API:

- `POST /api/runtime/correct`
- `GET /ws/runtime/correct`
- request body:
```json
{ "text": "原始ASR文本" }
```
- HTTP response body:
```json
{ "correctedText": "修正后的文本" }
```
- WebSocket response message:
```json
{ "correctedText": "修正后的文本" }
```
- Error response / message:
```json
{ "error": "错误码: 错误描述" }
```
- If `ACDP_RUNTIME_TOKEN` is configured, callers must send:
```http
Authorization: Bearer <token>
```
- WebSocket access uses the same `Authorization` header during upgrade.
- WebSocket governance is configurable through:
  - `websocketMaxConnections`
  - `websocketIdleTimeoutMs`
  - `websocketMaxMessageBytes`
  - `websocketCallerIdHeader`
  - `websocketCallerSecretHeader`
  - `websocketCallerIdQueryKey`
  - `websocketCallerSecretQueryKey`
  - `websocketCallerIpHeader`
  - `websocketRejectUnknownCallers`
  - `websocketDefaultMaxConnectionsPerCaller`
  - `websocketDefaultMaxRequestsPerMinute`
  - `websocketBlacklistIps`
  - `websocketCallers`
- Registered callers can authenticate with their own secret via:
  - `x-acdp-caller-secret`
  - `callerSecret` query parameter
  - `Authorization: Bearer <caller-secret>`
- caller identity can be supplied through:
  - `x-acdp-caller-id`
  - `callerId` query parameter
- runtime stats now expose a `websocketGovernance` snapshot for active caller counts and rejection counters
- the current server uses compact JSON responses and tuned keepalive/request timeouts to better support higher-concurrency validation

## Notes

- Use the browser page for Chinese HTTP testing. It avoids PowerShell request-body encoding issues.
- The prototype is intentionally minimal and uses file snapshots plus SQLite. It is not yet the final production deployment form.
- The prototype now binds to `0.0.0.0:8787` by default so it can be reached from the server's external IP.
- External access still requires the host firewall and cloud security group to allow TCP `8787`.
- This is still a prototype admin system; do not expose it broadly without additional access controls.
- `test:concurrency` requires a host environment that allows local port binding.
- `/admin` now includes a dashboard sheet for dictionary scale, hourly calls, hit counts, top terms, and peak concurrency summaries.
- The provided K8S manifests are single-replica MVP assets because the current prototype uses SQLite and local workspace state.
