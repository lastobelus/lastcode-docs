const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const {
  cp,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const lockPath = path.join(
  repositoryRoot,
  ".agents/skills/upstream.lock.json",
);

const sourceDefinitions = {
  "cursor-pstack": {
    repository: "https://github.com/cursor/plugins.git",
    spdx: "MIT",
    copies: [
      {
        from: "pstack/skills/unslop",
        to: ".agents/skills/unslop",
      },
      {
        from: "pstack/skills/technical-writing",
        to: ".agents/skills/technical-writing",
      },
      {
        from: "pstack/LICENSE",
        to: ".agents/skills/vendor-licenses/cursor-pstack-MIT.txt",
      },
    ],
    licensePaths: [
      ".agents/skills/vendor-licenses/cursor-pstack-MIT.txt",
    ],
  },
  "microsoft-playwright": {
    repository: "https://github.com/microsoft/playwright.git",
    spdx: "Apache-2.0",
    copies: [
      {
        from: "packages/playwright-core/src/tools/skills/playwright-cli",
        to: ".agents/skills/playwright-cli",
      },
      {
        from: "LICENSE",
        to: ".agents/skills/vendor-licenses/microsoft-playwright-Apache-2.0.txt",
      },
      {
        from: "NOTICE",
        to: ".agents/skills/vendor-licenses/microsoft-playwright-NOTICE.txt",
      },
    ],
    licensePaths: [
      ".agents/skills/vendor-licenses/microsoft-playwright-Apache-2.0.txt",
      ".agents/skills/vendor-licenses/microsoft-playwright-NOTICE.txt",
    ],
  },
};

function usage() {
  const names = Object.keys(sourceDefinitions).join(" | ");
  console.error(
    "Usage: npm run skills:update -- <" +
      names +
      "> <full-commit-sha>",
  );
}

function runGit(arguments_, cwd) {
  execFileSync("git", arguments_, { cwd, stdio: "inherit" });
}

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

async function filesAt(filePath) {
  const fileStat = await lstat(filePath);
  return fileStat.isDirectory() ? filesBelow(filePath) : [filePath];
}

function relative(filePath) {
  return path.relative(repositoryRoot, filePath).split(path.sep).join("/");
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

async function buildLockedSource(name, definition, revision) {
  const lockedFiles = [];

  for (const copy of definition.copies) {
    const destination = path.join(repositoryRoot, copy.to);
    const destinationFiles = (await filesAt(destination)).sort();

    for (const filePath of destinationFiles) {
      const contents = await readFile(filePath);
      lockedFiles.push({
        path: relative(filePath),
        sha256: sha256(contents),
      });
    }
  }

  return {
    name,
    repository: definition.repository,
    revision,
    spdx: definition.spdx,
    paths: definition.copies.map((copy) => ({
      source: copy.from,
      destination: copy.to,
    })),
    licensePaths: definition.licensePaths,
    files: lockedFiles.sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
  };
}

async function main() {
  const [sourceName, revision] = process.argv.slice(2);
  const definition = sourceDefinitions[sourceName];

  if (!definition || !/^[0-9a-f]{40}$/.test(revision || "")) {
    usage();
    process.exitCode = 2;
    return;
  }

  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "lastcode-docs-skills-"),
  );

  try {
    runGit(["init", "--quiet"], temporaryRoot);
    runGit(
      ["remote", "add", "origin", definition.repository],
      temporaryRoot,
    );
    runGit(
      [
        "fetch",
        "--quiet",
        "--depth=1",
        "--filter=blob:none",
        "origin",
        revision,
      ],
      temporaryRoot,
    );
    runGit(
      [
        "checkout",
        "--quiet",
        "FETCH_HEAD",
        "--",
        ...definition.copies.map((copy) => copy.from),
      ],
      temporaryRoot,
    );

    for (const copy of definition.copies) {
      const sourcePath = path.join(temporaryRoot, copy.from);
      const destination = path.join(repositoryRoot, copy.to);
      await rm(destination, { recursive: true, force: true });
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(sourcePath, destination, {
        recursive: true,
        preserveTimestamps: false,
      });
    }

    const previousLock = JSON.parse(await readFile(lockPath, "utf8"));
    const updatedSource = await buildLockedSource(
      sourceName,
      definition,
      revision,
    );
    const updatedSources = previousLock.sources.filter(
      (source) => source.name !== sourceName,
    );
    updatedSources.push(updatedSource);
    updatedSources.sort((left, right) =>
      left.name.localeCompare(right.name),
    );

    await writeFile(
      lockPath,
      JSON.stringify(
        { schemaVersion: 1, sources: updatedSources },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }

  console.log(
    "Updated " +
      sourceName +
      " to " +
      revision +
      ". Review the Git diff before committing.",
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
