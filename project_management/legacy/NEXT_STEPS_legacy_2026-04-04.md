# ACDP Next Steps

## Next Work To Do

1. `JOB-012`、`JOB-008`、`JOB-010`、`JOB-011`、`JOB-013`、`JOB-014`、`JOB-015`、`JOB-016`、`JOB-017` are now closed for the current round:
   - do not continue any of these closed batches by default
   - if `/console` gets new regression feedback or feed/template docs drift again, reopen as a fresh maintenance batch
2. Use `/Codex/ACDP/docs/42-console人工故障复盘与演示商用推进计划.md` as the demo-day and small-scale-commercial execution baseline
3. Return to the non-console follow-up line explicitly:
   - `JOB-001A` through `JOB-001D` are done
   - `/console` is no longer the active unfinished mainline
   - `JOB-002` is closed for the current authorized scope
   - `JOB-007` local connector work is done and the remaining work is now externally blocked
   - `JOB-009` also remains externally blocked by real host conditions
   - `JOB-013` has now been completed for `ACDP-CONSOLE-20260404-B01`; the B01 Console IA batch is no longer pending work
   - `JOB-014` has now been completed for `ACDP-CONSOLE-20260404-B02`; the B02 second-level/detail consistency batch is no longer pending work
   - `JOB-015` has now been completed for `ACDP-CONSOLE-20260404-B03`; the B03 convergence/system-consistency batch is no longer pending work
   - `JOB-016` has now been completed for `ACDP-CONSOLE-20260404-B04`; the B04 closure/visual-foundation batch is no longer pending work
   - `JOB-017` has now been completed for `ACDP-CONSOLE-20260404-B05`; the B05 visual-system upgrade batch is no longer pending work
   - `JOB-010` SQLite-after roadmap is now also closed
   - `JOB-011` first-slice WebSocket governance is now also closed
   - `JOB-006` is suspended until explicitly resumed
4. If `/console` gets a visual-only maintenance request, use `/Codex/ACDP/docs/20260404_console-visual-only-plan.md` as the guardrail:
   - round 1 only covers token/background/radius/shadow/button-hover/label-size tightening
   - do not turn it into table/dense-section/page-structure redesign
   - round 1 is already implemented in `console/client/app.css`; future work should be regression-only unless round 2 is explicitly approved
5. The latest closed `/console` maintenance baseline now includes:
   - wide term-list results now show an explicit horizontal-scroll hint
   - checkbox / standard-term columns stay visible while scrolling horizontally
   - do not pin the right-side action column again unless the terms page layout is changed together
   - the terms page no longer uses the right-side create panel layout; it now follows a top create-form + lower result-list vertical workflow
   - the create-term form is now a dedicated three-column grid and only falls back to one column on narrow screens
   - release review now distinguishes:
     - submitter-vs-reviewer conflict
     - dual-approval duplicate-reviewer conflict
     - remaining approval guidance for different reviewers
   - the terms table page-level `minWidth` has also been reduced once, so if future feedback returns, tighten stacking before adding more sticky columns or bespoke table layout logic
   - reuse the same page-specific approach if another single page needs the same treatment; do not roll it out blindly to all tables
6. Treat the newly landed unified backend UX baseline as mandatory follow-through, not a one-page patch:
   - route-level cached first-paint + background refresh
   - active/recovered runtime issue lifecycle presentation
   - in-card scroll clipping for dense content regions
7. Preserve the landed `/console` baseline without scope creep:
   - do not turn maintenance fixes into another feature round
   - keep workbench / release / runtime UX fixes aligned with the same business-first rule if regressions appear
   - backend-generated summaries that still leak raw technical words outside the now-cleaned release detail gate/validation blocks
8. Keep `/console/help/trial` aligned with the actual RBAC/source-of-truth implementation:
   - built-in trial users
   - assigned-role switching limits
   - page access vs. action gating
   - current trial-only restrictions
9. Keep the new overview runtime-demo panel useful but bounded:
   - it should stay a lightweight demo/verification entry, not grow into another standalone runtime page
   - continue controlling overview information density while keeping the demo path visible
