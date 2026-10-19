/**
 * Node 24 没有 @discordjs/opus 的预编译包，源码编译又需要 Visual Studio。
 * 本脚本在系统 Node 不是 22 时，把 Node 22 下载到项目里的 .node 目录。
 * 成功时向 stdout 只打印一行：SYSTEM，或 node.exe 所在目录。
 * 进度写到 stderr，避免 setup.bat 把日志当成路径。
 */
import { execFileSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME = join(ROOT, ".node");
const HOME_FILE = join(RUNTIME, "home.txt");
const FALLBACK_VERSION = "v22.20.0";

process.env.NODE_USE_ENV_PROXY = "1";

/** 从 Node 发行索引里挑最新的 22.12+。 */
export function pickLatestNode22(entries) {
  const versions = [];
  for (const entry of entries) {
    const version = entry?.version;
    const match = /^v22\.(\d+)\.\d+$/.exec(version ?? "");
    if (!match) continue;
    if (Number(match[1]) < 12) continue;
    versions.push(version);
  }
  versions.sort((a, b) => {
    const pa = a.slice(1).split(".").map(Number);
    const pb = b.slice(1).split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if (pa[i] !== pb[i]) return pa[i] - pb[i];
    }
    return 0;
  });
  return versions.at(-1) ?? null;
}

function systemNodeIs22() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  return major === 22 && minor >= 12;
}

function note(line) {
  process.stderr.write(`${line}\n`);
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.text();
}

async function resolveVersion() {
  const indexes = [
    "https://cdn.npmmirror.com/binaries/node/index.json",
    "https://npmmirror.com/mirrors/node/index.json",
    "https://nodejs.org/dist/index.json",
  ];
  for (const url of indexes) {
    try {
      const picked = pickLatestNode22(JSON.parse(await fetchText(url)));
      if (picked) return picked;
    } catch (err) {
      note(`[node22] 版本列表暂时打不开 ${url} (${err.message})`);
    }
  }
  note(`[node22] 使用内置版本 ${FALLBACK_VERSION}`);
  return FALLBACK_VERSION;
}

function zipName(version) {
  return `node-${version}-win-x64.zip`;
}

function folderName(version) {
  return `node-${version}-win-x64`;
}

async function download(version) {
  const folder = join(RUNTIME, folderName(version));
  const nodeExe = join(folder, "node.exe");
  if (existsSync(nodeExe)) return folder;

  mkdirSync(RUNTIME, { recursive: true });
  const zipPath = join(RUNTIME, zipName(version));
  const urls = [
    `https://cdn.npmmirror.com/binaries/node/${version}/${zipName(version)}`,
    `https://npmmirror.com/mirrors/node/${version}/${zipName(version)}`,
    `https://nodejs.org/dist/${version}/${zipName(version)}`,
  ];
  let lastError = null;
  for (const url of urls) {
    try {
      note(`[node22] 下载 ${url}`);
      const response = await fetch(url);
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      await pipeline(Readable.fromWeb(response.body), createWriteStream(zipPath));
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      note(`[node22] 下载失败: ${err.message}`);
      rmSync(zipPath, { force: true });
    }
  }
  if (lastError) throw lastError;

  note("[node22] 解压中...");
  execFileSync("tar", ["-xf", zipPath, "-C", RUNTIME], { stdio: "inherit" });
  rmSync(zipPath, { force: true });
  if (!existsSync(nodeExe)) throw new Error(`解压后找不到 ${nodeExe}`);
  return folder;
}

async function main() {
  if (systemNodeIs22()) {
    mkdirSync(RUNTIME, { recursive: true });
    writeFileSync(HOME_FILE, "SYSTEM\n");
    process.stdout.write("SYSTEM\n");
    return;
  }

  const version = await resolveVersion();
  const folder = await download(version);
  mkdirSync(RUNTIME, { recursive: true });
  writeFileSync(HOME_FILE, `${folder}\n`);
  note(`[node22] 将使用 ${folder}`);
  process.stdout.write(`${folder}\n`);
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((err) => {
    note(`[node22] ${err.message}`);
    process.exit(1);
  });
}
