# Advertising Layout Implementation

## Overview

This document describes the monetization-focused homepage redesign for the KAYAD automotive marketplace. The homepage now includes dedicated commercial zones and reusable advertisement components.

## Homepage Structure

The homepage is organized into the following sections:

1. **Hero** - Premium automotive slider with vehicle images
2. **Sponsor Banner Area** - Full-width advertisement banner
3. **Live Ticker** - Live auction count ticker
4. **Stats Bar** - Platform statistics (Cars Listed, Brands, Live Auctions, Buy Now)
5. **Featured Inventory** - Elite vehicle selection grid
6. **Live Auctions** - Active auction listings
7. **Dealer Spotlight** - Featured dealer profiles
8. **Private Seller Spotlight** - P2P seller profiles
9. **Advertisement Zone A** - Mid-page advertisement banner
10. **Featured Dealers** - Premium dealer partners
11. **Advertisement Zone B** - Mid-page advertisement banner
12. **Vehicle Categories** - Browse by category (Sedans, SUVs, Trucks, Motorcycles, Luxury, Sports)
13. **Advertisement Zone C** - Mid-page advertisement banner
14. **Testimonials** - User testimonials and reviews
15. **Partners** - Trusted partner logos
16. **Feature Pillars** - Platform features (Live Auctions, Escrow Protection, Verified Dealers)
17. **CTA Section** - Call-to-action for dealers and registration

## Advertisement Components

### AdvertisementBanner Component

**Location:** `src/components/AdvertisementBanner.jsx`

**Features:**
- Reusable advertisement banner component
- Supports multiple ad types:
  - `image` - Static image advertisements
  - `html` - HTML/iframe advertisements
  - `dealer` - Sponsored dealer profiles
  - `vehicle` - Sponsored vehicle listings
- Configurable sizes: `small`, `medium`, `large`
- Configurable positions: `horizontal`, `vertical`, `square`
- Optional dismissible functionality
- Sponsored label indicator
- Click tracking support
- Admin configurable via props

**Props:**
```javascript
{
  type: 'image' | 'html' | 'dealer' | 'vehicle',
  content: { dealer: {}, vehicle: {} }, // For dealer/vehicle types
  imageUrl: string, // For image type
  htmlContent: string, // For HTML type
  linkUrl: string, // Destination URL
  altText: string, // Alt text for accessibility
  position: 'horizontal' | 'vertical' | 'square',
  size: 'small' | 'medium' | 'large',
  dismissible: boolean,
  sponsoredLabel: boolean,
  className: string,
  onDismiss: function,
  onClick: function
}
```

**Usage Example:**
```jsx
<AdvertisementBanner
  type="image"
  imageUrl="https://example.com/ad.jpg"
  position="horizontal"
  size="large"
  linkUrl="https://example.com"
  altText="Advertisement"
  sponsoredLabel={true}
/>
```

### SponsoredDealerCard Component

**Features:**
- Displays sponsored dealer information
- Shows dealer logo, name, location
- Displays verification status
- Shows listing count
- Premium gold accent styling

### SponsoredVehicleCard Component

**Features:**
- Displays sponsored vehicle listings
- Shows vehicle image
- Displays vehicle name and price
- Premium dark overlay for text readability

## New Homepage Sections

### Dealer Spotlight

**Location:** `src/pages/home/components/DealerSpotlight.jsx`

**Features:**
- Showcases featured dealers
- Displays dealer cover image, logo, name, location
- Shows verification badge
- Displays listing count and rating
- Responsive grid layout (1-3 columns)
- Link to dealer profile

**Data Structure:**
```javascript
{
  _id: string,
  name: string,
  logo: string,
  coverImage: string,
  location: string,
  verified: boolean,
  listingsCount: number,
  rating: number,
  description: string
}
```

### Private Seller Spotlight

**Location:** `src/pages/home/components/PrivateSellerSpotlight.jsx`

**Features:**
- Showcases trusted private sellers
- Displays seller avatar (initial), name, location
- Shows verification badge
- Displays listing count and rating
- Shows response rate
- Responsive grid layout (1-3 columns)
- Link to seller listings

**Data Structure:**
```javascript
{
  _id: string,
  name: string,
  location: string,
  verified: boolean,
  listingsCount: number,
  rating: number,
  responseRate: number
}
```

### Featured Dealers

**Location:** `src/pages/home/components/FeaturedDealers.jsx`

**Features:**
- Showcases premium dealer partners
- Displays dealer logo in square format
- Shows premium badge for top partners
- Displays rating and location
- Shows verification status
- Responsive grid layout (1-4 columns)
- Link to dealer profile

**Data Structure:**
```javascript
{
  _id: string,
  name: string,
  logo: string,
  location: string,
  verified: boolean,
  isPremium: boolean,
  rating: number
}
```

### Vehicle Categories

**Location:** `src/pages/home/components/VehicleCategories.jsx`

**Features:**
- Browse vehicles by category
- Six categories: Sedans, SUVs, Trucks, Motorcycles, Luxury, Sports
- Displays category icon and vehicle count
- Background image with hover zoom effect
- Responsive grid layout (2-6 columns)
- Link to filtered showroom

**Categories:**
- Sedans (150 vehicles)
- SUVs (89 vehicles)
- Trucks (45 vehicles)
- Motorcycles (67 vehicles)
- Luxury (34 vehicles)
- Sports (28 vehicles)

### Testimonials

