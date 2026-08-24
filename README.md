# qx-rules

每天把 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat/tree/meta) 的 `.list` 转成 Quantumult X 原生分流规则，发布在 `release` 分支。

消费侧**不要**用 resource-parser。在 QX 的 `[filter_remote]` 里引用转换后的文件，并用 `force-policy` 指定策略组。

QX 要求每行必须带第三段策略，否则更新资源会报 `invalid line`。转换结果会写占位策略 `proxy`；设置了 `force-policy` 后，QX 会忽略这个占位值，改用你指定的策略组。

`ip-cidr` / `ip6-cidr` 会额外带 `no-resolve`，避免为匹配 IP 规则去解析域名。

## 订阅

```ini
[filter_remote]
https://raw.githubusercontent.com/xkrfer/qx-meta-rules/release/geo/geosite/google.list, tag=Google, force-policy=proxy, enabled=true
https://raw.githubusercontent.com/xkrfer/qx-meta-rules/release/geo/geoip/cn.list, tag=CN, force-policy=direct, enabled=true
```

路径与上游一致，例如：

- `geo/geosite/<name>.list`
- `geo/geoip/<name>.list`
- `geo-lite/...`
- `asn/...`

未设置 `force-policy` 时，这些规则可能不会按你期望的策略生效。

## 本地开发

需要 [Bun](https://bun.sh)。

```bash
bun test
bun src/cli.ts convert path/to/file.list
bun src/cli.ts sync
```

本地转换默认写到 `.tmp/`（已 gitignore）。
