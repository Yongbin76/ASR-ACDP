# 原始数据源清单

## 目录说明

- `data_sources/raw/shanghai_roads/`：上海路名原始资料
- `data_sources/raw/shanghai_government/`：上海政府部门原始资料

## 当前已同步文件

1. 上海路名原始资料
   - 项目内副本：`data_sources/raw/shanghai_roads/shanghai_all_roads.txt`
   - 原始来源：历史线下采集目录中的 `shanghai_all_roads.txt`，当前运行以项目内副本为准
   - 说明：原始文本资料，后续需要单独解析与结构化

2. 上海政府部门原始资料
   - 项目内副本：`data_sources/raw/shanghai_government/shanghai_government_complete.csv`
   - 原始来源：历史线下采集目录中的 `shanghai_government_complete.csv`，当前运行以项目内副本为准
   - 说明：结构化 CSV，可直接进入清洗流程

## 使用约定

- 原始资料只保留，不直接手工修改
- 后续清洗结果输出到 `data_sources/cleaned/`
- 词典候选和发布版本不直接读取外部路径，以项目内副本为准
