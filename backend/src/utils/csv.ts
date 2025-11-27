import { parse } from "csv-parse/sync";

export type StudentRow = {
  stdId: string;
  name: string;
  email: string;
  faculty?: string | undefined;
  department?: string | undefined;
};

export function parseStudentCsv(buffer: Buffer): StudentRow[] {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return records
    .map((row) => ({
      stdId: row.stdId ?? row.studentId ?? "",
      name: row.name ?? "",
      email: row.email ?? "",
      faculty: row.faculty ?? undefined,
      department: row.department ?? undefined,
    }))
    .filter((record) => record.stdId && record.name && record.email);
}
