import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

globalThis.React = React;

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => React.createElement('div', p, children),
    button: ({ children, ...p }) => React.createElement('button', p, children),
    span: ({ children, ...p }) => React.createElement('span', p, children),
    img: (p) => React.createElement('img', p),
    section: ({ children, ...p }) => React.createElement('section', p, children),
    article: ({ children, ...p }) => React.createElement('article', p, children),
    nav: ({ children, ...p }) => React.createElement('nav', p, children),
    header: ({ children, ...p }) => React.createElement('header', p, children),
    footer: ({ children, ...p }) => React.createElement('footer', p, children),
    ul: ({ children, ...p }) => React.createElement('ul', p, children),
    li: ({ children, ...p }) => React.createElement('li', p, children),
    p: ({ children, ...p }) => React.createElement('p', p, children),
    h1: ({ children, ...p }) => React.createElement('h1', p, children),
    h2: ({ children, ...p }) => React.createElement('h2', p, children),
    h3: ({ children, ...p }) => React.createElement('h3', p, children),
    a: ({ children, ...p }) => React.createElement('a', p, children),
    form: ({ children, ...p }) => React.createElement('form', p, children),
    input: (p) => React.createElement('input', p),
    label: ({ children, ...p }) => React.createElement('label', p, children),
    svg: ({ children, ...p }) => React.createElement('svg', p, children),
  },
  AnimatePresence: ({ children }) => children,
  useAnimation: () => ({ start: () => {} }),
  useInView: () => true,
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useTransform: () => 0,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const icons = ['Gauge', 'MapPin', 'ArrowRight', 'Search', 'X', 'ChevronLeft', 'ChevronRight', 
    'Star', 'Heart', 'Filter', 'User', 'Settings', 'Menu', 'Close', 'Phone', 'Mail',
    'Calendar', 'Clock', 'Car', 'Home', 'MessageCircle', 'Bell', 'Check', 'AlertCircle',
    'Eye', 'EyeOff', 'Trash', 'Edit', 'Plus', 'Minus', 'ExternalLink', 'Upload', 'Download',
    'RefreshCw', 'Zap', 'Shield', 'CreditCard', 'Truck', 'Package', 'DollarSign', 'LogOut',
    'Users', 'Briefcase', 'BarChart', 'PieChart', 'TrendingUp', 'TrendingDown', 'Activity',
    'DollarSign', 'FileText', 'Image', 'Camera', 'Send', 'MessageSquare', 'Info',
    'HelpCircle', 'AlertTriangle', 'CheckCircle', 'XCircle', 'ChevronDown', 'ChevronUp',
    'MoreHorizontal', 'MoreVertical', 'Link', 'Copy', 'Maximize', 'Minimize', 'Play',
    'Pause', 'SkipBack', 'SkipForward', 'Volume', 'Volume1', 'Volume2', 'VolumeX',
    'Facebook', 'Twitter', 'Instagram', 'Linkedin', 'Youtube', 'Globe', 'Map',
    'Navigation', 'Compass', 'Target', 'Award', 'Gift', 'Tag', 'ShoppingCart',
    'Wallet', 'Percent', 'Repeat', 'RotateCcw', 'RotateCw', 'Sun', 'Moon', 'Cloud',
    'CloudRain', 'Wind', 'Thermometer', 'Droplet', 'Umbrella', 'Sprout', 'Leaf',
    'LayoutGrid', 'LayoutList', 'List', 'Grid', 'Columns', 'Square', 'Circle',
    'Sliders', 'SlidersHorizontal', 'SlidersVertical', 'Gauge', 'Percent', 'DollarSign',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowUpRight', 'ArrowDownLeft', 'ArrowUpLeft', 'ArrowDownRight',
    'ChevronsLeft', 'ChevronsRight', 'ChevronsUp', 'ChevronsDown', 'PanelLeft', 'PanelRight',
    'CarFront', 'Caravan', 'Bus', 'Bike', 'Truck', 'Ship', 'Plane', 'TrainFront',
    'Sparkles', 'Zap', 'Bolt', 'Flame', 'Mountain', 'Building', 'Building2', 'Store',
    'ShoppingBag', 'CreditCard', 'Receipt', 'Wallet2', 'Banknote', 'Coins', 'PiggyBank',
    'Handshake', 'FileCheck', 'FileWarning', 'FileX', 'FilePlus', 'FileMinus', 'Folder',
    'FolderOpen', 'Archive', 'HardDrive', 'Database', 'Server', 'Cpu', 'Smartphone',
    'Tablet', 'Monitor', 'Laptop', 'Keyboard', 'Mouse', 'Printer', 'Projector',
    'Tv', 'Radio', 'Speaker', 'Music', 'Headphones', 'Mic', 'MicOff', 'Video',
    'VideoOff', 'Camera', 'CameraOff', 'Image', 'Images', 'Film', 'PlayCircle',
    'SkipForward', 'SkipBack', 'Rewind', 'FastForward', 'Volume1', 'Volume2', 'VolumeX',
    'Bell', 'BellOff', 'BellRing', 'Notification', 'Inbox', 'Mail', 'MailOpen',
    'Send', 'PaperPlane', 'MessageCircle', 'MessageSquare', 'Chat', 'ChatLeft', 'ChatRight',
    'Phone', 'PhoneCall', 'PhoneIncoming', 'PhoneOutgoing', 'PhoneMissed', 'PhoneOff',
    'Video', 'VideoIcon', 'User', 'UserCheck', 'UserX', 'UserPlus', 'UserMinus',
    'Users', 'UserCircle', 'UserSquare', 'Contact', 'IdCard', 'BadgeCheck', 'Shield',
    'ShieldCheck', 'ShieldAlert', 'ShieldX', 'Lock', 'LockOpen', 'Key', 'KeyRound',
    'Eye', 'EyeOff', 'EyeCheck', 'Glasses', 'Binoculars', 'Scan', 'ScanLine',
    'Fingerprint', 'ScanFace', 'Accessibility', 'Braille', 'Languages', 'Translate',
    'Type', 'Text', 'Font', 'Bold', 'Italic', 'Underline', 'Strikethrough',
    'AlignLeft', 'AlignCenter', 'AlignRight', 'AlignJustify', 'List', 'ListOrdered',
    'ListUnordered', 'Hash', 'Pilcrow', 'Quote', 'Replace', 'Undo', 'Redo',
    'History', 'RotateCcw', 'RotateCw', 'RefreshCw', 'RefreshCwCounterclockwise',
    'Archive', 'ArchiveRestore', 'Package', 'PackageOpen', 'PackageX', 'Boxes',
    'Container', 'LayoutGrid', 'Grid', 'LayoutList', 'Layout', 'PanelLeft', 'PanelRight',
    'PanelTop', 'PanelBottom', 'Sidebar', 'SidebarOpen', 'SidebarClose', 'SplitSquareHorizontal',
    'SplitSquareVertical', 'Minimize', 'Maximize', 'ZoomIn', 'ZoomOut', 'Maximize2',
    'Minimize2', 'Expand', 'Shrink', 'Move', 'CornerDownLeft', 'CornerDownRight',
    'CornerLeftDown', 'CornerLeftUp', 'CornerRightDown', 'CornerRightUp', 'CornerUpLeft',
    'CornerUpRight', 'Plus', 'Minus', 'PlusCircle', 'MinusCircle', 'PlusSquare',
    'MinusSquare', 'X', 'XCircle', 'XSquare', 'Check', 'CheckCircle', 'CheckSquare',
    'CheckCircle2', 'Circle', 'CircleDot', 'CircleDashed', 'CircleSlash', 'Hexagon',
    'Octagon', 'Pentagon', 'Square', 'Triangle', 'Zap', 'ZapOff', 'Flashlight',
    'FlashlightOff', 'Cloud', 'CloudOff', 'CloudDrizzle', 'CloudLightning', 'CloudRain',
    'CloudSnow', 'CloudSun', 'CloudMoon', 'Wind', 'Snowflake', 'Umbrella', 'Sun',
    'SunDim', 'SunHorizon', 'SunMedium', 'SunMoon', 'SunSnow', 'Moon', 'MoonStar',
    'MoonCloud', 'Star', 'StarHalf', 'StarOff', 'Sparkles', 'Flower', 'Flower2',
    'TreeDeciduous', 'TreePine', 'TreeOak', 'Shrub', 'Leaf', 'LeafSnow', 'Sprout',
    'Wheat', 'Carrot', 'Cherry', 'Apple', 'Banana', 'Coffee', 'GlassWater', 'GlassWine',
    'CupSoda', 'Beer', 'Pizza', 'Sandwich', 'Salad', 'ChefHat', 'CookingPot',
    'UtensilsCrossed', 'Utensils', 'Knife', 'Spoon', 'Fork', 'Plate', 'Bowl',
    'CookingPot', 'Cookie', 'Cake', 'Candy', 'Lollipop', 'Popcorn', 'Honey',
    'Fish', 'Meat', 'Avocado', 'Egg', 'Milk', 'MilkOff', 'Coffee', 'Tea',
    'GlassWater', 'Wine', 'Beer', 'Pill', 'Pills', 'Syringe', 'Bandage', 'Stethoscope',
    'Heart', 'HeartPulse', 'HeartOff', 'Activity', 'Pulse', 'PulseSquare', 'Waveform',
    'Brain', 'Lungs', 'Bone', 'Tooth', 'Eye', 'Ear', 'Nose', 'Brain',
    'Sparkle', 'Sparkles', 'Smile', 'SmilePlus', 'Frown', 'Meh', 'Laugh',
    'Trophy', 'Medal', 'Award', 'Crown', 'Gem', 'Diamond', 'Gift', 'GiftCard',
    'Ticket', 'TicketCheck', 'TicketMinus', 'TicketPercent', 'TicketPlus', 'TicketX',
    'Receipt', 'ReceiptCentEuro', 'ReceiptEuro', 'ReceiptIndianRupee', 'ReceiptJapaneseYen',
    'ReceiptPoundSterling', 'ReceiptRussianRuble', 'ReceiptSwissFranc', 'ReceiptTugrik',
    'DollarSign', 'Euro', 'IndianRupee', 'JapaneseYen', 'PoundSterling', 'RussianRuble',
    'SwissFranc', 'Tugrik', 'Bitcoin', 'Coins', 'CreditCard', 'Wallet', 'Wallet2',
    'PiggyBank', 'Banknote', 'Moneybill', 'Moneybill1', 'Moneybill2', 'DollarSign',
    'LoyaltyCard', 'Gift', 'Ticket', 'Receipt', 'Currency', 'Landmark', 'MapPin',
    'Map', 'Compass', 'Navigation', 'Navigation2', 'Navigation3', 'Crosshair', 'Target',
    'Aim', 'Locate', 'LocateFixed', 'LocateOff', 'Tent', 'TentPin', 'Campfire',
    'TentPin', 'Home', 'HomeIcon', 'Building', 'Building2', 'BuildingIcon', 'Store',
    'Storefront', 'Warehouse', 'Factory', 'Hospital', 'School', 'University', 'Bank',
    'Hotel', 'Church', 'Mosque', 'Temple', 'Stadium', 'Park', 'Tree', 'Mountain',
    'Globe', 'Globe1', 'Globe2', 'Globe3', 'World', 'Map', 'Map1', 'Map2',
    'Route', 'Navigation', 'Compass', 'Signpost', 'Armchair', 'Bed', 'BedDouble',
    'BedSingle', 'Bath', 'Bathtub', 'Shower', 'Toilet', 'Crib', 'Hammock',
    'Sofa', 'Armchair', 'Chair', 'ArmlessChair', 'Couch', 'Armchair2', 'Refrigerator',
    'Oven', 'Microwave', 'Toaster', 'Blender', 'CoffeeMaker', 'ChefHat', 'CookingPot',
    'Utensils', 'Knife', 'Spoon', 'Fork', 'Plate', 'Bowl', 'Cup', 'Glass',
    'GlassWater', 'GlassWine', 'Beer', 'Wine', 'Pizza', 'Sandwich', 'Salad',
    'SaladIcon', 'ChefHat', 'CookingPot', 'Flame', 'Gauge', 'GaugeCircle', 'Battery',
    'BatteryCharging', 'BatteryFull', 'BatteryLow', 'BatteryMedium', 'BatteryWarning',
    'Plug', 'PlugZap', 'Power', 'Socket', 'SwitchCamera', 'SwitchVideo', 'ToggleLeft',
    'ToggleRight', 'Volume', 'Volume1', 'Volume2', 'VolumeX', 'Wifi', 'WifiOff',
    'Bluetooth', 'BluetoothConnected', 'BluetoothOff', 'Signal', 'SignalZero', 'Signal1',
    'Signal2', 'Signal3', 'Signal4', 'Signal5', 'Bug', 'BugOff', 'Ant', 'Worm',
    'Pest', 'Locust', 'Apple', 'Banana', 'Cherry', 'Grape', 'Lemon', 'Lime',
    'Orange', 'Peach', 'Pear', 'Pepper', 'Watermelon', 'Carrot', 'Eggplant',
    'Tomato', 'Potato', 'Corn', 'HotPepper', 'Pumpkin', 'Mushroom', 'Acorn'];
  return icons.reduce((acc, icon) => {
    acc[icon] = () => React.createElement('span', { 'data-testid': `icon-${icon.toLowerCase()}` }, icon);
    return acc;
  }, {});
});

const createStorageMock = () => {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
};

const localStorageMock = createStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

// Mock sessionStorage
const sessionStorageMock = createStorageMock();
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  configurable: true,
});

Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  configurable: true,
});

Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  configurable: true,
  writable: true,
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(callback, options = {}) {
    this.callback = callback;
    this.options = options;
    this.thresholds = options.threshold || [];
    this.root = options.root || null;
    this.rootMargin = options.rootMargin || '';
  }

  observe(element) {
    // Simulate immediate intersection for testing
    const entry = {
      target: element,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: {},
      intersectionRect: {},
      rootBounds: this.root?.getBoundingClientRect() || null,
      time: Date.now(),
    };
    this.callback([entry], this);
  }

  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

// Use Object.defineProperty to allow tests to override
Object.defineProperty(globalThis, 'IntersectionObserver', {
  value: IntersectionObserverMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'IntersectionObserver', {
  value: IntersectionObserverMock,
  writable: true,
  configurable: true,
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

// Mock URL.createObjectURL and URL.revokeObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: () => 'blob:test-url',
  writable: true,
});
Object.defineProperty(URL, 'revokeObjectURL', {
  value: () => {},
  writable: true,
});
