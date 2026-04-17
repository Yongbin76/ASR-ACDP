# ACDP Session Handoff

## Date

- 2026-03-27
- 2026-03-30 Ubuntu migration note added
- 2026-04-01 console/doc sync note added
- 2026-04-01 console finish/local-green note added
- 2026-04-01 runtime-admin split deployment note added
- 2026-04-01 JOB-002B artifact-store foundation note added
- 2026-04-01 JOB-002C runtime-node registry note added
- 2026-04-01 JOB-002D runtime-control note added
- 2026-04-01 JOB-002E local-artifact switch note added
- 2026-04-01 JOB-002E rollback/state-machine note added
- 2026-04-01 JOB-002F local-stats upload note added
- 2026-04-01 JOB-002G console runtime-nodes note added
- 2026-04-01 JOB-002H rbac-four-layer note added
- 2026-04-02 runtime-control verification note added
- 2026-04-02 runtime-node auto-refresh note added
- 2026-04-02 remote-minio-sync note added
- 2026-04-02 local-minio configured-pass note added
- 2026-04-02 artifact env-injection note added
- 2026-04-02 k8s secret-template note added
- 2026-04-02 control-config-check note added
- 2026-04-02 console-closure roadmap note added
- 2026-04-02 console-workbench batch note added
- 2026-04-02 console-rollout batch note added
- 2026-04-02 console-release-confirmation batch note added
- 2026-04-02 console-query-optimization note added
- 2026-04-02 job-002b local-baseline note added
- 2026-04-02 job-002b env-host-evidence note added
- 2026-04-02 k8s-target-preflight note added
- 2026-04-02 demo-runtime-ui-fix note added
- 2026-04-02 unified-console-scroll note added
- 2026-04-02 console-issue-matrix note added
- 2026-04-02 console-standardization batch note added
- 2026-04-02 console-summary-copy batch note added
- 2026-04-02 console-query-tightening batch note added
- 2026-04-02 console-layout-priority-main note added
- 2026-04-02 release-validation-cache note added
- 2026-04-03 release-gate-batch-aggregation note added
- 2026-04-03 release-detail-approval-evidence-cache note added
- 2026-04-03 review-target-summary-batch note added
- 2026-04-03 admin-release-scan-and-screenshot-path note added
- 2026-04-03 console-error-copy-normalization note added
- 2026-04-03 release-confirmation-guidance-callout note added
- 2026-04-03 overview-runtime-finishing note added
- 2026-04-03 release-validation-case-cap-removal note added
- 2026-04-03 console-help-source-and-runtime-detail-folding note added
- 2026-04-03 release-confirmation-rollout-guidance-summary note added
- 2026-04-03 release-detail-business-first-copy note added
- 2026-04-03 workbench-blocked-release-selective-validation note added
- 2026-04-03 workbench-offline-runtime-light-read note added
- 2026-04-03 workbench-import-light-read note added
- 2026-04-03 workbench-review-validation-light-read note added
- 2026-04-03 runtime-rollout-attention-light-read note added
- 2026-04-03 console-release-gate-validation-unification note added
- 2026-04-03 job-001d-closure note added
- 2026-04-03 host-console-inject-evidence note added
- 2026-04-04 job-002-closure-by-authorization note added
- 2026-04-04 visual-maintenance-plan-guardrail note added
- 2026-04-04 visual-maintenance-round1-implementation note added
- 2026-04-04 terms-list-horizontal-scroll note added
- 2026-04-04 terms-layout-breakpoint-tightening note added
- 2026-04-04 terms-create-panel-top-layout note added
- 2026-04-04 release-review-approval-guard note added
- 2026-04-04 job-012-closure note added
- 2026-04-04 job-008-doc-sync-guard note added
- 2026-04-04 job-011-ws-governance note added
- 2026-04-04 job-010-state-management-roadmap note added
- 2026-04-04 job-007-connector-contract note added
- 2026-04-04 job-007-connector-preflight note added
- 2026-04-04 job-007-mock-verification note added
- 2026-04-04 job-013-console-b01-assessment note added
- 2026-04-04 job-013-console-b01-implementation note added
- 2026-04-04 job-014-console-b02-assessment note added
- 2026-04-04 job-014-console-b02-implementation note added
- 2026-04-04 job-015-console-b03-implementation note added
- 2026-04-04 job-016-console-b04-implementation note added
- 2026-04-04 job-017-console-b05-activation note added
- 2026-04-04 job-017-console-b05-implementation note added

## Current Status

Today the ACDP prototype remains a usable management backend MVP, and the confirmed control-plane/data-plane implementation has already landed `JOB-002B` through `JOB-002H`. Real control-managed verification has now passed in local/file mode, local/configured mode, and another host-level `configured` mode under explicit `*Env` injection, with a docker-backed local MinIO instance driven by `artifact_store.config.json`. The productionization pass around `JOB-002B` is now effectively closed at the host level: `check:control-config -- --require-env-sources` passes and a second env-injected configured report has been collected. The next architecture blocker has moved to real target-cluster access (`kubectl current-context` is still unset). In parallel, the `/console` closure roadmap has now fully completed `JOB-001A` through `JOB-001D`: overview/workbench, release-to-runtime rollout closure, release confirmation / exception closure, and the final query/perf/interaction finishing batch. The console release detail page now works as a first confirmation page instead of only a build/review page, and the remaining release-side read paths have been unified so release detail plus `/api/console/releases/{id}/gate|validation` all reuse the same console-formatted gate/validation presentation rules instead of leaving side-route endpoints on raw blocker codes or raw validation payloads. `JOB-002` is now also closed: the latest `/console` host report succeeds in `inject://prototype` mode inside this sandbox, the report notes/checklist are filled, the manual coordination template has been synced, and the screenshot gap has been formally accepted as a current close-out exception rather than a blocking defect.

The current `/console` maintenance batch under `JOB-012` is now closed. Using the real screenshot under `/test/ACDP/词条中心（界面交叉，数据列表没有按规则统一）_2026-04-02_210326_578.png` as the concrete reference, the terms page has been fully shifted to a vertical “create first, list below” workflow; the create-term form is now a dedicated three-column grid that collapses on narrow screens, and the term-list wide-table keeps only the horizontal-scroll hint plus sticky leading columns. In the same close-out pass, the release-review front-end guardrails were tightened: `/console/reviews` and `/console/reviews/:taskId` now distinguish submitter-vs-reviewer conflicts from duplicate-reviewer conflicts in dual approval, and release detail now shows approved reviewers plus remaining approval count. `docs/34-console收尾待办清单.md` has been cleared to no active carry-over item.

`JOB-008` has also been closed for the current round. The current import-template registry, template/example assets, validation feed example payloads, and the main reference docs have been re-audited together, and a new unit check now guards this sync through `prototype/tests/unit/template-assets-docs.test.js`. Future `/console` regressions or feed/template drift should reopen as new maintenance batches instead of reusing the just-closed rounds.

`JOB-011` is now also closed for the current first-slice scope. Runtime WebSocket governance no longer stops at a shared Bearer Token plus coarse global limits: `prototype/src/lib/runtime-ws-governance.js` now provides config-driven caller identity, registered caller secret auth, caller/IP blacklist, per-caller connection quota, per-caller message-rate quota, and an observable `websocketGovernance` snapshot under `GET /api/runtime/stats`. The corresponding design/config docs are now captured in `docs/43-WebSocket caller identity 与 quota 治理首轮方案.md` and `docs/2026-04-02/02-配置参数说明.md`. The remaining gap for this line is no longer “first governance slice missing”, but only the future multi-instance/shared-state follow-up if runtime WebSocket ever becomes a formal production ingress.

`JOB-010` is now closed as well. The repository now has an executable post-SQLite state-management roadmap in `docs/44-SQLite之后状态管理升级路线.md`: control-plane authoritative state should move to PostgreSQL, release / verification / feed object files should stay in MinIO or object storage, and runtime-local deployment state plus stats buffering should remain node-local. This means the project no longer lacks an upgrade direction for non-single-replica SQLite; the remaining work is implementation timing, not architecture ambiguity.

`JOB-007` has now moved into `in_progress`. The repository no longer stops at file-inbox-only validation feeds: `prototype/config/validation_feed_connectors.config.json` plus the refactored `prototype/src/lib/validation-feed-importer.js` now provide a config-driven connector contract with `file_inbox`, first-slice `http_pull_json`, delivery receipts, cursor-based incremental pull, optional `http_post` ack, and replay envelopes from the error directory. A dedicated preflight command, `npm run check:validation-feeds`, now checks source transport/auth/ack/cursor readiness before real cutover, and `npm run verify:validation-feeds` now produces a local mock `cg3` verification report that exercises pull -> ack success -> ack failure -> replay recovery -> cursor advance. The first preferred real source has been fixed to `cg3`. The remaining blocker for this line is no longer local verification coverage, but only real endpoint/auth/ack verification under external network conditions.

The required regression set has been rerun after these close-out changes and is green again: `npm run smoke:console`, `npm run test:console`, and `npm run test:unit` all pass, with the latest unit result at `23/23` test files passed.

