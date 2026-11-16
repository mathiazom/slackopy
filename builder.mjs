// Keeps the static site in SITE_DIR fresh: builds once at startup, then daily.
// The auth gate serves SITE_DIR/current, a symlink that is only switched to a finished build, 
// so a failed or half-done build is never served. Failures retry until one succeeds.
import {spawn} from "node:child_process";
import {cp, mkdir, readdir, rename, rm, symlink} from "node:fs/promises";
import path from "node:path";

const SITE_DIR = process.env.SITE_DIR ?? "/site";
const BUILDS_DIR = path.join(SITE_DIR, "builds");
// Astro moves its output into place with rename(), which fails across
// filesystems (EXDEV), and SITE_DIR is usually a mounted volume. So the build
// goes to the project's own filesystem first and is copied over afterwards.
// Not dist, which is dev builds' output (served by the local gate).
const STAGING_DIR = path.resolve(".builder");
const REBUILD_HOUR_UTC = 5;
const RETRY_MS = 5 * 60 * 1000;

function run(bin, args) {
    return new Promise((resolve) => {
        spawn(path.join("node_modules/.bin", bin), args, {stdio: "inherit"})
            .on("exit", (code) => resolve(code === 0))
            .on("error", () => resolve(false));
    });
}

// The search index is part of the build, so it is switched in together with the
// pages it indexes.
async function buildSite(outDir) {
    await rm(STAGING_DIR, {recursive: true, force: true});
    try {
        if (!(await run("astro", ["build", "--outDir", STAGING_DIR])
            && await run("pagefind", ["--site", STAGING_DIR]))) {
            return false;
        }
        await cp(STAGING_DIR, outDir, {recursive: true});
        return true;
    } catch (error) {
        console.error(error);
        return false;
    } finally {
        await rm(STAGING_DIR, {recursive: true, force: true});
    }
}

async function build() {
    const name = new Date().toISOString().replace(/[:.]/g, "-");
    const outDir = path.join(BUILDS_DIR, name);
    await mkdir(BUILDS_DIR, {recursive: true});
    if (!(await buildSite(outDir))) {
        await rm(outDir, {recursive: true, force: true});
        return false;
    }
    // rename() replaces the old symlink atomically.
    const next = path.join(SITE_DIR, "current.next");
    await rm(next, {force: true});
    await symlink(path.join("builds", name), next);
    await rename(next, path.join(SITE_DIR, "current"));
    for (const old of await readdir(BUILDS_DIR)) {
        if (old !== name) await rm(path.join(BUILDS_DIR, old), {recursive: true, force: true});
    }
    return true;
}

function msUntilNextRebuild() {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(REBUILD_HOUR_UTC, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.getTime() - now.getTime();
}

while (true) {
    const ok = await build();
    const wait = ok ? msUntilNextRebuild() : RETRY_MS;
    console.log(`${ok ? "Build done" : "Build failed"}, next in ${Math.round(wait / 60000)} min`);
    await new Promise((resolve) => setTimeout(resolve, wait));
}
