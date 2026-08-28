import { describe, expect, test } from "bun:test";
import { convertList } from "../src/convert";

const fixtures = import.meta.dir + "/fixtures";

describe("convertList", () => {
  test("maps supported lines to QX rules", async () => {
    const input = await Bun.file(`${fixtures}/success.list`).text();
    const expected = await Bun.file(`${fixtures}/success.qx`).text();
    const result = convertList(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe(expected);
    }
  });

  test("skips comment-only input and emits an empty file", async () => {
    const input = await Bun.file(`${fixtures}/comments-only.list`).text();
    const result = convertList(input);
    expect(result).toEqual({ ok: true, text: "" });
  });

  test("fails on classical clash rules", async () => {
    const input = await Bun.file(`${fixtures}/fail-classical.list`).text();
    const result = convertList(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.line).toContain("DOMAIN-SUFFIX");
    }
  });

  test("fails on regexp lines", async () => {
    const input = await Bun.file(`${fixtures}/fail-regexp.list`).text();
    const result = convertList(input);
    expect(result.ok).toBe(false);
  });

  test("fails the whole file when valid and invalid lines mix", async () => {
    const input = await Bun.file(`${fixtures}/fail-mixed.list`).text();
    const result = convertList(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.text).toBeUndefined();
    }
  });

  test("emits converted rules without an update header", () => {
    const result = convertList("+.google.com\n");
    expect(result).toEqual({
      ok: true,
      text: "host-suffix, google.com, proxy\n",
    });
  });

  test("does not treat hostnames starting with as as ASN", () => {
    const result = convertList("assets.ppy.sh\nasusrouter.com\nAS6185\n");
    expect(result).toEqual({
      ok: true,
      text: "host, assets.ppy.sh, proxy\nhost, asusrouter.com, proxy\nip-asn, 6185, proxy\n",
    });
  });
});

describe("convertList loon", () => {
  test("maps supported lines to Loon rules", async () => {
    const input = await Bun.file(`${fixtures}/success-loon.list`).text();
    const expected = await Bun.file(`${fixtures}/success.loon`).text();
    const result = convertList(input, "loon");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe(expected);
    }
  });

  test("skips comment-only input and emits an empty file", async () => {
    const input = await Bun.file(`${fixtures}/comments-only.list`).text();
    const result = convertList(input, "loon");
    expect(result).toEqual({ ok: true, text: "" });
  });

  test("skips question-mark wildcards and keeps simple prefix wildcards", () => {
    const result = convertList("*.google.com\n*.goo?le.com\n", "loon");
    expect(result).toEqual({
      ok: true,
      text: "DOMAIN-SUFFIX,google.com\n",
    });
  });

  test("skips non prefix-star wildcards", () => {
    const result = convertList("google.com\n*google.com\nfoo.*.bar.com\n", "loon");
    expect(result).toEqual({
      ok: true,
      text: "DOMAIN,google.com\n",
    });
  });

  test("succeeds with an empty file when only skippable wildcards remain", () => {
    const result = convertList("*.goo?le.com\n", "loon");
    expect(result).toEqual({ ok: true, text: "" });
  });

  test("fails on classical clash rules", async () => {
    const input = await Bun.file(`${fixtures}/fail-classical.list`).text();
    const result = convertList(input, "loon");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.line).toContain("DOMAIN-SUFFIX");
    }
  });

  test("fails on regexp lines", async () => {
    const input = await Bun.file(`${fixtures}/fail-regexp.list`).text();
    const result = convertList(input, "loon");
    expect(result.ok).toBe(false);
  });

  test("fails the whole file when valid and invalid lines mix", async () => {
    const input = await Bun.file(`${fixtures}/fail-mixed.list`).text();
    const result = convertList(input, "loon");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.text).toBeUndefined();
    }
  });

  test("emits converted rules without an update header", () => {
    const result = convertList("+.google.com\n", "loon");
    expect(result).toEqual({
      ok: true,
      text: "DOMAIN-SUFFIX,google.com\n",
    });
  });
});
