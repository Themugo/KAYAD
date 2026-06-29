# Dealer Spotlight Redesign

## Overview

The Dealer Spotlight section has been completely redesigned with a luxury automotive aesthetic, featuring a carousel layout, comprehensive dealer metrics, and sponsor-ready premium placements.

## Component Location

`src/pages/home/components/DealerSpotlight.jsx`

## Design Philosophy

### Luxury Automotive Style

The redesign embraces premium automotive design principles:
- **Gold Accent Color**: Consistent use of gold (`text-gold`, `bg-gold`) for premium feel
- **Glassmorphism**: Subtle backdrop blur effects for modern aesthetics
- **Gradient Overlays**: Smooth gradients for depth and visual hierarchy
- **Large Typography**: Bold, italic display fonts for impact
- **Spacious Layout**: Generous padding and breathing room
- **Premium Borders**: Gold gradient borders for sponsored placements

## Features

### Carousel Functionality

**Navigation:**
- Left/right navigation arrows with hover effects
- Pagination dots with active state (gold highlight)
- Smooth slide transitions using Framer Motion
- Spring animations for natural movement
- Scale effects during transitions

**Transition Variants:**
- Enter: Slide in from side with scale effect
- Center: Full opacity and scale
- Exit: Slide out to opposite side with scale effect

### Dealer Information Display

**Left Side - Dealer Profile:**

1. **Dealer Logo**
   - Large rounded square (24x24 to 32x32)
   - Gold border accent
   - Verified badge overlay (Shield icon on gold background)

2. **Dealer Name**
   - Large, bold display font
   - Premium crown icon for premium dealers
   - Location with MapPin icon

3. **Description**
   - Optional dealer description
   - Truncated to 2 lines

### Trust Metrics

Four key metrics displayed in a grid:

1. **Trust Score**
   - Star icon (filled gold)
   - Score out of 10
   - Default: 9.5/10

2. **Completed Sales**
   - Car icon (gold)
   - Total sales count
   - Fallback to listings count

3. **Years Active**
   - Calendar icon (gold)
   - Years in business
   - Calculated from joinedYear or defaults

4. **Rating**
   - TrendingUp icon (gold)
   - Star rating display
   - Default: 4.8★

### Featured Inventory Display

**Right Side - Inventory Preview:**

- Large cover image or featured image
- Dark gradient overlay for text readability
- "Featured Inventory" label with Award icon
- Grid of 3 vehicle thumbnails:
  - Vehicle image with hover zoom effect
  - Vehicle name (truncated)
  - Price in KES
  - Dark gradient overlay on thumbnails
- Fallback: Total vehicles available count

### Sponsor-Ready Features

**Premium Dealer Indicators:**
- Crown icon in header badge
- "Premium" label with gold styling
- Crown icon next to dealer name

**Sponsored Dealer Indicators:**
- Gold gradient border around entire card
- "Sponsored Placement" label below CTA button
- Enhanced visual prominence

**Monetization Support:**
- `isPremium` boolean flag for premium dealers
- `isSponsored` boolean flag for sponsored placements
- Visual distinction for different tiers
- Ready for dynamic pricing tiers

## Data Structure

```javascript
{
  _id: string,
  name: string,
  logo: string,
  coverImage: string,
  featuredImage: string,
  location: string,
  description: string,
  verified: boolean,
  isPremium: boolean,
  isSponsored: boolean,
  trustScore: number,
  rating: number,
  completedSales: number,
  listingsCount: number,
  yearsActive: number,
  joinedYear: number,
  featuredInventory: [
    {
      name: string,
      image: string,
      price: number
    }
  ]
}
```

## Responsive Design

### Breakpoints

- **Mobile (< 768px):**
  - Single column layout
  - Stacked dealer info and inventory
  - Smaller padding (p-8)
  - Smaller logo (24x24)

- **Tablet (768px - 1024px):**
  - Two column layout
  - Medium padding (p-8)
  - Medium logo (24x24)

- **Desktop (> 1024px):**
  - Two column layout
  - Large padding (p-12)
  - Large logo (32x32)

### Navigation

- Navigation arrows scale on desktop (14x14)
- Consistent positioning on all screens
- Touch-friendly button sizes

## Animations