10. Keep the top identity switcher strict and deterministic:
   - user must stay select-only
   - role options must keep following the selected user's assigned roles
   - do not reintroduce free-form operator editing in the console UI
11. After each completed batch, update:
   - `docs/38-项目JobList与状态清单.md`
   - `SESSION_HANDOFF.md`
   - `NEXT_STEPS.md`
12. During code changes, keep the implementation discipline explicit:
   - function comments must cover purpose/input/output
   - config parameters must keep their purpose documented
   - each batch must end with self-test and a reported result
13. Keep `JOB-002B` residual items explicit while console work continues:
   - local configured/file control-managed verification already passes
   - host-level env-injected configured verification now also passes
   - `artifact_store.config.json` already supports `*Env` injection
   - docker-backed local MinIO remains the default local verification baseline
12. Reuse `k8s/artifact-store-secret.example.yaml` plus the updated runtime/admin deployments as the first target-cluster injection baseline
13. Preserve `npm run verify:runtime-control -- --artifact-store-mode=configured` and `npm run verify:runtime-control -- --artifact-store-mode=file` as dual local/host regression baselines
14. Use `npm run check:control-config -- --require-env-sources` as the final preflight before switching a real target cluster to env-injected control-managed mode
15. `JOB-002B` host-level gap is now closed; the next remaining blocker has moved to target-cluster access:
   - `kubectl config current-context` is empty on the current host
   - no real target-cluster kube context / kubeconfig has been provided yet
   - `npm run check:k8s-target` now provides the canonical preflight result for this blocker
16. In the current sandbox/local shell, note the new explicit local execution blocker when present:
   - `npm run local:minio:status` may return `container.blocker=docker_socket_permission_denied`
17. After `JOB-001D` closure, continue real target cluster control-managed verification only when the work shifts out of `/console`
18. Then continue with real target cluster split deployment evidence consolidation
19. Re-run the split K8S deployment validation on a real target cluster, not only local `kind`
20. If real target-cluster validation is deferred, explicitly carry the deployment risk in handoff and release notes
21. `JOB-007` is no longer a local-only follow-up item:
   - local connector contract / preflight / mock verification are already done
   - remaining work is real `cg3` endpoint/auth/ack 联调与证据留档
   - external prerequisites source of truth: `/Codex/ACDP/docs/46-JOB-007与JOB-009外部条件清单.md`
22. Use the landed `JOB-007` baseline instead of reopening connector design from scratch:
   - source of truth: `/Codex/ACDP/docs/45-validation-feed外部connector首轮契约.md`
   - config file: `/Codex/ACDP/prototype/config/validation_feed_connectors.config.json`
   - preflight command: `cd /Codex/ACDP && npm run check:validation-feeds -- --source-type cg3 --require-remote-configured --require-ack-configured`
   - local mock verification: `cd /Codex/ACDP && npm run verify:validation-feeds`
   - current supported transports:
     - `file_inbox`
     - `http_pull_json`
   - current supported recovery semantics:
     - delivery receipt dedupe
     - cursor-based incremental pull
     - optional `http_post` ack
     - `replayErrors`
   - first real source stays `cg3`
23. Keep file-based connector docs and feed examples in sync when source payloads change:
   - reuse `prototype/tests/unit/template-assets-docs.test.js`
   - keep template/example assets, `validation_feed_examples.json`, `docs/19`, `docs/12`, and `prototype/README.md` green together
24. `JOB-009` is also no longer a local-only follow-up item:
   - local script and stats readiness are already done
   - remaining work is real host execution of `test:concurrency` and `--target-rps 200`
   - external prerequisites source of truth: `/Codex/ACDP/docs/46-JOB-007与JOB-009外部条件清单.md`
25. `JOB-013` is now a closed Console IA batch:
   - batch id: `ACDP-CONSOLE-20260404-B01`
   - current status: implemented and closed
   - completed task cards:
     - `T01`
     - `T02`
     - `T03`
     - `T04`
     - `T05`
     - `T06`
   - do not mix any future Console IA round into closed `JOB-001D` / `JOB-012` / `JOB-013`
