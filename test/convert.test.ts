import { describe, expect, test } from "bun:test";
import { convertList, formatUpdateHeader } from "../src/convert";

const fixtures = import.meta.dir + "/fixtures";
const updatedAt = new Date("2026-08-25T00:00:00.000Z");
const header = formatUpdateHeader(updatedAt);

describe("formatUpdateHeader", () => {
  test("emits the update banner with a UTC date", () => {
    expect(header).toBe(
      "#======================================#\n#Update 2026-08-25\n#======================================#\n",
    );
  });
});

describe("convertList", () => {
  test("maps supported lines to QX rules", async () => {
    const input = await Bun.file(`${fixtures}/success.list`).text();
    const expected = await Bun.file(`${fixtures}/success.qx`).text();
    const result = convertList(input, { updatedAt });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe(`${header}${expected}`);
    }
  });

  test("skips comment-only input but keeps the update header", async () => {
    const input = await Bun.file(`${fixtures}/comments-only.list`).text();
    const result = convertList(input, { updatedAt });
    expect(result).toEqual({ ok: true, text: header });
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

  test("prefixes converted rules with an update header", () => {
    const result = convertList("+.google.com\n", { updatedAt });
    expect(result).toEqual({
      ok: true,
      text: `${header}host-suffix, google.com, proxy\n`,
    });
  });
});