### Entrance Animation
- Section fades in with staggered delays
- Carousel slides animate with spring physics
- Scale effects during transitions

### Hover Effects
- Card border changes to gold
- Shadow increases with gold tint
- Vehicle thumbnails zoom on hover
- Navigation arrows translate on hover

### Transitions
- Smooth slide transitions (500ms)
- Scale effects (0.95 to 1.0)
- Opacity fades
- Spring physics for natural movement

## Styling

### Color Palette

- **Primary:** Gold (#d4c4a8)
- **Background:** Dark (#0a0a0a)
- **Text:** White (#ffffff)
- **Text Secondary:** White with opacity (40%, 50%, 60%)
- **Border:** White with low opacity (10%, 20%)

### Typography

- **Display Font:** `font-display` (italic, black weight)
- **Body Font:** System font
- **Tracking:** Uppercase labels use wide tracking (0.12em, 0.14em, 0.08em)
- **Sizes:** Clamp-based responsive sizing

### Effects

- **Shadows:** Gold-tinted shadows on hover
- **Gradients:** Subtle gold gradients for premium feel
- **Backdrop Blur:** Glassmorphism effects
- **Borders:** Thin white borders with gold accents

## Integration with Homepage

The Dealer Spotlight is integrated into the homepage at position 5:

```jsx
<DealerSpotlight dealers={featuredDealers.slice(0, 3)} />
```

**Data Fetching:**

To populate the dealer spotlight, fetch featured dealers from your API:

```javascript
useEffect(() => {
  const fetchDealers = async () => {
    const data = await dealerAPI.list({ 
      featured: true, 
      limit: 10,
      sort: '-trustScore' 
    });
    setFeaturedDealers(data.dealers);
  };
  fetchDealers();
}, []);
```

## Monetization Strategy

### Premium Tiers

**Standard:**
- Basic carousel placement
- Standard metrics display
- No special indicators

**Premium:**
- Crown badge indicator
- Enhanced visual prominence
- Priority placement in carousel

**Sponsored:**
- Gold gradient border
- "Sponsored Placement" label
- Maximum visual prominence
- Custom pricing

### Pricing Suggestions

- **Standard:** Free (organic placement)
- **Premium:** KES 50,000/month
- **Sponsored:** KES 150,000/month

### Admin Configuration

To make the section fully admin-configurable:

1. Create dealer tier management in admin panel
2. Add pricing tiers to database
3. Enable/disable sponsored placements
4. Set carousel order and priority
5. Track impressions and clicks

## Performance Considerations

- Images use LazyImage component for lazy loading
- Carousel only renders current slide
- Animations use GPU-accelerated transforms
- Efficient state management with useCallback
- Minimal re-renders with proper dependencies

## Accessibility

- ARIA labels on navigation buttons pagination dots
- Keyboard navigation support
- Semantic HTML structure
- Alt text on all images
- Sufficient color contrast

## Future Enhancements

1. **Auto-rotation:** Optional auto-advance carousel
2. **Touch Gestures:** Swipe navigation for mobile
3. **Video Background:** Optional video for featured inventory
4. **Live Chat:** Direct chat with dealer
5. **Reviews:** Display dealer reviews
6. **Comparison:** Compare multiple dealers
7. **Filters:** Filter dealers by location, specialty
8. **Analytics:** Track dealer profile views and clicks

## Files Modified

- `src/pages/home/components/DealerSpotlight.jsx` - Complete redesign

## Deployment Notes

- No breaking changes to existing API
- Backward compatible with existing dealer data
- Graceful fallbacks for missing fields
- Placeholder images for missing logos/images
- Works with empty dealer array (renders nothing)

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript for carousel functionality
- Framer Motion for animations
- CSS Grid and Flexbox for layout
- CSS custom properties for theming

## Testing Checklist

- [ ] Carousel navigation works correctly
- [ ] Pagination dots update on slide change
- [ ] Premium badge displays correctly
- [ ] Sponsored border displays correctly
- [ ] Trust metrics display with fallbacks
- [ ] Featured inventory displays correctly
- [ ] Responsive layout on mobile/tablet/desktop
- [ ] Animations are smooth and performant
- [ ] Keyboard navigation works
- [ ] Empty state handles gracefully
- [ ] Missing data uses fallbacks