26. `JOB-014` is now a closed Console detail-consistency batch:
   - batch id: `ACDP-CONSOLE-20260404-B02`
   - current status: implemented and closed
   - completed task cards:
     - `T01`
     - `T02`
     - `T03`
     - `T04`
     - `T05`
     - `T06`
   - do not mix any future Console detail-consistency round into closed `JOB-001D` / `JOB-012` / `JOB-013` / `JOB-014`
27. `JOB-015` is now a closed Console convergence/system-consistency batch:
   - batch id: `ACDP-CONSOLE-20260404-B03`
   - current status: implemented and closed
   - completed task cards:
     - `T01`
     - `T02`
     - `T03`
     - `T04`
     - `T05`
     - `T06`
   - do not mix any future Console convergence round into closed `JOB-013` / `JOB-014` / `JOB-015`
28. `JOB-016` is now a closed Console closure/visual-foundation batch:
   - batch id: `ACDP-CONSOLE-20260404-B04`
   - current status: implemented and closed
   - completed task cards:
     - `T01`
     - `T02`
     - `T03`
     - `T04`
      - `T05`
   - do not mix any future Console closure/visual-foundation round into closed `JOB-013` / `JOB-014` / `JOB-015` / `JOB-016`
29. `JOB-017` is now a closed Console visual-system batch:
   - batch id: `ACDP-CONSOLE-20260404-B05`
   - current status: implemented and closed
   - completed task cards:
     - `T01`
     - `T02`
     - `T03`
     - `T04`
     - `T05`
   - keep any future visual-system round as a fresh batch; do not spend it on page-level one-off patches
30. If demo acceptance needs it, run `npm run test:concurrency -- --users 1..5 --iterations N` on the target host
31. If moving beyond MVP K8S rollout, implement the `docs/44-SQLite之后状态管理升级路线.md` baseline instead of reopening state-management planning from scratch
32. Run a real-host throughput test toward `--target-rps 200` and record the result
33. Preserve the landed WebSocket governance baseline and only reopen it if production shape changes:
   - current baseline is no longer "Bearer Token only"; keep docs/handoff wording aligned to the landed caller-governance slice
   - `GET /ws/runtime/correct` now supports registered caller identity, caller secret, caller/ip blacklist, and caller-level quota
   - `GET /api/runtime/stats` now exposes `websocketGovernance`
   - use `/Codex/ACDP/docs/43-WebSocket caller identity 与 quota 治理首轮方案.md` plus `/Codex/ACDP/docs/2026-04-02/02-配置参数说明.md`
   - if runtime moves to multi-instance external WebSocket service, then plan shared quota state and control-plane managed caller registry
34. Preserve the landed post-SQLite roadmap baseline and only reopen `JOB-010` when implementation starts:
   - use `/Codex/ACDP/docs/44-SQLite之后状态管理升级路线.md` as the source of truth
   - the current recommended target is `PostgreSQL + MinIO/object storage + runtime-local SQLite/JSON`
   - do not reopen abstract "SQLite 是否够用"讨论 unless deployment shape has materially changed

## First Action Next Time

Run:

```bash
cd /Codex/ACDP
sed -n '1,240p' docs/38-项目JobList与状态清单.md
sed -n '1,260p' docs/39-控制面数据面架构与RBAC重构方案.md
sed -n '1,260p' docs/40-控制面数据面实施分解与开发前自审.md
```

Then continue from:

- inspect `docs/38-项目JobList与状态清单.md` and continue from `JOB-007` / `JOB-009` only when real external conditions are provided; otherwise do not reopen local feature work
- treat the landed `/console` closure baseline as frozen:
  - `GET /api/console/workbench`
  - `GET /api/console/runtime-control`
  - `POST /api/console/runtime-control/desired-version`
  - `GET /api/console/runtime-control/evidence/{reportId}`
  - release detail confirmation / evidence section
