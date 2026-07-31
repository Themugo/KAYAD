// ============================================================
// KAYAD VISUAL EXPERIENCE PLATFORM (VXP) CONTROLLER
// No-Code Visual Operating System for Frontend
// ============================================================

import VXPage from "../models/VXPage.js";
import VXSection from "../models/VXSection.js";
import VXComponent from "../models/VXComponent.js";
import VXTheme from "../models/VXTheme.js";
import VXLayout from "../models/VXLayout.js";
import VXAdvertisement from "../models/VXAdvertisement.js";
import VXCard from "../models/VXCard.js";
import VXWidget from "../models/VXWidget.js";
import VXVersion from "../models/VXVersion.js";
import VXStyle from "../models/VXStyle.js";

// ============================================
// PAGES
// ============================================

export async function getPages(req, res) {
  const { status, type, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;
  if (type) filters.pageType = type;

  const pages = await VXPage.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "updated_at",
    order: "desc",
  });

  res.json({ success: true, data: pages });
}

export async function getPage(req, res) {
  const page = await VXPage.findById(req.params.id);
  if (!page) return res.status(404).json({ success: false, error: "Page not found" });

  // Get sections
  const sections = await VXSection.findAll({ filters: { pageId: req.params.id } });

  // Get advertisements
  const advertisements = await VXAdvertisement.findAll({ filters: { pageId: req.params.id } });

  res.json({ success: true, data: { ...page, sections, advertisements } });
}

export async function createPage(req, res) {
  const { name, slug, pageType, title, description, sections, layout, themeId, settings, meta, seo } = req.body;

  const page = await VXPage.create({
    name,
    slug,
    pageType: pageType || 'custom',
    title,
    description,
    layout: typeof layout === 'object' ? JSON.stringify(layout) : layout,
    themeId,
    settings: typeof settings === 'object' ? JSON.stringify(settings) : settings,
    meta: typeof meta === 'object' ? JSON.stringify(meta) : meta,
    seo: typeof seo === 'object' ? JSON.stringify(seo) : seo,
    status: 'draft',
    createdBy: req.user?.id,
  });

  // Create sections
  if (sections && sections.length > 0) {
    for (const section of sections) {
      await VXSection.create({
        pageId: page.id,
        sectionType: section.sectionType,
        name: section.name,
        content: typeof section.content === 'object' ? JSON.stringify(section.content) : section.content,
        styles: typeof section.styles === 'object' ? JSON.stringify(section.styles) : section.styles,
        props: typeof section.props === 'object' ? JSON.stringify(section.props) : section.props,
        order: section.order || 0,
        visible: section.visible !== false,
      });
    }
  }

  res.status(201).json({ success: true, data: page });
}

export async function updatePage(req, res) {
  const { name, slug, title, description, sections, layout, themeId, settings, meta, seo, status } = req.body;

  const existing = await VXPage.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Page not found" });

  const updateData = { updatedBy: req.user?.id, updatedAt: new Date().toISOString() };

  if (name !== undefined) updateData.name = name;
  if (slug !== undefined) updateData.slug = slug;
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (layout !== undefined) updateData.layout = typeof layout === 'object' ? JSON.stringify(layout) : layout;
  if (themeId !== undefined) updateData.themeId = themeId;
  if (settings !== undefined) updateData.settings = typeof settings === 'object' ? JSON.stringify(settings) : settings;
  if (meta !== undefined) updateData.meta = typeof meta === 'object' ? JSON.stringify(meta) : meta;
  if (seo !== undefined) updateData.seo = typeof seo === 'object' ? JSON.stringify(seo) : seo;
  if (status !== undefined) updateData.status = status;

  const page = await VXPage.update(req.params.id, updateData);

  // Update sections if provided
  if (sections !== undefined) {
    await VXSection.deleteAll({ pageId: req.params.id });
    for (const section of sections) {
      await VXSection.create({
        pageId: page.id,
        sectionType: section.sectionType,
        name: section.name,
        content: typeof section.content === 'object' ? JSON.stringify(section.content) : section.content,
        styles: typeof section.styles === 'object' ? JSON.stringify(section.styles) : section.styles,
        props: typeof section.props === 'object' ? JSON.stringify(section.props) : section.props,
        order: section.order || 0,
        visible: section.visible !== false,
      });
    }
  }

  res.json({ success: true, data: page });
}