At this point, there is no remaining unfinished mainline that can be fully closed inside the current local sandbox. `JOB-007` and `JOB-009` are now both treated as externally blocked: `JOB-007` only lacks real `cg3` endpoint/auth/ack verification and evidence capture, while `JOB-009` only lacks real host-side concurrency / throughput data. Further meaningful progress on either job now requires external conditions rather than more local feature work.

The consolidated external prerequisites are now written down in `docs/46-JOB-007与JOB-009外部条件清单.md`. Use that file as the single source of truth before resuming either job.

Separately, the independent Console batch `JOB-013`, mapped to `ACDP-CONSOLE-20260404-B01`, is now implemented and closed. The main-repo work stayed inside the Console front-end layer (`console/client/app.js` + `console/client/app.css`) and did not change business workflow, API contract, or backend data model. The completed task-card scope is: `T01` overview first-screen hierarchy reset, `T02` terms-center listing normalization, `T03` review-center task-card cleanup, `T04` runtime-nodes risk-first presentation, `T05` import-center template/batch separation, and `T06` release-center stage/risk visibility improvement. This batch must not be mixed back into the already closed `JOB-001D` / `JOB-012`; any future Console IA/structure round should reopen as a fresh batch.

Another independent Console batch, `JOB-014`, mapped to `ACDP-CONSOLE-20260404-B02`, is now implemented and closed. This batch also stayed fully inside the Console front-end layer (`console/client/app.js` + `console/client/app.css`) and did not change business workflow, API contract, or backend data model. The completed B02 task-card scope is: `T01` validation-center list/action zoning, `T02` validation-detail scanability/action placement, `T03` term-detail zoning and action grouping, `T04` runtime-node-detail diagnostic hierarchy refinement, `T05` release-detail stage/risk zoning refinement, and `T06` import-template-detail structure standardization. The focus pages were `/console/validation-cases`, `/console/validation-cases/:id`, `/console/terms/:id`, `/console/runtime-nodes/:id`, `/console/releases/:id`, and `/console/import/templates/:id`. This batch must not be mixed back into the already closed `JOB-013`; any future Console second-level-page/detail consistency round should reopen as a fresh batch.

Another independent Console batch, `JOB-015`, mapped to `ACDP-CONSOLE-20260404-B03`, is now implemented and closed. This batch again stayed fully inside the Console front-end layer (`console/client/app.js` + `console/client/app.css`) and did not change business workflow, API contract, or backend data model. The completed B03 task-card scope is: `T01` help-center shell/support-entry alignment, `T02` long-form help readability and document-action consistency, `T03` shared filter/bulk-action pattern convergence, `T04` shared state badge/status-panel normalization, `T05` breadcrumb/pagination/secondary-navigation consistency, and `T06` cross-page detail metadata and side-panel normalization. The focus was not another page-by-page redesign, but a pattern-convergence pass so the Console reads as one system across help pages, list pages, and accepted B02 detail pages. This batch must not be mixed back into the already closed `JOB-013` / `JOB-014`; any future Console convergence round should reopen as a fresh batch.

`JOB-016`, mapped to `ACDP-CONSOLE-20260404-B04`, is now fully accepted and closed. The batch stayed fully inside the Console front-end layer (`console/client/app.js` + `console/client/app.css`) and still did not change business workflow, API contract, or backend data model. The black-box review originally returned the batch as `partially accepted` because `T05` left `5` high-priority review-detail pages tagged `too-few-buttons`; the focused follow-up patch then only targeted `ACDP-CONSOLE-20260404-B04-T05`, strengthening low-risk navigation actions into clearer real button-style actions while keeping decision context / target content / risk action zones separated. That `T05` follow-up has now passed review, so `JOB-016` can return to a closed state.

`JOB-017`, mapped to `ACDP-CONSOLE-20260404-B05`, is now the active Console batch. Unlike `B04`, this is not a corrective cleanup round: the accepted `B04` baseline already has `0` blocking pages and `0` high-priority issue pages. `B05` is a proactive visual-system upgrade batch intended to lift the Console shell, differentiate overview/workspace/support/detail page families more clearly, enrich backgrounds/tonal layering/accent usage, and polish typography/surfaces/metadata panels without reopening B04 structural closure work. The batch must stay system-level and reusable, not devolve into page-by-page one-off patches.

`JOB-017`, mapped to `ACDP-CONSOLE-20260404-B05`, is now implemented and closed. This batch again stayed fully inside the Console front-end layer (`console/client/app.js` + `console/client/app.css`) and did not change business workflow, API contract, or backend data model. The completed B05 task-card scope is: `T01` shell theme uplift, `T02` overview/workspace visual-language upgrade, `T03` support/documentation page identity, `T04` detail-page atmosphere and metadata-panel styling, and `T05` iconography / visual accents / final system polish. The result is a richer and more intentional Console shell and page-family system built on top of the accepted B04 structure, not a reopened corrective batch.

Completed work:

- Renamed project directory from `AC词典平台` to `ACDP`
- Synced project-internal references, docs, commands, and SQLite release paths to the new directory name
- Built and maintained a browser-based management page at `/admin`
- Implemented term CRUD, rules persistence, review tasks, audit logs, release build/publish/rollback, gray policy support, and pinyin-profile governance
- Added centralized runtime/path configuration via `prototype/config/app.config.json`
- Refactored CLI scripts and server startup to use shared config instead of scattered path literals
- Refactored server startup into importable `startServer()` / `createPrototypeApp()` form for testability
- Added an isolated integration test script at `prototype/tests/integration.js`
- Executed the full integration test successfully with:
  - `npm --prefix /Codex/ACDP run test:prototype`
