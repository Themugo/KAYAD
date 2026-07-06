import { describe, it, expect } from "@jest/globals";
import { STATES, validateTransition, getAllowedTransitions, isTerminal } from "../services/escrowStateMachine.js";

describe("Escrow State Machine", () => {
  describe("STATES", () => {
    it("has all required states", () => {
      expect(STATES.PENDING).toBe("pending");
      expect(STATES.FUNDED).toBe("funded");
      expect(STATES.VEHICLE_CONFIRMED).toBe("vehicle_confirmed");
      expect(STATES.DELIVERED).toBe("delivered");
      expect(STATES.DISPUTED).toBe("disputed");
      expect(STATES.REFUNDED).toBe("refunded");
      expect(STATES.RELEASED).toBe("released");
      expect(STATES.CLOSED).toBe("closed");
    });
  });

  describe("isTerminal", () => {
    it("returns true for REFUNDED and CLOSED", () => {
      expect(isTerminal(STATES.REFUNDED)).toBe(true);
      expect(isTerminal(STATES.CLOSED)).toBe(true);
    });

    it("returns false for non-terminal states", () => {
      expect(isTerminal(STATES.PENDING)).toBe(false);
      expect(isTerminal(STATES.FUNDED)).toBe(false);
      expect(isTerminal(STATES.VEHICLE_CONFIRMED)).toBe(false);
      expect(isTerminal(STATES.DELIVERED)).toBe(false);
      expect(isTerminal(STATES.DISPUTED)).toBe(false);
      expect(isTerminal(STATES.RELEASED)).toBe(false);
    });
  });

  describe("getAllowedTransitions", () => {
    it("returns correct next states for PENDING", () => {
      const next = getAllowedTransitions(STATES.PENDING);
      expect(next).toContain(STATES.FUNDED);
      expect(next).toContain(STATES.DISPUTED);
      expect(next).not.toContain(STATES.RELEASED);
    });

    it("returns empty for terminal states", () => {
      expect(getAllowedTransitions(STATES.REFUNDED)).toEqual([]);
      expect(getAllowedTransitions(STATES.CLOSED)).toEqual([]);
    });

    it("returns empty array for unknown state", () => {
      expect(getAllowedTransitions("unknown")).toEqual([]);
    });
  });

  describe("validateTransition", () => {
    it("allows PENDING → FUNDED for system role", () => {
      const result = validateTransition(STATES.PENDING, STATES.FUNDED, "system");
      expect(result.allowed).toBe(true);
    });

    it("rejects PENDING → FUNDED for buyer role", () => {
      const result = validateTransition(STATES.PENDING, STATES.FUNDED, "buyer");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not authorized/i);
    });

    it("allows PENDING → DISPUTED for buyer, seller, admin", () => {
      for (const role of ["buyer", "seller", "admin", "superadmin"]) {
        const result = validateTransition(STATES.PENDING, STATES.DISPUTED, role);
        expect(result.allowed).toBe(true);
      }
    });

    it("allows FUNDED → VEHICLE_CONFIRMED for buyer", () => {
      const result = validateTransition(STATES.FUNDED, STATES.VEHICLE_CONFIRMED, "buyer");
      expect(result.allowed).toBe(true);
    });

    it("rejects FUNDED → VEHICLE_CONFIRMED for seller", () => {
      const result = validateTransition(STATES.FUNDED, STATES.VEHICLE_CONFIRMED, "seller");
      expect(result.allowed).toBe(false);
    });

    it("allows VEHICLE_CONFIRMED → DELIVERED for seller", () => {
      const result = validateTransition(STATES.VEHICLE_CONFIRMED, STATES.DELIVERED, "seller");
      expect(result.allowed).toBe(true);
    });

    it("rejects VEHICLE_CONFIRMED → DELIVERED for buyer", () => {
      const result = validateTransition(STATES.VEHICLE_CONFIRMED, STATES.DELIVERED, "buyer");
      expect(result.allowed).toBe(false);
    });

    it("allows DELIVERED → RELEASED for admin (deliveryConfirmed=true)", () => {
      const result = validateTransition(STATES.DELIVERED, STATES.RELEASED, "admin", { deliveryConfirmed: true });
      expect(result.allowed).toBe(true);
    });

    it("allows DELIVERED → RELEASED for system", () => {
      const result = validateTransition(STATES.DELIVERED, STATES.RELEASED, "system", { deliveryConfirmed: true });
      expect(result.allowed).toBe(true);
    });

    it("blocks DELIVERED → RELEASED when delivery not confirmed", () => {
      const result = validateTransition(STATES.DELIVERED, STATES.RELEASED, "admin", { deliveryConfirmed: false });
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not confirmed/i);
    });

    it("allows DELIVERED → DISPUTED for any party", () => {
      for (const role of ["buyer", "seller", "admin", "superadmin"]) {
        const result = validateTransition(STATES.DELIVERED, STATES.DISPUTED, role);
        expect(result.allowed).toBe(true);
      }
    });

    it("allows DISPUTED → REFUNDED for admin", () => {
      const result = validateTransition(STATES.DISPUTED, STATES.REFUNDED, "admin");
      expect(result.allowed).toBe(true);
    });

    it("allows DISPUTED → RELEASED for admin", () => {
      const result = validateTransition(STATES.DISPUTED, STATES.RELEASED, "admin");
      expect(result.allowed).toBe(true);
    });

    it("rejects DISPUTED → REFUNDED for buyer", () => {
      const result = validateTransition(STATES.DISPUTED, STATES.REFUNDED, "buyer");
      expect(result.allowed).toBe(false);
    });

    it("allows RELEASED → CLOSED for admin or system", () => {
      expect(validateTransition(STATES.RELEASED, STATES.CLOSED, "admin").allowed).toBe(true);
      expect(validateTransition(STATES.RELEASED, STATES.CLOSED, "system").allowed).toBe(true);
    });

    it("rejects transition from terminal state", () => {
      const result = validateTransition(STATES.REFUNDED, STATES.PENDING, "admin");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/terminal/);
    });

    it("rejects non-existent transition", () => {
      const result = validateTransition(STATES.PENDING, STATES.RELEASED, "admin");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not allowed/);
    });

    it("rejects unknown current state", () => {
      const result = validateTransition("unknown", STATES.PENDING, "admin");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/unknown/i);
    });
  });

  describe("Full lifecycle happy path", () => {
    it("validates complete PENDING → CLOSED flow", () => {
      const escrow = { deliveryConfirmed: false };
      expect(validateTransition(STATES.PENDING, STATES.FUNDED, "system").allowed).toBe(true);
      escrow.deliveryConfirmed = false;
      expect(validateTransition(STATES.FUNDED, STATES.VEHICLE_CONFIRMED, "buyer").allowed).toBe(true);
      expect(validateTransition(STATES.VEHICLE_CONFIRMED, STATES.DELIVERED, "seller").allowed).toBe(true);
      escrow.deliveryConfirmed = true;
      expect(validateTransition(STATES.DELIVERED, STATES.RELEASED, "admin", escrow).allowed).toBe(true);
      expect(validateTransition(STATES.RELEASED, STATES.CLOSED, "admin").allowed).toBe(true);
    });

    it("validates dispute → refund flow", () => {
      expect(validateTransition(STATES.FUNDED, STATES.DISPUTED, "buyer").allowed).toBe(true);
      expect(validateTransition(STATES.DISPUTED, STATES.REFUNDED, "admin").allowed).toBe(true);
    });

    it("validates dispute → release flow", () => {
      expect(validateTransition(STATES.DELIVERED, STATES.DISPUTED, "buyer").allowed).toBe(true);
      expect(validateTransition(STATES.DISPUTED, STATES.RELEASED, "admin").allowed).toBe(true);
    });
  });
});
