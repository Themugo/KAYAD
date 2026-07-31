// ============================================================
// KAYAD WEBSITE BUILDER / CMS
// CMS SERVICE - Dynamic Frontend Rendering Engine
// ============================================================

import db from '../../db/index.js';
import { logInfo, logError } from '../../utils/logger.js';

/**
 * CMS Service
 * Dynamic website rendering from database
 */
class CMSService {

  // ============================================================
  // PAGE MANAGEMENT
  // ============================================================

  /**
   * Get published page by slug
   */
  async getPublishedPage(slug) {
    const page = await db.findOne('cms_pages', { slug, status: 'published' });
    if (!page) return null;

    // Get page sections
    const sections = await db.find('cms_page_sections', { 
      page_id: page.id, 
      is_active: true 
    }, { sort: { ordering: 1 } });

    // Get hero section if exists
    const heroSection = sections.find(s => s.section_type === 'hero');
    let heroConfig = null;
    if (heroSection) {
      heroConfig = await db.findOne('cms_hero_sections', { section_id: heroSection.id });
    }

    // Get footer config
    const footer = await db.findOne('cms_footer_configs', { is_active: true });

    // Get theme
    const theme = await db.findOne('cms_theme_configs', { is_active: true });

    // Get navigation
    const navigation = await this.getActiveNavigation('main');
    const mobileNav = await this.getActiveNavigation('mobile');

    // Get active popup
    const popup = await this.getActivePopup();

    // Get announcement
    const announcement = await this.getActiveAnnouncement();

    return {
      page,
      sections: sections.map(s => ({
        ...s,
        content: typeof s.content === 'string' ? JSON.parse(s.content) : s.content,
      })),
      hero: heroConfig,
      footer,
      theme,
      navigation,
      mobileNav,
      popup,
      announcement,
    };
  }

  /**
   * Get all pages
   */
  async getPages(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.pageType) query.page_type = filters.pageType;