- Added pinyin-profile conflict detection APIs for shared `fullPinyinNoTone` / initials / alternative readings
- Added browser-side conflict list and detail view under `/admin`
- Added term-level polyphone candidate generation API and browser-side candidate review/apply flow
- Added pinyin profile comparison APIs and browser-side comparison list/detail view
- Added a lightweight RBAC model with role-based write/review/publish/operator boundaries and `/api/admin/me`
- Extended `prototype/tests/integration.js` to cover the new conflict and candidate endpoints
- Verified on Ubuntu that the current `/usr/bin/node` is `v20.20.0`, which cannot load the built-in `node:sqlite` module used by the prototype
- Added a runtime guard via `npm run check:env` and wrapped prototype scripts so unsupported Node versions fail with a clear action message
- Added a project-root `.nvmrc` and documented Ubuntu requirement as Node.js `>= 22.13.0`
- Switched the Ubuntu environment from Node 20 to Node 22 and re-verified the prototype baseline
- Re-ran `npm run test:prototype` successfully on Ubuntu after the runtime upgrade
- Added conflict severity ranking for pinyin conflicts, including score/level/reasons and short-term/high-overlap prioritization in API responses and `/admin`
- Added a persisted pinyin candidate review queue on top of `review_tasks`
- Added `POST /api/admin/terms/{termId}/pinyin-candidates` for explicit candidate submission
- Approving a pinyin candidate review now appends the approved reading into the term `alternativeReadings`
- Updated the browser admin page to show candidate review status and explicit submit-for-review actions
- Added character-level discrepancy output in pinyin comparison details
- Updated the browser admin page to show changed character slots in pinyin comparison detail
- Added `POST /api/admin/releases/{releaseId}/submit-review` for explicit release review submission
- Enforced approved release review before `publish` and `canary`
- Enforced release review / execution separation so the reviewer and publisher/operator cannot be the same operator
- Updated the browser admin page to show release approval status and explicit submit-for-review actions
- Added dual approval for high-risk releases based on included `riskLevel=high` terms
- Enforced distinct reviewers for high-risk dual approval
- Added finer-grained release gates before `publish` / `canary`
- Release gates now block exposure when included terms are no longer in `approved/published`
- Release gates now block exposure when included terms still have pending pinyin-candidate reviews
- Added validation-driven release gates based on snapshot loadability and smoke simulation on selected release terms
- Added repo-configured business validation cases under `prototype/config/release_validation_cases.json`
- Added SQLite-backed validation cases with bootstrap seeding from repo config
- Added `GET/POST /api/admin/validation-cases` and `POST /api/admin/validation-cases/{caseId}/disable`
- Release validation now reads enabled DB cases first and falls back to repo config only when DB cases are absent
- Added bulk validation-case feed import via `POST /api/admin/validation-cases/import`
- Import supports `upsert` and `insert_only` modes for offline/online sample feeds
- Added file-based feed connectors for `cg3`, `qa_feedback`, and `online_feedback`
- Added `GET /api/admin/validation-cases/feed-sources` and `POST /api/admin/validation-cases/import-feeds`
- Feed files are consumed from inbox directories and archived after import
- Added source-specific payload adapters for `cg3.records[]`, `qa_feedback.feedbacks[]`, and `online_feedback.events[]`
- Added example payload definitions in `prototype/config/validation_feed_examples.json`
- Added feed-batch fault isolation so invalid files move to source-specific error directories instead of blocking the whole import run
- Added CLI entry `npm run import:validation-feeds` for manual feed scan/import
- Feed-source status now exposes pending files and error files per source
- Changed prototype server bind host from `127.0.0.1` to `0.0.0.0` for direct external-IP access
- Added `npm run setup:prototype` for one-step prototype setup
- Added `npm run demo:prototype` for local demo output without browser dependence
- Added `npm run test:concurrency` for 1~5 user local concurrency verification
- Added `npm run test:unit` and initial unit-test coverage for core logic modules
- Added formal runtime correction API `POST /api/runtime/correct`
- Added WebSocket runtime correction endpoint `GET /ws/runtime/correct`
- Simplified the formal HTTP/WS correction contract to `correctedText` on success and a single `error` string on failure
- Added background resident service commands `npm run service:start|status|stop`
- Added deployment assets: `Dockerfile` plus basic K8S namespace/PVC/deployment/service manifests
- Switched JSON responses to compact encoding and tuned HTTP keepalive/request timeouts for better concurrency verification
- Extended `test:concurrency` with target RPS evaluation for the `/api/runtime/correct` endpoint
- Added optional Bearer Token auth for HTTP/WS runtime correction using `ACDP_RUNTIME_TOKEN`
- Added WebSocket connection governance controls for max connections, idle timeout, and max message bytes
- Added `GET /api/runtime/stats` for runtime in-flight/error/latency observation during pressure testing
- Added config-driven WebSocket caller governance in `prototype/src/lib/runtime-ws-governance.js`, covering caller identity, registered caller secrets, caller/IP blacklist, per-caller connection quota, and per-caller message-rate quota
- Added WebSocket governance config parsing in `prototype/src/lib/config.js` plus new `auth.websocket*` fields in `prototype/config/app.config.json`
- `/ws/runtime/correct` now enforces the caller governance path while preserving the legacy runtime-token fallback when strict registered-caller mode is not enabled
- `GET /api/runtime/stats` now also exposes `websocketGovernance` for active caller counts and rejection counters
- Added `prototype/tests/unit/runtime-ws-governance.test.js`
- Added `docs/44-SQLite之后状态管理升级路线.md`, closing the planning scope for post-SQLite state management with a concrete `PostgreSQL + MinIO + runtime-local SQLite/JSON` recommendation
- Added `prototype/config/validation_feed_connectors.config.json` for config-driven validation feed connector definitions
- Refactored `prototype/src/lib/validation-feed-importer.js` to support `file_inbox`, `http_pull_json`, delivery receipts, cursor-based incremental pull, optional `http_post` ack, and replay envelopes
- `POST /api/admin/validation-cases/import-feeds` and `npm run import:validation-feeds` now support source filtering plus replay-error processing
- Added `prototype/src/cli/check-validation-feed-connectors.js` plus `npm run check:validation-feeds` for remote connector preflight
- Added `prototype/src/cli/verify-validation-feeds.js` plus `npm run verify:validation-feeds` for local mock `cg3` connector verification with receipt/cursor/replay evidence
- Added `docs/45-validation-feed外部connector首轮契约.md`
- Expanded `prototype/tests/unit/validation-feed.test.js` to cover HTTP pull import, duplicate delivery skip, and ack-failure replay recovery
- Added `prototype/tests/unit/validation-feed-connectors-check.test.js`
- Added `prototype/tests/unit/validation-feed-verify.test.js`
- Added `GET /api/admin/dashboard` and a dashboard sheet in `/admin`
- Dashboard now shows dictionary totals, per-category seed/alias scale, hourly runtime calls, top hit terms, and peak concurrency summary
- Added an independent `/console` client and route while keeping `/admin` as the MVP demo entry
- Added `/api/console/*` read/write workflows for overview, terms, import jobs, reviews, releases, validation cases, exports, and help articles
- Added console help content under `/console/help/integration` and `/console/help/trial`
- Added `npm run test:console` for inject-based console E2E coverage
- Added `npm run smoke:console` with automatic inject fallback when local port binding is blocked
- Synced docs `25`~`30` around console host smoke, trial, feedback collection, and remediation tracking
- Finished a `/console` stabilization pass without touching `/admin` route behavior
- Added `/console` high-risk action confirmations and form double-submit protection
- Added disabled-state action guards for already-stopped terms/cases, already-submitted pinyin candidates, no-error import jobs, and non-actionable releases
- Extended `smoke:console` to verify `/admin` and `/console` entry isolation together
- Added `prototype/tests/unit/entrypoint-isolation.test.js` and `prototype/tests/unit/console-smoke.test.js`
- Added `npm run verify:host:console` plus host report output under `prototype/workspace/host_verification`
- Re-ran `npm run smoke:console`, `npm run test:console`, and `npm run test:unit` successfully after the `/console` stabilization pass
- Split `server.js` composition into runtime and admin/console surfaces
- Added `prototype/src/runtime-server.js` and `prototype/src/admin-server.js`
- Added `npm run start:runtime|start:admin`
- Added `npm run service:start|status|stop:runtime`
- Added `npm run service:start|status|stop:admin`
- Added `npm run smoke:runtime` and `npm run smoke:admin`
- Added split-surface unit coverage including `server-surfaces.test.js`, `admin-smoke.test.js`, and `runtime-smoke.test.js`
- Added split deployment assets: `Dockerfile.runtime`, `Dockerfile.admin`, `k8s/runtime-*.yaml`, `k8s/admin-*.yaml`
- Installed `docker` and `kubectl` on the host
- Built `acdp-runtime:latest` and `acdp-admin:latest` successfully on the host
- Verified split Docker deployment successfully with shared workspace volume
- Verified split Kubernetes deployment successfully on a local `kind` cluster
- Added a runtime initContainer in `k8s/runtime-deployment.yaml` to wait for the shared latest snapshot before startup
- Added dedicated ops docs for split deployment and runtime/admin service operations
- Added `artifact_store.config.json` loading into shared app config via `prototype/src/lib/config.js`
- Added `prototype/src/lib/artifact-store.js` for artifact store abstraction, MinIO client base behavior, and release artifact key/path planning
- Updated release build flow in `prototype/src/cli/build-snapshot.js` and `prototype/src/server.js` to emit config-driven artifact plan data with provider/bucket/key/url/checksum/size
- Added `prototype/tests/unit/artifact-store.test.js`
- Re-ran `npm run test:unit` successfully after the `JOB-002B` foundation changes
- Re-ran `npm run smoke:console` successfully after the `JOB-002B` foundation changes
- Added `runtime_nodes` persistence and status computation in `prototype/src/lib/platform-db.js`
- Added `POST /api/runtime-nodes/register` and `POST /api/runtime-nodes/heartbeat` on the admin app, guarded by runtime Bearer token instead of `/admin` role headers
- Added `prototype/tests/unit/runtime-nodes.test.js`
- Re-ran `npm run test:unit`, `npm run smoke:runtime`, and `npm run smoke:admin` successfully after the `JOB-002C` changes
- Added `runtime_control_state` persistence and artifact metadata generation for desired release control
- Added `GET /api/admin/runtime-control` and `POST /api/admin/runtime-control/desired-version`
- Added `GET /api/runtime-control/me` for runtime-side control-state reads using runtime token + nodeId
- Added `prototype/tests/unit/runtime-control.test.js`
- Re-ran `npm run test:unit`, `npm run smoke:runtime`, and `npm run smoke:admin` successfully after the `JOB-002D` minimum control-path changes
- Added runtime local artifact install/state helpers in `prototype/src/lib/runtime-artifacts.js`
- Added runtime control client support in `prototype/src/lib/runtime-control-client.js`, including a test-only injected control-plane client path
- Added `POST /api/runtime-nodes/{nodeId}/apply-result`
- Runtime can now install a desired snapshot into local `runtime_artifacts/releases/<releaseId>` and atomically switch `runtime_state/current.json`
- Runtime now tolerates startup without shared `latest` when control-managed mode is enabled, returning `runtime_not_ready` until a local snapshot is installed
- Extended `prototype/tests/unit/runtime-control.test.js` to verify runtime startup without `latest`, local artifact pull, atomic switch, correction success, and apply-result reporting
- Re-ran `npm run test:unit`, `npm run smoke:runtime`, and `npm run smoke:admin` successfully after the `JOB-002E` minimum local-switch changes
- Added deployment-state persistence with `activeRelease / previousRelease / lastAttempt`
- Added rollback and failure-recovery behavior for post-install verification failures
- Extended `prototype/tests/unit/runtime-control.test.js` to verify rollback to the previous local release
- Re-ran `npm run test:unit`, `npm run smoke:runtime`, and `npm run smoke:admin` successfully after the `JOB-002E` rollback/state-machine hardening
- Added runtime local stats SQLite buffering in `prototype/src/lib/runtime-stats.js`
- Added `POST /api/runtime-nodes/{nodeId}/stats/upload`
- Added admin-side idempotent ingestion keyed by `nodeId + batchId + sequence`
- Added node-level stats aggregation tables and continued global dashboard aggregation updates
- Added `prototype/tests/unit/runtime-stats-sync.test.js`
- Re-ran `npm run test:unit`, `npm run smoke:runtime`, and `npm run smoke:admin` successfully after the `JOB-002F` local-stats upload changes
- Added `/console/runtime-nodes` navigation entry and page route
- Added `GET /api/console/runtime-nodes` and `GET /api/console/runtime-nodes/{nodeId}`
- Added console-side runtime node list/detail aggregation including status, versions, apply result, hourly stats, top hit terms, and control-state summary
- Re-ran `npm run test:unit`, `npm run smoke:console`, `npm run smoke:runtime`, and `npm run smoke:admin` successfully after the `JOB-002G` page changes
- Added user/role/permission/page-feature four-layer RBAC base model in `prototype/src/lib/admin-auth.js`
- Added runtime-node/stat read permissions to the RBAC model
- `/api/admin/me` now returns user identity, assigned roles, page features, and page access
- `/console` top identity bar now reflects current user + current role and uses page access to hide unavailable nav entries
- `/console` now also uses page-feature checks to hide/disable multiple high-risk and high-frequency actions, and its submit handler performs a second feature-level guard
- `PAGE_FEATURE_MATRIX` now carries `riskLevel / confirmRequired / constraintCode` metadata for critical actions
- Re-ran `npm run test:unit`, `npm run smoke:console`, `npm run smoke:runtime`, and `npm run smoke:admin` successfully after the `JOB-002H` first-slice changes
- Added another `JOB-002H` pass to extend action-level page-feature mapping across terms/releases/import/validation flows
- Re-ran `npm run test:unit`, `npm run smoke:console`, `npm run smoke:runtime`, and `npm run smoke:admin` successfully after the `JOB-002H` action-matrix expansion
- Added `syncReleaseArtifactsToStore` in `prototype/src/lib/artifact-store.js` so verification can stage release files to a config-derived `file://` artifact store without hardcoding MinIO settings
- Added `prototype/src/cli/verify-runtime-control.js` and `npm run verify:runtime-control` for real HTTP control-plane validation
- Added remote MinIO artifact upload/sync support in `prototype/src/lib/artifact-store.js`, including config-driven credential resolution, bucket ensure/create, SigV4 request signing, and object PUT upload
- Added MinIO pre-signed GET URL generation for runtime artifact download, so private buckets still work in configured mode
- Added `prototype/src/cli/local-minio.js` and `npm run local:minio:start|status|stop` for config-driven local MinIO management via docker
- Started a local docker-backed MinIO instance from `artifact_store.config.json`
- Because the endpoint is local and credentials were empty, `npm run local:minio:start` generated local development credentials and wrote them back into `prototype/config/artifact_store.config.json`
- Re-ran `npm run verify:runtime-control -- --artifact-store-mode=configured` successfully after local MinIO startup and presigned download support
- Captured the latest configured-mode success report at `prototype/workspace/host_verification/2026-04-02T03-19-21.032Z_runtime_control_verify_configured/summary.json`
- Re-ran `npm run verify:runtime-control -- --artifact-store-mode=file` successfully after limiting presigned URLs to remote MinIO only
- Captured the latest file-mode verification report at `prototype/workspace/host_verification/2026-04-02T03-20-58.623Z_runtime_control_verify_file/summary.json`
- Re-ran `npm run test:unit` successfully after the local MinIO + presigned download changes
- Added config-driven artifact-store env injection in `prototype/src/lib/config.js`, so `artifact_store.config.json` can point to host/production env vars via `*Env` fields
- Added config-driven `runtimeControl` env injection in `prototype/src/lib/config.js`, so target-host/K8S runtime identity and admin base URL can also be injected without editing repo JSON
- Updated `prototype/config/artifact_store.config.json` to include `endpointEnv/publicBaseUrlEnv/bucketEnv/regionEnv/rootUserEnv/rootPasswordEnv/accessKeyEnv/secretKeyEnv`
- Updated `prototype/config/artifact_store.config.json` to include `adminBaseUrlEnv/nodeIdEnv/nodeNameEnv/nodeEnvEnv/nodeAddressEnv`
- Added `k8s/artifact-store-secret.example.yaml`
- Updated `k8s/runtime-deployment.yaml` and `k8s/admin-deployment.yaml` to consume artifact store / runtime auth envs via Secret injection
- Added ops doc `docs/41-本地MinIO与制品仓凭据注入说明.md`
- Updated `README.md`, `prototype/README.md`, `docs/35-拆分部署资产使用说明.md`, `docs/36-拆分部署首轮验证执行清单.md`, and `docs/37-runtime-admin服务运维手册.md` to document local MinIO lifecycle, env injection, and K8S Secret usage
- Added `prototype/src/cli/check-control-managed-config.js` and `npm run check:control-config` as a final preflight before moving to target-host or target-cluster env injection
- Verified `npm run check:control-config` successfully with `ACDP_RUNTIME_TOKEN` injected in the shell
- Added `--require-env-sources` mode to `npm run check:control-config`, so target-host/cluster rollout can explicitly fail when critical values are still coming from repo config instead of env injection
- Re-ran `npm run test:unit` successfully after the env-injection changes
- Updated `/console/runtime-nodes` list/detail to auto-refresh every 5 seconds and show `heartbeatAgeSeconds / offlineThresholdSeconds`, so stopping runtime no longer requires manual refresh to observe timeout-based offline transition
- Re-ran `npm run smoke:console` successfully after the runtime-node page refresh change
- Completed a `/console` whole-backend capability review and confirmed that the next console phase should focus on:
  - `JOB-001A` overview/workbench
  - `JOB-001B` release-to-runtime rollout closure
  - `JOB-001C` release confirmation and exception closure
  - `JOB-001D` query/perf and interaction finishing
