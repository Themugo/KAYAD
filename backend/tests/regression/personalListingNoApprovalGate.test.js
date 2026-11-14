import { describe, it, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(process.cwd(), "controllers/carController.js"), "utf8");
const create = src.slice(src.indexOf("export const createCar"), src.indexOf("export const createCar") + 12000);

describe("personal account listing: no approval gate unless the owner turns one on", () => {
  it("createCar decides publication with the shared sellerMayPublishDirectly rule", () => {
    expect(src).toMatch(/import \{[^}]*sellerMayPublishDirectly[^}]*\} from "\.\.\/services\/onboardingPolicy\.service\.js"/);
    expect(create).toMatch(/const publishNow = await sellerMayPublishDirectly\(/);
    expect(create).toMatch(/status: publishNow \? "available" : "pending"/);
  });

  it("no longer requires a separate approved seller-capability record to go live", () => {
    expect(create).not.toMatch(/sellerPublishable/);
    expect(create).not.toMatch(/autoPublish && /);
  });
});
