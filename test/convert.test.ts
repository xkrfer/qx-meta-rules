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

  test("skips comment-only input", async () => {
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

  test("emits a single rule line without a header", () => {
    const result = convertList("+.google.com\n");
    expect(result).toEqual({
      ok: true,
      text: "host-suffix, google.com\n",
    });
  });
});
