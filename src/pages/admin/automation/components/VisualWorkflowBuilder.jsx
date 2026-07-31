import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Play, Pause, Save, Plus, Trash2, Copy, GripVertical, Settings,
  ChevronDown, Search, Monitor, Tablet, Smartphone, Undo, Redo,
  ZoomIn, ZoomOut, Grid3X3, ArrowRight, CheckCircle, XCircle,
  Mail, MessageSquare, Bell, Clock, Webhook, Database, Code,
  UserPlus, CheckSquare, ArrowUpCircle, GitBranch, Eye, FlaskConical,
  FileText, Users, AlertTriangle, RefreshCw, Check, X
} from 'lucide-react';

// Design System Colors
const colors = {
  navy: '#17244B',
  beige: '#F6F1E8',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#C77B58',
  softBlue: '#60A5FA',
};

// Node Types with Icons and Default Config
const nodeTypes = [
  {
    category: 'Flow Control',
    nodes: [
      { type: 'start', label: 'Start', icon: Play, color: colors.emerald, defaultData: {} },
      { type: 'end', label: 'End', icon: XCircle, color: colors.mutedCrimson, defaultData: {} },
      { type: 'condition', label: 'Condition', icon: GitBranch, color: colors.softBlue, defaultData: { field: '', operator: 'equals', value: '' } },
      { type: 'delay', label: 'Delay', icon: Clock, color: colors.mutedOrange, defaultData: { duration: 60, unit: 'seconds' } },
    ]
  },
  {
    category: 'Actions',
    nodes: [
      { type: 'notification_email', label: 'Email', icon: Mail, color: colors.navy, defaultData: { template: '', recipient: '' } },
      { type: 'notification_sms', label: 'SMS', icon: MessageSquare, color: colors.terracotta, defaultData: { template: '', recipient: '' } },
      { type: 'notification_push', label: 'Push', icon: Bell, color: colors.mutedOrange, defaultData: { title: '', body: '' } },
      { type: 'task_create', label: 'Create Task', icon: CheckSquare, color: '#8B5CF6', defaultData: { title: '', assignee: '', priority: 'medium' } },
      { type: 'task_assign', label: 'Assign Task', icon: UserPlus, color: '#06B6D4', defaultData: { assignee: '' } },
      { type: 'approval_request', label: 'Request Approval', icon: CheckCircle, color: colors.emerald, defaultData: { approverRole: '', priority: 'medium' } },
    ]
  },
  {
    category: 'Integrations',
    nodes: [
      { type: 'webhook', label: 'Webhook', icon: Webhook, color: '#A855F7', defaultData: { url: '', method: 'POST' } },
      { type: 'api_call', label: 'API Call', icon: Code, color: colors.navy, defaultData: { endpoint: '', method: 'GET' } },
      { type: 'database_update', label: 'Database', icon: Database, color: colors.softBlue, defaultData: { table: '', operation: 'update' } },
    ]
  },
  {
    category: 'KAYAD Specific',
    nodes: [
      { type: 'dealer_suspend', label: 'Suspend Dealer', icon: Users, color: colors.mutedCrimson, defaultData: { reason: '' } },
      { type: 'dealer_activate', label: 'Activate Dealer', icon: CheckCircle, color: colors.emerald, defaultData: {} },
      { type: 'listing_update', label: 'Update Listing', icon: FileText, color: colors.softBlue, defaultData: { field: '', value: '' } },
      { type: 'listing_archive', label: 'Archive Listing', icon: RefreshCw, color: colors.mutedOrange, defaultData: {} },
      { type: 'listing_hide', label: 'Hide Listing', icon: Eye, color: colors.mutedCrimson, defaultData: { reason: '' } },
      { type: 'escalate', label: 'Escalate', icon: ArrowUpCircle, color: '#EC4899', defaultData: { level: 1, reason: '' } },
    ]
  },
];

