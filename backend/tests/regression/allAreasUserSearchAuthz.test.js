import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

// AA-S2: GET /api/users/search must require authentication and must not expose
// email addresses or admin accounts to non-admin callers.
const src = fs.readFileSync(path.resolve("routes/userRoutes.js"), "utf8");
const block = src.slice(src.indexOf('"/search"'), src.indexOf('"/me"'));

describe("user search authorization (AA-S2)", () => {
  it("requires protect", () => expect(block).toMatch(/\bprotect\b/));
  it("only selects email for admins", () => {
    expect(block).toMatch(/isAdmin\s*\?\s*"name email/);
    expect(block).toMatch(/:\s*"name avatar/);
  });
  it("excludes admin accounts for non-admins", () => expect(block).toMatch(/\$nin:\s*STAFF_ROLES/));
});
