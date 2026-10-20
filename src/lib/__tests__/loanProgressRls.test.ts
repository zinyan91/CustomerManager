import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const db = new PGlite();
const owner='00000000-0000-0000-0000-000000000001';
const leader='00000000-0000-0000-0000-000000000002';
const outsider='00000000-0000-0000-0000-000000000003';
const team='00000000-0000-0000-0000-000000000004';
const asUser = async (id:string,sql:string) => {
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false);`);
  try { return await db.query(sql); }
  finally { await db.exec('RESET ROLE'); }
};
const insert=`INSERT INTO public."LoanProgressEntries" ("Month","CustomerKind","CustomerName","Amount","CaseType","LoanTerm","Stage")
  VALUES ('2026-10','new','Khách thử',0,'Mới','Ngắn hạn','Mới nhận hồ sơ') RETURNING *`;
beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon;
    CREATE SCHEMA auth; CREATE SCHEMA app_team;
    GRANT USAGE ON SCHEMA auth,app_team TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES ('${owner}'),('${leader}'),('${outsider}');
    CREATE TABLE public."Customers" ("Id" bigint PRIMARY KEY,"FullName" text,"OwnerId" uuid);
    INSERT INTO public."Customers" VALUES (1,'KH hiện hữu','${owner}'),(2,'KH ngoài','${outsider}');
    GRANT SELECT ON public."Customers" TO authenticated;
    CREATE TABLE public."TeamMemberships" ("UserId" uuid,"TeamId" uuid,"EffectiveFrom" timestamptz,"EffectiveTo" timestamptz);
    INSERT INTO public."TeamMemberships" VALUES ('${owner}','${team}',now()-interval '1 day',null);
    CREATE FUNCTION public.has_module(text) RETURNS boolean LANGUAGE sql STABLE AS
      $$ SELECT coalesce(current_setting('test.module',true),'yes')<>'no' $$;
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
    CREATE FUNCTION app_team.account_active() RETURNS boolean LANGUAGE sql STABLE AS
      $$ SELECT coalesce(current_setting('test.active',true),'yes')<>'no' $$;
    CREATE FUNCTION app_team.can_lead_team(uuid) RETURNS boolean LANGUAGE sql STABLE AS
      $$ SELECT auth.uid()='${leader}'::uuid $$;
  `);
  await db.exec(readFileSync('supabase/migrations/20261020130541_loan_progress_entries.sql','utf8'));
},30000);
afterAll(async()=>{await db.close();});
describe.sequential('progress RLS and guards',()=>{
  it('allows own entry, retains zero and missing, audits creation',async()=>{
    const result=await asUser(owner,insert);
    expect(result.rows[0]).toMatchObject({OwnerId:owner,Amount:'0',Cards:null,Version:1});
    expect((await db.query('SELECT * FROM public."LoanProgressHistory"')).rows).toHaveLength(1);
  });
  it('leader reads but cannot update or insert under member identity',async()=>{
    expect((await asUser(leader,'SELECT * FROM public."LoanProgressEntries"')).rows).toHaveLength(1);
    expect((await asUser(leader,`UPDATE public."LoanProgressEntries" SET "Stage"='Đã giải ngân' RETURNING *`)).rows).toHaveLength(0);
    await expect(asUser(leader,`INSERT INTO public."LoanProgressEntries" ("OwnerId","Month","CustomerKind","CustomerName","CaseType","LoanTerm","Stage")
      VALUES ('${owner}','2026-10','new','X','Mới','Ngắn hạn','Đã giải ngân')`)).rejects.toThrow(/row-level security/);
  });
  it('outsider cannot read, disabled account/module cannot read or write',async()=>{
    expect((await asUser(outsider,'SELECT * FROM public."LoanProgressEntries"')).rows).toHaveLength(0);
    for (const setting of ['test.active','test.module']) {
      await db.exec(`SELECT set_config('${setting}','no',false)`);
      expect((await asUser(owner,'SELECT * FROM public."LoanProgressEntries"')).rows).toHaveLength(0);
      await expect(asUser(owner,insert)).rejects.toThrow(/row-level security/);
      await db.exec(`SELECT set_config('${setting}','yes',false)`);
    }
  });
  it('enforces customer ownership and canonical name',async()=>{
    await expect(asUser(owner,`UPDATE public."LoanProgressEntries" SET "CustomerKind"='existing',"CustomerId"=2`)).rejects.toThrow(/không thuộc/);
    const result=await asUser(owner,`UPDATE public."LoanProgressEntries" SET "CustomerKind"='existing',"CustomerId"=1,"CustomerName"='spoof' RETURNING *`);
    expect(result.rows[0]).toMatchObject({CustomerName:'KH hiện hữu',Version:2});
    expect((await db.query('SELECT * FROM public."LoanProgressHistory"')).rows).toHaveLength(2);
  });
  it('rejects reassignment, delete, history writes, decimals and negative amounts',async()=>{
    await expect(asUser(owner,`UPDATE public."LoanProgressEntries" SET "OwnerId"='${outsider}'`)).rejects.toThrow(/permission denied/);
    await expect(asUser(owner,'DELETE FROM public."LoanProgressEntries"')).rejects.toThrow(/permission denied/);
    await expect(asUser(owner,'SELECT * FROM public."LoanProgressHistory"')).rejects.toThrow(/permission denied/);
    for (const value of ['-1','0.5',"'NaN'","'Infinity'"])
      await expect(asUser(owner,`UPDATE public."LoanProgressEntries" SET "Amount"=${value}`)).rejects.toThrow();
  });
  it('membership ending removes team visibility',async()=>{
    await db.exec(`UPDATE public."TeamMemberships" SET "EffectiveTo"=now()-interval '1 second'`);
    expect((await asUser(leader,'SELECT * FROM public."LoanProgressEntries"')).rows).toHaveLength(0);
  });
});