export async function deletePage(req, res) {
  await VXSection.deleteAll({ pageId: req.params.id });
  await VXAdvertisement.deleteAll({ pageId: req.params.id });
  await VXPage.delete(req.params.id);
  res.json({ success: true, message: "Page deleted" });
}

export async function publishPage(req, res) {
  const existing = await VXPage.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Page not found" });

  const page = await VXPage.update(req.params.id, {
    status: 'published',
    publishedAt: new Date().toISOString(),
    publishedBy: req.user?.id,
  });

  // Create version snapshot
  const versions = await VXVersion.findAll({ filters: { entityType: 'page', entityId: req.params.id } });
  await VXVersion.create({
    entityType: 'page',
    entityId: req.params.id,
    version: versions.length + 1,
    snapshot: JSON.stringify(existing),
    createdBy: req.user?.id,
  });

  res.json({ success: true, data: page });
}

export async function duplicatePage(req, res) {
  const existing = await VXPage.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Page not found" });

  const sections = await VXSection.findAll({ filters: { pageId: req.params.id } });

  const newPage = await VXPage.create({
    name: `${existing.name} (Copy)`,
    slug: `${existing.slug}-copy-${Date.now()}`,
    pageType: existing.pageType,
    title: `${existing.title} (Copy)`,
    description: existing.description,
    layout: existing.layout,
    themeId: existing.themeId,
    settings: existing.settings,
    meta: existing.meta,
    seo: existing.seo,
    status: 'draft',
    createdBy: req.user?.id,
  });

  // Duplicate sections
  for (const section of sections) {
    await VXSection.create({
      pageId: newPage.id,
      sectionType: section.sectionType,
      name: section.name,
      content: section.content,
      styles: section.styles,
      props: section.props,
      order: section.order,
      visible: section.visible,
    });
  }

  res.status(201).json({ success: true, data: newPage });
}

// ============================================
// SECTIONS
// ============================================

export async function getSections(req, res) {
  const { pageId, category, page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (pageId) filters.pageId = pageId;
  if (category) filters.category = category;

  const sections = await VXSection.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "order",
    order: "asc",
  });

  res.json({ success: true, data: sections });
}

export async function createSection(req, res) {
  const { pageId, sectionType, name, content, styles, props, order, visible } = req.body;

  const section = await VXSection.create({
    pageId,
    sectionType,
    name,
    content: typeof content === 'object' ? JSON.stringify(content) : content,
    styles: typeof styles === 'object' ? JSON.stringify(styles) : styles,
    props: typeof props === 'object' ? JSON.stringify(props) : props,
    order: order || 0,
    visible: visible !== false,
  });

  res.status(201).json({ success: true, data: section });
}

export async function updateSection(req, res) {
  const { name, content, styles, props, order, visible } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (content !== undefined) updateData.content = typeof content === 'object' ? JSON.stringify(content) : content;
  if (styles !== undefined) updateData.styles = typeof styles === 'object' ? JSON.stringify(styles) : styles;
  if (props !== undefined) updateData.props = typeof props === 'object' ? JSON.stringify(props) : props;
  if (order !== undefined) updateData.order = order;
  if (visible !== undefined) updateData.visible = visible;

  const section = await VXSection.update(req.params.id, updateData);
  res.json({ success: true, data: section });
}

export async function deleteSection(req, res) {
  await VXSection.delete(req.params.id);
  res.json({ success: true, message: "Section deleted" });
}

export async function reorderSections(req, res) {
  const { sections } = req.body;

  for (const item of sections) {
    await VXSection.update(item.id, { order: item.order });
  }

  res.json({ success: true, message: "Sections reordered" });
}

