import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { cif, name, nationalId } = req.query;
      let sql = 'SELECT * FROM "Customers" WHERE 1=1';
      const params: any[] = [];

      if (cif && typeof cif === 'string' && cif.trim()) {
        params.push(`%${cif.trim()}%`);
        sql += ` AND "CifKh" ILIKE $${params.length}`;
      }
      if (name && typeof name === 'string' && name.trim()) {
        params.push(`%${name.trim()}%`);
        sql += ` AND "FullName" ILIKE $${params.length}`;
      }
      if (nationalId && typeof nationalId === 'string' && nationalId.trim()) {
        params.push(`%${nationalId.trim()}%`);
        sql += ` AND "NationalId" ILIKE $${params.length}`;
      }

      sql += ' ORDER BY "Id" DESC;';

      const result = await pool.query(sql, params);
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const body = req.body;
      const sql = `
        INSERT INTO "Customers" (
          "CifKh", "FullName", "NationalId", "Phone", "Email", "Address",
          "AccountNumber", "MonthlyIncome", "MaritalStatus", "CifKhlq",
          "SpouseName", "SpouseNationalId", "SpousePhone", "SpouseAccountNumber", "SpouseIncome"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *;
      `;
      const values = [
        body.CifKh, body.FullName, body.NationalId || null, body.Phone || null,
        body.Email || null, body.Address || null, body.AccountNumber || null,
        body.MonthlyIncome || 0, body.MaritalStatus || 'Độc thân', body.CifKhlq || null,
        body.SpouseName || null, body.SpouseNationalId || null, body.SpousePhone || null,
        body.SpouseAccountNumber || null, body.SpouseIncome || 0
      ];

      const result = await pool.query(sql, values);
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const body = req.body;

      const sql = `
        UPDATE "Customers" SET
          "CifKh" = $1, "FullName" = $2, "NationalId" = $3, "Phone" = $4,
          "Email" = $5, "Address" = $6, "AccountNumber" = $7, "MonthlyIncome" = $8,
          "MaritalStatus" = $9, "CifKhlq" = $10, "SpouseName" = $11,
          "SpouseNationalId" = $12, "SpousePhone" = $13, "SpouseAccountNumber" = $14,
          "SpouseIncome" = $15
        WHERE "Id" = $16
        RETURNING *;
      `;
      const values = [
        body.CifKh, body.FullName, body.NationalId || null, body.Phone || null,
        body.Email || null, body.Address || null, body.AccountNumber || null,
        body.MonthlyIncome || 0, body.MaritalStatus || 'Độc thân', body.CifKhlq || null,
        body.SpouseName || null, body.SpouseNationalId || null, body.SpousePhone || null,
        body.SpouseAccountNumber || null, body.SpouseIncome || 0, id
      ];

      const result = await pool.query(sql, values);
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM "Customers" WHERE "Id" = $1;', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
