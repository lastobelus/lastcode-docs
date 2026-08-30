const { createHash } = require("node:crypto");
const { readdir, readFile, stat } = require("node:fs/promises");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const lockPath = path.join(
  repositoryRoot,
  ".agents/skills/upstream.lock.json",
);

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesBelow(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function relative(filePath) {
  return path.relative(repositoryRoot, filePath).split(path.sep).join("/");
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

async function main() {
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  const expected = new Map();

  for (const source of lock.sources) {
    for (const file of source.files) {
      if (expected.has(file.path)) {
        throw new Error("Duplicate locked path: " + file.path);
      }
      expected.set(file.path, file.sha256);
    }
  }

  const vendoredDirectories = [
    ".agents/skills/unslop",
    ".agents/skills/technical-writing",
    ".agents/skills/playwright-cli",
    ".agents/skills/vendor-licenses",
  ];
  const actualPaths = [];

  for (const directory of vendoredDirectories) {
    const absoluteDirectory = path.join(repositoryRoot, directory);
    if (!(await stat(absoluteDirectory)).isDirectory()) {
      throw new Error("Missing vendored directory: " + directory);
    }
    actualPaths.push(
      ...(await filesBelow(absoluteDirectory)).map((filePath) =>
        relative(filePath),
      ),
    );
  }

  const actual = new Set(actualPaths);

  for (const filePath of actual) {
    if (!expected.has(filePath)) {
      throw new Error("Unlisted vendored file: " + filePath);
    }
  }

  for (const [filePath, digest] of expected) {
    if (!actual.has(filePath)) {
      throw new Error("Missing vendored file: " + filePath);
    }

    const contents = await readFile(path.join(repositoryRoot, filePath));
    const actualDigest = sha256(contents);
    if (actualDigest !== digest) {
      throw new Error(
        "Digest mismatch for " +
          filePath +
          ": expected " +
          digest +
          ", got " +
          actualDigest,
      );
    }
  }

  console.log("Verified " + expected.size + " vendored files.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
