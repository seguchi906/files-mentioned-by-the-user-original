import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { parseCsv } from "../netlify/functions/_lib/csv.mjs";
import { normalizeCsvRow } from "../netlify/functions/_lib/project.mjs";

await loadEnv();

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env first.");
  process.exit(1);
}

const csvPath = process.argv[2] || "C:\\Users\\太宰府2\\OneDrive - 株式会社西日本測量設計\\技術部アプリデータ\\original-data.csv(sales-graph-app_order-graph-app)\\original-data.csv";
const bytes = await readFile(csvPath);
const csv = decodeCsv(bytes);
const projects = parseCsv(csv).map(normalizeCsvRow);
const sql = neon(connectionString);

let imported = 0;
for (const project of projects) {
  await sql`
    insert into projects (
      fiscal_year, fiscal_year_true, number, name, field, subfield, field_number,
      start_date, end_date, revised_end_date, fisical_end_date, office, contract_amount
    )
    values (
      ${project.fiscal_year}, ${project.fiscal_year_true}, ${project.number}, ${project.name},
      ${project.field}, ${project.subfield}, ${project.field_number}, ${project.start_date},
      ${project.end_date}, ${project.revised_end_date}, ${project.fisical_end_date},
      ${project.office}, ${project.contract_amount}
    )
    on conflict (number) do update
    set
      fiscal_year = excluded.fiscal_year,
      fiscal_year_true = excluded.fiscal_year_true,
      name = excluded.name,
      field = excluded.field,
      subfield = excluded.subfield,
      field_number = excluded.field_number,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      revised_end_date = excluded.revised_end_date,
      fisical_end_date = excluded.fisical_end_date,
      office = excluded.office,
      contract_amount = excluded.contract_amount
  `;
  imported += 1;
}

console.log(`Imported ${imported} projects.`);

function decodeCsv(bytes) {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (!utf8.includes("\uFFFD")) return utf8;
  return new TextDecoder("shift_jis", { fatal: false }).decode(bytes);
}

async function loadEnv() {
  let text = "";
  try {
    text = await readFile(".env", "utf8");
  } catch {
    return;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