- keep `JOB-002` closed and only reopen `/console` for maintenance-grade regressions
- keep `JOB-007` blocked until real external conditions are provided:
  - `prototype/src/lib/validation-feed-importer.js` is now the single connector entry for validation feed import
  - `prototype/config/validation_feed_connectors.config.json` is the source of truth for source transport/auth/ack config
  - default next step is real `cg3` endpoint/auth/ack verification, not more local feature expansion
- keep `JOB-009` blocked until a real host environment is provided:
  - `test:concurrency` and runtime stats are ready
  - what is missing is only host-side execution and evidence capture
- keep `JOB-013` closed:
  - it belongs to `ACDP-CONSOLE-20260404-B01`
  - all six task cards have landed in `console/client/app.js` + `console/client/app.css`
  - if future Console IA/structure feedback appears, open a fresh batch instead of widening or reusing `JOB-013`
- keep `JOB-014` closed:
  - it belongs to `ACDP-CONSOLE-20260404-B02`
  - all six B02 task cards have landed in `console/client/app.js` + `console/client/app.css`
  - if future Console second-level-page/detail consistency feedback appears, open a fresh batch instead of widening or reusing `JOB-014`
- keep `JOB-015` closed:
  - it belongs to `ACDP-CONSOLE-20260404-B03`
  - all six B03 task cards have landed in `console/client/app.js` + `console/client/app.css`
  - if future Console convergence/system-consistency feedback appears, open a fresh batch instead of widening or reusing `JOB-015`
- keep `JOB-016` closed:
  - it belongs to `ACDP-CONSOLE-20260404-B04`
  - all five B04 task cards have landed in `console/client/app.js` + `console/client/app.css`
  - if future Console closure/visual-foundation feedback appears, open a fresh batch instead of widening or reusing `JOB-016`
- keep `JOB-017` closed:
  - it belongs to `ACDP-CONSOLE-20260404-B05`
  - all five B05 task cards have landed in `console/client/app.js` + `console/client/app.css`
  - if future Console visual-system work is requested, open a fresh batch instead of widening or reusing `JOB-017`
- keep `JOB-010` closed for the current planning scope:
  - `docs/44-SQLite之后状态管理升级路线.md` is now the single upgrade baseline for post-SQLite state management
  - future work should reopen only when the PostgreSQL/object-store migration actually starts
- keep `JOB-011` closed for the current first-slice scope:
  - `prototype/src/lib/runtime-ws-governance.js` is now the single governance entry for runtime WebSocket caller identity / quota / blacklist
  - `prototype/config/app.config.json` + `docs/2026-04-02/02-配置参数说明.md` are the source of truth for new WebSocket governance config
  - future work should reopen only when shared-state quota, control-plane registry, or stronger production governance is actually needed
- the first `JOB-001D` slice already landed:
  - import detail aggregation optimization
  - validation detail / related-terms direct query optimization
  - workbench validation canonical-set direct query
  - reviews / validation-cases paged-query optimization
  - runtime-nodes current-page aggregation optimization
  - releases paged-query optimization
  - runtime-control evidence direct-read optimization
  - runtime pages default manual-refresh behavior
  - access-meta caching by operator/role
  - runtime issue classification and recovery hinting
  - first pass of unified in-card scrolling for data-heavy regions
- the second `JOB-001D` slice also landed:
  - runtime-nodes real backend pagination with SQL-level status/env filtering
  - runtime-node unified issue lifecycle in console APIs
  - runtime detail recovered-vs-active issue presentation
  - route-level cached first-paint with background refresh
  - stronger in-card scroll-edge clipping
- the latest doc/help slice also landed:
  - `/console/help/trial` now explains the real trial user/RBAC model and restrictions
  - `docs/26-console内部试用说明.md` synced to the same wording
- the latest identity-switcher slice also landed:
  - current user is now select-only with a default value
  - current role now follows the selected user's assigned roles
- the latest overview-demo slice also landed:
  - `/console` overview now includes a first-class “输入与纠错演示” panel
  - users can run `/api/simulate` directly in the new backend and inspect corrected output plus hit details
  - the admin-only regression was fixed by moving the panel to `/api/console/runtime-demo/*` mirror endpoints