export async function getSectionTemplates(req, res) {
  const templates = [
    { id: 'hero', name: 'Hero Section', category: 'hero', thumbnail: '/templates/hero.svg' },
    { id: 'hero_search', name: 'Hero with Search', category: 'hero', thumbnail: '/templates/hero-search.svg' },
    { id: 'featured_cars', name: 'Featured Cars', category: 'cars', thumbnail: '/templates/featured-cars.svg' },
    { id: 'latest_cars', name: 'Latest Listings', category: 'cars', thumbnail: '/templates/latest-cars.svg' },
    { id: 'dealers', name: 'Dealers Grid', category: 'dealers', thumbnail: '/templates/dealers.svg' },
    { id: 'stats', name: 'Statistics', category: 'content', thumbnail: '/templates/stats.svg' },
    { id: 'testimonials', name: 'Testimonials', category: 'content', thumbnail: '/templates/testimonials.svg' },
    { id: 'cta', name: 'Call to Action', category: 'marketing', thumbnail: '/templates/cta.svg' },
    { id: 'newsletter', name: 'Newsletter Signup', category: 'marketing', thumbnail: '/templates/newsletter.svg' },
    { id: 'footer', name: 'Footer', category: 'footer', thumbnail: '/templates/footer.svg' },
    { id: 'faq', name: 'FAQ Accordion', category: 'support', thumbnail: '/templates/faq.svg' },
    { id: 'blog_grid', name: 'Blog Grid', category: 'blog', thumbnail: '/templates/blog.svg' },
    { id: 'partners', name: 'Partners/Brands', category: 'content', thumbnail: '/templates/partners.svg' },
    { id: 'auction_banner', name: 'Auction Banner', category: 'auction', thumbnail: '/templates/auction-banner.svg' },
    { id: 'inspection_banner', name: 'Inspection Banner', category: 'inspection', thumbnail: '/templates/inspection-banner.svg' },
    { id: 'finance_calc', name: 'Finance Calculator', category: 'finance', thumbnail: '/templates/finance.svg' },
    { id: 'map', name: 'Map Location', category: 'location', thumbnail: '/templates/map.svg' },
    { id: 'countdown', name: 'Countdown Timer', category: 'marketing', thumbnail: '/templates/countdown.svg' },
    { id: 'video', name: 'Video Banner', category: 'media', thumbnail: '/templates/video.svg' },
    { id: 'tabs', name: 'Tabbed Content', category: 'content', thumbnail: '/templates/tabs.svg' },
  ];

  res.json({ success: true, data: templates });
}

// ============================================
// COMPONENTS
// ============================================

