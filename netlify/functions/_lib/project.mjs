const integerFields = new Set(["fiscal_year", "fiscal_year_true", "field_number", "contract_amount"]);
const dateFields = new Set(["start_date", "end_date", "revised_end_date", "fisical_end_date"]);

export const editableFields = [
  "fiscal_year",
  "fiscal_year_true",
  "number",
  "name",
  "field",
  "subfield",
  "field_number",
  "start_date",
  "end_date",
  "revised_end_date",
  "fisical_end_date",
  "office",
  "contract_amount"
];

export function normalizeProject(input) {
  const project = {};

  for (const field of editableFields) {
    const raw = input[field] ?? "";
    if (integerFields.has(field)) {
      project[field] = raw === "" || raw === null ? null : Number(raw);
    } else if (dateFields.has(field)) {
      project[field] = normalizeDate(raw);
    } else {
      project[field] = String(raw ?? "").trim();
    }
  }

  if (!project.number) throw Object.assign(new Error("業務番号は必須です。"), { statusCode: 400 });
  if (!project.name) throw Object.assign(new Error("業務名は必須です。"), { statusCode: 400 });
  if (!Number.isFinite(project.contract_amount)) {
    throw Object.assign(new Error("契約金額は数値で入力してください。"), { statusCode: 400 });
  }

  return project;
}

export function normalizeCsvRow(row) {
  return normalizeProject({
    fiscal_year: row.FiscalYear,
    fiscal_year_true: row.FiscalYeartrue,
    number: row.number,
    name: row.name,
    field: row.field,
    subfield: row.subfield,
    field_number: row.fieldnumber,
    start_date: row.startDate,
    end_date: row.endDate,
    revised_end_date: row.revisedEndDate,
    fisical_end_date: row.fisicalEndDate,
    office: row.office,
    contract_amount: row.contractAmount
  });
}

function normalizeDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return text;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
