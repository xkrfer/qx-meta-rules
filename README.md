# qx-meta-rules

每天把 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat/tree/meta) 的 `.list` 转成 Quantumult X 与 Loon 原生分流规则，分别发布在 `release` 与 `loon` 分支。

## Quantumult X

消费侧**不要**用 resource-parser。在 QX 的 `[filter_remote]` 里引用转换后的文件，并用 `force-policy` 指定策略组。

QX 要求每行必须带第三段策略，否则更新资源会报 `invalid line`。转换结果会写占位策略 `proxy`；设置了 `force-policy` 后，QX 会忽略这个占位值，改用你指定的策略组。

`ip-cidr` / `ip6-cidr` 会额外带 `no-resolve`，避免为匹配 IP 规则去解析域名。

```ini
[filter_remote]
https://raw.githubusercontent.com/xkrfer/qx-meta-rules/release/geo/geosite/google.list, tag=Google, force-policy=proxy, enabled=true
https://raw.githubusercontent.com/xkrfer/qx-meta-rules/release/geo/geoip/cn.list, tag=CN, force-policy=direct, enabled=true
```

未设置 `force-policy` 时，这些规则可能不会按你期望的策略生效。

## Loon

在 Loon 的 `[Remote Rule]` 里引用 `loon` 分支的文件，并用 `policy=` 指定策略。规则正文不写策略名。

`*.example.com` 会收成 `DOMAIN-SUFFIX,example.com`。含 `?` 或非 `*.host` 的通配会被跳过。`IP-CIDR` / `IP-CIDR6` / `IP-ASN` 带 `no-resolve`。

```ini
[Remote Rule]
https://raw.githubusercontent.com/xkrfer/qx-meta-rules/loon/geo/geosite/google.list, policy=PROXY, tag=Google, enabled=true
https://raw.githubusercontent.com/xkrfer/qx-meta-rules/loon/geo/geoip/cn.list, policy=DIRECT, tag=CN, enabled=true
```

未设置 `policy=` 时，这些规则可能不会按你期望的策略生效。

## 路径

路径与上游一致，例如：

- `geo/geosite/<name>.list`
- `geo/geoip/<name>.list`
- `geo-lite/...`
- `asn/...`

上游 `classical/` 目录是 Clash 规则语法，与同名 `.list` 内容重复，不会转换。

## 本地开发

需要 [Bun](https://bun.sh)。

```bash
bun test
bun src/cli.ts convert path/to/file.list
bun src/cli.ts convert path/to/file.list --target loon
bun src/cli.ts sync
bun src/cli.ts sync --target loon
```

本地转换默认写到 `.tmp/`（已 gitignore）。