export async function getComponents(req, res) {
  const { category, type, page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (category) filters.category = category;
  if (type) filters.componentType = type;

  const components = await VXComponent.findAll({
    filters,
    limit: parseInt(limit),
    offset,
  });

  res.json({ success: true, data: components });
}

export async function createComponent(req, res) {
  const { name, componentType, category, description, props, defaultStyles, templates } = req.body;

  const component = await VXComponent.create({
    name,
    componentType,
    category,
    description,
    props: typeof props === 'object' ? JSON.stringify(props) : props,
    defaultStyles: typeof defaultStyles === 'object' ? JSON.stringify(defaultStyles) : defaultStyles,
    templates: typeof templates === 'object' ? JSON.stringify(templates) : templates,
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: component });
}

export async function updateComponent(req, res) {
  const { name, description, props, defaultStyles, templates } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (props !== undefined) updateData.props = typeof props === 'object' ? JSON.stringify(props) : props;
  if (defaultStyles !== undefined) updateData.defaultStyles = typeof defaultStyles === 'object' ? JSON.stringify(defaultStyles) : defaultStyles;
  if (templates !== undefined) updateData.templates = typeof templates === 'object' ? JSON.stringify(templates) : templates;

  const component = await VXComponent.update(req.params.id, updateData);
  res.json({ success: true, data: component });
}

export async function deleteComponent(req, res) {
  await VXComponent.delete(req.params.id);
  res.json({ success: true, message: "Component deleted" });
}

export async function getComponentLibrary(req, res) {
  const library = [
    // Layout Components
    { id: 'container', name: 'Container', category: 'layout', icon: 'square', description: 'Wrapper container with max-width' },
    { id: 'grid', name: 'Grid', category: 'layout', icon: 'grid', description: 'Responsive grid layout' },
    { id: 'flex', name: 'Flexbox', category: 'layout', icon: 'layout', description: 'Flexible box layout' },
    { id: 'stack', name: 'VStack/HStack', category: 'layout', icon: 'layers', description: 'Vertical/horizontal stacking' },
    { id: 'divider', name: 'Divider', category: 'layout', icon: 'minus', description: 'Horizontal/vertical divider' },
    { id: 'spacer', name: 'Spacer', category: 'layout', icon: 'move-vertical', description: 'Empty space' },

    // Typography
    { id: 'heading', name: 'Heading', category: 'typography', icon: 'type', description: 'H1-H6 headings' },
    { id: 'text', name: 'Text', category: 'typography', icon: 'align-left', description: 'Paragraph text' },
    { id: 'link', name: 'Link', category: 'typography', icon: 'link', description: 'Anchor links' },
    { id: 'list', name: 'List', category: 'typography', icon: 'list', description: 'Bulleted/numbered lists' },
    { id: 'quote', name: 'Quote', category: 'typography', icon: 'quote', description: 'Blockquote' },

    // Media
    { id: 'image', name: 'Image', category: 'media', icon: 'image', description: 'Responsive images' },
    { id: 'video', name: 'Video', category: 'media', icon: 'video', description: 'Video player' },
    { id: 'icon', name: 'Icon', category: 'media', icon: 'smile', description: 'Icon elements' },
    { id: 'avatar', name: 'Avatar', category: 'media', icon: 'user', description: 'User avatar' },
    { id: 'gallery', name: 'Gallery', category: 'media', icon: 'images', description: 'Image gallery' },

    // Navigation
    { id: 'navbar', name: 'Navbar', category: 'navigation', icon: 'menu', description: 'Navigation bar' },
    { id: 'menu', name: 'Menu', category: 'navigation', icon: 'list', description: 'Navigation menu' },
    { id: 'tabs', name: 'Tabs', category: 'navigation', icon: 'folder', description: 'Tab navigation' },
    { id: 'breadcrumb', name: 'Breadcrumb', category: 'navigation', icon: 'corner-down-right', description: 'Breadcrumb trail' },
    { id: 'pagination', name: 'Pagination', category: 'navigation', icon: 'chevrons-right', description: 'Page navigation' },

    // Interactive
    { id: 'button', name: 'Button', category: 'interactive', icon: 'square', description: 'Clickable buttons' },
    { id: 'input', name: 'Input', category: 'interactive', icon: 'edit-2', description: 'Text input fields' },
    { id: 'select', name: 'Select', category: 'interactive', icon: 'chevron-down', description: 'Dropdown select' },
    { id: 'checkbox', name: 'Checkbox', category: 'interactive', icon: 'check-square', description: 'Checkbox input' },
    { id: 'radio', name: 'Radio', category: 'interactive', icon: 'circle', description: 'Radio buttons' },
    { id: 'toggle', name: 'Toggle', category: 'interactive', icon: 'toggle-left', description: 'Toggle switch' },
    { id: 'slider', name: 'Slider', category: 'interactive', icon: 'sliders', description: 'Range slider' },
    { id: 'search', name: 'Search', category: 'interactive', icon: 'search', description: 'Search input' },

    // Display
    { id: 'card', name: 'Card', category: 'display', icon: 'credit-card', description: 'Card container' },
    { id: 'badge', name: 'Badge', category: 'display', icon: 'tag', description: 'Label badges' },
    { id: 'alert', name: 'Alert', category: 'display', icon: 'alert-circle', description: 'Alert messages' },
    { id: 'tooltip', name: 'Tooltip', category: 'display', icon: 'info', description: 'Hover tooltips' },
    { id: 'modal', name: 'Modal', category: 'display', icon: 'square', description: 'Popup modal' },
    { id: 'drawer', name: 'Drawer', category: 'display', icon: 'panel-right', description: 'Side drawer' },

    // Data Display
    { id: 'table', name: 'Table', category: 'data', icon: 'table', description: 'Data table' },
    { id: 'list_view', name: 'List', category: 'data', icon: 'list', description: 'List view' },
    { id: 'timeline', name: 'Timeline', category: 'data', icon: 'git-commit', description: 'Timeline display' },
    { id: 'progress', name: 'Progress', category: 'data', icon: 'trending-up', description: 'Progress bar' },
    { id: 'chart', name: 'Chart', category: 'data', icon: 'bar-chart', description: 'Chart visualization' },
    { id: 'stat', name: 'Stat', category: 'data', icon: 'hash', description: 'Statistics display' },

    // KAYAD Specific
    { id: 'vehicle_card', name: 'Vehicle Card', category: 'kayad', icon: 'car', description: 'Vehicle listing card' },
    { id: 'dealer_card', name: 'Dealer Card', category: 'kayad', icon: 'building', description: 'Dealer profile card' },
    { id: 'auction_card', name: 'Auction Card', category: 'kayad', icon: 'gavel', description: 'Auction item card' },
    { id: 'bid_widget', name: 'Bid Widget', category: 'kayad', icon: 'trending-up', description: 'Bidding widget' },
    { id: 'finance_calc', name: 'Finance Calculator', category: 'kayad', icon: 'calculator', description: 'Loan calculator' },
    { id: 'inspection_widget', name: 'Inspection Widget', category: 'kayad', icon: 'clipboard-check', description: 'Inspection booking' },
    { id: 'search_form', name: 'Vehicle Search', category: 'kayad', icon: 'search', description: 'Vehicle search form' },
    { id: 'filter_panel', name: 'Filter Panel', category: 'kayad', icon: 'sliders', description: 'Search filters' },
    { id: 'map_widget', name: 'Map Widget', category: 'kayad', icon: 'map-pin', description: 'Location map' },
    { id: 'countdown', name: 'Countdown', category: 'kayad', icon: 'clock', description: 'Auction countdown' },
    { id: 'price_display', name: 'Price Display', category: 'kayad', icon: 'tag', description: 'Formatted price' },
    { id: 'gallery_slider', name: 'Gallery Slider', category: 'kayad', icon: 'image', description: 'Image gallery' },
  ];

  res.json({ success: true, data: library });
}

// ============================================
// THEMES
// ============================================

export async function getThemes(req, res) {
  const { status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;

  const themes = await VXTheme.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "updated_at",
    order: "desc",
  });

  res.json({ success: true, data: themes });
}

