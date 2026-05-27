import { sql, projectColumns } from "./_lib/db.mjs";
import { stringifyCsv } from "./_lib/csv.mjs";
import { handleError, methodNotAllowed } from "./_lib/http.mjs";

export async function handler(event) {
  try {
    if (event.httpMethod !== "GET") return methodNotAllowed();

    const projects = await sql`
      select ${sql.unsafe(projectColumns)}
      from projects
      order by number asc, id asc
    `;

    return {
      statusCode: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=\"projects.csv\"",
        "cache-control": "no-store"
      },
      body: `\uFEFF${stringifyCsv(projects)}`
    };
  } catch (error) {
    return handleError(error);
  }
}
