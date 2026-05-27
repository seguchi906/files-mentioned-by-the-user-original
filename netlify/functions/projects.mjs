import { sql, projectColumns } from "./_lib/db.mjs";
import { handleError, json, methodNotAllowed, readJson } from "./_lib/http.mjs";
import { normalizeProject } from "./_lib/project.mjs";

export async function handler(event) {
  try {
    if (event.httpMethod === "GET") return await listProjects(event);
    if (event.httpMethod === "POST") return await createProject(event);
    return methodNotAllowed();
  } catch (error) {
    return handleError(error);
  }
}

async function listProjects(event) {
  const params = event.queryStringParameters || {};
  const search = `%${params.search || ""}%`;
  const fiscalYear = params.fiscal_year_true || "";
  const field = params.field || "";
  const office = params.office || "";
  const sort = ["number", "name", "project_year", "fiscal_year", "fiscal_year_true", "field", "office", "contract_amount", "start_date", "end_date", "revised_end_date"].includes(params.sort)
    ? params.sort
    : "number";
  const direction = params.direction === "desc" ? sql`desc` : sql`asc`;
  const secondaryCategoryDirection = params.direction === "desc" ? sql`subfield desc nulls last` : sql`subfield asc nulls last`;
  const orderBy = sort === "field"
    ? sql`field ${direction} nulls last, ${secondaryCategoryDirection}, id asc`
    : sql`${sql.unsafe(sort)} ${direction}, id asc`;

  const projects = await sql`
    select ${sql.unsafe(projectColumns)}
    from projects
    where (${params.search ? sql`number ilike ${search} or name ilike ${search} or field ilike ${search} or office ilike ${search}` : sql`true`})
      and (${fiscalYear ? sql`substring(number from '^[0-9]{2}') = ${fiscalYear}` : sql`true`})
      and (${field ? sql`field = ${field}` : sql`true`})
      and (${office ? sql`office = ${office}` : sql`true`})
    order by ${orderBy}
  `;

  const facets = await sql`
    select
      array_remove(array_agg(distinct substring(number from '^[0-9]{2}') order by substring(number from '^[0-9]{2}')), null) as fiscal_years,
      array_remove(array_agg(distinct field order by field), null) as fields,
      array_remove(array_agg(distinct office order by office), null) as offices
    from projects
  `;

  return json(200, { projects, facets: facets[0] || { fiscal_years: [], fields: [], offices: [] } });
}

async function createProject(event) {
  const project = normalizeProject(await readJson(event));
  const rows = await sql`
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
    returning ${sql.unsafe(projectColumns)}
  `;
  return json(201, { project: rows[0] });
}