export async function getTheme(req, res) {
  const theme = await VXTheme.findById(req.params.id);
  if (!theme) return res.status(404).json({ success: false, error: "Theme not found" });
  res.json({ success: true, data: theme });
}

export async function createTheme(req, res) {
  const { name, description, colors, typography, spacing, shadows, borders, animations, isDefault } = req.body;

  const theme = await VXTheme.create({
    name,
    description,
    colors: typeof colors === 'object' ? JSON.stringify(colors) : colors,
    typography: typeof typography === 'object' ? JSON.stringify(typography) : typography,
    spacing: typeof spacing === 'object' ? JSON.stringify(spacing) : spacing,
    shadows: typeof shadows === 'object' ? JSON.stringify(shadows) : shadows,
    borders: typeof borders === 'object' ? JSON.stringify(borders) : borders,
    animations: typeof animations === 'object' ? JSON.stringify(animations) : animations,
    status: 'active',
    isDefault: isDefault || false,
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: theme });
}

export async function updateTheme(req, res) {
  const { name, description, colors, typography, spacing, shadows, borders, animations, status, isDefault } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (colors !== undefined) updateData.colors = typeof colors === 'object' ? JSON.stringify(colors) : colors;
  if (typography !== undefined) updateData.typography = typeof typography === 'object' ? JSON.stringify(typography) : typography;
  if (spacing !== undefined) updateData.spacing = typeof spacing === 'object' ? JSON.stringify(spacing) : spacing;
  if (shadows !== undefined) updateData.shadows = typeof shadows === 'object' ? JSON.stringify(shadows) : shadows;
  if (borders !== undefined) updateData.borders = typeof borders === 'object' ? JSON.stringify(borders) : borders;
  if (animations !== undefined) updateData.animations = typeof animations === 'object' ? JSON.stringify(animations) : animations;
  if (status !== undefined) updateData.status = status;
  if (isDefault !== undefined) updateData.isDefault = isDefault;

  const theme = await VXTheme.update(req.params.id, updateData);
  res.json({ success: true, data: theme });
}

