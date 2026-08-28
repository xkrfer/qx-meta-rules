# qx-meta-rules

本分支是 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat/tree/meta) 转换后的 Loon 原生分流规则，由 [主仓库](https://github.com/xkrfer/qx-meta-rules) 每日自动更新。

在 Loon 的 `[Remote Rule]` 里引用本分支的文件，并用 `policy=` 指定策略。规则正文**不写策略名**，策略只由订阅行决定。

`*.example.com` 会收成 `DOMAIN-SUFFIX,example.com`（会同时命中 `example.com` 本身）。含 `?` 或无法写成 `*.` + 合法主机名的通配会被跳过。

`IP-CIDR` / `IP-CIDR6` / `IP-ASN` 会带 `no-resolve`，避免为匹配 IP 规则去解析域名。

## 订阅

```ini
[Remote Rule]
https://raw.githubusercontent.com/xkrfer/qx-meta-rules/loon/geo/geosite/google.list, policy=PROXY, tag=Google, enabled=true
https://raw.githubusercontent.com/xkrfer/qx-meta-rules/loon/geo/geoip/cn.list, policy=DIRECT, tag=CN, enabled=true
```

路径与上游一致，例如：

- `geo/geosite/<name>.list`
- `geo/geoip/<name>.list`
- `geo-lite/...`
- `asn/...`

上游 `classical/` 目录是 Clash 规则语法，与同名 `.list` 内容重复，不会转换。

未设置 `policy=` 时，这些规则可能不会按你期望的策略生效。
