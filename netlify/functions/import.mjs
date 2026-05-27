import { sql } from "./_lib/db.mjs";
import { parseCsv } from "./_lib/csv.mjs";
import { handleError, json, methodNotAllowed, readJson } from "./_lib/http.mjs";
import { normalizeCsvRow } from "./_lib/project.mjs";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") return methodNotAllowed();

    const { csv, csvBase64 } = await readJson(event);
    const csvText = csvBase64 ? decodeCsvBase64(csvBase64) : csv;
    if (!csvText) return json(400, { error: "CSVファイルの内容がありません。" });

    const projects = parseCsv(csvText).map(normalizeCsvRow);
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

    return json(200, { imported });
  } catch (error) {
    return handleError(error);
  }
}

function decodeCsvBase64(csvBase64) {
  const bytes = Uint8Array.from(Buffer.from(csvBase64, "base64"));
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (!utf8.includes("\uFFFD")) return utf8;
  return new TextDecoder("shift_jis", { fatal: false }).decode(bytes);
}