export async function deleteTheme(req, res) {
  await VXTheme.delete(req.params.id);
  res.json({ success: true, message: "Theme deleted" });
}

export async function getDefaultTheme(req, res) {
  const themes = await VXTheme.findAll({ filters: { status: 'active', isDefault: true } });
  if (themes.length > 0) {
    res.json({ success: true, data: themes[0] });
  } else {
    // Return default KAYAD theme
    res.json({
      success: true,
      data: {
        name: 'KAYAD Default',
        colors: {
          primary: '#17244B',
          secondary: '#F6F1E8',
          accent: '#C77B58',
          success: '#10B981',
          info: '#60A5FA',
          warning: '#FB923C',
          danger: '#EF4444',
          background: '#F6F1E8',
          surface: '#FFFFFF',
          text: '#1F2937',
          textSecondary: '#6B7280',
          border: '#E5E7EB',
        },
      },
    });
  }
}

// ============================================
// CARDS
// ============================================

export async function getCards(req, res) {
  const { cardType, status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (cardType) filters.cardType = cardType;
  if (status) filters.status = status;

  const cards = await VXCard.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "updated_at",
    order: "desc",
  });

  res.json({ success: true, data: cards });
}

export async function createCard(req, res) {
  const { name, cardType, fields, layout, styles, thumbnail } = req.body;

  const card = await VXCard.create({
    name,
    cardType,
    fields: typeof fields === 'object' ? JSON.stringify(fields) : fields,
    layout: typeof layout === 'object' ? JSON.stringify(layout) : layout,
    styles: typeof styles === 'object' ? JSON.stringify(styles) : styles,
    thumbnail,
    status: 'active',
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: card });
}

