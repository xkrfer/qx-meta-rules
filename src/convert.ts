export type ConvertSuccess = {
  ok: true;
  text: string;
};

export type ConvertFailure = {
  ok: false;
  lineNumber: number;
  line: string;
  reason: string;
};

export type ConvertResult = ConvertSuccess | ConvertFailure;

export type ConvertTarget = "qx" | "loon";

type Rule =
  | { kind: "keyword"; match: string }
  | { kind: "wildcard"; match: string }
  | { kind: "suffix"; match: string }
  | { kind: "ip6"; match: string }
  | { kind: "ip4"; match: string }
  | { kind: "asn"; match: string }
  | { kind: "domain"; match: string };

type Classified = Rule | "skip" | "fail";

const KEYWORD_PREFIX = /^keyword:/i;
const SUFFIX_PREFIX = /^\+\./;
const ASN_PREFIX = /^AS\d+$/i;
const IPV4_CIDR =
  /^(?:\d{1,3}\.){3}\d{1,3}\/(?:[0-9]|[12][0-9]|3[0-2])$/;
const IPV6_CIDR = /^[0-9a-f:.]+\/(?:[0-9]|[1-9][0-9]|1[0-2][0-8])$/i;
const HOSTNAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i;
const WILDCARD_CHARS = /[*?]/;

export function convertList(input: string, target: ConvertTarget = "qx"): ConvertResult {
  const rules: string[] = [];
  const lines = input.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const classified = classifyLine(raw);
    if (classified === "skip") {
      continue;
    }
    if (classified === "fail") {
      return {
        ok: false,
        lineNumber: i + 1,
        line: raw,
        reason: "unrecognized line",
      };
    }
    const mapped = target === "loon" ? emitLoon(classified) : emitQx(classified);
    if (mapped === "skip") {
      continue;
    }
    rules.push(mapped);
  }

  return {
    ok: true,
    text: rules.length === 0 ? "" : `${rules.join("\n")}\n`,
  };
}

function classifyLine(raw: string): Classified {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return "skip";
  }
  if (trimmed.startsWith("#") || trimmed.startsWith(";") || trimmed.startsWith("//")) {
    return "skip";
  }

  const value = stripInlineComment(trimmed).trim();
  if (value === "") {
    return "skip";
  }

  return classifyValue(value);
}

function stripInlineComment(line: string): string {
  const hash = line.indexOf("#");
  if (hash === -1) {
    return line;
  }
  return line.slice(0, hash);
}

function classifyValue(value: string): Classified {
  if (KEYWORD_PREFIX.test(value)) {
    const keyword = value.replace(KEYWORD_PREFIX, "").trim();
    return keyword === "" ? "fail" : { kind: "keyword", match: keyword };
  }

  if (WILDCARD_CHARS.test(value)) {
    return { kind: "wildcard", match: value };
  }

  if (SUFFIX_PREFIX.test(value)) {
    const suffix = value.slice(2).trim();
    return suffix === "" ? "fail" : { kind: "suffix", match: suffix };
  }

  if (value.includes(":") && IPV6_CIDR.test(value)) {
    return { kind: "ip6", match: value };
  }

  if (IPV4_CIDR.test(value)) {
    return { kind: "ip4", match: value };
  }

  if (ASN_PREFIX.test(value)) {
    return { kind: "asn", match: value.slice(2) };
  }

  if (/^\d+$/.test(value)) {
    return { kind: "asn", match: value };
  }

  if (HOSTNAME.test(value)) {
    return { kind: "domain", match: value };
  }

  return "fail";
}

function simpleWildcardSuffix(value: string): string | null {
  if (!value.startsWith("*.")) {
    return null;
  }
  const host = value.slice(2);
  return HOSTNAME.test(host) ? host : null;
}

const PLACEHOLDER_POLICY = "proxy";

function qx(type: string, match: string, extra?: string): string {
  const line = `${type}, ${match}, ${PLACEHOLDER_POLICY}`;
  return extra ? `${line}, ${extra}` : line;
}

function emitQx(rule: Rule): string {
  switch (rule.kind) {
    case "keyword":
      return qx("host-keyword", rule.match);
    case "wildcard":
      return qx("host-wildcard", rule.match);
    case "suffix":
      return qx("host-suffix", rule.match);
    case "ip6":
      return qx("ip6-cidr", rule.match, "no-resolve");
    case "ip4":
      return qx("ip-cidr", rule.match, "no-resolve");
    case "asn":
      return qx("ip-asn", rule.match);
    case "domain":
      return qx("host", rule.match);
  }
}

function emitLoon(rule: Rule): string | "skip" {
  switch (rule.kind) {
    case "keyword":
      return `DOMAIN-KEYWORD,${rule.match}`;
    case "wildcard": {
      const suffix = simpleWildcardSuffix(rule.match);
      return suffix === null ? "skip" : `DOMAIN-SUFFIX,${suffix}`;
    }
    case "suffix":
      return `DOMAIN-SUFFIX,${rule.match}`;
    case "ip6":
      return `IP-CIDR6,${rule.match},no-resolve`;
    case "ip4":
      return `IP-CIDR,${rule.match},no-resolve`;
    case "asn":
      return `IP-ASN,${rule.match},no-resolve`;
    case "domain":
      return `DOMAIN,${rule.match}`;
  }
}