- Confirmed the implementation discipline for the next console batches:
  - after each batch, update `docs/38-项目JobList与状态清单.md`, `SESSION_HANDOFF.md`, and `NEXT_STEPS.md`
  - keep function comments explicit about purpose/input/output
  - keep config parameter purpose documented
  - self-test and report after each completed batch
- Completed `JOB-001A` `/console` overview/workbench:
  - added `GET /api/console/workbench`
  - added workbench aggregation for pending reviews, preview-ready imports, blocked releases, offline nodes, failed/rolled-back apply nodes, and attention validation cases
  - upgraded `/console` overview into a workbench-oriented page while preserving the existing summary/version/quick-entry information
  - kept the workbench compatible with the current RBAC page-access model
  - added test coverage in `prototype/tests/unit/console-read.test.js` and `prototype/tests/unit/console-api.test.js`
  - passed:
    - `npm run test:unit`
    - `npm run smoke:console`
    - `npm run test:console`
- Completed `JOB-001B` `/console` release-to-runtime rollout closure:
  - added `GET /api/console/runtime-control`
  - added `POST /api/console/runtime-control/desired-version`
  - added console-side rollout aggregation so release detail and runtime-nodes can both read current desired version, `configVersion`, and node convergence counts
  - upgraded release detail so a release can be issued as the current runtime desired version directly from `/console`
  - upgraded `/console/runtime-nodes` to show current rollout summary and allow reissuing the current desired version
  - added `releases.rollout` feature mapping under the RBAC model
  - added/updated test coverage in `prototype/tests/unit/console-read.test.js` and `prototype/tests/unit/console-api.test.js`
  - passed:
    - `npm run test:unit`
    - `npm run smoke:console`
    - `npm run test:console`
- Completed `JOB-001C` `/console` release confirmation / exception closure:
  - added release confirmation aggregation into `getConsoleReleaseDetail()`
  - added runtime-control evidence discovery from local `prototype/workspace/host_verification/*runtime_control_verify*/summary.json`
  - added `GET /api/console/runtime-control/evidence/{reportId}`
  - upgraded release detail to show:
    - confirmation status
    - issue list with remediation links
    - rollout / validation / gate summary
    - runtime-control evidence table with JSON entry links
  - added test coverage for release confirmation and evidence endpoint in `prototype/tests/unit/console-api.test.js`
  - passed:
    - `npm run test:unit`
    - `npm run smoke:console`
    - `npm run test:console`
- Started `JOB-001D` `/console` query/perf finishing and completed the first optimization slice:
  - optimized `getConsoleImportJobDetail()` so preview summary / error preview / created review tasks no longer depend on loading and filtering a large in-memory row set
  - optimized validation detail / related-terms reads to query directly by `case_id` / `canonical_text`
  - removed the `listTerms(limit=500)` dependency from workbench validation attention detection
  - added paged query support for review tasks and validation cases, and switched `/console` review/validation list aggregations to use it
  - reduced `/console/runtime-nodes` request/peak aggregation scope to the current page instead of the whole filtered node set
  - switched `/console` release list to paged release reads instead of full-list filtering
  - changed runtime-control evidence detail lookup to direct report-file reads by `reportId`
  - changed runtime-node pages to default manual refresh instead of always-on full-page auto refresh
  - added optional runtime auto-refresh toggle and manual refresh action for demo control
  - added access-meta caching by `operator/role`, reducing repeated `/api/admin/me` reads on route changes
  - added friendlier runtime issue classification and recovery guidance, including the `artifact download failed: 404` case
  - started a unified “in-card scrolling for data-heavy regions” scheme and applied it to workbench/runtime/release/validation-heavy sections
  - passed:
    - `npm run test:unit`
    - `npm run smoke:console`
    - `npm run test:console`