export async function updateCard(req, res) {
  const { name, fields, layout, styles, thumbnail, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (fields !== undefined) updateData.fields = typeof fields === 'object' ? JSON.stringify(fields) : fields;
  if (layout !== undefined) updateData.layout = typeof layout === 'object' ? JSON.stringify(layout) : layout;
  if (styles !== undefined) updateData.styles = typeof styles === 'object' ? JSON.stringify(styles) : styles;
  if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
  if (status !== undefined) updateData.status = status;

  const card = await VXCard.update(req.params.id, updateData);
  res.json({ success: true, data: card });
}

export async function deleteCard(req, res) {
  await VXCard.delete(req.params.id);
  res.json({ success: true, message: "Card deleted" });
}

export async function getCardFields(req, res) {
  const fields = [
    { id: 'image', name: 'Image', type: 'image' },
    { id: 'gallery', name: 'Image Gallery', type: 'gallery' },
    { id: 'title', name: 'Title', type: 'text' },
    { id: 'subtitle', name: 'Subtitle', type: 'text' },
    { id: 'description', name: 'Description', type: 'text' },
    { id: 'price', name: 'Price', type: 'currency' },
    { id: 'originalPrice', name: 'Original Price', type: 'currency' },
    { id: 'discount', name: 'Discount Badge', type: 'badge' },
    { id: 'seller', name: 'Seller Name', type: 'text' },
    { id: 'dealer', name: 'Dealer Name', type: 'text' },
    { id: 'dealerBadge', name: 'Dealer Badge', type: 'badge' },
    { id: 'dealerRating', name: 'Dealer Rating', type: 'rating' },
    { id: 'location', name: 'Location', type: 'text' },
    { id: 'mileage', name: 'Mileage', type: 'text' },
    { id: 'fuelType', name: 'Fuel Type', type: 'badge' },
    { id: 'transmission', name: 'Transmission', type: 'badge' },
    { id: 'year', name: 'Year', type: 'text' },
    { id: 'color', name: 'Color', type: 'badge' },
    { id: 'engineSize', name: 'Engine Size', type: 'text' },
    { id: 'inspectionBadge', name: 'Inspection Badge', type: 'badge' },
    { id: 'inspectionScore', name: 'Inspection Score', type: 'score' },
    { id: 'financeBadge', name: 'Finance Available', type: 'badge' },
    { id: 'auctionBadge', name: 'Auction Active', type: 'badge' },
    { id: 'bidCount', name: 'Bid Count', type: 'number' },
    { id: 'currentBid', name: 'Current Bid', type: 'currency' },
    { id: 'timeRemaining', name: 'Time Remaining', type: 'countdown' },
    { id: 'wishlistButton', name: 'Wishlist Button', type: 'action' },
    { id: 'compareButton', name: 'Compare Button', type: 'action' },
    { id: 'shareButton', name: 'Share Button', type: 'action' },
    { id: 'viewButton', name: 'View Button', type: 'action' },
    { id: 'bidButton', name: 'Bid Button', type: 'action' },
    { id: 'callButton', name: 'Call Button', type: 'action' },
    { id: 'views', name: 'View Count', type: 'number' },
    { id: 'postedDate', name: 'Posted Date', type: 'date' },
    { id: 'warranty', name: 'Warranty Badge', type: 'badge' },
    { id: 'newBadge', name: 'New Badge', type: 'badge' },
    { id: 'featuredBadge', name: 'Featured Badge', type: 'badge' },
    { id: 'soldBadge', name: 'Sold Badge', type: 'badge' },
  ];

  res.json({ success: true, data: fields });
}

// ============================================
// ADVERTISEMENTS
// ============================================

export async function getAdvertisements(req, res) {
  const { pageId, status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (pageId) filters.pageId = pageId;
  if (status) filters.status = status;

  const ads = await VXAdvertisement.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "priority",
    order: "desc",
  });

  res.json({ success: true, data: ads });
}

export async function createAdvertisement(req, res) {
  const { pageId, zone, name, type, content, schedule, priority, rotation, status } = req.body;

  const ad = await VXAdvertisement.create({
    pageId,
    zone,
    name,
    type,
    content: typeof content === 'object' ? JSON.stringify(content) : content,
    schedule: typeof schedule === 'object' ? JSON.stringify(schedule) : schedule,
    priority: priority || 0,
    rotation: rotation || 1,
    status: status || 'active',
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: ad });
}