- the latest runtime-control slice also landed:
  - runtime control view now refreshes presigned artifact download URLs instead of replaying stale stored URLs
  - this specifically addresses delayed runtime syncs failing with MinIO `403 Forbidden`
- the latest runtime-aggregation slice also landed:
  - failed-apply workbench reads now use direct apply-status filtering
  - rollout summary now uses SQL-level target-version aggregation
  - rollout attention nodes now use direct ordered reads
- the latest typography/copy slice also landed:
  - console now has an explicit font-size hierarchy
  - a first batch of high-frequency English UI labels was converted to Chinese
  - a first batch of high-frequency flash/action feedback copy was converted to Chinese
- the newest standardization slice also landed:
  - `terms / import / reviews / validation` pages now hide more raw `categoryCode / riskLevel / importType / jobType / decision` values behind Chinese labels
  - review target summaries from backend aggregation were aligned to the same Chinese terminology
  - the shared typography hierarchy now also covers metric values, callout titles, review meta, template code subtitles, empty states, and code blocks
  - term detail / term validation / import home / import job detail switched from avoidable serial reads to parallel reads
- the latest summary-copy slice also landed:
  - workbench summary items now use more Chinese-first subtitles/details
  - release confirmation / gate / validation tables now translate blocker codes, validation types, and common failure reasons
  - remaining overview/release/validation table `categoryCode` displays were reduced further
  - runtime issue wording no longer shows `desiredVersion / artifact metadata` directly to end users
- the latest query-tightening slice also landed:
  - term-to-validation related-case counts now use direct SQL counting instead of loading up to 500 validation cases into memory
  - workbench “待关注样本” now reads unmatched enabled samples directly instead of comparing full term canonicals against up to 500 cases in JS
  - release gate pending term/pinyin-review checks now read review tasks directly by target term ids instead of using `listReviewTasks(...limit=500)` plus in-memory filtering
  - overview pending-review count now uses paged-query totals instead of a capped `limit=200` list length
- the latest layout slice also landed:
  - terms / import / validation pages now share a `layout-priority-main` rule for “wide table + right-side action rail” layouts
  - these pages collapse earlier into a vertical stack on medium widths instead of waiting for the global narrow breakpoint
  - this specifically fixes the terms-page overlap reported in `/test/ACDP/词条中心（界面交叉，数据列表没有按规则统一）_2026-04-02_210326_578.png`
- the latest gate-cost slice also landed:
  - release validation summaries are now cached by snapshot state + enabled validation-case version
  - repeated workbench / release-list / dashboard / gate reads no longer rerun the same snapshot validation loop when underlying inputs have not changed
- the latest blocked-release aggregation slice also landed:
  - `buildWorkbenchBlockedReleaseSection()` no longer uses `listReleases()` full reads plus per-release gate scans; it now walks paged release chunks and keeps an exact blocked count
  - console release-list reads now reuse a page-level `buildReleaseGateSummaryMap()` result instead of recomputing database gate scans row by row
  - release database gate blockers and release terms can now be read in batch form from `platform-db`
  - validation fallback file state now participates in the validation cache key when DB-enabled cases are absent
- the latest release-detail helper slice also landed:
  - release-list approval summaries now batch per page instead of calling three approval helpers per row
  - release detail now reuses preloaded release / release-terms / runtime-control inputs across approval, gate, rollout, and term-change sections
  - runtime-control evidence lists now cache parsed host-verification summaries until the directory state changes
- the latest review-helper slice also landed:
  - review-list target summaries now batch live term/release lookups per page instead of per-row reads
  - review detail still reuses the same summary path to keep wording consistent with the list
- the latest shared admin-release slice also landed:
  - screenshot directory is confirmed at `/test/ACDP/`
  - `/api/admin/dashboard` release totals / blocked counts now read paged release chunks instead of repeating full release scans
  - `/api/admin/releases` now walks paged release chunks and reuses page-level summaries/gate maps instead of the older all-release path
