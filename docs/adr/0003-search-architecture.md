---
title: 0003 Search Architecture
owner: @tech-lead
team: architecture
last-reviewed: 2026-07-11
review-frequency: quarterly
status: active
tags: [architecture]
---
# 0003: Search Architecture

## Status
Accepted

## Context
The KAYAD platform requires efficient search functionality for car listings with complex filtering and sorting requirements:
- Full-text search on car attributes (title, brand, model, description)
- Faceted search (price range, year, location, mileage)
- Geographic search (location-based filtering)
- Real-time search results
- Search analytics and tracking
- Performance at scale (thousands of listings)

## Decision
We will implement Supabase (PostgreSQL)-based search with the following architecture:

### Search Implementation
1. **Text Search**: PostgreSQL full-text search with `to_tsvector` and `to_tsquery`
2. **Faceted Search**: SQL aggregations with GROUP BY and filters
3. **Geographic Search**: PostGIS with `ST_DWithin`, `ST_Within`
4. **Caching**: Redis cache for popular search queries
5. **Analytics**: SearchAnalytics model for tracking search behavior

### Technical Implementation
- **Database**: Supabase (PostgreSQL) with text search indexes
- **Indexing Strategy**:
  - GIN indexes on searchable fields
  - Text search index on title, brand, model, description
  - Partial indexes for active listings only
- **Query Optimization**: Early filtering with optimized queries
- **Pagination**: Offset-based pagination for large result sets

### Search Features
- Full-text search with relevance scoring using `ts_rank`
- Multi-field search with weights
- Fuzzy matching for typos (using `similarity` or `pg_trgm`)
- Auto-suggest for search queries
- Saved searches for users
- Search history tracking

## Consequences

### Positive
- Native Supabase/PostgreSQL integration (no additional infrastructure)
- Excellent performance for all dataset sizes
- Powerful full-text search capabilities
- Built-in PostGIS geospatial support
- Real-time search results with Row Level Security

### Negative
- May need Elasticsearch migration at very large scale (millions of documents)
- Fuzzy matching requires additional extension (pg_trgm)

## Alternatives Considered

### Elasticsearch
- **Rejected**: Additional infrastructure complexity
- **Reason**: PostgreSQL full-text search provides sufficient capabilities for current scale

### Algolia
- **Rejected**: Third-party dependency and cost
- **Reason**: Can be added later if search requirements become more complex

### MongoDB Atlas Search
- **Rejected**: Migrated to Supabase as primary database
- **Reason**: Consolidating on Supabase for all data storage

## Implementation Notes
- Monitor search query performance
- Add query logging for optimization
- Implement search result caching for popular queries
- Consider Elasticsearch migration if scale requires it
- Add A/B testing for search relevance

## References
- [PostgreSQL Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Supabase Documentation](https://supabase.com/docs)

## Related ADRs
- 0005: Analytics Architecture
- 0006: Infrastructure Architecture
