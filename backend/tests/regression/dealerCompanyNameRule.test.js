import { describe, it, expect } from "@jest/globals";
import { validateCompanyName, dealerPublicName } from "../../utils/companyName.js";

describe("dealer company-name rule", () => {
  it("accepts a distinct company name", () => {
    expect(validateCompanyName("Nairobi Prime Motors Ltd", { personName: "Jane Wanjiku" }).ok).toBe(true);
  });
  it("requires a name", () => {
    expect(validateCompanyName("", {}).code).toBe("COMPANY_NAME_REQUIRED");
    expect(validateCompanyName(undefined, {}).ok).toBe(false);
  });
  it("rejects the person's own name, in any order or case", () => {
    expect(validateCompanyName("Jane Wanjiku", { personName: "jane wanjiku" }).code).toBe("COMPANY_NAME_IS_PERSONAL_NAME");
    expect(validateCompanyName("Wanjiku  Jane", { personName: "Jane Wanjiku" }).ok).toBe(false);
  });
  it("rejects emails, urls, phone numbers and letterless names", () => {
    for (const bad of ["a@b.com", "https://x.co", "0712345678", "12345"]) {
      expect(validateCompanyName(bad, { personName: "X Y" }).ok).toBe(false);
    }
  });
  it("public name never falls back to the personal name", () => {
    expect(dealerPublicName({ name: "Jane Wanjiku" })).toBe("KAYAD dealer");
    expect(dealerPublicName({ name: "Jane", businessName: "Prime Motors" })).toBe("Prime Motors");
  });
});
