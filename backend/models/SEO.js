import mongoose from "mongoose";

const seoMetadataSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["page", "car", "auction", "dealer", "category"],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    // Meta tags
    metaTitle: {
      type: String,
      required: true,
      maxLength: 70,
    },
    metaDescription: {
      type: String,
      required: true,
      maxLength: 160,
    },
    metaKeywords: {
      type: [String],
      default: [],
    },
    // Open Graph
    ogTitle: {
      type: String,
      maxLength: 95,
    },
    ogDescription: {
      type: String,
      maxLength: 200,
    },
    ogImage: {
      type: String,
    },
    ogImageAlt: {
      type: String,
    },
    ogType: {
      type: String,
      enum: ["website", "article", "product", "profile"],
      default: "website",
    },
    // Twitter Card
    twitterCard: {
      type: String,
      enum: ["summary", "summary_large_image", "app", "player"],
      default: "summary_large_image",
    },
    twitterSite: {
      type: String,
    },
    twitterCreator: {
      type: String,
    },
    // Structured Data (JSON-LD)
    structuredData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    structuredDataType: {
      type: String,
      enum: [
        "Organization",
        "WebSite",
        "WebPage",
        "Product",
        "Offer",
        "AutoDealer",
        "FAQPage",
        "BreadcrumbList",
        "Car",
        "Event",
        null,
      ],
    },
    // Canonical URL
    canonicalUrl: {
      type: String,
    },
    // Robots
    robots: {
      index: { type: Boolean, default: true },
      follow: { type: Boolean, default: true },
      "max-image-preview": { type: String, enum: ["none", "large", "index"], default: "large" },
      "max-snippet": { type: Number, default: 160 },
      "max-video-preview": { type: Number, default: -1 },
    },
    // Additional
    keywords: {
      type: [String],
      default: [],
    },
    // Priority and change frequency for sitemap
    priority: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    changeFrequency: {
      type: String,
      enum: ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"],
      default: "weekly",
    },
    // Local SEO
    localBusiness: {
      type: {
        type: String,
        enum: ["local_business"],
      },
      name: String,
      address: String,
      city: String,
      country: String,
      phone: String,
      openingHours: [String],
    },
    // Status
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },
    // Versioning
    version: {
      type: Number,
      default: 1,
    },
    lastReviewed: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for entity lookups
seoMetadataSchema.index({ entityType: 1, entityId: 1 }, { unique: true, sparse: true });

// Index for slug lookups
seoMetadataSchema.index({ slug: 1, status: 1 });

// Pre-save validation
seoMetadataSchema.pre("save", function (next) {
  // Auto-generate ogTitle from metaTitle if not set
  if (!this.ogTitle && this.metaTitle) {
    this.ogTitle = this.metaTitle;
  }
  // Auto-generate ogDescription from metaDescription if not set
  if (!this.ogDescription && this.metaDescription) {
    this.ogDescription = this.metaDescription;
  }
  next();
});

// Static method to generate JSON-LD for a car
seoMetadataSchema.statics.generateCarJsonLd = function (car, baseUrl = "") {
  const vehicleIdentification = car.vehicleIdentification || {};
  const pricing = car.pricing || {};

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: car.title,
    description: car.description,
    image: car.images?.[0] || "",
    url: `${baseUrl}/cars/${car._id}`,
    sku: car._id.toString(),
    productID: car._id.toString(),
    brand: {
      "@type": "Brand",
      name: vehicleIdentification.make || "Unknown",
    },
    model: vehicleIdentification.model || "Unknown",
    manufacturer: {
      "@type": "Organization",
      name: vehicleIdentification.make || "KAYAD",
    },
    offers: {
      "@type": "Offer",
      price: pricing.currentPrice || car.price || 0,
      priceCurrency: "KES",
      availability: car.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/UsedCondition",
      seller: {
        "@type": "AutoDealer",
        name: "KAYAD Motors",
        url: baseUrl,
      },
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Year",
        value: vehicleIdentification.year || "",
      },
      {
        "@type": "PropertyValue",
        name: "Mileage",
        value: vehicleIdentification.mileage || "",
      },
      {
        "@type": "PropertyValue",
        name: "Transmission",
        value: vehicleIdentification.transmission || "",
      },
      {
        "@type": "PropertyValue",
        name: "Fuel Type",
        value: vehicleIdentification.fuelType || "",
      },
    ].filter((p) => p.value),
  };
};

// Static method to generate breadcrumb JSON-LD
seoMetadataSchema.statics.generateBreadcrumbJsonLd = function (items, baseUrl = "") {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url ? `${baseUrl}${item.url}` : undefined,
    })),
  };
};

// Static method to get or create SEO metadata
seoMetadataSchema.statics.getOrCreate = async function (entityType, entityId, defaults = {}) {
  let seo = await this.findOne({ entityType, entityId });
  if (!seo) {
    seo = await this.create({
      entityType,
      entityId,
      metaTitle: defaults.metaTitle || "",
      metaDescription: defaults.metaDescription || "",
      ...defaults,
    });
  }
  return seo;
};

const SEOMetadata = mongoose.model("SEOMetadata", seoMetadataSchema);

export default SEOMetadata;
