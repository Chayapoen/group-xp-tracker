import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

describe("Supabase Admin & Schema", () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    if (origUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (origKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("throws a clear error when Supabase env vars are missing", () => {
    expect(() => getSupabaseAdmin()).toThrow(/NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("defines all 7 required tables with RLS enabled, toggle RPC, and evidence-photos bucket", () => {
    const schemaPath = path.resolve(process.cwd(), "supabase/schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf8").toLowerCase();
    const requiredTables = [
      "app_settings",
      "temp_users",
      "score_categories",
      "score_items",
      "user_scores",
      "score_history",
      "evidence_photos",
    ];
    for (const table of requiredTables) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain("create or replace function public.toggle_user_score");
    expect(sql).toContain("evidence-photos");
  });
});
