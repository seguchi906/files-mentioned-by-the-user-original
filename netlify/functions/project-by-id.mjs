import { sql, projectColumns } from "./_lib/db.mjs";
import { handleError, json, methodNotAllowed, readJson } from "./_lib/http.mjs";
import { normalizeProject } from "./_lib/project.mjs";

export async function handler(event) {
  try {
    const id = Number(event.queryStringParameters?.id);
    if (!Number.isInteger(id)) {
      return json(400, { error: "IDが正しくありません。" });
    }

    if (event.httpMethod === "PUT") return await updateProject(id, event);
    if (event.httpMethod === "DELETE") return await deleteProject(id);
    return methodNotAllowed();
  } catch (error) {
    return handleError(error);
  }
}

async function updateProject(id, event) {
  const project = normalizeProject(await readJson(event));
  const rows = await sql`
    update projects
    set
      fiscal_year = ${project.fiscal_year},
      fiscal_year_true = ${project.fiscal_year_true},
      number = ${project.number},
      name = ${project.name},
      field = ${project.field},
      subfield = ${project.subfield},
      field_number = ${project.field_number},
      start_date = ${project.start_date},
      end_date = ${project.end_date},
      revised_end_date = ${project.revised_end_date},
      fisical_end_date = ${project.fisical_end_date},
      office = ${project.office},
      contract_amount = ${project.contract_amount}
    where id = ${id}
    returning ${sql.unsafe(projectColumns)}
  `;

  if (!rows[0]) return json(404, { error: "対象の業務が見つかりません。" });
  return json(200, { project: rows[0] });
}

async function deleteProject(id) {
  const rows = await sql`delete from projects where id = ${id} returning id`;
  if (!rows[0]) return json(404, { error: "対象の業務が見つかりません。" });
  return json(200, { ok: true });
}
