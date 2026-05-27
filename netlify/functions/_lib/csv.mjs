export function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows.filter((items) => items.some((item) => item !== ""));
  if (!headers) return [];

  return dataRows.map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] ?? ""])));
}

export function stringifyCsv(rows) {
  const headers = [
    "FiscalYear",
    "FiscalYeartrue",
    "number",
    "name",
    "field",
    "subfield",
    "fieldnumber",
    "startDate",
    "endDate",
    "revisedEndDate",
    "fisicalEndDate",
    "office",
    "contractAmount"
  ];

  const lines = rows.map((row) => [
    row.fiscal_year,
    row.fiscal_year_true,
    row.number,
    row.name,
    row.field,
    row.subfield,
    row.field_number,
    row.start_date,
    row.end_date,
    row.revised_end_date,
    row.fisical_end_date,
    row.office,
    row.contract_amount
  ]);

  return [headers, ...lines].map((line) => line.map(escapeCell).join(",")).join("\r\n");
}

function escapeCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
