-- ============================================================================
-- Enforce uniqueness of proposal public tokens at the database level
-- ============================================================================
-- Why:
-- - generate_proposal_public_token() retries on collision
-- - BUT the database must be the final authority
-- - Partial index avoids blocking legacy NULL rows
-- ============================================================================

create unique index if not exists proposals_public_token_uidx
on public.proposals (public_token)
where public_token is not null;