// Node Component
const WorkflowNode = ({ node, isSelected, onSelect, onDelete, canvasOffset }) => {
  const nodeDef = nodeTypes.flatMap(c => c.nodes).find(n => n.type === node.type);
  const Icon = nodeDef?.icon || FileText;
  const color = nodeDef?.color || colors.navy;

  return (
    <div
      className={`absolute w-48 bg-white rounded-xl shadow-lg border-2 cursor-move transition-all ${
        isSelected ? 'border-[#17244B] ring-2 ring-[#17244B]/20' : 'border-slate-200 hover:border-slate-300'
      }`}
      style={{
        left: node.position?.x || 100,
        top: node.position?.y || 100,
        zIndex: isSelected ? 100 : 10,
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-xl" style={{ backgroundColor: `${color}15` }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{nodeDef?.label || node.type}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
          className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={14} className="text-red-500" />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        {node.data && Object.keys(node.data).length > 0 ? (
          <div className="space-y-1 text-xs text-slate-500">
            {Object.entries(node.data).slice(0, 2).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="capitalize">{key}:</span>
                <span className="text-slate-700 truncate">{String(value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Click to configure</p>
        )}
      </div>

      {/* Connection Points */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-300 hover:border-[#17244B] cursor-crosshair" />
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-300 hover:border-[#17244B] cursor-crosshair" />
    </div>
  );
};

// Edge Component
const WorkflowEdge = ({ edge, nodes }) => {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);

  if (!sourceNode || !targetNode) return null;

  const sourceX = (sourceNode.position?.x || 0) + 192;
  const sourceY = (sourceNode.position?.y || 0) + 40;
  const targetX = targetNode.position?.x || 0;
  const targetY = (targetNode.position?.y || 0) + 40;

  const midX = (sourceX + targetX) / 2;

  return (
    <g>
      <path
        d={`M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`}
        fill="none"
        stroke={edge.condition ? colors.mutedOrange : colors.softBlue}
        strokeWidth={2}
        strokeDasharray={edge.condition ? '5,5' : 'none'}
        markerEnd={`url(#arrowhead-${edge.condition ? 'condition' : 'default'})`}
      />
      <defs>
        <marker id="arrowhead-default" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={colors.softBlue} />
        </marker>
        <marker id="arrowhead-condition" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={colors.mutedOrange} />
        </marker>
      </defs>
      {edge.condition && (
        <foreignObject
          x={midX - 50}
          y={(sourceY + targetY) / 2 - 12}
          width="100"
          height="24"
          className="overflow-visible"
        >
          <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs text-amber-700 text-center">
            {edge.condition}
          </div>
        </foreignObject>
      )}
    </g>
  );
};

export default function VisualWorkflowBuilder() {
  const [nodes, setNodes] = useState([
    { id: 'start', type: 'start', position: { x: 100, y: 200 }, data: {} },
    { id: 'end', type: 'end', position: { x: 800, y: 200 }, data: {} },
  ]);
  const [edges, setEdges] = useState([
    { id: 'e1', source: 'start', target: 'end' }
  ]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [canvasRef, setCanvasRef] = useState(null);
  const [history, setHistory] = useState([{ nodes: [], edges: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [searchNodes, setSearchNodes] = useState('');
  const [showNodePanel, setShowNodePanel] = useState(true);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [showSimulation, setShowSimulation] = useState(false);

  const filteredNodes = nodeTypes.map(category => ({
    ...category,
    nodes: category.nodes.filter(node =>
      node.label.toLowerCase().includes(searchNodes.toLowerCase())
    )
  })).filter(category => category.nodes.length > 0);

  const addNode = (nodeType) => {
    const nodeDef = nodeTypes.flatMap(c => c.nodes).find(n => n.type === nodeType);
    const newNode = {
      id: `${nodeType}_${Date.now()}`,
      type: nodeType,
      position: { x: 400, y: 200 },
      data: { ...nodeDef.defaultData },
    };
    saveToHistory();
    setNodes([...nodes, newNode]);
  };

  const deleteNode = (nodeId) => {
    if (nodeId === 'start' || nodeId === 'end') return;
    saveToHistory();
    setNodes(nodes.filter(n => n.id !== nodeId));
    setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
  };

  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDraggedNode(nodeId);
    setDragOffset({
      x: e.clientX - (node.position?.x || 0),
      y: e.clientY - (node.position?.y || 0),
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (draggedNode && canvasRef) {
      const rect = canvasRef.getBoundingClientRect();
      const newX = (e.clientX - dragOffset.x - rect.left) / zoom;
      const newY = (e.clientY - dragOffset.y - rect.top) / zoom;

      setNodes(nodes.map(n =>
        n.id === draggedNode
          ? { ...n, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }
          : n
      ));
    } else if (isDraggingCanvas) {
      setPanOffset(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    }
  }, [draggedNode, dragOffset, isDraggingCanvas, zoom, nodes, canvasRef]);

  const handleMouseUp = useCallback(() => {
    if (draggedNode) {
      saveToHistory();
    }
    setDraggedNode(null);
    setIsDraggingCanvas(false);
  }, [draggedNode]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const saveToHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setNodes(prev.nodes);
      setEdges(prev.edges);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setNodes(next.nodes);
      setEdges(next.edges);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const simulate = () => {
    setShowSimulation(true);
    // In real implementation, this would call the API
  };

  return (
    <div className="flex h-screen bg-[#F6F1E8]">
      {/* Node Library Panel */}
      {showNodePanel && (
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Node Library</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchNodes}
                onChange={(e) => setSearchNodes(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {filteredNodes.map((category) => (
              <div key={category.category}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.nodes.map((node) => {
                    const Icon = node.icon;
                    return (
                      <button
                        key={node.type}
                        onClick={() => addNode(node.type)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-[#17244B] hover:bg-[#17244B]/5 transition-all text-left"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${node.color}20` }}>
                          <Icon size={16} style={{ color: node.color }} />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{node.label}</span>
                        <Plus size={14} className="ml-auto text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Canvas */}
      <main className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30"
              title="Undo"
            >
              <Undo size={18} />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30"
              title="Redo"
            >
              <Redo size={18} />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-2" />
            <button
              onClick={() => setShowNodePanel(!showNodePanel)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showNodePanel ? 'bg-[#17244B] text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Nodes
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-2 rounded hover:bg-white">
                <ZoomOut size={16} />
              </button>
              <span className="text-sm px-2">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="p-2 rounded hover:bg-white">
                <ZoomIn size={16} />
              </button>
            </div>
            <button onClick={() => setZoom(1)} className="p-2 rounded-lg hover:bg-slate-100" title="Reset zoom">
              <Grid3X3 size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={simulate}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium"
            >
              <FlaskConical size={16} />
              Simulate
            </button>
            <button className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium">
              <Eye size={16} />
              Preview
            </button>
            <button className="px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054] flex items-center gap-2 text-sm font-medium">
              <Save size={16} />
              Save Workflow
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div
          ref={setCanvasRef}
          className="flex-1 overflow-hidden relative cursor-grab"
          style={{
            backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
          }}
          onMouseDown={() => setIsDraggingCanvas(true)}
          onClick={() => setSelectedNode(null)}
        >
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})` }}
          >
            {edges.map((edge) => (
              <WorkflowEdge key={edge.id} edge={edge} nodes={nodes} />
            ))}
          </svg>

          <div
            className="absolute inset-0"
            style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
          >
            {nodes.map((node) => (
              <div
                key={node.id}
                className="group"
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              >
                <WorkflowNode
                  node={node}
                  isSelected={selectedNode === node.id}
                  onSelect={setSelectedNode}
                  onDelete={deleteNode}
                />
              </div>
            ))}
          </div>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <GitBranch size={64} className="mx-auto text-slate-300 mb-4" />
                <p className="text-lg font-medium text-slate-500 mb-2">Start Building Your Workflow</p>
                <p className="text-sm text-slate-400">Click on nodes from the left panel to add them</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Properties Panel */}
      {selectedNode && (
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Node Properties</h2>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 rounded hover:bg-slate-100"
            >
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {(() => {
              const node = nodes.find(n => n.id === selectedNode);
              const nodeDef = nodeTypes.flatMap(c => c.nodes).find(n => n.type === node?.type);
              if (!node || !nodeDef) return null;

              return (
                <>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${nodeDef.color}20` }}>
                        <nodeDef.icon size={20} style={{ color: nodeDef.color }} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{nodeDef.label}</p>
                        <p className="text-xs text-slate-500">ID: {node.id}</p>
                      </div>
                    </div>
                  </div>

                  {node.type === 'start' || node.type === 'end' ? (
                    <p className="text-sm text-slate-500">No configuration needed</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(node.data || {}).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-slate-600 mb-1 capitalize">
                            {key.replace(/_/g, ' ')}
                          </label>
                          {typeof value === 'string' ? (
                            key === 'template' || key === 'description' ? (
                              <textarea
                                value={value}
                                onChange={(e) => {
                                  setNodes(nodes.map(n =>
                                    n.id === selectedNode
                                      ? { ...n, data: { ...n.data, [key]: e.target.value } }
                                      : n
                                  ));
                                }}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none"
                                rows={3}
                              />
                            ) : (
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => {
                                  setNodes(nodes.map(n =>
                                    n.id === selectedNode
                                      ? { ...n, data: { ...n.data, [key]: e.target.value } }
                                      : n
                                  ));
                                }}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                              />
                            )
                          ) : typeof value === 'number' ? (
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => {
                                setNodes(nodes.map(n =>
                                  n.id === selectedNode
                                    ? { ...n, data: { ...n.data, [key]: parseInt(e.target.value) } }
                                    : n
                                ));
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                            />
                          ) : typeof value === 'boolean' ? (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={(e) => {
                                  setNodes(nodes.map(n =>
                                    n.id === selectedNode
                                      ? { ...n, data: { ...n.data, [key]: e.target.checked } }
                                      : n
                                  ));
                                }}
                                className="rounded border-slate-300"
                              />
                              <span className="text-sm text-slate-500">{value ? 'Enabled' : 'Disabled'}</span>
                            </label>
                          ) : (
                            <select
                              value={value}
                              onChange={(e) => {
                                setNodes(nodes.map(n =>
                                  n.id === selectedNode
                                    ? { ...n, data: { ...n.data, [key]: e.target.value } }
                                    : n
                                ));
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {node.type !== 'start' && node.type !== 'end' && (
                    <div className="pt-4 border-t border-slate-100">
                      <button
                        onClick={() => deleteNode(node.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                        Delete Node
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </aside>
      )}

      {/* Simulation Modal */}
      {showSimulation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Workflow Simulation</h2>
              <button onClick={() => setShowSimulation(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={20} className="text-emerald-600" />
                  <span className="font-medium text-emerald-800">Simulation Complete</span>
                </div>
                <p className="text-sm text-emerald-700">
                  All conditions would resolve successfully. Estimated execution time: 3.5 seconds.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Execution Path</h3>
                <div className="space-y-2">
                  {['Start → Email Notification → Approval → End'].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium">{i + 1}</span>
                      <span className="text-slate-600">{step}</span>
                      <ArrowRight size={14} className="text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Warnings</h3>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  No warnings detected
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Possible Outcomes</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'Complete', probability: 85 },
                    { name: 'Needs Approval', probability: 10 },
                    { name: 'Failed', probability: 5 },
                  ].map((outcome, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-slate-800">{outcome.probability}%</div>
                      <div className="text-xs text-slate-500">{outcome.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
