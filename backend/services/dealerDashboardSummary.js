// Pure derivations for the dealer dashboard. Everything is computed from the signed-in dealer's own real listings and leads;
// nothing is invented, and an empty result means "no data", which the UI shows as such.

const STAGE_LABEL = {
  new: "New enquiry", contacted: "Buyer contacted", negotiating: "Negotiation in progress", inspectionBooked: "Inspection booked",
  reserved: "Vehicle reserved", sold: "Marked sold", lost: "Lead closed",
};

const firstImage = (listing) => {
  const img = Array.isArray(listing?.images) ? listing.images[0] : null;
  return (typeof img === "string" ? img : img?.url) || null;
};

export function listingStatusBreakdown(listings) {
  const out = { available: 0, pending: 0, reserved: 0, sold: 0, hidden: 0, draft: 0 };
  for (const l of listings || []) {
    const key = l.status === "active" ? "available" : l.status;
    if (Object.prototype.hasOwnProperty.call(out, key)) out[key]++;
  }
  return out;
}

export function buildTopPerformers(listings, leads, limit = 5) {
  const leadsByVehicle = new Map();
  for (const lead of leads || []) {
    if (lead.vehicle) leadsByVehicle.set(String(lead.vehicle), (leadsByVehicle.get(String(lead.vehicle)) || 0) + 1);
  }
  return [...(listings || [])]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, limit)
    .map((l) => ({ id: l.id, title: l.title, views: l.views || 0, price: l.price, status: l.status, image: firstImage(l), leads: leadsByVehicle.get(String(l.id)) || 0 }));
}

export function buildRecentActivity(listings, leads, limit = 8) {
  const titleById = new Map((listings || []).map((l) => [String(l.id), l.title]));
  const stamp = (lead) => lead.lastActivityAt || lead.updatedAt || lead.createdAt || null;
  return [...(leads || [])]
    .sort((a, b) => new Date(stamp(b) || 0) - new Date(stamp(a) || 0))
    .slice(0, limit)
    .map((lead) => {
      const title = titleById.get(String(lead.vehicle));
      return {
        id: lead.id,
        type: "lead",
        message: `${STAGE_LABEL[lead.stage] || "Lead update"}${title ? ` · ${title}` : ""}`,
        time: stamp(lead),
        stage: lead.stage || null,
        vehicleId: lead.vehicle || null,
      };
    });
}