    return db.find('cms_pages', query, { sort: { page_name: 1 } });
  }

  /**
   * Create page
   */
  async createPage(pageData) {
    const pageCode = `PAGE-${Date.now().toString(36).toUpperCase()}`;

    const page = await db.create('cms_pages', {
      page_code: pageCode,
      page_name: pageData.pageName,
      page_type: pageData.pageType || 'custom',
      slug: pageData.slug,
      status: 'draft',
      version: 1,
      meta_title: pageData.metaTitle,
      meta_description: pageData.metaDescription,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create version
    await this.createContentVersion('page', page.id, { ...page, sections: [] }, 'Initial draft');

    return page;
  }

  /**
   * Update page
   */
  async updatePage(pageId, pageData) {
    const page = await db.findById('cms_pages', pageId);
    if (!page) throw new Error('Page not found');

    await db.update('cms_pages', pageId, {
      ...pageData,
      updated_at: new Date(),
    });

    return db.findById('cms_pages', pageId);
  }

  /**
   * Publish page
   */
  async publishPage(pageId, userId, userName) {
    const page = await db.findById('cms_pages', pageId);
    if (!page) throw new Error('Page not found');

    // Create version before publishing
    const sections = await db.find('cms_page_sections', { page_id: pageId });
    await this.createContentVersion('page', pageId, { ...page, sections }, 'Published', userId, userName);

    await db.update('cms_pages', pageId, {
      status: 'published',
      published_at: new Date(),
      version: page.version + 1,
      updated_at: new Date(),
    });

    return db.findById('cms_pages', pageId);
  }

  // ============================================================
  // SECTION MANAGEMENT
  // ============================================================

  /**
   * Add section to page
   */
  async addSection(pageId, sectionData) {
    const sectionCode = `SEC-${Date.now().toString(36).toUpperCase()}`;

    // Get max ordering
    const existingSections = await db.find('cms_page_sections', { page_id: pageId });
    const maxOrder = existingSections.reduce((max, s) => Math.max(max, s.ordering || 0), 0);

    const section = await db.create('cms_page_sections', {
      page_id: pageId,
      section_code: sectionCode,
      section_type: sectionData.sectionType,
      title: sectionData.title,
      subtitle: sectionData.subtitle,
      content: sectionData.content || {},
      ordering: maxOrder + 1,
      is_visible: true,
      is_active: true,
      background_color: sectionData.backgroundColor,
      background_image: sectionData.backgroundImage,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // If hero section, create hero config
    if (sectionData.sectionType === 'hero') {
      await db.create('cms_hero_sections', {
        hero_code: sectionCode,
        section_id: section.id,
        headline: sectionData.title,
        subtitle: sectionData.subtitle,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return section;
  }

  /**
   * Update section
   */
  async updateSection(sectionId, sectionData) {
    await db.update('cms_page_sections', sectionId, {
      ...sectionData,
      updated_at: new Date(),
    });

    return db.findById('cms_page_sections', sectionId);
  }

  /**
   * Reorder sections
   */
  async reorderSections(pageId, sectionOrders) {
    for (const { sectionId, ordering } of sectionOrders) {
      await db.update('cms_page_sections', sectionId, { ordering });
    }
  }

  // ============================================================
  // NAVIGATION MANAGEMENT
  // ============================================================

  /**
   * Get navigation
   */
  async getNavigation(navCode) {
    return db.findOne('cms_navigation', { nav_code: navCode });
  }

  /**
   * Get active navigation with items
   */
  async getActiveNavigation(navCode) {
    const nav = await db.findOne('cms_navigation', { nav_code: navCode, is_active: true });
    if (!nav) return null;

    // Get items
    const items = await db.find('cms_nav_items', { nav_id: nav.id, is_active: true }, { sort: { ordering: 1 } });

    // Build hierarchy
    const rootItems = items.filter(i => !i.parent_id);
    const buildHierarchy = (parentId) => {
      return items
        .filter(i => i.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildHierarchy(item.id),
        }));
    };

    return {
      ...nav,
      items: buildHierarchy(null),
    };
  }

  /**
   * Update navigation
   */
  async updateNavigation(navCode, navData) {
    const nav = await db.findOne('cms_navigation', { nav_code: navCode });
    if (!nav) throw new Error('Navigation not found');

    await db.update('cms_navigation', nav.id, {
      items: navData.items,
      settings: navData.settings,
      updated_at: new Date(),
    });

    // Create version
    await this.createContentVersion('navigation', nav.id, navData);

    return db.findOne('cms_navigation', { nav_code: navCode });
  }

  /**
   * Add navigation item
   */
  async addNavItem(navId, itemData) {
    const itemCode = `NAV-${Date.now().toString(36).toUpperCase()}`;

    // Get max ordering
    const existingItems = await db.find('cms_nav_items', { nav_id: navId, parent_id: itemData.parentId });
    const maxOrder = existingItems.reduce((max, i) => Math.max(max, i.ordering || 0), 0);

    const item = await db.create('cms_nav_items', {
      nav_id: navId,
      item_code: itemCode,
      label: itemData.label,
      url: itemData.url,
      item_type: itemData.itemType || 'link',
      icon: itemData.icon,
      badge: itemData.badge,
      parent_id: itemData.parentId,
      ordering: maxOrder + 1,
      is_visible: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return item;
  }

  // ============================================================
  // THEME MANAGEMENT
  // ============================================================

  /**
   * Get active theme
   */
  async getActiveTheme() {
    return db.findOne('cms_theme_configs', { is_active: true });
  }

  /**
   * Update theme
   */
  async updateTheme(themeCode, themeData) {
    const theme = await db.findOne('cms_theme_configs', { theme_code: themeCode });
    if (!theme) throw new Error('Theme not found');

    // Create version before update
    await this.createContentVersion('theme', theme.id, themeData);

    await db.update('cms_theme_configs', theme.id, {
      colors: themeData.colors || theme.colors,
      typography: themeData.typography || theme.typography,
      spacing: themeData.spacing || theme.spacing,
      border_radius: themeData.borderRadius || theme.border_radius,
      shadows: themeData.shadows || theme.shadows,
      buttons: themeData.buttons || theme.buttons,
      updated_at: new Date(),
    });

    return db.findOne('cms_theme_configs', { theme_code: themeCode });
  }

  /**
   * Create new theme
   */
  async createTheme(themeData) {
    const themeCode = `THEME-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cms_theme_configs', {
      theme_code: themeCode,
      theme_name: themeData.themeName,
      colors: themeData.colors || {},
      typography: themeData.typography || {},
      is_active: false,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // ============================================================
  // CAR CARD CONFIG
  // ============================================================

  /**
   * Get car card config
   */
  async getCarCardConfig(configCode = 'default') {
    const config = await db.findOne('cms_car_card_configs', { 
      config_code: configCode 
    });
    if (!config) {
      // Return default config
      return {
        config_code: 'default',
        config_name: 'Default',
        card_style: 'default',
        fields_to_show: ['photo', 'price', 'title', 'location', 'mileage', 'transmission'],
        columns_desktop: 4,
        pagination_type: 'numbered',
      };
    }
    return {
      ...config,
      fields_to_show: typeof config.fields_to_show === 'string' 
        ? JSON.parse(config.fields_to_show) 
        : config.fields_to_show,
      fields_order: typeof config.fields_order === 'string'
        ? JSON.parse(config.fields_order)
        : config.fields_order,
    };
  }

  /**
   * Update car card config
   */
  async updateCarCardConfig(configCode, configData) {
    const config = await db.findOne('cms_car_card_configs', { config_code: configCode });
    if (!config) throw new Error('Config not found');

    await db.update('cms_car_card_configs', config.id, {
      ...configData,
      updated_at: new Date(),
    });

    return this.getCarCardConfig(configCode);
  }

  // ============================================================
  // POPUP MANAGEMENT
  // ============================================================

  /**
   * Get active popup
   */
  async getActivePopup() {
    const now = new Date();
    
    const popup = await db.findOne('cms_popups', {
      status: 'active',
      start_date: { $lte: now },
      end_date: { $gte: now },
    });

    if (popup) {
      // Increment impressions
      await db.update('cms_popups', popup.id, {
        impressions: popup.impressions + 1,
      });
    }

    return popup;
  }

  /**
   * Get all popups
   */
  async getPopups(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;

    return db.find('cms_popups', query, { sort: { created_at: -1 } });
  }

  /**
   * Create popup
   */
  async createPopup(popupData) {
    const popupCode = `POPUP-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cms_popups', {
      popup_code: popupCode,
      popup_name: popupData.popupName,
      title: popupData.title,
      content: popupData.content,
      popup_type: popupData.popupType || 'announcement',
      size: popupData.size || 'medium',
      start_date: popupData.startDate,
      end_date: popupData.endDate,
      auto_open: popupData.autoOpen || false,
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // ============================================================
  // FOOTER MANAGEMENT
  // ============================================================

  /**
   * Get active footer
   */
  async getActiveFooter() {
    return db.findOne('cms_footer_configs', { is_active: true });
  }

  /**
   * Update footer
   */
  async updateFooter(footerCode, footerData) {
    const footer = await db.findOne('cms_footer_configs', { footer_code: footerCode });
    if (!footer) throw new Error('Footer not found');

    await db.update('cms_footer_configs', footer.id, {
      columns: footerData.columns || footer.columns,
      copyright_text: footerData.copyrightText,
      policies: footerData.policies || footer.policies,
      social_links: footerData.socialLinks || footer.social_links,
      show_app_download: footerData.showAppDownload,
      app_store_urls: footerData.appStoreUrls,
      show_newsletter: footerData.showNewsletter,
      newsletter_placeholder: footerData.newsletterPlaceholder,
      newsletter_button_text: footerData.newsletterButtonText,
      updated_at: new Date(),
    });

    return db.findOne('cms_footer_configs', { footer_code: footerCode });
  }

  // ============================================================
  // MEDIA LIBRARY
  // ============================================================

  /**
   * Get media items
   */
  async getMediaItems(filters = {}) {
    const query = { status: 'active' };
    if (filters.mediaType) query.media_type = filters.mediaType;
    if (filters.folder) query.folder = filters.folder;

    return db.find('cms_media', query, { sort: { created_at: -1 } });
  }

  /**
   * Upload media
   */
  async uploadMedia(mediaData) {
    const mediaCode = `MEDIA-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cms_media', {
      media_code: mediaCode,
      file_name: mediaData.fileName,
      original_name: mediaData.originalName,
      media_type: mediaData.mediaType,
      mime_type: mediaData.mimeType,
      url: mediaData.url,
      thumbnail_url: mediaData.thumbnailUrl,
      optimized_url: mediaData.optimizedUrl,
      width: mediaData.width,
      height: mediaData.height,
      file_size: mediaData.fileSize,
      folder: mediaData.folder,
      tags: mediaData.tags || [],
      alt_text: mediaData.altText,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // ============================================================
  // FORMS
  // ============================================================

  /**
   * Get form
   */
  async getForm(formCode) {
    return db.findOne('cms_forms', { form_code: formCode, status: 'active' });
  }

  /**
   * Submit form
   */
  async submitForm(formCode, formData) {
    const form = await db.findOne('cms_forms', { form_code: formCode });
    if (!form) throw new Error('Form not found');

    // Update submission count
    await db.update('cms_forms', form.id, {
      total_submissions: (form.total_submissions || 0) + 1,
    });

    // In production, would save submission and send notifications
    return { success: true, message: 'Form submitted successfully' };
  }

  // ============================================================
  // ANNOUNCEMENTS
  // ============================================================

  /**
   * Get active announcement
   */
  async getActiveAnnouncement() {
    const now = new Date();
    
    return db.findOne('cms_announcements', {
      status: 'active',
      start_date: { $lte: now },
      end_date: { $gte: now },
    });
  }

  // ============================================================
  // SEO
  // ============================================================

  /**
   * Get SEO config
   */
  async getSEOConfig() {
    return db.findOne('cms_seo_configs', { is_active: true });
  }

  /**
   * Update SEO config
   */
  async updateSEOConfig(configData) {
    let config = await db.findOne('cms_seo_configs', { is_active: true });

    if (config) {
      await db.update('cms_seo_configs', config.id, {
        ...configData,
        updated_at: new Date(),
      });
    } else {
      config = await db.create('cms_seo_configs', {
        config_code: 'SEO-DEFAULT',
        ...configData,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return config;
  }

  // ============================================================
  // CONTENT VERSIONS
  // ============================================================

  /**
   * Create content version
   */
  async createContentVersion(contentType, contentId, snapshot, summary, userId = null, userName = null) {
    const versionCode = `VER-${Date.now().toString(36).toUpperCase()}`;

    // Get current max version
    const existingVersions = await db.find('cms_content_versions', {
      content_type: contentType,
      content_id: contentId,
    });
    const maxVersion = existingVersions.reduce((max, v) => Math.max(max, v.version_number || 0), 0);

    return db.create('cms_content_versions', {
      version_code: versionCode,
      content_type: contentType,
      content_id: contentId,
      snapshot: typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot),
      version_number: maxVersion + 1,
      change_summary: summary,
      status: 'draft',
      created_by: userId,
      created_by_name: userName,
      created_at: new Date(),
    });
  }

  /**
   * Get content versions
   */
  async getContentVersions(contentType, contentId) {
    return db.find('cms_content_versions', {
      content_type: contentType,
      content_id: contentId,
    }, { sort: { version_number: -1 } });
  }

  /**
   * Rollback to version
   */
  async rollbackToVersion(versionId) {
    const version = await db.findById('cms_content_versions', versionId);
    if (!version) throw new Error('Version not found');

    const snapshot = typeof version.snapshot === 'string' 
      ? JSON.parse(version.snapshot) 
      : version.snapshot;

    // Restore based on content type
    switch (version.content_type) {
      case 'page':
        await db.update('cms_pages', version.content_id, {
          ...snapshot,
          updated_at: new Date(),
        });
        break;
      case 'theme':
        await db.update('cms_theme_configs', version.content_id, {
          ...snapshot,
          updated_at: new Date(),
        });
        break;
      case 'navigation':
        await db.update('cms_navigation', version.content_id, {
          ...snapshot,
          updated_at: new Date(),
        });
        break;
    }

    return { success: true };
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Initialize default CMS content
   */
  async initializeDefaults() {
    // Create default page
    const existingPage = await db.findOne('cms_pages', { slug: '/' });
    if (!existingPage) {
      await this.createPage({
        pageName: 'Homepage',
        pageType: 'homepage',
        slug: '/',
        metaTitle: 'KAYAD - Africa\'s Smartest Automotive Platform',
        metaDescription: 'Buy, sell, auction and finance vehicles with confidence on East Africa\'s most trusted automotive platform.',
      });
    }

    // Create default navigation
    const existingNav = await db.findOne('cms_navigation', { nav_code: 'main' });
    if (!existingNav) {
      await db.create('cms_navigation', {
        nav_code: 'main',
        nav_name: 'Main Navigation',
        items: [
          { label: 'Buy', url: '/marketplace', item_type: 'link' },
          { label: 'Sell', url: '/sell', item_type: 'link' },
          { label: 'Auction', url: '/auction', item_type: 'link' },
          { label: 'Finance', url: '/finance', item_type: 'link' },
          { label: 'Inspect', url: '/inspection', item_type: 'link' },
          { label: 'Dealers', url: '/dealers', item_type: 'link' },
        ],
        settings: { sticky: true },
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Create default theme
    const existingTheme = await db.findOne('cms_theme_configs', { theme_code: 'default' });
    if (!existingTheme) {
      await db.create('cms_theme_configs', {
        theme_code: 'default',
        theme_name: 'KAYAD Default Theme',
        is_default: true,
        is_active: true,
        colors: {
          primary: '#1e3a5f',
          secondary: '#64748b',
          accent: '#c4a484',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          info: '#3b82f6',
          background: '#f5f0e8',
          surface: '#ffffff',
        },
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Create default footer
    const existingFooter = await db.findOne('cms_footer_configs', { footer_code: 'default' });
    if (!existingFooter) {
      await db.create('cms_footer_configs', {
        footer_code: 'default',
        config_name: 'Default Footer',
        columns: [
          { title: 'Marketplace', links: [
            { label: 'Buy a Car', url: '/marketplace' },
            { label: 'Sell a Car', url: '/sell' },
            { label: 'Auction', url: '/auction' },
          ]},
          { title: 'Services', links: [
            { label: 'Finance', url: '/finance' },
            { label: 'Inspection', url: '/inspection' },
            { label: 'Escrow', url: '/escrow' },
          ]},
          { title: 'Company', links: [
            { label: 'About Us', url: '/about' },
            { label: 'Contact', url: '/contact' },
            { label: 'Careers', url: '/careers' },
          ]},
          { title: 'Legal', links: [
            { label: 'Privacy Policy', url: '/privacy' },
            { label: 'Terms of Service', url: '/terms' },
            { label: 'Cookie Policy', url: '/cookies' },
          ]},
        ],
        copyright_text: '© 2026 KAYAD. All rights reserved.',
        show_newsletter: true,
        newsletter_placeholder: 'Enter your email',
        newsletter_button_text: 'Subscribe',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    logInfo('CMS defaults initialized');
  }
}

export const cmsService = new CMSService();
export default cmsService;
