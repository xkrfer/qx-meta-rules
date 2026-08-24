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

const KEYWORD_PREFIX = /^keyword:/i;
const SUFFIX_PREFIX = /^\+\./;
const ASN_PREFIX = /^AS/i;
const IPV4_CIDR =
  /^(?:\d{1,3}\.){3}\d{1,3}\/(?:[0-9]|[12][0-9]|3[0-2])$/;
const IPV6_CIDR = /^[0-9a-f:.]+\/(?:[0-9]|[1-9][0-9]|1[0-2][0-8])$/i;
const HOSTNAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i;
const WILDCARD_CHARS = /[*?]/;

export function convertList(input: string): ConvertResult {
  const rules: string[] = [];
  const lines = input.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const mapped = mapLine(raw);
    if (mapped === "skip") {
      continue;
    }
    if (mapped === null) {
      return {
        ok: false,
        lineNumber: i + 1,
        line: raw,
        reason: "unrecognized line",
      };
    }
    rules.push(mapped);
  }

  return {
    ok: true,
    text: rules.length === 0 ? "" : `${rules.join("\n")}\n`,
  };
}

function mapLine(raw: string): string | "skip" | null {
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

  return mapValue(value);
}

function stripInlineComment(line: string): string {
  const hash = line.indexOf("#");
  if (hash === -1) {
    return line;
  }
  return line.slice(0, hash);
}

function mapValue(value: string): string | null {
  if (KEYWORD_PREFIX.test(value)) {
    const keyword = value.replace(KEYWORD_PREFIX, "").trim();
    return keyword === "" ? null : qx("host-keyword", keyword);
  }

  if (WILDCARD_CHARS.test(value)) {
    return qx("host-wildcard", value);
  }

  if (SUFFIX_PREFIX.test(value)) {
    const suffix = value.slice(2).trim();
    return suffix === "" ? null : qx("host-suffix", suffix);
  }

  if (value.includes(":") && IPV6_CIDR.test(value)) {
    return qx("ip6-cidr", value, "no-resolve");
  }

  if (IPV4_CIDR.test(value)) {
    return qx("ip-cidr", value, "no-resolve");
  }

  if (ASN_PREFIX.test(value)) {
    const asn = value.slice(2).trim();
    return /^\d+$/.test(asn) ? qx("ip-asn", asn) : null;
  }

  if (/^\d+$/.test(value)) {
    return qx("ip-asn", value);
  }

  if (HOSTNAME.test(value)) {
    return qx("host", value);
  }

  return null;
}

const PLACEHOLDER_POLICY = "proxy";

function qx(type: string, match: string, extra?: string): string {
  const line = `${type}, ${match}, ${PLACEHOLDER_POLICY}`;
  return extra ? `${line}, ${extra}` : line;
}
