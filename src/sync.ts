import { mkdir, readdir, unlink } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { convertList } from "./convert";

export const LIST_ROOTS = ["geo/geosite", "geo/geoip", "geo-lite", "asn"] as const;
export const SKIP_DIR_NAMES = new Set(["classical"]);
export const DEFAULT_UPSTREAM = "https://github.com/MetaCubeX/meta-rules-dat.git";
export const DEFAULT_BRANCH = "meta";

export type SyncOptions = {
  outDir: string;
  upstreamUrl?: string;
  upstreamDir?: string;
  workDir?: string;
};

export type SyncReport = {
  failed: string[];
  written: string[];
  deleted: string[];
  kept: string[];
};

export async function sync(options: SyncOptions): Promise<SyncReport> {
  const upstreamDir = options.upstreamDir ?? (await cloneUpstream(options));
  const relativePaths = await collectListFiles(upstreamDir);
  const incoming = new Map<string, string | "keep">();
  const failed: string[] = [];
  const written: string[] = [];
  const kept: string[] = [];

  for (const relativePath of relativePaths) {
    const source = join(upstreamDir, relativePath);
    const text = await Bun.file(source).text();
    const result = convertList(text);
    if (result.ok) {
      incoming.set(relativePath, result.text);
      written.push(relativePath);
    } else {
      incoming.set(relativePath, "keep");
      failed.push(`${relativePath}:${result.lineNumber}: ${result.reason}`);
      kept.push(relativePath);
    }
  }

  const deleted = await applyPublish(options.outDir, incoming);
  await removeSkippedDirs(options.outDir);
  await writeReleaseReadme(options.outDir);

  if (failed.length > 0) {
    console.error("convert failed:");
    for (const item of failed) {
      console.error(`  ${item}`);
    }
  }

  return { failed, written, deleted, kept };
}

export async function applyPublish(
  outDir: string,
  incoming: Map<string, string | "keep">,
): Promise<string[]> {
  await mkdir(outDir, { recursive: true });

  for (const [relativePath, content] of incoming) {
    if (content === "keep") {
      continue;
    }
    const dest = join(outDir, relativePath);
    await mkdir(dirname(dest), { recursive: true });
    await Bun.write(dest, content);
  }

  const existing = await collectListFiles(outDir);
  const deleted: string[] = [];
  for (const relativePath of existing) {
    if (!incoming.has(relativePath)) {
      await unlink(join(outDir, relativePath));
      deleted.push(relativePath);
    }
  }
  return deleted;
}

const README_SOURCE = join(import.meta.dir, "release-readme.md");

export async function writeReleaseReadme(outDir: string): Promise<void> {
  const source = Bun.file(README_SOURCE);
  if (!(await source.exists())) {
    return;
  }
  await mkdir(outDir, { recursive: true });
  await Bun.write(join(outDir, "README.md"), await source.text());
}

export async function collectListFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for (const dir of LIST_ROOTS) {
    await walkLists(join(root, dir), root, files);
  }
  return files.sort();
}

async function walkLists(dir: string, root: string, files: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true }).catch((error: unknown) => {
    if (isNotFound(error)) {
      return [];
    }
    throw error;
  });

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) {
        continue;
      }
      await walkLists(full, root, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".list")) {
      files.push(relative(root, full));
    }
  }
}

async function cloneUpstream(options: SyncOptions): Promise<string> {
  const dest = options.workDir ?? join(".tmp", "upstream-meta");
  await mkdir(dirname(dest), { recursive: true });
  await rmIfExists(dest);
  const url = options.upstreamUrl ?? DEFAULT_UPSTREAM;
  const proc = Bun.spawn(
    ["git", "clone", "--depth", "1", "--branch", DEFAULT_BRANCH, url, dest],
    { stdout: "inherit", stderr: "inherit" },
  );
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`git clone failed with exit ${code}`);
  }
  return dest;
}

async function rmIfExists(path: string): Promise<void> {
  const proc = Bun.spawn(["rm", "-rf", path]);
  await proc.exited;
}

async function removeSkippedDirs(root: string): Promise<void> {
  for (const dir of LIST_ROOTS) {
    await walkAndRemoveSkipped(join(root, dir));
  }
}

async function walkAndRemoveSkipped(dir: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true }).catch((error: unknown) => {
    if (isNotFound(error)) {
      return [];
    }
    throw error;
  });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const full = join(dir, entry.name);
    if (SKIP_DIR_NAMES.has(entry.name)) {
      await rmIfExists(full);
      continue;
    }
    await walkAndRemoveSkipped(full);
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