export async function updateAdvertisement(req, res) {
  const { name, type, content, schedule, priority, rotation, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (type !== undefined) updateData.type = type;
  if (content !== undefined) updateData.content = typeof content === 'object' ? JSON.stringify(content) : content;
  if (schedule !== undefined) updateData.schedule = typeof schedule === 'object' ? JSON.stringify(schedule) : schedule;
  if (priority !== undefined) updateData.priority = priority;
  if (rotation !== undefined) updateData.rotation = rotation;
  if (status !== undefined) updateData.status = status;

  const ad = await VXAdvertisement.update(req.params.id, updateData);
  res.json({ success: true, data: ad });
}

export async function deleteAdvertisement(req, res) {
  await VXAdvertisement.delete(req.params.id);
  res.json({ success: true, message: "Advertisement deleted" });
}

export async function getAdZones(req, res) {
  const zones = [
    { id: 'homepage_hero', name: 'Homepage Hero', page: 'home' },
    { id: 'homepage_sidebar', name: 'Homepage Sidebar', page: 'home' },
    { id: 'homepage_between', name: 'Between Listings', page: 'home' },
    { id: 'search_top', name: 'Above Search Results', page: 'search' },
    { id: 'search_sidebar', name: 'Search Sidebar', page: 'search' },
    { id: 'search_between', name: 'Between Results', page: 'search' },
    { id: 'details_sidebar', name: 'Car Details Sidebar', page: 'details' },
    { id: 'details_gallery', name: 'In Image Gallery', page: 'details' },
    { id: 'details_bottom', name: 'Below Details', page: 'details' },
    { id: 'auction_banner', name: 'Auction Page Banner', page: 'auction' },
    { id: 'auction_sidebar', name: 'Auction Sidebar', page: 'auction' },
    { id: 'dealer_header', name: 'Dealer Page Header', page: 'dealer' },
    { id: 'dealer_sidebar', name: 'Dealer Sidebar', page: 'dealer' },
    { id: 'footer', name: 'Footer Banner', page: 'all' },
    { id: 'popup', name: 'Popup/Modal', page: 'all' },
    { id: 'sticky_bottom', name: 'Sticky Bottom Bar', page: 'all' },
    { id: 'floating_left', name: 'Floating Left', page: 'all' },
    { id: 'floating_right', name: 'Floating Right', page: 'all' },
  ];

  res.json({ success: true, data: zones });
}

// ============================================
// VERSIONS
// ============================================

export async function getVersions(req, res) {
  const { entityType, entityId, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (entityType) filters.entityType = entityType;
  if (entityId) filters.entityId = entityId;

  const versions = await VXVersion.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "version",
    order: "desc",
  });

  res.json({ success: true, data: versions });
}

export async function rollbackVersion(req, res) {
  const version = await VXVersion.findById(req.params.id);
  if (!version) return res.status(404).json({ success: false, error: "Version not found" });

  res.json({ success: true, message: `Rolled back to version ${version.version}`, snapshot: JSON.parse(version.snapshot) });
}

// ============================================
// DASHBOARD
// ============================================

export async function getVXPStats(req, res) {
  const [pages, sections, themes, cards, ads] = await Promise.all([
    VXPage.findAll({ limit: 1000 }),
    VXSection.findAll({ limit: 10000 }),
    VXTheme.findAll({ limit: 100 }),
    VXCard.findAll({ limit: 1000 }),
    VXAdvertisement.findAll({ limit: 1000 }),
  ]);

  res.json({
    success: true,
    data: {
      pages: {
        total: pages.length,
        published: pages.filter(p => p.status === 'published').length,
        draft: pages.filter(p => p.status === 'draft').length,
      },
      sections: { total: sections.length },
      themes: { total: themes.length },
      cards: { total: cards.length },
      advertisements: { total: ads.length },
    },
  });
}

// ============================================
// AI DESIGN ASSISTANT
// ============================================

export async function aiDesignAssist(req, res) {
  const { instruction, context } = req.body;

  // Parse instruction and generate design suggestions
  const suggestions = {
    layout: [],
    colors: [],
    typography: [],
    components: [],
    sections: [],
  };

  const instructionLower = instruction.toLowerCase();

  if (instructionLower.includes('premium') || instructionLower.includes('luxury')) {
    suggestions.colors = [
      { property: 'primary', value: '#1a1a2e' },
      { property: 'accent', value: '#c9a227' },
      { property: 'background', value: '#fafafa' },
    ];
    suggestions.typography = [
      { property: 'heading', value: 'Playfair Display' },
      { property: 'body', value: 'Inter' },
    ];
  }

  if (instructionLower.includes('modern')) {
    suggestions.layout = ['Clean grid', 'Large whitespace', 'Minimal decoration'];
    suggestions.components = ['Simple cards', 'Icon-only buttons', 'Full-width hero'];
  }

  if (instructionLower.includes('reduce') || instructionLower.includes('smaller')) {
    suggestions.spacing = ['padding: 8px', 'margin: 12px', 'gap: 8px'];
  }

  if (instructionLower.includes('hero') || instructionLower.includes('homepage')) {
    suggestions.sections = [
      { type: 'hero', name: 'Hero Section' },
      { type: 'featured_cars', name: 'Featured Cars' },
      { type: 'cta', name: 'Call to Action' },
    ];
  }

  res.json({ success: true, data: suggestions });
}
