# qx-meta-rules

本分支是 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat/tree/meta) 转换后的 Quantumult X 原生分流规则，由 [主仓库](https://github.com/xkrfer/qx-meta-rules) 每日自动更新。

消费侧**不要**用 resource-parser。在 QX 的 `[filter_remote]` 里引用本分支的文件，并用 `force-policy` 指定策略组。

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

上游 `classical/` 目录是 Clash 规则语法，与同名 `.list` 内容重复，不会转换。

未设置 `force-policy` 时，这些规则可能不会按你期望的策略生效。
