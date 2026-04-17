# secrets-template

部署时至少需要准备：

- `ACDP_RUNTIME_TOKEN`
- `ACDP_RUNTIME_CONTROL_REGISTRATION_SECRET`
- 制品仓访问凭据

要求：

- 不把真实密钥写入仓库
- 只通过部署环境的 secret 注入
- admin 与 runtime 的 secret 分开管理
