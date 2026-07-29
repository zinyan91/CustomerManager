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
        SELECT l.*, 
               json_build_object('Id', cust."Id", 'CifKh', cust."CifKh", 'FullName', cust."FullName", 'AccountNumber', cust."AccountNumber") as customer
        FROM "LoanContracts" l
        LEFT JOIN "Customers" cust ON l."CustomerId" = cust."Id"
        ORDER BY l."Id" DESC;
      `;
      const result = await pool.query(sql);
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const body = req.body;
      const sql = `
        INSERT INTO "LoanContracts" (
          "Id", "CustomerId", "ContractNumber", "ContractType", "ContractAmount", "DebtGroup", "IsSettled", "IsRestructured"
        ) VALUES (
          (SELECT COALESCE(MAX("Id"), 0) + 1 FROM "LoanContracts"),
          $1, $2, $3, $4, $5, false, false
        )
        RETURNING *;
      `;
      const values = [
        body.CustomerId, body.ContractNumber, body.ContractType || 0,
        body.ContractAmount || 0, body.DebtGroup || 1
      ];

      const result = await pool.query(sql, values);
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const body = req.body;
      const sql = `
        UPDATE "LoanContracts" SET
          "CustomerId" = $1, "ContractNumber" = $2, "ContractType" = $3,
          "ContractAmount" = $4, "DebtGroup" = $5
        WHERE "Id" = $6
        RETURNING *;
      `;
      const values = [
        body.CustomerId, body.ContractNumber, body.ContractType || 0,
        body.ContractAmount || 0, body.DebtGroup || 1, id
      ];

      const result = await pool.query(sql, values);
      return res.status(200).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
