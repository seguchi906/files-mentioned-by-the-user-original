import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "public/index.html",
  "public/app.js",
  "public/styles.css",
  "netlify/functions/projects.mjs",
  "netlify/functions/project-by-id.mjs",
  "netlify/functions/export-csv.mjs",
  "netlify/functions/import.mjs",
  "database/schema.sql"
];

await Promise.all(requiredFiles.map((file) => access(file)));

for (const file of ["public/app.js"]) {
  new Function(await readFile(file, "utf8"));
}

await import("../netlify/functions/_lib/csv.mjs");
await import("../netlify/functions/_lib/project.mjs");

console.log("Static app and function sources are present.");
