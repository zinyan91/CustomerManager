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
        SELECT cc.*, 
               json_build_object('Id', cust."Id", 'CifKh', cust."CifKh", 'FullName', cust."FullName") as customer
        FROM "CreditCards" cc
        LEFT JOIN "Customers" cust ON cc."CustomerId" = cust."Id"
        ORDER BY cc."Id" DESC;
      `;
      const result = await pool.query(sql);
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const body = req.body;
      const sql = `
        INSERT INTO "CreditCards" (
          "Id", "CustomerId", "IssuanceType", "CardNumber", "CreditLimit", "Limit", "CurrentBalance", "Note"
        ) VALUES (
          (SELECT COALESCE(MAX("Id"), 0) + 1 FROM "CreditCards"),
          $1, $2, $3, $4, $5, $6, $7
        )
        RETURNING *;
      `;
      const values = [
        body.CustomerId, body.IssuanceType || 'Quan hệ tín dụng',
        body.CardNumber || null, body.CreditLimit || 0, body.Limit || 0,
        body.CurrentBalance || 0, body.Note || null
      ];

      const result = await pool.query(sql, values);
      return res.status(200).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
