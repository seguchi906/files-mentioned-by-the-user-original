import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

export const sql = neon(connectionString);

export const projectColumns = `
  id,
  substring(number from '^[0-9]{2}') as number_term,
  fiscal_year,
  fiscal_year_true,
  number,
  name,
  field,
  subfield,
  field_number,
  to_char(start_date, 'YYYY-MM-DD') as start_date,
  to_char(end_date, 'YYYY-MM-DD') as end_date,
  to_char(revised_end_date, 'YYYY-MM-DD') as revised_end_date,
  to_char(fisical_end_date, 'YYYY-MM-DD') as fisical_end_date,
  office,
  contract_amount,
  created_at,
  updated_at
`;