- Continued `JOB-001D` and landed the second unified backend slice for demo/small-scale-commercial readiness:
  - changed `listRuntimeNodes()` to support SQL-level `status/env` filtering plus real `COUNT(*)` and `LIMIT/OFFSET`
  - changed `listConsoleRuntimeNodes()` from “load 500 then slice in memory” to real backend pagination
  - added unified runtime-node `issue` summaries in console APIs so list/detail pages can distinguish:
    - active issue
    - recovered historical issue
    - healthy/no issue
  - changed runtime-node detail presentation so recovered `lastError` content is shown as trace information instead of a live fault
  - added route-level cached-page replay plus background refresh on `/console`, reducing blank first-paint waits when re-entering heavy pages
  - refined the unified in-card scrolling scheme with stronger scroll-edge clipping for dense content areas
  - extended unit/API coverage for:
    - runtime-node pagination totals
    - recovered runtime issue lifecycle
    - active runtime issue lifecycle
  - passed:
    - `npm run test:unit`
    - `npm run smoke:console`
    - `npm run test:console`
- Clarified the current user/RBAC model directly inside the trial help path:
  - updated `/api/console/help/trial` content in `prototype/src/lib/console-help.js`
  - the page now explicitly explains:
    - current trial identity model is operator/role simulation, not production login
    - built-in users and their assigned-role limits
    - page access vs. page-feature action gating
    - key restrictions such as release review separation and high-risk action confirmations
  - synced the repo doc:
    - `/Codex/ACDP/docs/26-console内部试用说明.md`
  - passed:
    - `npm run test:unit`
    - `npm run smoke:console`
- Tightened the top identity switcher interaction on `/console`:
  - changed “当前用户” from editable text+datalist to a strict select-only control
  - the control now always has a default selected user instead of allowing empty/free-form values
  - role options now update immediately when the selected user changes
  - single-role users now effectively lock the role select to their assigned role
  - the last selected user/role pair is restored on reload
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Added a first-class runtime correction demo area directly on `/console` overview:
  - overview now reads `/api/runtime/current` and renders a new “输入与纠错演示” panel
  - users can input text and execute `/api/simulate` without leaving the new backend
  - the panel shows:
    - stable/canary current version
    - corrected output
    - replace hits / candidates / blocked items
    - selected route and traffic bucket
  - the demo area is gated by the same RBAC feature model (`overview.runtimeDemo.*`)
  - failure results are rendered inline on the page instead of requiring `/admin`
  - synced related help/doc wording so the trial path now mentions the overview demo entry
  - passed:
    - `npm run smoke:console`
    - `npm run test:unit`
    - `npm run test:console`
- Fixed the admin-only startup regression introduced by the overview demo panel:
  - root cause:
    - `/console` overview was directly calling runtime-surface endpoints (`/api/runtime/current`, `/api/simulate`)
    - under `npm run start:admin`, those endpoints are intentionally absent, so the page failed to load
  - fix:
    - added admin/console-side mirror endpoints:
      - `GET /api/console/runtime-demo/current`
      - `POST /api/console/runtime-demo/simulate`
    - changed the overview demo panel to use those mirror endpoints instead
    - preserved the original surface boundary:
      - `/api/runtime/*` is still not exposed on admin-only app
  - passed:
    - `npm run smoke:console`
    - `npm run test:unit`
- Fixed the stale-presigned-url failure behind the console “制品下载鉴权失败” warning:
  - observed runtime state:
    - last attempt failed with `artifact download failed: 403 Forbidden`
  - actual root cause:
    - runtime control had persisted a presigned MinIO download URL at issue time
    - with `presignExpiresSeconds=900`, later runtime sync attempts could reuse an already expired URL
    - this is a stale-presign problem, not only a generic credentials/config problem
  - fix:
    - `getRuntimeControlViewForNode()` now refreshes artifact metadata from the current release files before returning control data to runtime
    - runtime therefore receives a fresh artifact download URL on each control fetch
    - MinIO settings remain config-driven; nothing was hardcoded
  - added unit coverage to ensure stale stored `artifactUrl` values are not replayed back to runtime
  - passed:
    - `npm run test:unit`
    - `npm run test:console`
