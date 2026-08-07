/*
# Missing Foreign Key Indexes

Index audit of the applied schema found 2 foreign key columns without a
matching index: vehicle_inspections.inspector_id and
system_settings.updated_by (both reference profiles.id). Added here as a new
migration rather than editing the existing schema migration file directly,
since that one may already be applied to a real database.
*/

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_inspector_id ON vehicle_inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON system_settings(updated_by);
