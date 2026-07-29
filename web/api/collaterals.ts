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
      const sql = `
        SELECT c.*, 
               json_build_object('Id', cust."Id", 'CifKh', cust."CifKh", 'FullName', cust."FullName") as customer
        FROM "Collaterals" c
        LEFT JOIN "Customers" cust ON c."CustomerId" = cust."Id"
        ORDER BY c."Id" DESC;
      `;
      const result = await pool.query(sql);
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const body = req.body;
      const sql = `
        INSERT INTO "Collaterals" (
          "CustomerId", "AssetCode", "AssetType", "Address", "AppraisedValue", "Value"
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const values = [
        body.CustomerId, body.AssetCode || null, body.AssetType || 'Loại 1',
        body.Address || null, body.AppraisedValue || 0, body.Value || 0
      ];

      const result = await pool.query(sql, values);
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const body = req.body;
      const sql = `
        UPDATE "Collaterals" SET
          "CustomerId" = $1, "AssetCode" = $2, "AssetType" = $3,
          "Address" = $4, "AppraisedValue" = $5, "Value" = $6
        WHERE "Id" = $7
        RETURNING *;
      `;
      const values = [
        body.CustomerId, body.AssetCode || null, body.AssetType || 'Loại 1',
        body.Address || null, body.AppraisedValue || 0, body.Value || 0, id
      ];

      const result = await pool.query(sql, values);
      return res.status(200).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
