import { describe, it, expect } from "@jest/globals";
import fs from "fs";
const src = fs.readFileSync(new URL("../../controllers/announcementController.js", import.meta.url), "utf8");
describe("G-21 announcement audiences follow the unified account model", () => {
  it("dealers audience is business dealers only", () => { expect(src).toMatch(/DEALER_ROLES = \["dealer"\]/); expect(src).toMatch(/case "dealers":\s+query = \{ role: \{ \$in: DEALER_ROLES \} \}/); });
  it("buyers audience reaches every personal account, including legacy private sellers", () => { expect(src).toMatch(/PERSONAL_ROLES = \["user", "buyer", "individual_seller"\]/); expect(src).toMatch(/case "buyers":\s+query = \{ role: \{ \$in: PERSONAL_ROLES \} \}/); });
});
