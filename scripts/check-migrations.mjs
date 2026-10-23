/**
 * Runs every migration on an in-process Postgres, runs the lock-down migration
 * and everything after it a second time (it must survive being re-run), then
 * runs supabase/checks/security.sql against the result. No Docker and no
 * network: PGlite is Postgres compiled to WebAssembly.
 *
 *   npm run check:db
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = join(import.meta.dirname, "..");
const migrationsDir = join(root, "supabase", "migrations");
const read = (path) => readFileSync(path, "utf8");

const migrations = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

/** 0001 predates the rule that a migration can be run twice. */
const FIRST_REPEATABLE = "0006";

const db = new PGlite();
const passed = [];

async function run(label, sql) {
  try {
    await db.exec(sql, {
      onNotice: (notice) => {
        if (notice.message.startsWith("ok: ")) passed.push(notice.message.slice(4));
      },
    });
  } catch (error) {
    console.error(`\n${label} failed: ${error.message}`);
    process.exit(1);
  }
}

await run("Supabase shim", read(join(root, "supabase", "checks", "supabase-shim.sql")));

for (const name of migrations) {
  await run(name, read(join(migrationsDir, name)));
}
const repeatable = migrations.filter((name) => name >= FIRST_REPEATABLE);
for (const name of repeatable) {
  await run(`${name} (second run)`, read(join(migrationsDir, name)));
}
console.log(`Applied ${migrations.length} migrations, and re-ran ${repeatable.join(", ")}.`);

await run("security checks", read(join(root, "supabase", "checks", "security.sql")));
for (const check of passed) console.log(`  ok  ${check}`);
console.log(`${passed.length} checks passed.`);
await db.close();
