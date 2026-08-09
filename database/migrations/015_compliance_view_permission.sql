-- Legal Advisor was given can_view_analytics as its only permission, but
-- that gates website traffic/business analytics (server/routes/analytics.js)
-- - it has nothing to do with compliance filings or contracts, so a Legal
-- Advisor with only that flag couldn't actually see anything relevant to
-- their role. This adds a real read-only permission for the surfaces that
-- matter: filing deadlines, the document vault, and contract templates
-- (not individual employee contracts, which carry salary data).

ALTER TABLE staff ADD COLUMN IF NOT EXISTS can_view_compliance BOOLEAN DEFAULT false;