- Continued `JOB-001D` runtime aggregation finishing:
  - changed failed-apply workbench reads to direct `last_apply_status IN (...)` queries instead of loading nodes then filtering in memory
  - changed runtime rollout summary to SQL-level aggregation by target version instead of scanning up to 500 runtime nodes
  - changed rollout top-node selection to direct ordered reads for the first 10 attention nodes
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Started a typography / Chinese-copy normalization pass for `/console`:
  - added explicit font-size hierarchy variables in `console/client/app.css`
  - aligned repeated UI text layers to shared size buckets instead of ad-hoc sizes
  - converted a first batch of high-frequency English labels to Chinese in overview, runtime-nodes, releases, confirmation, and evidence sections
  - converted a first batch of high-frequency flash/action feedback copy to Chinese as well
  - kept raw technical values such as IDs / URLs as monospace values rather than forcing them into translated pseudo-labels
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Continued that `/console` standardization pass on heavy operational pages:
  - extended Chinese-first display mapping on `terms / import / reviews / validation` so category, risk, import type, job type, and import-row decision values are no longer shown as naked backend codes in the main UI
  - aligned backend-generated review target summaries with the same Chinese terminology, so review cards/details no longer mix translated shell text with raw English summary fragments
  - extended the shared typography hierarchy to metric values, callout titles, review titles/meta, template code subtitles, empty states, and code blocks
  - changed several avoidable serial reads to `Promise.all(...)` on:
    - term detail
    - term validation cases
    - import home
    - import job detail
  - kept `/admin` and existing `/console` route capability unchanged while tightening the user-visible presentation layer
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Continued the `/console` summary-copy cleanup around workbench and release confirmation:
  - workbench items now use more Chinese-first subtitles/details for review/import/validation/release summaries instead of surfacing raw source/job/task codes
  - release confirmation and gate tables now translate blocker codes, validation case types, and common validation failure reasons
  - overview/release/validation tables cleaned a few remaining raw `categoryCode` displays
  - runtime issue wording no longer exposes `desiredVersion / artifact metadata` directly to end users
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Continued `JOB-001D` query tightening on remaining helper-scan paths:
  - `termValidationSummaryMap()` no longer loads up to 500 validation cases and filters them in memory; it now counts enabled related cases directly by canonical text set
  - workbench “待关注样本” no longer loads all term canonicals plus up to 500 validation cases for JS-side comparison; it now reads the unmatched enabled cases directly from SQL
  - `getReleaseGateSummary()` no longer relies on `listReviewTasks(...limit=500)` plus in-memory term-set filtering for pending term/pinyin reviews; it now reads pending review tasks directly by target term ids
  - `getConsoleOverview()` pending-review count no longer risks being truncated by `limit=200`; it now uses the paged-query total
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Fixed the `/console/terms` overlap issue reported from `/test/ACDP/词条中心（界面交叉，数据列表没有按规则统一）_2026-04-02_210326_578.png`:
  - root cause: wide-table pages with a right-side operation column were still forced into two columns at widths where the table area needed to dominate
  - added a unified `layout-priority-main` layout rule for:
    - terms
    - import
    - validation-cases
  - behavior now is:
    - wide screens keep a main-list-first two-column layout
    - medium widths collapse these pages earlier into a vertical stack
    - the table region no longer collides with the right-side create/import form region
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Added release-validation summary caching to reduce repeated gate recomputation:
  - `buildReleaseValidationSummary()` now caches by:
    - release id
    - snapshot file size/mtime state
    - enabled validation-case count
    - latest enabled validation-case `updated_at`
  - repeated workbench/release-list/dashboard/gate reads now reuse the same validation summary while release snapshot and enabled validation cases stay unchanged
  - cache invalidates automatically when release snapshot or enabled validation-case set changes
  - behavior and response shape remain unchanged; this is a pure cost reduction
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Continued `JOB-001D` release-gate cost reduction on blocked-release paths:
  - added batched database gate-summary readers in `prototype/src/lib/platform-db.js` for:
    - release-term lookups by release-id batch
    - release database gate blockers by release-id batch
  - added `buildReleaseGateSummaryMap()` in `prototype/src/lib/release-gates.js` so current-page/current-batch release reads can reuse:
    - batched database gate summaries
    - one normalized validation-case set
    - existing per-release validation summary cache
  - changed the blocked-release workbench section to scan releases via `listReleasesPaged()` chunks instead of loading every release row up front and then recalculating gate state one by one
  - changed the console release list to reuse a page-level gate-summary map instead of recomputing database gate scans per row
  - extended the validation cache key so repo fallback validation-case file changes also invalidate cached summaries when the DB has no enabled validation cases
  - added supporting indexes for `releases`, `release_terms`, and `review_tasks` around the batched gate-scan path
  - added/strengthened unit coverage in:
    - `prototype/tests/unit/release-gates.test.js`
    - `prototype/tests/unit/console-read.test.js`
  - one parallel local regression attempt briefly hit SQLite `database is locked`; re-running the required console regressions serially passed cleanly
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Continued `JOB-001D` release-list/release-detail helper aggregation tightening:
  - added a batched release approval-summary path in `prototype/src/lib/console-service.js`, so the release list no longer computes approval state row by row through separate latest-review / approval-policy / review-summary reads
  - release-list reads now share one `releaseTermsMap` across:
    - approval summaries
    - gate summaries
  - `getConsoleReleaseDetail()` now reuses the already loaded:
    - release
    - release terms
    - runtime control state
    across approval / gate / rollout / term-change sections instead of rereading the same release-local inputs
  - added runtime-control evidence directory-state caching so release detail no longer reparses every host verification summary file on unchanged reads
  - added regression coverage to verify:
    - release-list approval status after approval
    - release-detail evidence list refresh after a new report directory appears
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Continued `JOB-001D` review helper aggregation tightening:
  - `listConsoleReviews()` no longer builds target summaries by calling `getTerm()` / `getRelease()` once per review row
  - added page-level review target summary batching for:
    - live term summaries
    - live release summaries
  - kept `getConsoleReviewDetail()` on the same summary-construction path so review list/detail wording stays aligned
  - added regression coverage for:
    - review-list target summary title on term reviews
    - release-list approval state after approval
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Corrected the screenshot-path assumption and tightened shared admin release scans:
  - confirmed screenshots are under `/test/ACDP/`
  - `/api/admin/dashboard` no longer uses two full `listReleases()` scans plus per-release gate evaluation to derive release totals / blocked counts
  - `/api/admin/releases` now walks paged release chunks and reuses per-page console release summaries plus batched gate maps instead of the older full-read path
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Continued `JOB-001D` user-facing error-copy cleanup using the real screenshot set:
  - confirmed `/test/ACDP/版本发布报错.png` is mainly a console error-copy issue rather than a missing release capability issue
  - added a unified console-side error parser + Chinese message mapping so action/page failures no longer surface raw backend code strings for common release/review/import/runtime cases
  - this now covers common cases such as:
    - `release_review_submitter_conflict`
    - `release_gate_blocked`
    - `release_review_required`
    - `release_separation_required`
    - `release_status_invalid`
    - `runtime_not_ready`
    - `template_not_found`
    - `import_job_status_invalid`
    - `validation_case_exists`
    - `invalid_validation_case`
    - `pinyin_candidate_not_found`
  - both route-level load errors and in-page action failures now reuse the same normalized copy path
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Continued `JOB-001D` release-confirmation guidance cleanup:
  - added a compact “建议先处理” guidance callout in release detail
  - the guidance callout uses only existing `confirmation.issues` / confirmation status and does not introduce any new API or workflow
  - when blocked/warning issues exist, the card now highlights:
    - the highest-priority current issue
    - its Chinese description
    - the most relevant next jump link
  - when the confirmation state is already healthy, the card explicitly tells the user that the main confirmation items are complete instead of leaving them to infer that from metrics alone
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Continued `JOB-001D` overview/runtime interaction finishing:
  - `getConsoleWorkbench()` now returns a small `highlights` summary so the overview page can show direct “先处理什么” cards without inventing another workflow surface
  - the overview page now uses those highlight cards for “当前优先事项” and hides empty duplicate workbench sections instead of repeatedly rendering blank panels
  - `listConsoleRuntimeNodes()` now returns `issueSummary` and keeps current-page nodes ordered by `active -> warning -> recovered -> healthy`
  - the runtime list page now explains current exceptions vs. historical exceptions using the API summary instead of leaving users to infer that from one column and one counter
  - fixed a latent console client syntax issue by quoting the `'runtime control evidence not found'` error-map key so `console/client/app.js` is valid JavaScript
  - added regression coverage for:
    - workbench highlight summaries
    - runtime issue summary counts and current-page lifecycle ordering
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Continued `JOB-001D` release-validation input tightening:
  - removed the old enabled-validation-case cap from `prototype/src/lib/release-gates.js`
  - release validation now reads enabled DB cases through `listAllValidationCasesByFilters({ enabled: true })` instead of the older `listValidationCases(...limit=500)` path
  - this keeps release gate / release confirmation / blocked-release workbench validation consistent once enabled samples exceed 500 rows
  - response shape did not change; only the gate input set is now complete
  - added regression coverage with a 510-case scenario to ensure:
    - `businessCaseCount` includes rows beyond the old cap
    - the tail sample is still present in the validation result set
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Continued `JOB-001D` help/runtime detail finishing:
  - `/api/console/help/{slug}` now exposes `sourceDocPath`, and `/api/console/help/{slug}/source` can download the corresponding Markdown source from `docs/25` / `docs/26`
  - help detail pages now provide direct “返回帮助中心 / 下载 Markdown 原文” actions so operators do not need to jump to raw repo URLs from the browser
  - runtime node detail pages no longer place raw last-error strings and presigned artifact URLs directly in the main summary flow
  - those technical strings now sit behind folded “查看原始错误信息 / 查看制品下载地址” details, while the primary callout remains business explanation + recovery guidance
  - added regression coverage in `prototype/tests/unit/console-api.test.js` for:
    - help article `sourceDocPath`
    - `/api/console/help/trial/source` attachment download
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Continued `JOB-001D` release-confirmation / rollout summary consolidation:
  - `getConsoleRuntimeRollout()` now returns a backend-owned `guidance` object so release detail no longer has to infer “未下发 / 失败 / 待收敛 / 离线 / 已完成收敛” from multiple scattered fields in the client
  - `buildReleaseConfirmation()` now exposes more business-facing summary counters:
    - `gateBlockerCount`
    - `validationCaseCount`
    - `validationSkippedCount`
    - `totalNodes`
    - `desiredNodes`
    - `untouchedNodes`
  - release detail now consumes those summary values directly and uses the same backend-owned logic for the rollout callout
  - normalized the remaining mixed wording from `Gate 未通过` to `发布门禁未通过`
  - added regression coverage in `prototype/tests/unit/console-read.test.js` for:
    - rollout guidance
    - confirmation summary counters
  - passed:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
- Continued `JOB-001D` release-detail business-first copy cleanup:
  - `getConsoleReleaseDetail()` now preformats release gate blockers and validation cases into console-facing fields instead of leaving the client to fall back to raw codes or JSON
  - release detail “发布门禁结果 / 验证结果” now shows business explanation first, while `taskId / snapshotPath / error / sampleText / validationMode / channel / action` and similar technical fields sit behind folded technical-details blocks
  - this keeps the release-detail cleanup aligned with the same runtime-detail rule: business-first guidance in the main reading path, technical payloads only on demand
  - added regression coverage in `prototype/tests/unit/console-read.test.js` for pending-review blocker title/detail formatting
- Continued `JOB-001D` workbench blocked-release selective validation:
  - `buildWorkbenchBlockedReleaseSection()` now evaluates each release page in two phases:
    - database gate summary first
    - validation summary only for releases that are not already blocked by database gates
  - this keeps blocked-release workbench counts exact while avoiding repeated validation scans for releases already blocked by term status / pending review conditions
  - added regression coverage in `prototype/tests/unit/console-read.test.js` for a validation-only blocked release so the selective path does not miss releases that are blocked only by validation
- Continued `JOB-001D` workbench offline-node light read:
  - `buildWorkbenchOfflineRuntimeSection()` no longer calls `listConsoleRuntimeNodes()` and therefore no longer pays for request-summary, peak, and issue-summary aggregation just to render five offline workbench items
  - the workbench path now reads `status=offline` runtime nodes directly and keeps the same user-facing fields: node name, env, last heartbeat, and current version
  - added regression coverage in `prototype/tests/unit/console-read.test.js` for the offline-node workbench summary/item path
- Continued `JOB-001D` workbench import light read:
  - `buildWorkbenchImportSection()` no longer calls `listConsoleImportJobs()` just to render five `preview_ready` items on the overview workbench
  - the workbench path now reads import jobs directly and only batches the preview-row summary it actually needs
  - this removes unnecessary `resultSummary` reads and per-item `getImportJobResult()` fallback calls from the overview path
  - added regression coverage in `prototype/tests/unit/console-read.test.js` for the import workbench summary/item path
- Continued `JOB-001D` workbench review/validation light read:
  - `buildWorkbenchReviewSection()` no longer routes through `listConsoleReviews()` for the homepage 5-row block
  - the workbench review path now reads pending review tasks directly, keeps an exact total count, and still reuses the same batched review target-summary aggregation
  - `buildWorkbenchValidationSection()` no longer routes through `listValidationCasesWithoutKnownCanonicals()` for the homepage 5-row block
  - the workbench validation path now reads unmatched enabled samples directly, with a separate total-count query and the same visible fields
  - added regression coverage in `prototype/tests/unit/console-read.test.js` for exact review/validation totals plus the 5-row cap
