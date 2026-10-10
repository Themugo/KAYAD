import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen, Upload, Search, Filter, Grid, List, MoreVertical,
  Image, Film, FileText, Music, Archive, Trash2, Edit, Copy,
  Download, Eye, CheckSquare, Square, X, Plus, ChevronDown, Tag,
  FolderPlus, RefreshCw, ImageIcon, Maximize2, ZoomIn
} from 'lucide-react';
import * as cmsApi from '../../../../services/cmsApi';

// Design System Colors
const colors = {
  navy: '#0A3340',
  beige: '#EEF7F5',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#5aafa4',
  softBlue: '#5AAFA4',
};

const mediaTypes = [
  { id: 'all', label: 'All Files', icon: FolderOpen },
  { id: 'image', label: 'Images', icon: Image },
  { id: 'video', label: 'Videos', icon: Film },
  { id: 'document', label: 'Documents', icon: FileText },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'archive', label: 'Archives', icon: Archive },
];

const mediaSeed = [];

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function MediaLibrary() {
  const [media, setMedia] = useState(mediaSeed);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [folders] = useState(['/', 'banners', 'vehicles', 'dealers', 'campaigns', 'legal']);
  const [currentFolder, setCurrentFolder] = useState('/');
  const [draggedItem, setDraggedItem] = useState(null);

  const filteredMedia = media.filter(item => {
    if (selectedType !== 'all' && item.mediaType !== selectedType) return false;
    if (searchQuery && !item.filename.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    if (currentFolder !== '/' && !item.folder) return false;
    return true;
  });

  const toggleSelect = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === filteredMedia.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredMedia.map(m => m.id));
    }
  };

  const getMediaIcon = (type) => {
    const icons = {
      image: Image,
      video: Film,
      document: FileText,
      audio: Music,
      archive: Archive,
    };
    return icons[type] || Image;
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
                  <FolderOpen size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#0A3340]">Media Library</h1>
                  <p className="text-xs text-[#64748B]">{media.length} files • {formatFileSize(media.reduce((acc, m) => acc + m.size, 0))} used</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D] transition-colors"
              >
                <Upload size={18} />
                Upload Files
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Folders */}
        <aside className="w-64 bg-white border-r border-[#D7E7E4] min-h-[calc(100vh-73px)] p-4">
          <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Folders</h3>
          <nav className="space-y-1">
            <button
              onClick={() => setCurrentFolder('/')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${currentFolder === '/' ? 'bg-[#0A3340] text-white' : 'text-[#64748B] hover:bg-[#EEF7F5]'}`}
            >
              <FolderOpen size={16} />
              All Media
            </button>
            {folders.filter(f => f !== '/').map(folder => (
              <button
                key={folder}
                onClick={() => setCurrentFolder(folder)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${currentFolder === folder ? 'bg-[#0A3340] text-white' : 'text-[#64748B] hover:bg-[#EEF7F5]'}`}
              >
                <FolderOpen size={16} />
                <span className="capitalize">{folder}</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 pt-6 border-t border-[#D7E7E4]">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#64748B] hover:text-[#0A3340] transition-colors">
              <FolderPlus size={16} />
              New Folder
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-white rounded-lg border border-[#D7E7E4] p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#EEF7F5]' : 'hover:bg-[#F6FAF9]'}`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#EEF7F5]' : 'hover:bg-[#F6FAF9]'}`}
                >
                  <List size={16} />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] focus:ring-2 focus:ring-[#0A3340]/20 outline-none w-64"
                />
              </div>

              {selectedItems.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <span>{selectedItems.length} selected</span>
                  <button
                    onClick={() => setSelectedItems([])}
                    className="p-1 hover:bg-[#EEF7F5] rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedItems.length > 0 && (
                <>
                  <button className="flex items-center gap-2 px-3 py-2 text-sm text-[#64748B] hover:bg-[#EEF7F5] rounded-lg">
                    <Download size={16} />
                    Download
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                    Delete
                  </button>
                </>
              )}
              <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <RefreshCw size={18} className="text-[#64748B]" />
              </button>
            </div>
          </div>

          {/* Media Type Tabs */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {mediaTypes.map(type => {
              const Icon = type.icon;
              const count = type.id === 'all' ? media.length : media.filter(m => m.mediaType === type.id).length;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedType === type.id ? 'bg-[#0A3340] text-white' : 'bg-white border border-[#D7E7E4] text-[#64748B] hover:border-[#0A3340]'}`}
                >
                  <Icon size={16} />
                  {type.label}
                  <span className={`px-1.5 py-0.5 rounded text-xs ${selectedType === type.id ? 'bg-white/20' : 'bg-[#EEF7F5]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Media Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredMedia.map(item => {
                const Icon = getMediaIcon(item.mediaType);
                const isSelected = selectedItems.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`group relative bg-white rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${isSelected ? 'border-[#0A3340]' : 'border-transparent hover:border-[#D7E7E4]'}`}
                    onClick={() => setSelectedMedia(item)}
                  >
                    <div className="aspect-square bg-[#EEF7F5] flex items-center justify-center">
                      {item.mediaType === 'image' && item.url !== '#' ? (
                        <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                      ) : (
                        <Icon size={32} className="text-[#94A3B8]" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-[#0A3340] truncate">{item.filename}</p>
                      <p className="text-xs text-[#94A3B8]">{formatFileSize(item.size)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                      className={`absolute top-2 left-2 p-1 rounded transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                      {isSelected ? (
                        <div className="w-5 h-5 bg-[#0A3340] rounded flex items-center justify-center">
                          <CheckSquare size={14} className="text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 bg-white rounded border border-[#BDE5DE] flex items-center justify-center">
                          <Square size={14} className="text-[#94A3B8]" />
                        </div>
                      )}
                    </button>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 bg-white rounded shadow hover:bg-[#F6FAF9]">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#D7E7E4] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F6FAF9] border-b border-[#D7E7E4]">
                    <th className="px-4 py-3 text-left">
                      <button onClick={selectAll} className="text-[#94A3B8] hover:text-[#64748B]">
                        {selectedItems.length === filteredMedia.length ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">File</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">Uploaded</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7E7E4]">
                  {filteredMedia.map(item => {
                    const Icon = getMediaIcon(item.mediaType);
                    const isSelected = selectedItems.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-[#F6FAF9] cursor-pointer ${isSelected ? 'bg-[#0A3340]/5' : ''}`}
                        onClick={() => setSelectedMedia(item)}
                      >
                        <td className="px-4 py-3">
                          <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}>
                            {isSelected ? <CheckSquare size={16} className="text-[#0A3340]" /> : <Square size={16} className="text-[#94A3B8]" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-[#EEF7F5] flex items-center justify-center overflow-hidden">
                              {item.mediaType === 'image' && item.url !== '#' ? (
                                <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                              ) : (
                                <Icon size={20} className="text-[#94A3B8]" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#0A3340]">{item.filename}</p>
                              <p className="text-xs text-[#94A3B8]">{item.tags.join(', ')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#64748B] capitalize">{item.mediaType}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{formatFileSize(item.size)}</td>
                        <td className="px-4 py-3 text-sm text-[#64748B]">{formatDate(item.uploadedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-1.5 rounded hover:bg-[#EEF7F5]" title="Preview">
                              <Eye size={14} />
                            </button>
                            <button className="p-1.5 rounded hover:bg-[#EEF7F5]" title="Edit">
                              <Edit size={14} />
                            </button>
                            <button className="p-1.5 rounded hover:bg-[#EEF7F5]" title="Copy URL">
                              <Copy size={14} />
                            </button>
                            <button className="p-1.5 rounded hover:bg-red-50 text-[#94A3B8] hover:text-red-500" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-[#0A3340]/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#0A3340]">Upload Files</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="border-2 border-dashed border-[#BDE5DE] rounded-xl p-12 text-center hover:border-[#0A3340] transition-colors cursor-pointer">
              <Upload size={48} className="mx-auto text-[#BDE5DE] mb-4" />
              <p className="text-lg font-medium text-[#12576D] mb-2">Drop files here or click to upload</p>
              <p className="text-sm text-[#64748B]">Supports: JPG, PNG, GIF, SVG, MP4, PDF (max 50MB)</p>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <select className="flex-1 px-4 py-2 rounded-lg border border-[#D7E7E4] text-sm">
                <option value="/">Root Folder</option>
                {folders.filter(f => f !== '/').map(folder => (
                  <option key={folder} value={folder}>{folder}</option>
                ))}
              </select>
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Detail Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-[#0A3340]/50 flex items-center justify-center z-50" onClick={() => setSelectedMedia(null)}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#D7E7E4]">
              <h3 className="font-semibold text-[#0A3340]">{selectedMedia.filename}</h3>
              <button onClick={() => setSelectedMedia(null)} className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="flex">
              <div className="flex-1 bg-[#0A3340] flex items-center justify-center p-8" style={{ minHeight: '400px' }}>
                {selectedMedia.mediaType === 'image' && selectedMedia.url !== '#' ? (
                  <img src={selectedMedia.url} alt={selectedMedia.filename} className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-white text-center">
                    <Maximize2 size={64} className="mx-auto mb-4 opacity-50" />
                    <p>Preview not available</p>
                  </div>
                )}
              </div>
              <div className="w-80 p-4 border-l border-[#D7E7E4] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">Filename</label>
                    <p className="text-sm text-[#0A3340]">{selectedMedia.filename}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">File Type</label>
                    <p className="text-sm text-[#0A3340] capitalize">{selectedMedia.mediaType}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">File Size</label>
                    <p className="text-sm text-[#0A3340]">{formatFileSize(selectedMedia.size)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">Uploaded</label>
                    <p className="text-sm text-[#0A3340]">{formatDate(selectedMedia.uploadedAt)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">Tags</label>
                    <div className="flex flex-wrap gap-1">
                      {selectedMedia.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-[#EEF7F5] rounded text-xs text-[#64748B]">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">URL</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={selectedMedia.url}
                        className="flex-1 px-3 py-2 text-xs bg-[#F6FAF9] rounded border border-[#D7E7E4]"
                      />
                      <button className="p-2 bg-[#EEF7F5] rounded hover:bg-[#DDF4F0]">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-6 pt-4 border-t border-[#D7E7E4]">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D] text-sm">
                    <Edit size={14} />
                    Edit
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9] text-sm">
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
