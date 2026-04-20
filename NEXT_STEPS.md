# ACDP Next Steps

> 此文件由 `project_management/source_of_truth.json` 自动生成。
> 它只保留当前未关闭工作、关闭批次边界和下一次启动动作。

## Current Open Jobs

1. `JOB-006` 真实目标 K8S 集群 split 部署验证
   - 状态：`blocked`
   - 下一步：提供真实 kubeconfig 与镜像仓库后重跑部署验证
2. `JOB-030` `v1.0` R7 真实环境验证与发布准备
   - 状态：`blocked`
   - 下一步：等待 `JOB-006` 与 `JOB-009` 的外部条件就绪后，按 `docs/83` 进入真实部署、真实并发和发布前证据收口
3. `JOB-090` `v1.0` 测试体系建设与流水线验证准备
   - 状态：`in_progress`
   - 下一步：若真实部署与压测资源就绪，则按 `docs/105`~`docs/107` 进入 `L4 ~ L6`；否则保持当前本地 readiness 全绿基线，等待外部条件
4. `JOB-007` validation feeds 真实外部系统集成
   - 状态：`blocked`
   - 下一步：提供真实 `cg3` endpoint/auth/ack 条件后再做联调与证据留档
5. `JOB-009` 并发与吞吐验证
   - 状态：`blocked`
   - 下一步：在目标宿主机运行 `test:concurrency` 基础并发与 `--target-rps 200` 验证；若复用已运行服务，可加 `--base-url`

## Closed Batches

- `JOB-102` | `v1.0` docs 历史文档首批归档收边
- `JOB-101` | `v1.0` 正式文档工作区与单一真源绑定
- `JOB-013` | `/console` B01 信息架构与视觉层级优化批次
- `JOB-014` | `/console` B02 二级工作页与详情页层级一致性批次
- `JOB-015` | `/console` B03 跨页模式收敛与系统感一致性批次
- `JOB-016` | `/console` B04 收尾批次与低风险视觉基础增强

## External Preconditions

- JOB-006 需要真实 kubeconfig / registry / target-cluster access。
- JOB-007 需要真实 cg3 endpoint / auth / ack 条件。
- JOB-009 需要真实宿主机执行并发与吞吐验证。

## First Action Next Time

```bash
cd /Codex/ACDP
npm run pm:brief
npm run pm:check
```

## Sync Commands

```bash
cd /Codex/ACDP
npm run pm:brief
npm run pm:sync
npm run pm:check
```
