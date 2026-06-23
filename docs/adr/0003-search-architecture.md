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
We will implement MongoDB-based search with the following architecture:

### Search Implementation
1. **Text Search**: MongoDB Atlas Search or MongoDB text indexes
2. **Faceted Search**: Aggregation pipeline with $match, $group, $facet
3. **Geographic Search**: GeoJSON with $near, $geoWithin operators
4. **Caching**: Redis cache for popular search queries
5. **Analytics**: SearchAnalytics model for tracking search behavior

### Technical Implementation
- **Database**: MongoDB with text indexes on searchable fields
- **Indexing Strategy**:
  - Compound indexes on frequently queried fields
  - Text index on title, brand, model, description
  - Geospatial index on location
  - Partial indexes for active listings only
- **Query Optimization**: Aggregation pipeline with early filtering
- **Pagination**: Cursor-based pagination for large result sets

### Search Features
- Full-text search with relevance scoring
- Multi-field search with weights
- Fuzzy matching for typos
- Auto-suggest for search queries
- Saved searches for users
- Search history tracking

## Consequences

### Positive
- Native MongoDB integration (no additional infrastructure)
- Good performance for medium-scale datasets
- Flexible aggregation pipeline for complex queries
- Built-in geospatial support
- Real-time search results (no indexing delay)

### Negative
- Performance degradation at very large scale (millions of documents)
- Limited advanced search features compared to dedicated search engines
- Text search less sophisticated than Elasticsearch
- Relevance scoring less customizable

## Alternatives Considered

### Elasticsearch
- **Rejected**: Additional infrastructure complexity
- **Reason**: MongoDB Atlas Search provides sufficient capabilities for current scale

### Algolia
- **Rejected**: Third-party dependency and cost
- **Reason**: Can be added later if search requirements become more complex

### PostgreSQL Full-Text Search
- **Rejected**: Not using PostgreSQL as primary database
- **Reason**: MongoDB is our primary database, keeping search in same system

## Implementation Notes
- Monitor search query performance
- Add query logging for optimization
- Implement search result caching for popular queries
- Consider Elasticsearch migration if scale requires it
- Add A/B testing for search relevance

## References
- [MongoDB Atlas Search Documentation](https://www.mongodb.com/docs/atlas/search/)
- [MongoDB Text Search](https://www.mongodb.com/docs/manual/text-search/)

## Related ADRs
- 0005: Analytics Architecture
- 0006: Infrastructure Architecture
