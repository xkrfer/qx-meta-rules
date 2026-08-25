import { afterAll, describe, expect, test } from "bun:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { formatUpdateHeader } from "../src/convert";
import { applyPublish, collectListFiles, sync } from "../src/sync";

const updatedAt = new Date("2026-08-25T00:00:00.000Z");
const header = formatUpdateHeader(updatedAt);

const tmp = join(import.meta.dir, "..", ".tmp", "sync-test");

afterAll(async () => {
  await Bun.spawn(["rm", "-rf", tmp]).exited;
});

describe("applyPublish", () => {
  test("writes successes, keeps failures, deletes stale lists", async () => {
    const outDir = join(tmp, "release");
    await mkdir(join(outDir, "geo/geosite"), { recursive: true });
    await Bun.write(join(outDir, "geo/geosite/google.list"), "old-google\n");
    await Bun.write(join(outDir, "geo/geosite/ads.list"), "old-ads\n");
    await Bun.write(join(outDir, "geo/geosite/old.list"), "stale\n");

    const incoming = new Map<string, string | "keep">([
      ["geo/geosite/google.list", "host-suffix, google.com, proxy\n"],
      ["geo/geosite/ads.list", "keep"],
    ]);

    const deleted = await applyPublish(outDir, incoming);
    expect(deleted).toEqual(["geo/geosite/old.list"]);
    expect(await Bun.file(join(outDir, "geo/geosite/google.list")).text()).toBe(
      "host-suffix, google.com, proxy\n",
    );
    expect(await Bun.file(join(outDir, "geo/geosite/ads.list")).text()).toBe("old-ads\n");
    expect(await Bun.file(join(outDir, "geo/geosite/old.list")).exists()).toBe(false);
    expect(await Bun.file(join(outDir, "README")).exists()).toBe(false);
    expect(await Bun.file(join(outDir, "README.md")).exists()).toBe(false);
    expect(await Bun.file(join(outDir, "index.json")).exists()).toBe(false);
  });
});

describe("sync without clone", () => {
  test("converts every list under the four roots", async () => {
    const upstreamDir = join(tmp, "upstream");
    const outDir = join(tmp, "out");
    await mkdir(join(upstreamDir, "geo/geosite"), { recursive: true });
    await mkdir(join(upstreamDir, "geo/geoip"), { recursive: true });
    await mkdir(join(upstreamDir, "geo-lite/geosite"), { recursive: true });
    await mkdir(join(upstreamDir, "asn"), { recursive: true });
    await Bun.write(join(upstreamDir, "geo/geosite/google.list"), "+.google.com\n");
    await Bun.write(join(upstreamDir, "geo/geoip/cn.list"), "1.1.8.0/24\n");
    await Bun.write(join(upstreamDir, "geo-lite/geosite/google.list"), "google.com\n");
    await Bun.write(join(upstreamDir, "asn/cloudflare.list"), "AS13335\n");
    await Bun.write(join(upstreamDir, "geo/geosite/bad.list"), "regexp:foo\n");

    const report = await sync({ outDir, upstreamDir, updatedAt });
    const files = await collectListFiles(outDir);
    const readme = await Bun.file(join(import.meta.dir, "..", "src", "release-readme.md")).text();

    expect(files).toEqual([
      "asn/cloudflare.list",
      "geo-lite/geosite/google.list",
      "geo/geoip/cn.list",
      "geo/geosite/google.list",
    ]);
    expect(await Bun.file(join(outDir, "geo/geosite/google.list")).text()).toBe(
      `${header}host-suffix, google.com, proxy\n`,
    );
    expect(await Bun.file(join(outDir, "README.md")).text()).toBe(readme);
    expect(await Bun.file(join(outDir, "geo/geosite/bad.list")).exists()).toBe(false);
    expect(report.failed.some((item) => item.startsWith("geo/geosite/bad.list"))).toBe(true);
  });
});
