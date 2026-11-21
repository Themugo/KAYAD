#!/usr/bin/env node
// Legacy chat attachment INVENTORY — read-only. Makes NO Cloudinary call and NO database write.
//
//   node backend/scripts/chat-attachment-inventory.mjs --out inventory.json
//
// Reads chats (id, messages) and cars (id, images) through the service-role client (SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY from the environment; run it against STAGING first). Writes a JSON manifest containing only
// public ids, counts and chat counts — never message text, user ids or URLs with signatures.
// The manifest is the required input of migrate-chat-attachments-private.mjs --apply (after human review).
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildInventory } from "../services/chatAttachmentInventory.js";

const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6) || `chat-attachment-inventory-${Date.now()}.json`;
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (staging first)."); process.exit(2); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const readAll = async (table, columns) => {
  const rows = []; const page = 500;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb.from(table).select(columns).order("id").range(from, from + page - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < page) break;
  }
  return rows;
};

const chats = await readAll("chats", "id, messages");
const cars = await readAll("cars", "id, images");
const inv = buildInventory(chats, cars);
const manifest = { generatedAt: new Date().toISOString(), mode: "inventory-read-only", chatsScanned: chats.length, carsScanned: cars.length, ...inv };
fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ out, chatsScanned: chats.length, carsScanned: cars.length, counts: inv.counts, distinctAssets: inv.assets, migrationCandidates: inv.candidates.length, excluded: inv.excluded.length }));