- the latest error-copy slice also landed:
  - `/test/ACDP/版本发布报错.png` has been traced to raw backend error text surfacing in the console
  - common release/review/import/runtime error codes now map to Chinese-first action/page failure copy in the console client
- the latest confirmation-guidance slice also landed:
  - release detail now shows a compact “建议先处理” guidance callout in the confirmation section
  - the card reuses existing confirmation issues instead of introducing another workflow surface
- the latest overview/runtime-finishing slice also landed:
  - `GET /api/console/workbench` now includes `highlights` so the overview page can surface a small “先处理什么” card set from existing workbench results
  - the overview page now hides empty duplicate workbench sections instead of repeatedly rendering blank panels below the combined workbench blocks
  - `GET /api/console/runtime-nodes` now includes `issueSummary` and keeps current-page nodes ordered by `active -> warning -> recovered -> healthy`
  - the runtime list page now explains current vs. historical exceptions from that summary instead of leaving users to infer lifecycle from a single status cell
  - `console/client/app.js` also had a latent invalid object key for `'runtime control evidence not found'`; this is now quoted so the client bundle is valid JavaScript
- the latest release-validation-cap slice also landed:
  - `prototype/src/lib/release-gates.js` no longer reads enabled validation cases through the older `limit=500` path
  - release validation now uses all enabled DB cases, so release gate / confirmation results will not silently drop rows after the 500th sample
  - regression coverage now includes a 510-case scenario to keep this from regressing
- the latest help/runtime-detail slice also landed:
  - `/api/console/help/{slug}` now exposes `sourceDocPath`, and `/api/console/help/{slug}/source` can download the corresponding Markdown original
  - help detail pages now provide explicit “返回帮助中心 / 下载 Markdown 原文” actions instead of assuming browser-side repo path access
  - runtime node detail pages now keep raw last-error strings and presigned artifact URLs behind folded technical-details blocks
  - the primary runtime callout remains business explanation + recovery guidance first
- the latest release-confirmation-rollout-summary slice also landed:
  - `getConsoleRuntimeRollout()` now returns a backend-owned `guidance` object for “未下发 / 失败 / 待收敛 / 离线 / 已完成收敛” states
  - `buildReleaseConfirmation()` now exposes more direct summary counters for blocker count, validation coverage, skipped smoke validation, and node coverage
  - release detail now consumes those backend summaries directly instead of continuing to spread equivalent判断 across frontend sections
  - the remaining mixed wording `Gate 未通过` has been unified to `发布门禁未通过`
- the latest release-detail-business-first slice also landed:
  - `getConsoleReleaseDetail()` now preformats release gate blockers and validation cases into console-facing display fields
  - release detail “发布门禁结果 / 验证结果” now shows business explanation first and keeps raw `taskId / snapshotPath / error / sampleText / validationMode / channel / action` behind folded technical details
  - release detail no longer depends on frontend raw-code / JSON fallback rendering for those two heavy sections
- the latest workbench-blocked-release slice also landed:
  - `buildWorkbenchBlockedReleaseSection()` now reads database gate blockers first and only runs validation scans for releases not already blocked by database gates
  - validation-only blocked releases are still counted, but releases already blocked by term status / pending review no longer pay the extra validation scan cost in the workbench path
- the latest workbench-offline-runtime slice also landed:
  - `buildWorkbenchOfflineRuntimeSection()` now reads offline runtime nodes directly instead of routing through the heavier runtime-node list aggregation path
  - the overview workbench no longer pays request-summary / peak / issue-summary costs for this five-row section
- the latest workbench-import-light slice also landed:
  - `buildWorkbenchImportSection()` now reads `preview_ready` import jobs directly and only batches preview-row statistics
  - the overview workbench no longer pays import-list `resultSummary` / `getImportJobResult()` costs for this five-row section
- the latest workbench-review-validation-light slice also landed:
  - `buildWorkbenchReviewSection()` now reads `status=pending` review tasks directly for the homepage block and keeps the same batched target-summary wording
  - `buildWorkbenchValidationSection()` now reads unmatched enabled validation cases directly for the homepage block
  - both sections now keep exact totals while capping visible items at 5 without page-level pagination wrappers