describe.sequential('explicit team progress permissions',()=>{
  beforeAll(async()=>{
    await db.exec(`
      CREATE TABLE public."Teams" ("Id" uuid PRIMARY KEY,"IsActive" boolean);
      INSERT INTO public."Teams" VALUES ('${team}',true),('00000000-0000-0000-0000-000000000005',true);
      CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS
        $$ SELECT auth.uid()='${outsider}'::uuid $$;
      CREATE OR REPLACE FUNCTION app_team.can_lead_team(p_team uuid) RETURNS boolean LANGUAGE sql STABLE AS
        $$ SELECT public.is_admin() OR (auth.uid()='${leader}'::uuid AND p_team='${team}'::uuid) $$;
      CREATE FUNCTION app_team.can_view_team(p_team uuid) RETURNS boolean LANGUAGE sql STABLE AS
        $$ SELECT public.is_admin() OR (auth.uid() IN ('${owner}'::uuid,'${leader}'::uuid) AND p_team='${team}'::uuid) $$;
    `);
    await db.exec(readFileSync('supabase/migrations/20261020134007_loan_progress_team_assignment.sql','utf8'));
    await db.exec(readFileSync('supabase/migrations/20261020134855_loan_progress_editor_customer_guard.sql','utf8'));
  });
  it('retains legacy rows, requires team and denies member entry',async()=>{
    expect((await db.query('SELECT "TeamId" FROM public."LoanProgressEntries"')).rows[0]).toEqual({TeamId:null});
    await expect(asUser(owner,insert)).rejects.toThrow(/row-level security/);
    await expect(asUser(leader,insert)).rejects.toThrow(/row-level security/);
  });
  it('admin assigns legacy row; leader reads and edits team irrespective of creator',async()=>{
    await asUser(outsider,`UPDATE public."LoanProgressEntries" SET "TeamId"='${team}'`);
    expect((await asUser(leader,'SELECT * FROM public."LoanProgressEntries"')).rows).toHaveLength(1);
    expect((await asUser(leader,`UPDATE public."LoanProgressEntries" SET "Stage"='Chờ giải ngân' RETURNING *`)).rows).toHaveLength(1);
    await expect(asUser(leader,`UPDATE public."LoanProgressEntries" SET "TeamId"='00000000-0000-0000-0000-000000000005'`)).rejects.toThrow(/row-level security/);
  });
  it('members read but cannot edit and leaders can insert for own team',async()=>{
    expect((await asUser(owner,'SELECT * FROM public."LoanProgressEntries"')).rows).toHaveLength(1);
    expect((await asUser(owner,`UPDATE public."LoanProgressEntries" SET "Stage"='Đã giải ngân' RETURNING *`)).rows).toHaveLength(0);
    await asUser(leader,`INSERT INTO public."LoanProgressEntries" ("TeamId","Month","CustomerKind","CustomerName","CaseType","LoanTerm","Stage")
      VALUES ('${team}','2026-10','new','Team entry','Mới','Ngắn hạn','Mới nhận hồ sơ')`);
    expect((await asUser(owner,'SELECT * FROM public."LoanProgressEntries"')).rows).toHaveLength(2);
  });
});

describe.sequential('progress assignee',()=>{
  beforeAll(async()=>{
    await db.exec(`
      ALTER TABLE auth.users ADD COLUMN banned_until timestamptz;
      CREATE TABLE public."UserRoles" ("UserId" uuid PRIMARY KEY,"FullName" text);
      INSERT INTO public."UserRoles" VALUES ('${owner}','Nhân sự thật');
      UPDATE public."TeamMemberships" SET "EffectiveTo"=NULL;
    `);
    await db.exec(readFileSync('supabase/migrations/20261020135338_loan_progress_assignee.sql','utf8'));
  });
  it('preserves legacy nulls and rejects missing or outside-team assignments',async()=>{
    expect((await db.query<{AssigneeId:string|null}>('SELECT "AssigneeId" FROM public."LoanProgressEntries"')).rows.every(row=>row.AssigneeId===null)).toBe(true);
    await expect(asUser(leader,`UPDATE public."LoanProgressEntries" SET "AssigneeId"='${outsider}'`)).rejects.toThrow(/không thuộc team/);
    await expect(asUser(leader,`INSERT INTO public."LoanProgressEntries" ("TeamId","Month","CustomerKind","CustomerName","CaseType","LoanTerm","Stage")
      VALUES ('${team}','2026-10','new','X','Mới','Ngắn hạn','Mới nhận hồ sơ')`)).rejects.toThrow(/Chọn nhân sự/);
  });
  it('validates membership and snapshots name rather than creator',async()=>{
    const result=await asUser(leader,`UPDATE public."LoanProgressEntries" SET "AssigneeId"='${owner}' RETURNING *`);
    expect(result.rows[0]).toMatchObject({AssigneeId:owner,AssigneeName:'Nhân sự thật'});
    await expect(asUser(leader,`UPDATE public."LoanProgressEntries" SET "AssigneeName"='spoof'`)).rejects.toThrow(/permission denied/);
  });
  it('retains historical name and assignment after membership ends',async()=>{
    await db.exec(`UPDATE public."TeamMemberships" SET "EffectiveTo"=now()-interval '1 second';
      UPDATE public."UserRoles" SET "FullName"='Tên mới';`);
    const result=await asUser(leader,`UPDATE public."LoanProgressEntries" SET "Stage"='Thu thập hồ sơ' RETURNING *`);
    expect(result.rows[0]).toMatchObject({AssigneeId:owner,AssigneeName:'Nhân sự thật'});
  });
});
