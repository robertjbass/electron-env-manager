import { execSync } from "child_process"

function run(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8" }).trim()
}

// Check for GH_TOKEN
if (!process.env.GH_TOKEN) {
  console.error("Error: GH_TOKEN environment variable is not set")
  process.exit(1)
}

// Check for uncommitted changes
const status = run("git status --porcelain")
if (status) {
  console.error("Error: You have uncommitted changes:")
  console.error(status)
  console.error("\nPlease commit or stash your changes before publishing.")
  process.exit(1)
}

// Check if local branch is ahead of remote
try {
  run("git fetch")
  const ahead = run("git rev-list --count @{u}..HEAD")
  if (parseInt(ahead) > 0) {
    console.error(`Error: You have ${ahead} unpushed commit(s).`)
    console.error("Please push your changes before publishing.")
    process.exit(1)
  }
} catch {
  console.error(
    "Error: Could not check remote status. Make sure you have an upstream branch set.",
  )
  process.exit(1)
}

// Determine release channel based on branch
const branch = run("git rev-parse --abbrev-ref HEAD")
const isPrerelease = branch === "dev" || branch === "develop"

if (isPrerelease) {
  console.log(`Publishing BETA release from branch: ${branch}`)
} else {
  console.log(`Publishing STABLE release from branch: ${branch}`)
}

console.log("Building and publishing release...")

try {
  const publishCmd = isPrerelease
    ? "pnpm build && electron-builder --publish always -c.publish.releaseType=prerelease"
    : "pnpm build && electron-builder --publish always"

  execSync(publishCmd, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: {
      ...process.env,
      EP_PRE_RELEASE: isPrerelease ? "true" : "false",
    },
  })
  console.log(`${isPrerelease ? "Beta" : "Stable"} release published successfully!`)
} catch (error) {
  console.error("Failed to publish release:", error)
  process.exit(1)
}
