# deployment_bundle

本目录作为 `v1.0` 部署交付包模板。

交付时至少应补齐：

- `images/image-tags.json`
- `k8s/` 下的部署 YAML
- `env/` 下的环境变量样例
- `secrets/` 下的密钥说明
- `docs/` 下的部署与回滚文档

当前模板只提供结构和样例，不包含真实密钥或真实镜像地址。
