import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

await loadEnv();

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env first.");
  process.exit(1);
}

if (connectionString.includes("[user]") || connectionString.includes("[password]") || connectionString.includes("[host]")) {
  console.error("DATABASE_URL still contains placeholder text. Copy the real connection string from Neon and replace the sample value in .env.");
  process.exit(1);
}

const sql = neon(connectionString);
const schema = await readFile("database/schema.sql", "utf8");

for (const statement of splitSql(schema)) {
  await sql.query(statement);
}

console.log("Neon database schema is ready.");

function splitSql(schema) {
  const statements = [];
  let current = "";
  let dollarQuote = null;

  for (let i = 0; i < schema.length; i += 1) {
    const rest = schema.slice(i);

    if (!dollarQuote && rest.startsWith("$$")) {
      dollarQuote = "$$";
      current += "$$";
      i += 1;
      continue;
    }

    if (dollarQuote && rest.startsWith(dollarQuote)) {
      dollarQuote = null;
      current += "$$";
      i += 1;
      continue;
    }

    const char = schema[i];
    if (char === ";" && !dollarQuote) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      continue;
    }

    current += char;
  }

  const last = current.trim();
  if (last) statements.push(last);
  return statements;
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