- the latest runtime-rollout-attention slice also landed:
  - `getConsoleRuntimeRollout()` now reads rollout attention nodes through one backend-owned query instead of taking a target-version list and re-sorting it in JS
  - release detail and `/api/console/runtime-control` now share the same rollout attention row builder
  - regression coverage now fixes the expected order for untouched / failed / pending / offline-aligned / healthy-aligned nodes
- the latest release-gate-validation-unification slice also landed:
  - `/api/console/releases/{releaseId}/gate` and `/api/console/releases/{releaseId}/validation` now reuse the same console-formatted gate/validation sections already used by release detail
  - this closes the last release-side side-route gap where raw blocker codes or raw validation payloads could still leak outside the main detail path
- the latest dense-table standardization slice also landed:
  - `console/client/app.js` now has a shared `renderDenseTable()` helper for card-internal scrolling + large-result default collapse
  - remaining table-shaped dense sections across overview/runtime/terms/import/releases/validation now use the same scroll/fold treatment instead of mixing raw tables and ad hoc wrappers
  - `console/client/app.css` now includes `dense-section*` styles for the folded dense-block shell
  - this was a maintenance-only standardization pass; it did not expand `/console` feature scope
- the latest required verification set also passed after the current close-out batch:
  - `npm run smoke:console`
  - `npm run test:console`
  - `npm run test:unit`
  - latest result: `23/23` unit test files passed
- next focus should be:
  - wait for real `cg3` endpoint/auth/ack conditions or real host throughput environment
  - do not reopen `JOB-013`; if new Console IA/structure feedback appears, start a fresh batch
  - do not expand local `/console` or connector feature scope while `JOB-007` / `JOB-009` are externally blocked
  - keep `JOB-006` explicitly blocked until kube context / target-cluster access is actually provided
  - if `/console` receives new regression feedback, reopen it as a fresh `JOB-012` maintenance batch with the same test/doc update discipline
- the latest `JOB-002` sandbox report is now:
  - `/Codex/ACDP/prototype/workspace/host_verification/2026-04-03T16-11-07.176Z_host_console_verify/summary.json`
  - it already has filled `notes/manual-checklist.md` and `notes/operator-summary.md`
  - it ran in `captureMode=inject` because the current sandbox cannot listen on `127.0.0.1`
  - screenshots still must be captured on a real host browser; do not treat inject evidence as screenshot-equivalent
- keep the next change scoped to `JOB-007` / `JOB-009`, real target-cluster work, PostgreSQL/object-store roadmap implementation, or a newly reopened maintenance batch
- inspect `prototype/workspace/host_verification/*runtime_control_verify*/summary.json`
- keep `artifact_store.config.json` as the only source of MinIO connection settings
- refer to `docs/41-本地MinIO与制品仓凭据注入说明.md`
- use `npm run local:minio:start` / `npm run local:minio:status` / `npm run local:minio:stop` for local MinIO lifecycle
- treat docker-backed local MinIO as the default local verification baseline
- use `artifactStore.localCredentialMode.active` from `check:control-config` as the explicit signal that env migration is still incomplete
- run `npm run check:control-config` before collecting the real target-host verification evidence
- the host-level env-injected verification evidence is now:
  - `/Codex/ACDP/prototype/workspace/host_verification/2026-04-02T06-36-35.369Z_runtime_control_verify_configured/summary.json`
- run `npm run check:control-config -- --require-env-sources` on the real target cluster host before treating cluster-side env migration as complete
- keep `npm run verify:runtime-control -- --artifact-store-mode=configured` and `npm run verify:runtime-control -- --artifact-store-mode=file` as the local/host real HTTP regression checks
- use `k8s/artifact-store-secret.example.yaml` and the updated runtime/admin deployments as the target-cluster env injection baseline
- then provide a real kube context / kubeconfig, re-run `npm run check:k8s-target`, and continue target-cluster split deployment validation
