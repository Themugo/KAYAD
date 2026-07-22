import mongoose from "mongoose";

const localizationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      index: true,
    },
    namespace: {
      type: String,
      default: "common",
      index: true,
    },
    locale: {
      type: String,
      required: true,
      enum: [
        "en",
        "sw",
        "ar",
        "zh",
        "de",
        "fr",
        "es",
        "pt",
      ],
      default: "en",
      index: true,
    },
    value: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    context: {
      type: String,
      description: "Usage context for translators",
    },
    characterLimit: {
      type: Number,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["draft", "active", "deprecated"],
      default: "active",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index
localizationSchema.index({ key: 1, namespace: 1, locale: 1 }, { unique: true });
localizationSchema.index({ locale: 1, status: 1 });
localizationSchema.index({ updatedAt: -1 });

// Static method to get translations for a locale
localizationSchema.statics.getTranslations = async function (locale = "en", namespace = "common") {
  const translations = await this.find({
    locale,
    namespace,
    status: "active",
  }).select("key value context");

  return translations.reduce((acc, t) => {
    acc[t.key] = {
      value: t.value,
      context: t.context,
    };
    return acc;
  }, {});
};

// Static method to get all namespaces for a locale
localizationSchema.statics.getAllNamespaces = async function (locale = "en") {
  const namespaces = await this.distinct("namespace", {
    locale,
    status: "active",
  });
  return namespaces;
};

// Static method to get translations grouped by namespace
localizationSchema.statics.getAllTranslations = async function (locale = "en") {
  const translations = await this.find({
    locale,
    status: "active",
  }).select("key value namespace context");

  return translations.reduce((acc, t) => {
    if (!acc[t.namespace]) acc[t.namespace] = {};
    acc[t.namespace][t.key] = {
      value: t.value,
      context: t.context,
    };
    return acc;
  }, {});
};

// Static method to search translations
localizationSchema.statics.search = async function (query, options = {}) {
  const { locale, namespace, page = 1, limit = 50 } = options;

  const filter = { status: "active" };
  if (locale) filter.locale = locale;
  if (namespace) filter.namespace = namespace;
  if (query) {
    filter.$or = [
      { key: { $regex: query, $options: "i" } },
      { value: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  const [results, total] = await Promise.all([
    this.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    this.countDocuments(filter),
  ]);

  return {
    results,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Static method to upsert translations
localizationSchema.statics.upsertTranslations = async function (translations, locale = "en", namespace = "common") {
  const bulkOps = translations.map((t) => ({
    updateOne: {
      filter: { key: t.key, namespace, locale },
      update: {
        $set: {
          value: t.value,
          description: t.description,
          context: t.context,
          status: "active",
        },
      },
      upsert: true,
    },
  }));

  return this.bulkWrite(bulkOps);
};

const Localization = mongoose.model("Localization", localizationSchema);

export default Localization;
