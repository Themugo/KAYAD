import asyncHandler from "../middleware/asyncHandler.js";
import Localization from "../models/Localization.js";
import { logInfo, logWarn } from "../utils/logger.js";

// =============================
// 🌐 GET TRANSLATIONS FOR LOCALE
// =============================
export const getTranslations = asyncHandler(async (req, res) => {
  const { locale = "en", namespace = "common" } = req.query;

  const translations = await Localization.getTranslations(locale, namespace);

  res.json({
    success: true,
    data: {
      locale,
      namespace,
      translations,
    },
  });
});

// =============================
// 📦 GET ALL NAMESPACES
// =============================
export const getAllNamespaces = asyncHandler(async (req, res) => {
  const { locale = "en" } = req.query;

  const namespaces = await Localization.getAllNamespaces(locale);

  res.json({
    success: true,
    data: {
      locale,
      namespaces,
    },
  });
});

// =============================
// 🌍 GET ALL TRANSLATIONS
// =============================
export const getAllTranslations = asyncHandler(async (req, res) => {
  const { locale = "en" } = req.query;

  const translations = await Localization.getAllTranslations(locale);

  res.json({
    success: true,
    data: {
      locale,
      translations,
    },
  });
});

// =============================
// 🔍 SEARCH TRANSLATIONS
// =============================
export const searchTranslations = asyncHandler(async (req, res) => {
  const { q, locale, namespace, page = 1, limit = 50 } = req.query;

  const result = await Localization.search(q, {
    locale,
    namespace,
    page: parseInt(page),
    limit: parseInt(limit),
  });

  res.json({
    success: true,
    data: result,
  });
});

// =============================
// ➕ CREATE TRANSLATION
// =============================
export const createTranslation = asyncHandler(async (req, res) => {
  const { key, namespace = "common", locale, value, description, context } = req.body;

  if (!locale || !value) {
    return res.status(400).json({
      success: false,
      message: "Locale and value are required",
    });
  }

  // Check for existing
  const existing = await Localization.findOne({ key, namespace, locale });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: "Translation already exists",
      translationId: existing._id,
    });
  }

  const translation = await Localization.create({
    key,
    namespace,
    locale,
    value,
    description,
    context,
  });

  logInfo("Translation created", {
    key,
    namespace,
    locale,
    translationId: translation._id,
  });

  res.status(201).json({
    success: true,
    data: translation,
  });
});

// =============================
// ✏️ UPDATE TRANSLATION
// =============================
export const updateTranslation = asyncHandler(async (req, res) => {
  const { translationId } = req.params;
  const { value, description, context, status } = req.body;

  const translation = await Localization.findById(translationId);
  if (!translation) {
    return res.status(404).json({
      success: false,
      message: "Translation not found",
    });
  }

  if (value) translation.value = value;
  if (description !== undefined) translation.description = description;
  if (context !== undefined) translation.context = context;
  if (status) translation.status = status;

  await translation.save();

  logInfo("Translation updated", {
    translationId: translation._id,
    updatedBy: req.user.id,
  });

  res.json({
    success: true,
    data: translation,
  });
});

// =============================
// 🗑️ DELETE TRANSLATION
// =============================
export const deleteTranslation = asyncHandler(async (req, res) => {
  const { translationId } = req.params;

  const translation = await Localization.findByIdAndDelete(translationId);
  if (!translation) {
    return res.status(404).json({
      success: false,
      message: "Translation not found",
    });
  }

  logInfo("Translation deleted", {
    translationId,
    deletedBy: req.user.id,
  });

  res.json({
    success: true,
    message: "Translation deleted",
  });
});

// =============================
// 📥 IMPORT TRANSLATIONS (BULK)
// =============================
export const importTranslations = asyncHandler(async (req, res) => {
  const { locale = "en", namespace = "common", translations } = req.body;

  if (!Array.isArray(translations)) {
    return res.status(400).json({
      success: false,
      message: "Translations must be an array",
    });
  }

  const result = await Localization.upsertTranslations(translations, locale, namespace);

  logInfo("Translations imported", {
    locale,
    namespace,
    count: translations.length,
    modified: result.modifiedCount,
    upserted: result.upsertedCount,
  });

  res.json({
    success: true,
    data: {
      locale,
      namespace,
      imported: translations.length,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
    },
  });
});

// =============================
// 📤 EXPORT TRANSLATIONS
// =============================
export const exportTranslations = asyncHandler(async (req, res) => {
  const { locale = "en", namespace } = req.query;

  let translations;
  if (namespace) {
    translations = await Localization.getTranslations(locale, namespace);
  } else {
    translations = await Localization.getAllTranslations(locale);
  }

  res.json({
    success: true,
    data: {
      locale,
      namespace,
      translations,
      exportedAt: new Date().toISOString(),
    },
  });
});

// =============================
// 🔄 TRANSLATE KEY TO ALL LOCALES
// =============================
export const getKeyInAllLocales = asyncHandler(async (req, res) => {
  const { key, namespace = "common" } = req.params;

  const translations = await Localization.find({
    key,
    namespace,
    status: "active",
  }).select("locale value context description");

  const result = translations.reduce((acc, t) => {
    acc[t.locale] = {
      value: t.value,
      context: t.context,
      description: t.description,
    };
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      key,
      namespace,
      translations: result,
    },
  });
});

// =============================
// 📊 GET TRANSLATION STATISTICS
// =============================
export const getTranslationStats = asyncHandler(async (req, res) => {
  const stats = await Localization.aggregate([
    {
      $group: {
        _id: { locale: "$locale", namespace: "$namespace" },
        count: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        draft: {
          $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
        },
      },
    },
    {
      $group: {
        _id: "$_id.locale",
        namespaces: {
          $push: {
            namespace: "$_id.namespace",
            total: "$count",
            active: "$active",
            draft: "$draft",
          },
        },
        total: { $sum: "$count" },
      },
    },
  ]);

  res.json({
    success: true,
    data: stats,
  });
});