- Continued `JOB-001D` runtime rollout attention light read:
  - `getConsoleRuntimeRollout()` no longer reuses the older target-version node list and then performs a second JS-side re-sort for release detail / runtime-control
  - rollout attention nodes now come from one backend query with a stable priority:
    - not yet targeted
    - targeted but failed / rolled back
    - targeted and still converging
    - aligned but offline
    - aligned and online
  - release detail and `/api/console/runtime-control` now share the same attention-row assembly path
  - added regression coverage in `prototype/tests/unit/console-read.test.js` for the fixed attention ordering plus `matchesTargetVersion / targetsSelectedVersion` flags
- Continued `JOB-001D` release gate / validation endpoint unification:
  - `getConsoleReleaseGateDetail()` now owns the shared console formatting path for release gate blockers and validation cases
  - `/api/console/releases/{releaseId}/gate` and `/api/console/releases/{releaseId}/validation` now return the same console-formatted sections already used by release detail
  - this closes the last side-route gap where raw blocker codes / raw validation payloads could still escape outside the main release detail path
  - added regression coverage in `prototype/tests/unit/console-api.test.js` for the formatted gate/validation endpoint output
- Closed `JOB-001D`:
  - workbench heavy reads, runtime rollout, release detail, release gate/validation side routes, and the screenshot-driven backend UX normalization are now considered complete for the current `/console` scope
  - any future `/console` copy/layout/pagination regressions should reopen as `JOB-012` maintenance items instead of continuing the `JOB-001D` mainline
  - re-ran the required serial regressions for closure:
    - `npm run smoke:console`
    - `npm run test:console`
    - `npm run test:unit`
    - latest result: `19/19` unit test files passed
- Re-ran the required serial console regressions after the latest workbench-light batch:
  - `npm run smoke:console`
  - `npm run test:console`
  - `npm run test:unit`
  - latest result: `19/19` unit test files passed
- Added a formal issue/plan document based on `/test/ACDP/`:
  - `/Codex/ACDP/docs/42-console人工故障复盘与演示商用推进计划.md`
  - includes:
    - fixed / partially mitigated / unresolved issue matrix
    - demo-safe path
    - small-scale-commercial must-close items
    - staged rollout plan
- Continued `JOB-002B` productionization closing notes:
  - confirmed that docker-backed local MinIO remains the default local development / local verification baseline
  - enhanced `npm run check:control-config` so it now explicitly reports when the current setup is still in local credential mode (`artifactStore.localCredentialMode.active=true`)
  - enhanced `npm run local:minio:status` so it now reports `defaultLocalDevBaseline=true` and a structured blocker when docker daemon/socket permissions are unavailable
  - in the current sandbox, `npm run local:minio:status` returns `docker_socket_permission_denied`, which is now an explicit local execution blocker instead of an implicit raw docker error
- Closed the host-level `JOB-002B` env-injection evidence gap:
  - `ACDP_RUNTIME_TOKEN=real-host-token ... npm run check:control-config -- --require-env-sources` now passes with:
    - all artifact store critical fields from env
    - all runtime control critical fields from env
    - `artifactStore.localCredentialMode.active=false`
    - MinIO health check `200`
  - `ACDP_RUNTIME_TOKEN=real-host-token ... npm run verify:runtime-control -- --artifact-store-mode=configured` succeeded and produced:
    - `/Codex/ACDP/prototype/workspace/host_verification/2026-04-02T06-36-35.369Z_runtime_control_verify_configured/summary.json`
  - the next remaining blocker is cluster-side, not host-side:
    - `kubectl config current-context` returned empty
- Added target-cluster preflight tooling:
  - added `npm run check:k8s-target`
  - current result on this host:
    - `kubectl` client is available
    - blocker=`kube_context_missing`
    - no usable current context is set yet
  - this means the next remaining blocker is explicitly “target cluster access missing”, not an application-side uncertainty

## Key Working Entry Points

Project root:

- `/Codex/ACDP`
- Legacy Windows root references have been retired; use `/Codex/ACDP` as the single active workspace path.

Main prototype docs:

- `README.md`
- `prototype/README.md`
- `docs/12-原型实现与当前能力.md`
- `docs/38-项目JobList与状态清单.md`
- `docs/39-控制面数据面架构与RBAC重构方案.md`
- `docs/40-控制面数据面实施分解与开发前自审.md`
- `docs/41-本地MinIO与制品仓凭据注入说明.md`
- `prototype/config/artifact_store.config.json`

Main runtime entry:

- `prototype/src/server.js`

Main browser entry:

- `http://127.0.0.1:8787/admin`
- `http://127.0.0.1:8787/console`
- `http://<server-ip>:8787/admin`
- `http://<server-ip>:8787/console`

Main config file:

- `prototype/config/app.config.json`

Main integration test:

- `prototype/tests/integration.js`

Main feed import entry:

- `npm run import:validation-feeds`

Main setup entry:

- `npm run setup:prototype`

Main demo entry:

- `npm run demo:prototype`

Main concurrency entry:

- `npm run test:concurrency -- --users 5 --iterations 10`

Main unit test entry:

- `npm run test:unit`

Main console verification entries:

- `npm run test:console`
- `npm run smoke:console`
- `npm run verify:host:console`

Main split-service verification entries:

- `npm run smoke:runtime`
- `npm run smoke:admin`
- `npm run verify:runtime-control -- --artifact-store-mode=configured`
- `npm run verify:runtime-control -- --artifact-store-mode=file`
- `npm run local:minio:start`
- `npm run local:minio:status`
- `npm run local:minio:stop`
- `npm run start:runtime`
- `npm run start:admin`

Main K8S assets:

- `Dockerfile`
- `k8s/deployment.yaml`
- `k8s/service.yaml`
- `k8s/pvc.yaml`

Main split deployment assets:

- `Dockerfile.runtime`
- `Dockerfile.admin`
- `k8s/runtime-deployment.yaml`
- `k8s/runtime-service.yaml`
- `k8s/admin-deployment.yaml`
- `k8s/admin-service.yaml`

Main service management entries:

- `npm run service:start`
- `npm run service:status`
- `npm run service:stop`

## Current Implemented Capabilities

- Data preparation from raw Shanghai roads and government department sources
- SQLite-backed management storage
- Rule persistence and runtime rule execution
- Pinyin profile persistence and manual polyphone override handling
- Review task workflow
- Audit log recording
- Snapshot build/publish/rollback
- Stable/canary runtime selection with gray policy
- Browser management UI for runtime simulation and admin actions
- Independent `/console` client for the new backend workflow
- Pinyin conflict summary/detail views in the browser admin page
- Polyphone candidate generation, persisted candidate review queue, and explicit submit-for-review flow in the browser admin page
- Pinyin profile comparison list/detail view with character-level discrepancy detail in the browser admin page
- Role switching and current identity inspection in the browser admin page
- Release review workflow, dual approval for high-risk releases, and finer-grained release gates
- Validation-case management, feed import, file-based feed connectors, and source-specific payload adapters
- Console-side term/import/review/release/validation workflows, CSV export, help center, and attachment download flow
- `/console` stabilization safeguards for confirmations, repeat-submit prevention, and state-aware action disabling
- One-step setup/demo script support for prototype delivery
- Local concurrency verification entry for 1~5 users
- Initial unit-test coverage and runnable unit-test entry
- Source functions under `prototype/src/lib`, `prototype/src/cli`, and `prototype/src/server.js` now have function-level purpose/input/output comments
- Formal remote correction API for external callers
- WebSocket remote correction API for long-lived callers
- Background resident service management via CLI
- Basic container and K8S deployment assets for MVP rollout
- Split runtime/admin server entries, smoke checks, service commands, and deployment assets

## Known Current Boundaries

- Rule model is still a prototype subset, not the full production rule model
- Pinyin governance is term-level only; no character-level override tooling yet
- Polyphone handling still depends on manual profile input; candidate queue and character-level comparison now exist, but there is still no character-level override editing flow
- Gray policy model is simplified to `traffic_key_hash` + percentage
- Frontend is a single-page prototype, not a production admin system; RBAC is lightweight and header-driven
- `/admin` remains the MVP demo page, while `/console` is still in trial-stage refinement rather than a finalized production frontend
- Validation feeds now have a config-driven remote connector baseline, but no real CG3 / QA / online endpoint has been verified yet
- Ubuntu migration baseline is now established on Node.js `>= 22.13.0`, but future sessions should still start with `npm run check:env`
- Feed connectors now provide first-slice ack / replay semantics, but only local mock verification has passed; real external semantics still need joint verification
- Even though the prototype now listens on `0.0.0.0`, external access still depends on firewall/security-group rules and should not be exposed broadly without extra protection
- `test:concurrency` cannot run inside a sandbox that blocks local port binding; run it on the actual host environment
- Current K8S assets are single-replica MVP assets and still rely on SQLite workspace persistence
- The `200 concurrency/second` target still needs real-host validation
- Runtime HTTP/WS APIs now support the first caller-governance slice, but multi-instance/shared-state caller identity / quota governance is still not implemented
- Unit tests are green, but full integration verification still needs to run on the real host environment
- Split runtime/admin deployment has passed Docker and local `kind` verification, but has not yet been validated on a real target Kubernetes cluster with a real kubeconfig and registry workflow
- Because real target-cluster validation is still missing, deployment risks remain around image pull policy, storage class/PVC behavior, service exposure, cluster RBAC/quota, and rollout sequencing in the actual environment