**Location:** `src/pages/home/components/Testimonials.jsx`

**Features:**
- Displays user testimonials and reviews
- Shows user avatar, name, and role
- Star rating display
- Quote styling with decorative icon
- Responsive grid layout (1-3 columns)

**Data Structure:**
```javascript
{
  name: string,
  role: string,
  rating: number,
  text: string,
  image: string
}
```

### Partners

**Location:** `src/pages/home/components/Partners.jsx`

**Features:**
- Displays trusted partner logos
- Six partner slots
- Hover effects on logos
- Responsive grid layout (2-6 columns)

**Partners:**
- Toyota Kenya
- Safaricom
- KCB Bank
- Equity Bank
- Absa Kenya
- Co-op Bank

## Advertisement Zones

### Sponsor Banner Area

**Position:** Below Hero, above Live Ticker
**Size:** Large horizontal (1400x120px)
**Purpose:** Prime placement for main sponsor

### Advertisement Zone A

**Position:** Between Private Seller Spotlight and Featured Dealers
**Size:** Large horizontal (1400x200px)
**Purpose:** Mid-page break for advertisements

### Advertisement Zone B

**Position:** Between Featured Dealers and Vehicle Categories
**Size:** Large horizontal (1400x200px)
**Purpose:** Mid-page break for advertisements

### Advertisement Zone C

**Position:** Between Vehicle Categories and Testimonials
**Size:** Large horizontal (1400x200px)
**Purpose:** Mid-page break for advertisements

## Responsive Design

All sections are fully responsive with the following breakpoints:

- **Mobile (< 768px):** Single column layouts
- **Tablet (768px - 1024px):** 2-3 column layouts
- **Desktop (> 1024px):** Full multi-column layouts

### Grid Breakpoints

- **Dealer Spotlight:** 1 → 2 → 3 columns
- **Private Seller Spotlight:** 1 → 2 → 3 columns
- **Featured Dealers:** 1 → 2 → 4 columns
- **Vehicle Categories:** 2 → 3 → 6 columns
- **Testimonials:** 1 → 2 → 3 columns
- **Partners:** 2 → 3 → 6 columns

## Admin Configuration

Advertisement banners are admin-configurable through component props. To make them fully admin-configurable, integrate with your admin panel:

1. Create an advertisement management API endpoint
2. Fetch advertisement data in HomePage component
3. Pass dynamic data to AdvertisementBanner components
4. Store advertisement settings in database

### Suggested API Structure

```javascript
// GET /api/advertisements
{
  sponsorBanner: {
    type: 'image',
    imageUrl: '...',
    linkUrl: '...',
    active: true
  },
  zoneA: {
    type: 'html',
    htmlContent: '...',
    active: true
  },
  zoneB: {
    type: 'dealer',
    dealerId: '...',
    active: true
  },
  zoneC: {
    type: 'vehicle',
    vehicleId: '...',
    active: true
  }
}
```

## Integration with Existing Features

### Featured Dealers Data

To populate dealer sections, integrate with your dealer API:

```javascript
useEffect(() => {
  const fetchDealers = async () => {
    const data = await dealerAPI.list({ 
      featured: true, 
      limit: 10,
      sort: '-rating' 
    });
    setFeaturedDealers(data.dealers);
  };
  fetchDealers();
}, []);
```

### Top Sellers Data

To populate private seller section, integrate with your user API:

```javascript
useEffect(() => {
  const fetchSellers = async () => {
    const data = await userAPI.list({ 
      role: 'seller',
      verified: true,
      limit: 10,
      sort: '-listingsCount' 
    });
    setTopSellers(data.users);
  };
  fetchSellers();
}, []);
```

## Styling

All components use the existing design system:
- Gold accent color (`text-gold`, `bg-gold`)
- Dark theme with white text
- Glassmorphism effects (`backdrop-blur`)
- Smooth transitions and hover effects
- Framer Motion animations for entrance effects

## Performance Considerations

- Images use LazyImage component for lazy loading
- Advertisements can be dismissed to reduce clutter
- Responsive images adapt to screen size
- Animation delays staggered for smooth loading

## Future Enhancements

1. **Advertisement Analytics:** Track impressions and clicks
2. **A/B Testing:** Test different ad placements
3. **Dynamic Pricing:** Charge based on zone and position
4. **Targeted Ads:** Show relevant ads based on user behavior
5. **Ad Scheduling:** Schedule ads for specific time periods
6. **Geographic Targeting:** Show location-specific ads
7. **User Segmentation:** Show different ads to different user types

## Files Created/Modified

### New Files Created:
- `src/components/AdvertisementBanner.jsx` - Reusable ad component
- `src/pages/home/components/DealerSpotlight.jsx` - Dealer spotlight section
- `src/pages/home/components/PrivateSellerSpotlight.jsx` - Private seller spotlight
- `src/pages/home/components/FeaturedDealers.jsx` - Featured dealers section
- `src/pages/home/components/VehicleCategories.jsx` - Vehicle categories
- `src/pages/home/components/Testimonials.jsx` - Testimonials section
- `src/pages/home/components/Partners.jsx` - Partners section

### Modified Files:
- `src/pages/HomePage.jsx` - Restructured homepage with new sections

## Deployment Notes

- No breaking changes to existing features
- All new sections are optional (display empty arrays if no data)
- Advertisement zones use placeholder images - replace with real ads
- Partner logos use placeholder images - replace with real logos
- Testimonial images use Unsplash - replace with real user photos
