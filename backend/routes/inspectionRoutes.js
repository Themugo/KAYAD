// Compatibility entrypoint: the inspection domain has one canonical router.
// Keep this module only for imports outside server.js that still reference the historical path.
export { default } from "../inspection/routes/inspectionRoutes.js";
