// The paperwork a dealer application CAN include. Which of these are asked for, and which are mandatory, is NOT decided here:
// that is the owner-controlled saved configuration (services/dealerPaperwork.service.js). This file only defines what each item is
// and how an entry of that kind is validated, so the catalogue is the single list of supported document types.
//
// In KAYAD, dealer paperwork is a set of STRUCTURED ENTRIES (ID type + number, KRA PIN, registration number, address, phone
// verification), recorded on dealer_verifications.documents and reviewed by an admin. There is no dealer document FILE upload in
// the product, so none was added; file-type/size/storage rules therefore do not apply to these items.
import { z } from "zod";

export const PAPERWORK_ITEMS = Object.freeze({
  governmentId: {
    label: "Government ID",
    help: "National ID, passport or driving licence number.",
    kind: "entry",
    schema: z.object({
      type: z.enum(["national_id", "passport", "drivers_license"]),
      documentNumber: z.string().trim().min(3).max(100),
    }).strict(),
  },
  kraPin: {
    label: "KRA PIN",
    help: "Kenya Revenue Authority PIN, for example A123456789Z.",
    kind: "entry",
    schema: z.object({ pinNumber: z.string().trim().regex(/^[A-Z]\d{9}[A-Z]$/i, "Invalid KRA PIN") }).strict(),
  },
  businessRegistration: {
    label: "Business registration",
    help: "Registration number of the business.",
    kind: "entry",
    schema: z.object({ registrationNumber: z.string().trim().min(2).max(100), businessName: z.string().trim().min(2).max(200) }).strict(),
  },
  physicalAddress: {
    label: "Physical address",
    help: "Where the dealership operates from.",
    kind: "entry",
    schema: z.object({ address: z.string().trim().min(3).max(300) }).strict(),
  },
  // Completed through the OTP flow (/api/verification/phone/*), not typed in the form; "present" means verified.
  phoneVerification: {
    label: "Phone verification",
    help: "Confirm your phone number with a one-time code.",
    kind: "verification",
    schema: null,
  },
});

export const PAPERWORK_KEYS = Object.freeze(Object.keys(PAPERWORK_ITEMS));
