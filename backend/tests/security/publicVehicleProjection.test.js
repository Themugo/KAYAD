// Phase 13K — unit contract for the public vehicle projection (the HTTP + database proof is runbooks/phase13k-20261026/http/phase13k_public_vehicle_security.mjs).
import { describe, it, expect } from "@jest/globals";
import { toPublicVehicleDetail, toPublicVehicleSummary, toPublicDealer, PUBLIC_VEHICLE_POLICY } from "../../utils/publicVehicleProjection.js";

const SENSITIVE = {
  reservePrice: 9876543, reserve_price: 9876543, reserveMode: "hard", reserve_mode: "hard", dealerPhone: "+254799000111", dealer_phone: "+254799000111",
  chassisNumber: "CHS-1", chassis_number: "CHS-1", registrationNumber: "REG-1", registration_number: "REG-1", vin: "VIN-1",
  highestBidder: "u-1", highest_bidder_id: "u-1", winner: { note: "w" }, paymentStatus: "paid", payment_status: "paid", isPaid: true, priceHistory: [{ n: 1 }], price_history: [{ n: 1 }],
  deletedAt: "2026-01-01", deleted_at: "2026-01-01", deletedBy: "a-1", isFlaggedDuplicate: true, approved: true, clicks: 9, trustScore: 77, ntsaVerified: true, logbookVerified: true, dealer_id: "d-1",
};
const car = { id: "c-1", _id: "c-1", title: "T", brand: "B", model: "M", year: 2019, price: 1, images: [], currentBid: 5, bidsCount: 1, allowBid: true, dutyStatus: "duty_paid", escrowEnabled: false, ...SENSITIVE,
  dealer: { id: "d-1", _id: "d-1", name: "N", businessName: "BN", avatar: "a", role: "dealer", dealerApprovedAt: "x", phone: "+254711000222", email: "d@x.example", bio: "bio", location: "Nairobi" } };

describe("public vehicle projection", () => {
  it("detail keeps display fields and drops every sensitive key and value", () => {
    const out = toPublicVehicleDetail(car);
    expect(out.title).toBe("T"); expect(out.currentBid).toBe(5); expect(out.dealer.name).toBe("N"); expect(out.dealer.id).toBe("d-1");
    const text = JSON.stringify(out);
    for (const k of Object.keys(SENSITIVE)) expect(Object.prototype.hasOwnProperty.call(out, k)).toBe(false);
    for (const v of ["9876543", "+254799000111", "CHS-1", "REG-1", "VIN-1", "u-1", "+254711000222", "d@x.example", "bio"]) expect(text.includes(v)).toBe(false);
  });
  it("seller phone and VIN are emitted only when the recorded owner policy says so", () => {
    expect(PUBLIC_VEHICLE_POLICY).toEqual({ exposeVin: false, exposeSellerPhone: false });
    const open = toPublicVehicleDetail(car, { exposeVin: true, exposeSellerPhone: true });
    expect(open.vin).toBe("VIN-1"); expect(open.dealer.phone).toBe("+254711000222"); expect(open.dealer.email).toBeUndefined(); expect(open.chassisNumber).toBeUndefined();
  });
  it("summary projection never carries reserve, chassis, VIN, bidder or winner", () => {
    const out = toPublicVehicleSummary(car); const text = JSON.stringify(out);
    for (const v of ["9876543", "CHS-1", "REG-1", "VIN-1", "u-1", "+254799000111", "+254711000222"]) expect(text.includes(v)).toBe(false);
    expect(out.title).toBe("T");
  });
  it("an unpopulated dealer id passes through and null stays null", () => {
    expect(toPublicDealer("d-1")).toBe("d-1"); expect(toPublicDealer(null)).toBeNull();
    expect(toPublicVehicleDetail({ ...car, dealer: "d-1" }).dealer).toBe("d-1");
  });
});