## Next Recommended Work

Priority 1:

- `JOB-001D` is already closed; the newest `/console` slice was maintenance-only standardization, not new feature work
- `console/client/app.js` now has a shared `renderDenseTable()` helper, and the remaining table-shaped dense sections now consistently use:
  - in-card scrolling
  - default collapse when row count is large
  - the same clipped-edge dense block treatment
- `console/client/app.css` now defines the corresponding `dense-section*` wrapper styles; typography hierarchy remains fixed at:
  - display `30px`
  - page title `28px`
  - metric `32px`
  - section title `20px`
  - card/callout title `18px`
  - body `14px`
  - meta `13px`
  - label/code `12px`
- latest required regressions all passed after this maintenance slice:
  - `cd /Codex/ACDP && npm run smoke:console`
  - `cd /Codex/ACDP && npm run test:console`
  - `cd /Codex/ACDP && npm run test:unit`
  - latest result: `19/19` unit test files passed
- continued `JOB-002` host verification evidence closure:
  - `prototype/src/cli/verify-host-console.js` now infers `.body.html` / `.body.json` evidence extensions even in inject fallback mode, instead of dropping HTML/JSON captures as `.txt`
  - re-ran `npm run verify:host:console` and collected a fresh successful report at:
    - `/Codex/ACDP/prototype/workspace/host_verification/2026-04-03T16-11-07.176Z_host_console_verify/summary.json`
  - this report confirms:
    - `ok=true`
    - `captureMode=inject`
    - `entryIsolation.adminOk=true`
    - `entryIsolation.consoleOk=true`
    - `entryIsolation.adminIndependentFromConsole=true`
  - filled:
    - `notes/manual-checklist.md`
    - `notes/operator-summary.md`
    - `screenshots/README.md`
  - synced the accepted close-out conclusion into:
    - `docs/27-console联调记录模板.md`
  - closure decision:
    - the current sandbox still cannot listen on `127.0.0.1`
    - for this batch, that screenshot gap is accepted and inject HTML/JSON evidence is treated as sufficient close-out evidence
- Use `docs/38-项目JobList与状态清单.md` as the primary project-management view of remaining jobs
- Use `docs/39-控制面数据面架构与RBAC重构方案.md` and `docs/40-控制面数据面实施分解与开发前自审.md` as the implementation baseline
- `JOB-002` is closed for the current scope; keep any future real-host screenshot collection as optional supplemental evidence, not a blocking action
- Continue from non-`JOB-002` work only when a new maintenance issue or a new external-environment task is explicitly opened
- the current visual-only idea for `/console` has now been narrowed into a bounded `JOB-012` maintenance plan:
  - `docs/20260404_console-visual-only-plan.md` is now an execution guardrail, not a redesign brief
  - first round is limited to token/background/radius/shadow/button-hover/label-size tightening
  - dense-section behavior, table structure, page structure, and global typography hierarchy stay unchanged in that round
- the first round of that visual maintenance plan is now implemented in `console/client/app.css`:
  - page background and sidebar no longer use the older blue gradient baseline
  - cards, controls, nav items, and topbar now follow the tighter neutral visual baseline
  - button hover no longer uses the older lift effect
  - `label` text has been raised from `12px` to `13px`
  - dense-section behavior, table structure, and global typography hierarchy remain unchanged by design
- another `JOB-012` maintenance pass has also landed for `/console/terms` list readability:
  - shared table rendering now supports per-page horizontal-scroll hint text, minimum table width, and page-specific table classes
  - the terms list now shows an explicit left-right scroll hint for wide result sets
  - the terms list keeps the checkbox column and standard-term column sticky during horizontal scrolling
  - the earlier attempt to also pin the action column was immediately backed off because it could overlap the right-side create-term area
  - the terms page now also has its own earlier stack breakpoint, so the create-term panel drops below the list before the wide table starts visually colliding with it
  - this stays within maintenance scope and does not change term-center page structure or business fields
- Keep the current `runtime_nodes` ownership rule clear: runtime reports `currentVersion` and heartbeat state; control-plane-owned `desiredVersion` should be written from admin-side control logic
- Keep the current `JOB-002D/002E` boundary clear: control/deploy code path is already in place, but real host/cluster evidence for control-managed mode is still worth补充
- Keep the `JOB-002B` constraint: MinIO endpoint/bucket/credentials/ports remain config-driven only, with no hardcoded values in business code
- Complete real target Kubernetes cluster validation for the split runtime/admin deployment
- Capture the real-cluster rollout, pod/service status, logs, and service-level verification outputs as deployment evidence
- Then consider replacing file-based connectors with real CG3 / QA / online feedback system integration

## Start-Next-Time Checklist

When resuming work next time, do this first:

1. Open `SESSION_HANDOFF.md`
2. Open `docs/12-原型实现与当前能力.md`
3. Check the runtime:
   - `cd /Codex/ACDP && npm run check:env`
4. Run the core local verification set:
   - `cd /Codex/ACDP && npm run test:unit`
   - `cd /Codex/ACDP && npm run test:console`
5. If validating browser/host delivery, run:
   - `cd /Codex/ACDP && npm run smoke:console`
   - `cd /Codex/ACDP && npm run verify:host:console`
   - `cd /Codex/ACDP && npm run smoke:runtime`
   - `cd /Codex/ACDP && npm run smoke:admin`
6. If validating control-managed mode, run:
   - `cd /Codex/ACDP && npm run local:minio:start`
   - `cd /Codex/ACDP && npm run verify:runtime-control -- --artifact-store-mode=configured`
   - `cd /Codex/ACDP && npm run verify:runtime-control -- --artifact-store-mode=file`
   - Use `cd /Codex/ACDP && npm run local:minio:stop` when local MinIO is no longer needed
7. Start the prototype if needed:
   - `cd /Codex/ACDP && npm run start:prototype`
   - or `cd /Codex/ACDP && npm run start:runtime`
   - or `cd /Codex/ACDP && npm run start:admin`
8. Continue with:
   - `treat JOB-002 as closed unless stronger host-side evidence is explicitly requested`
   - `treat JOB-010 as closed unless implementation of the PostgreSQL/object-store roadmap is explicitly resumed`
   - `keep JOB-006 suspended until explicitly resumed`
   - `treat JOB-007 as externally blocked until real `cg3` endpoint/auth/ack conditions are provided`
   - `treat JOB-009 as externally blocked until a real host environment is provided for concurrency testing`
   - `treat JOB-013 as closed for ACDP-CONSOLE-20260404-B01; if new Console IA/structure feedback arrives, open a fresh batch instead of reusing it`
   - `treat JOB-014 as closed for ACDP-CONSOLE-20260404-B02; if new Console second-level-page/detail consistency feedback arrives, open a fresh batch instead of reusing it`
   - `treat JOB-015 as closed for ACDP-CONSOLE-20260404-B03; if new Console convergence/system-consistency feedback arrives, open a fresh batch instead of reusing it`
   - `treat JOB-016 as closed for ACDP-CONSOLE-20260404-B04; if new Console closure/visual-foundation feedback arrives, open a fresh batch instead of reusing it`
   - `treat JOB-017 as closed for ACDP-CONSOLE-20260404-B05; if new Console visual-system work is requested later, open a fresh batch instead of reusing it`
   - `treat JOB-011 as closed unless shared-state quota / production caller-registry work is explicitly requested`
   - `handle new /console feedback only under JOB-012 maintenance`
   - `if the issue is visual-only, follow docs/20260404_console-visual-only-plan.md and do not expand into redesign work`
   - `the current visual round-1 baseline is already landed, so future work should be regression fixes or a deliberately approved round-2 pass`

## Explicit Next Prompt Suggestion

Use this prompt at the start of the next session:

`继续 ACDP 工作，先阅读 docs/38-项目JobList与状态清单.md、docs/40-控制面数据面实施分解与开发前自审.md、SESSION_HANDOFF.md。不要重做背景梳理；JOB-002、JOB-010、JOB-011、JOB-013、JOB-014、JOB-015、JOB-016、JOB-017 已关闭，JOB-006 先挂起；JOB-007 与 JOB-009 当前都属于外部条件阻塞，只有在拿到真实 cg3 endpoint/auth/ack 条件或真实宿主机吞吐环境后再恢复；不要回到 /console 旧收尾批次；继续保持 artifact_store.config.json 驱动，不要把 MinIO 信息硬编码进代码。`
