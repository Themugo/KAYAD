import React, { useState, useEffect } from 'react';
import {
  Box, Layers, Database, FileText, Grid3X3, Kanban, Calendar,
  BarChart3, Shield, GitBranch, Wand2, Plus, Search, Filter,
  Edit, Trash2, Copy, MoreVertical, Eye, Settings, ChevronRight,
  Check, X, GripVertical, ChevronDown, ChevronUp, Save,
  Download, Upload, RefreshCw, Zap, ArrowRight, Code, Palette,
  Table, Layout, Columns, MapPin, Car, Users, Package, CalendarDays,
  MessageSquare, AlertTriangle, CheckCircle, Clock, FileCode
} from 'lucide-react';
import * as lowCodeApi from '../../../services/lowCodeApi';

// Design System Colors
const colors = {
  navy: '#0A3340',
  beige: '#EEF7F5',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#5aafa4',
  softBlue: '#5AAFA4',
  mutedOrange: '#13b8a6',
  mutedCrimson: '#EF4444',
};

const statusColors = {
  published: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-[#DDF4F0] text-[#12576D]',
  archived: 'bg-[#EEF7F5] text-[#12576D]',
};

const viewTypeIcons = {
  table: Table,
  kanban: Kanban,
  calendar: Calendar,
  gallery: Grid3X3,
  timeline: Clock,
  map: MapPin,
};

const categoryIcons = {
  vehicle: Car,
  dealer: Users,
  fleet: Package,
  event: CalendarDays,
  support: MessageSquare,
  compliance: AlertTriangle,
  custom: Box,
};

const modules = [
  { id: 'objects', label: 'Business Objects', icon: Layers, color: colors.navy },
  { id: 'schema', label: 'Schema Designer', icon: Database, color: colors.softBlue },
  { id: 'forms', label: 'Form Builder', icon: FileText, color: colors.terracotta },
  { id: 'views', label: 'View Builder', icon: Layout, color: colors.emerald },
  { id: 'relationships', label: 'Relationships', icon: GitBranch, color: '#5aafa4' },
  { id: 'permissions', label: 'Permissions', icon: Shield, color: colors.mutedOrange },
  { id: 'api', label: 'API Explorer', icon: Code, color: colors.softBlue },
  { id: 'ai', label: 'AI Assistant', icon: Wand2, color: '#13B8A6' },
  { id: 'dashboards', label: 'Dashboards', icon: BarChart3, color: '#13B8A6' },
  { id: 'versions', label: 'Version History', icon: FileCode, color: colors.navy },
];

const fieldTypes = [
  { id: 'text', name: 'Text', icon: 'type', color: colors.navy },
  { id: 'number', name: 'Number', icon: 'hash', color: colors.softBlue },
  { id: 'currency', name: 'Currency', icon: 'dollar-sign', color: colors.emerald },
  { id: 'date', name: 'Date', icon: 'calendar', color: colors.terracotta },
  { id: 'boolean', name: 'Yes/No', icon: 'toggle-left', color: colors.mutedOrange },
  { id: 'dropdown', name: 'Dropdown', icon: 'chevron-down', color: '#5aafa4' },
  { id: 'rich_text', name: 'Rich Text', icon: 'file-text', color: colors.navy },
  { id: 'image', name: 'Image', icon: 'image', color: colors.terracotta },
  { id: 'file', name: 'File', icon: 'file', color: colors.softBlue },
  { id: 'user', name: 'User', icon: 'user', color: colors.emerald },
  { id: 'lookup', name: 'Lookup', icon: 'search', color: '#13B8A6' },
  { id: 'formula', name: 'Formula', icon: 'calculator', color: '#13B8A6' },
];

export default function BusinessObjectStudio() {
  const [activeModule, setActiveModule] = useState('objects');
  const [businessObjects, setBusinessObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingObject, setEditingObject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // New Object Form State
  const [newObject, setNewObject] = useState({
    name: '',
    singularName: '',
    pluralName: '',
    description: '',
    category: 'custom',
    icon: 'box',
    color: colors.navy,
    fields: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data } = await lowCodeApi.getPlatformStats();
      setStats(data.data);

      const { data: objectsData } = await lowCodeApi.getBusinessObjects();
      setBusinessObjects(objectsData.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      // No synthetic production fallback: the UI remains empty until the backend responds.
    } finally {
      setLoading(false);
    }
  };

  const openNewObjectModal = () => {
    setEditingObject(null);
    setNewObject({
      name: '',
      singularName: '',
      pluralName: '',
      description: '',
      category: 'custom',
      icon: 'box',
      color: colors.navy,
      fields: [
        { fieldName: 'Name', fieldType: 'text', required: true, unique: false },
        { fieldName: 'Description', fieldType: 'rich_text', required: false },
        { fieldName: 'Status', fieldType: 'dropdown', required: true, options: ['active', 'inactive'] },
      ],
    });
    setShowModal(true);
  };

  const addField = () => {
    setNewObject(prev => ({
      ...prev,
      fields: [...prev.fields, { fieldName: '', fieldType: 'text', required: false }],
    }));
  };

  const removeField = (index) => {
    setNewObject(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const updateField = (index, updates) => {
    setNewObject(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => i === index ? { ...f, ...updates } : f),
    }));
  };

  const saveObject = async () => {
    try {
      if (editingObject) {
        await lowCodeApi.updateBusinessObject(editingObject.id, newObject);
      } else {
        await lowCodeApi.createBusinessObject(newObject);
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to save object:', error);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Platform Overview</h2>
        <button
          onClick={openNewObjectModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]"
        >
          <Plus size={18} />
          New Business Object
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Objects', value: stats?.totalObjects || 0, icon: Layers, color: colors.navy },
          { label: 'Published', value: stats?.publishedObjects || 0, icon: CheckCircle, color: colors.emerald },
          { label: 'Draft', value: stats?.draftObjects || 0, icon: Edit, color: colors.mutedOrange },
          { label: 'Total Fields', value: stats?.totalFields || 0, icon: Database, color: colors.softBlue },
          { label: 'Total Views', value: stats?.totalViews || 0, icon: Layout, color: colors.terracotta },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <span className="text-sm text-[#64748B]">{stat.label}</span>
            </div>
            <div className="text-3xl font-bold text-[#0A3340]">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {modules.slice(0, 4).map((mod) => (
          <button
            key={mod.id}
            onClick={() => setActiveModule(mod.id)}
            className="p-6 rounded-xl border border-[#D7E7E4] hover:border-[#0A3340] hover:bg-[#0A3340]/5 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${mod.color}20` }}>
              <mod.icon size={24} style={{ color: mod.color }} />
            </div>
            <h3 className="font-semibold text-[#0A3340]">{mod.label}</h3>
            <p className="text-sm text-[#64748B] mt-1">Create and manage</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderBusinessObjects = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Business Objects</h2>
        <button
          onClick={openNewObjectModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]"
        >
          <Plus size={18} />
          New Object
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input
            type="text"
            placeholder="Search objects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] outline-none"
          />
        </div>
        <select className="px-4 py-2.5 rounded-lg border border-[#D7E7E4] outline-none">
          <option>All Categories</option>
          <option>Vehicle</option>
          <option>Fleet</option>
          <option>Dealer</option>
          <option>Support</option>
          <option>Custom</option>
        </select>
        <select className="px-4 py-2.5 rounded-lg border border-[#D7E7E4] outline-none">
          <option>All Status</option>
          <option>Published</option>
          <option>Draft</option>
        </select>
      </div>

      {/* Objects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businessObjects
          .filter(o => !searchQuery || o.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((obj) => {
            const CategoryIcon = categoryIcons[obj.category] || Box;
            return (
              <div
                key={obj.id}
                onClick={() => setSelectedObject(obj)}
                className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4] hover:border-[#0A3340] cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${obj.color || colors.navy}20` }}>
                      <CategoryIcon size={24} className="text-[#64748B]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#0A3340]">{obj.name}</h3>
                      <p className="text-xs text-[#94A3B8] font-mono">{obj.objectKey}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[obj.status]}`}>
                    {obj.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-[#64748B] mb-4">
                  <span>{obj.fieldCount} fields</span>
                  <span className="capitalize">{obj.category}</span>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-[#D7E7E4]">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveModule('schema'); setSelectedObject(obj); }}
                    className="flex-1 px-3 py-2 text-sm border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]"
                  >
                    Schema
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveModule('forms'); setSelectedObject(obj); }}
                    className="flex-1 px-3 py-2 text-sm border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]"
                  >
                    Forms
                  </button>
                  <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                    <MoreVertical size={16} className="text-[#64748B]" />
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  const renderSchemaDesigner = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0A3340]">Schema Designer</h2>
          {selectedObject && (
            <p className="text-[#64748B]">Designing {selectedObject.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
            <Download size={18} />
          </button>
          <button className="px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
            <Upload size={18} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
            <Save size={18} />
            Save Schema
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Field Types Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] p-4">
          <h3 className="font-semibold text-[#0A3340] mb-4">Field Types</h3>
          <div className="grid grid-cols-2 gap-2">
            {fieldTypes.map((type) => (
              <button
                key={type.id}
                className="flex items-center gap-2 p-3 rounded-lg border border-[#D7E7E4] hover:border-[#0A3340] hover:bg-[#0A3340]/5 transition-all text-left"
              >
                <div className="w-8 h-8 rounded" style={{ backgroundColor: `${type.color}20` }} />
                <span className="text-sm font-medium text-[#12576D]">{type.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fields List */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-[#D7E7E4]">
          <div className="p-4 border-b border-[#D7E7E4] flex items-center justify-between">
            <h3 className="font-semibold text-[#0A3340]">Fields</h3>
            <button
              onClick={addField}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#0A3340] hover:bg-[#0A3340]/10 rounded-lg"
            >
              <Plus size={16} />
              Add Field
            </button>
          </div>

          <div className="p-4 space-y-2">
            {(selectedObject?.fields || [
              { fieldName: 'Name', fieldKey: 'name', fieldType: 'text', required: true },
              { fieldName: 'Description', fieldKey: 'description', fieldType: 'rich_text', required: false },
              { fieldName: 'Status', fieldKey: 'status', fieldType: 'dropdown', required: true, options: ['active', 'inactive'] },
              { fieldName: 'Price', fieldKey: 'price', fieldType: 'currency', required: false },
              { fieldName: 'Image', fieldKey: 'image', fieldType: 'image', required: false },
              { fieldName: 'Assigned To', fieldKey: 'assigned_to', fieldType: 'user', required: false },
            ]).map((field, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[#D7E7E4] hover:border-[#BDE5DE]">
                <GripVertical size={16} className="text-[#94A3B8] cursor-move" />
                <div className="flex-1">
                  <p className="font-medium text-[#0A3340]">{field.fieldName}</p>
                  <p className="text-xs text-[#94A3B8] font-mono">{field.fieldKey} • {field.fieldType}</p>
                </div>
                <div className="flex items-center gap-2">
                  {field.required && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs">Required</span>
                  )}
                  {field.unique && (
                    <span className="px-2 py-0.5 bg-[#DDF4F0] text-[#176B87] rounded text-xs">Unique</span>
                  )}
                  <button className="p-1.5 hover:bg-[#EEF7F5] rounded">
                    <Edit size={14} className="text-[#64748B]" />
                  </button>
                  <button className="p-1.5 hover:bg-red-50 rounded">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SQL Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#0A3340]">Generated SQL</h3>
          <button className="px-3 py-1.5 text-sm border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
            <Copy size={14} className="inline mr-1" />
            Copy
          </button>
        </div>
        <pre className="bg-[#0A3340] text-[#EEF7F5] p-4 rounded-lg text-sm font-mono overflow-x-auto">
{`CREATE TABLE custom_vehicle_rental (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  price DECIMAL(15,2),
  image VARCHAR(500),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_vehicle_rental_status ON custom_vehicle_rental(status);
CREATE INDEX idx_vehicle_rental_created_at ON custom_vehicle_rental(created_at);`}
        </pre>
      </div>
    </div>
  );

  const renderAIAssistant = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">AI Assistant</h2>

      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#DDF4F0] flex items-center justify-center">
            <Wand2 size={24} className="text-[#176B87]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#0A3340]">Describe Your Business Object</h3>
            <p className="text-sm text-[#64748B]">Use natural language and let AI create the schema</p>
          </div>
        </div>

        <textarea
          className="w-full p-4 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] focus:ring-2 focus:ring-[#0A3340]/20 outline-none resize-none"
          rows={4}
          placeholder="Example: Create a Fleet Management module with vehicle assignments, maintenance schedules and driver allocation. Each vehicle should track mileage, insurance expiry, and service history."
        />

        <div className="flex items-center justify-between mt-4">
          <button className="flex items-center gap-2 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
            <RefreshCw size={16} />
            Clear
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#176B87] text-white rounded-lg hover:bg-[#12576D]">
            <Wand2 size={18} />
            Generate Schema
          </button>
        </div>
      </div>

      {/* Suggestions Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] p-6">
        <h3 className="font-semibold text-[#0A3340] mb-4">AI Suggestions</h3>

        <div className="space-y-6">
          {/* Object Name */}
          <div className="p-4 bg-[#F6FAF9] rounded-lg">
            <p className="text-sm text-[#64748B] mb-1">Suggested Object Name</p>
            <p className="text-xl font-bold text-[#0A3340]">Fleet Management</p>
          </div>

          {/* Fields */}
          <div>
            <p className="text-sm text-[#64748B] mb-2">Suggested Fields</p>
            <div className="grid grid-cols-3 gap-2">
              {['Vehicle', 'Driver', 'Assignment Date', 'Return Date', 'Mileage Out', 'Mileage In', 'Fuel Level', 'Status', 'Notes'].map((field) => (
                <div key={field} className="px-3 py-2 bg-[#EEF7F5] rounded-lg text-sm text-[#12576D]">
                  {field}
                </div>
              ))}
            </div>
          </div>

          {/* Relationships */}
          <div>
            <p className="text-sm text-[#64748B] mb-2">Suggested Relationships</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-[#F6FAF9] rounded">
                <GitBranch size={16} className="text-[#94A3B8]" />
                <span className="text-sm text-[#12576D]">Has Many → Vehicle</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-[#F6FAF9] rounded">
                <GitBranch size={16} className="text-[#94A3B8]" />
                <span className="text-sm text-[#12576D]">Has Many → Driver</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-[#F6FAF9] rounded">
                <GitBranch size={16} className="text-[#94A3B8]" />
                <span className="text-sm text-[#12576D]">Has Many → Maintenance Schedule</span>
              </div>
            </div>
          </div>

          {/* Views */}
          <div>
            <p className="text-sm text-[#64748B] mb-2">Suggested Views</p>
            <div className="flex gap-2">
              <span className="px-3 py-1.5 bg-[#DDF4F0] text-[#12576D] rounded-lg text-sm">Table</span>
              <span className="px-3 py-1.5 bg-[#DDF4F0] text-[#12576D] rounded-lg text-sm">Kanban</span>
              <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm">Calendar</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-[#D7E7E4]">
            <button className="flex-1 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
              Edit Suggestions
            </button>
            <button className="flex-1 px-4 py-2 bg-[#176B87] text-white rounded-lg hover:bg-[#12576D]">
              Create Object
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'objects':
      case 'schema':
        return activeModule === 'schema' && selectedObject ? renderSchemaDesigner() : renderBusinessObjects();
      case 'ai':
        return renderAIAssistant();
      default:
        return (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-[#D7E7E4] text-center">
            <Layers size={64} className="mx-auto text-[#BDE5DE] mb-4" />
            <h3 className="text-xl font-semibold text-[#0A3340] mb-2">{modules.find(m => m.id === activeModule)?.label}</h3>
            <p className="text-[#64748B]">This module is under development</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF7F5]">
      {/* Header */}
      <header className="bg-white border-b border-[#D7E7E4] sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A3340] flex items-center justify-center">
                  <Layers size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#0A3340]">Business Object Studio</h1>
                  <p className="text-xs text-[#64748B]">Low-Code Platform</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <RefreshCw size={20} className="text-[#64748B]" />
              </button>
              <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <Settings size={20} className="text-[#64748B]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-[#D7E7E4] min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#0A3340] text-white'
                      : 'text-[#64748B] hover:bg-[#EEF7F5]'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{mod.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderModuleContent()}
        </main>
      </div>

      {/* New Object Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#0A3340]/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-[#D7E7E4] flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0A3340]">
                {editingObject ? 'Edit Business Object' : 'Create Business Object'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-[#0A3340]">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#64748B] mb-1">Name</label>
                    <input
                      type="text"
                      value={newObject.name}
                      onChange={(e) => setNewObject(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] outline-none"
                      placeholder="e.g., Vehicle Rental"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#64748B] mb-1">Category</label>
                    <select
                      value={newObject.category}
                      onChange={(e) => setNewObject(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4] outline-none"
                    >
                      <option value="vehicle">Vehicle</option>
                      <option value="fleet">Fleet</option>
                      <option value="dealer">Dealer</option>
                      <option value="event">Event</option>
                      <option value="support">Support</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#64748B] mb-1">Singular Name</label>
                    <input
                      type="text"
                      value={newObject.singularName}
                      onChange={(e) => setNewObject(prev => ({ ...prev, singularName: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#64748B] mb-1">Plural Name</label>
                    <input
                      type="text"
                      value={newObject.pluralName}
                      onChange={(e) => setNewObject(prev => ({ ...prev, pluralName: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#64748B] mb-1">Description</label>
                  <textarea
                    value={newObject.description}
                    onChange={(e) => setNewObject(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] outline-none resize-none"
                    rows={2}
                  />
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#0A3340]">Fields</h3>
                  <button onClick={addField} className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#0A3340] hover:bg-[#0A3340]/10 rounded-lg">
                    <Plus size={16} />
                    Add Field
                  </button>
                </div>

                <div className="space-y-2">
                  {newObject.fields.map((field, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-[#F6FAF9] rounded-lg">
                      <GripVertical size={16} className="text-[#94A3B8] cursor-move" />
                      <input
                        type="text"
                        value={field.fieldName}
                        onChange={(e) => updateField(i, { fieldName: e.target.value })}
                        className="flex-1 px-3 py-2 rounded border border-[#D7E7E4] text-sm"
                        placeholder="Field name"
                      />
                      <select
                        value={field.fieldType}
                        onChange={(e) => updateField(i, { fieldType: e.target.value })}
                        className="px-3 py-2 rounded border border-[#D7E7E4] text-sm"
                      >
                        {fieldTypes.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-sm text-[#64748B]">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(i, { required: e.target.checked })}
                          className="rounded"
                        />
                        Required
                      </label>
                      <button onClick={() => removeField(i)} className="p-2 hover:bg-red-50 rounded text-red-500">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#D7E7E4] flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
                Cancel
              </button>
              <button onClick={saveObject} className="px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
                {editingObject ? 'Update' : 'Create'} Object
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
