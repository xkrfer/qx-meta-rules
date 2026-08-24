import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { convertList } from "./convert";
import { sync } from "./sync";

const args = process.argv.slice(2);
const command = args[0];

function flag(name: string, fallback?: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  return args[index + 1];
}

if (command === "convert") {
  const input = args[1];
  if (!input) {
    console.error("usage: bun src/cli.ts convert <file> [--out <dir>]");
    process.exit(1);
  }

  const outRoot = flag("--out", ".tmp") ?? ".tmp";
  const dest = join(outRoot, input);
  const source = Bun.file(input);
  if (!(await source.exists())) {
    console.error(`file not found: ${input}`);
    process.exit(1);
  }

  const result = convertList(await source.text());
  if (!result.ok) {
    console.error(`convert failed ${input}:${result.lineNumber}: ${result.reason}`);
    process.exit(1);
  }

  await mkdir(dirname(dest), { recursive: true });
  await Bun.write(dest, result.text);
} else if (command === "sync") {
  const outDir = flag("--out", ".tmp") ?? ".tmp";
  const report = await sync({
    outDir,
    upstreamUrl: flag("--upstream"),
    upstreamDir: flag("--upstream-dir"),
    workDir: flag("--workdir"),
  });
  console.log(
    `written=${report.written.length} kept=${report.kept.length} deleted=${report.deleted.length} failed=${report.failed.length}`,
  );
  if (report.failed.length > 0) {
    process.exitCode = 0;
  }
} else {
  console.error("usage: bun src/cli.ts <convert|sync>");
  process.exit(1);
}
