# Retired validators

`validate-stage5f7-private-auction-contract.mjs` checked three design documents (contract freeze, threat model, API authorization matrix) that are not in the repository, and it checked them against wording ("physical custody is mandatory for every private-seller auction", "seller pays the disclosed charges") that records product policy decisions. Those documents were not supplied and were not reconstructed, because inventing a policy contract would be worse than having no validator.

Status of the feature in code: the schema exists as a local-only migration (`supabase/migrations/20261020160000_private_seller_auction_custody_contract.sql`, not applied to any hosted database) and the application code does not enforce the workflow yet.

Owner decision needed: either restore the original three documents and move this script back to `scripts/`, or confirm the private-seller custody policy is shelved.
