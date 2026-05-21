import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Terminal, 
  CheckCircle, 
  AlertTriangle, 
  Code, 
  FileText, 
  Play, 
  Layers, 
  CheckSquare, 
  TrendingUp, 
  Settings, 
  RefreshCw, 
  Sparkles,
  Clipboard,
  Info,
  Globe,
  Trash2,
  Check,
  Zap,
  BookOpen
} from 'lucide-react';

const apiKey = ""; // Canvas runtime automatically sets up API permissions

// Prebuilt vulnerable/secure mock templates for quick audit tests
const CODE_TEMPLATES = {
  vulnerableJs: `// Vulnerable Node.js / Express Auth Endpoint
const express = require('express');
const router = express.Router();
const db = require('./db');

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // CRITICAL: SQL Injection vulnerability! Direct string concatenation
  const query = "SELECT * FROM users WHERE user = '" + username + "' AND pass = '" + password + "'";
  
  db.query(query, (err, result) => {
    if (err) {
      // WARNING: Leaking internal stack trace
      return res.status(500).send(err.stack); 
    }
    
    if (result.length > 0) {
      // WARNING: Hardcoded session secret keys
      const token = jwt.sign({ id: result[0].id }, "SUPER_KAYAD_SECRET_98765"); 
      res.json({ token });
    } else {
      res.status(401).send("Invalid credentials");
    }
  });
});`,

  pythonSqli: `# Vulnerable Python Command & SQL Execution
import os
import sqlite3

def run_system_diagnostic(user_path, query_param):
    # WARNING: Dangerous OS Command execution risk via input format formatting
    os.system("ls -la " + user_path)
    
    conn = sqlite3.connect('kayad_sys.db')
    cursor = conn.cursor()
    
    # CRITICAL: SQL Injection via unparameterized formatting
    raw_query = f"SELECT log_info FROM logs WHERE severity = '{query_param}'"
    cursor.execute(raw_query)
    return cursor.fetchall()`,

  secureRef: `// Optimized & Secure Reference Core Class
const crypto = require('crypto');

class KayadSecurityEngine {
  constructor(config = {}) {
    // RESOLVED: Safe parameter fallback & dynamic configuration
    this.keyLength = config.keyLength || 32;
    this.saltLength = config.saltLength || 16;
  }

  // RESOLVED: Secure cryptographic key hashing with modern pbkdf2
  async generateSecureHash(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Input must be a valid, sanitized string.');
    }
    
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(this.saltLength).toString('hex');
      crypto.pbkdf2(password, salt, 100000, this.keyLength, 'sha512', (err, derivedKey) => {
        if (err) return reject(err);
        resolve({
          hash: derivedKey.toString('hex'),
          salt: salt
        });
      });
    });
  }
}`
};

export default function App() {
  const [activeTab, setActiveTab] = useState('auditor');
  const [codeContent, setCodeContent] = useState(CODE_TEMPLATES.vulnerableJs);
  const [auditType, setAuditType] = useState('all');
  const [enableGrounding, setEnableGrounding] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [auditResult, setAuditResult] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  
  const [projectMetadata, setProjectMetadata] = useState({
    name: 'KAYAD',
    language: 'JavaScript / Python / Shell',
    env: 'Production / Dev',
    version: '1.0.2'
  });

  const [checklist, setChecklist] = useState({
    security: [
      { id: 'sec-1', text: 'No sensitive credentials or API keys hardcoded in code.', done: false, severity: 'Critical' },
      { id: 'sec-2', text: 'Inputs are strictly validated and parameterized before execution.', done: false, severity: 'High' },
      { id: 'sec-3', text: 'Dependencies are audited and free of critical CVE leaks.', done: false, severity: 'Medium' },
      { id: 'sec-4', text: 'Secure cryptographic systems and salted hashing protocols used.', done: false, severity: 'High' },
      { id: 'sec-5', text: 'Internal stack traces and DB structures are hidden from clients.', done: false, severity: 'Low' },
    ],
    quality: [
      { id: 'qual-1', text: 'Code is highly modularized with strict separation of concerns.', done: false, severity: 'Medium' },
      { id: 'qual-2', text: 'Proper asynchronous try-catch blocks capture system exceptions.', done: false, severity: 'High' },
      { id: 'qual-3', text: 'The repo contains updated and detailed README/documentation guides.', done: false, severity: 'Medium' },
    ],
    performance: [
      { id: 'perf-1', text: 'Stream and DB connections are cleanly closed upon execution.', done: false, severity: 'High' },
      { id: 'perf-2', text: 'Expensive iterations and nested query patterns are indexed.', done: false, severity: 'Medium' },
    ]
  });

  const totalItems = Object.values(checklist).flat().length;
  const completedItems = Object.values(checklist).flat().filter(item => item.done).length;
  const progressPercent = Math.round((completedItems / totalItems) * 100) || 0;

  // Temporary trigger for small toast confirmations
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2500);
  };

  const toggleChecklist = (category, id) => {
    setChecklist(prev => ({
      ...prev,
      [category]: prev[category].map(item => 
        item.id === id ? { ...item, done: !item.done } : item
      )
    }));
  };

  const handleInsertTemplate = (templateKey) => {
    setCodeContent(CODE_TEMPLATES[templateKey]);
    triggerToast(`Inserted ${templateKey === 'vulnerableJs' ? 'JavaScript Vulnerable' : templateKey === 'pythonSqli' ? 'Python SQLi' : 'Secure Core'} template`);
  };

  // Exponential backoff network fetch helper for stability under load
  const makeApiCallWithRetry = async (url, payload, retries = 5, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (err) {
        if (i === retries - 1) throw err;
      }
      await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
    }
    throw new Error('All retry connection attempts failed.');
  };

  const handleAiAudit = async () => {
    setLoading(true);
    setErrorMsg('');
    setAuditResult('');
    
    const steps = [
      'Scanning codebase patterns & parsing statements...',
      'Mapping potential SQL, OS Injection, and XSS attack surfaces...',
      'Consulting modern secure design rules & OWASP guidelines...',
      'Searching public documentation and vulnerabilities via grounding...',
      'Drafting full constructive recommendations...'
    ];

    let stepIdx = 0;
    setLoadingStep(steps[stepIdx]);
    const stepInterval = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        stepIdx++;
        setLoadingStep(steps[stepIdx]);
      }
    }, 1800);

    const systemPrompt = `You are a world-class principal DevSecOps Security Auditor and Senior Software Architect.
Provide an extremely thorough, expert-grade security audit report of the project ${projectMetadata.name}.
Focus on:
1. Critical & Major Vulnerabilities (e.g., Command injection, SQL Injection, Hardcoded secrets, bad sanitization).
2. Architectural standards (modularity, error logging safety, separation of concerns).
3. Performance constraints (connection handling, database structures, optimizations).

Your output MUST be a structured, comprehensive Markdown report with:
- An overall 'Audit Security Score' prominently displayed at the start (e.g. GRADE: A, B, C, D, or F with a short summary).
- Structured headings, tables, bullet items, and warnings.
- Code blocks showing standard 'VULNERABLE PATTERN' alongside 'CORRECTED REFACTOR FIX'.
- Provide steps on how the user can test or verify the resolution of these faults.`;

    const userPrompt = `Project Name: ${projectMetadata.name}
Language/Stack: ${projectMetadata.language}
Target Environment: ${projectMetadata.env}
Vulnerability Audit Focus: ${auditType}
Web Search Grounding Enabled: ${enableGrounding ? 'Yes' : 'No'}

Please audit the following codebase snippet/details. Search public standards or look up GitHub repo reference issues if related to public projects or standard APIs:
\`\`\`
${codeContent}
\`\`\`

Provide the complete review report.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      };

      if (enableGrounding) {
        payload.tools = [{ "google_search": {} }];
      }

      const result = await makeApiCallWithRetry(url, payload);
      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (textResponse) {
        setAuditResult(textResponse);
        triggerToast("AI Code Audit completed successfully!");
      } else {
        throw new Error("Could not parse output response from Gemini Engine.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred during the API query. Ensure your code is valid and connection is active. (No external API keys are required in canvas environment)");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
      setLoadingStep('');
    }
  };

  const renderAuditReport = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeLines = [];
    let codeLang = '';

    return lines.map((line, idx) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          const currentCode = codeLines.join('\n');
          codeLines = [];
          return (
            <div key={idx} className="my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs shadow-inner">
              <div className="bg-slate-900 px-4 py-2 flex justify-between items-center border-b border-slate-800 text-slate-400">
                <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">{codeLang || 'Refactored Code'}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(currentCode);
                    triggerToast("Code copied to clipboard!");
                  }}
                  className="hover:text-slate-200 text-[10px] transition-colors flex items-center gap-1 bg-slate-850 px-2 py-0.5 rounded border border-slate-700/80"
                >
                  <Clipboard className="w-3 h-3" />
                  Copy Block
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-emerald-400 font-mono leading-relaxed select-text"><code>{currentCode}</code></pre>
            </div>
          );
        } else {
          inCodeBlock = true;
          codeLang = line.slice(3).trim();
          return null;
        }
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return null;
      }

      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-black text-white mt-6 mb-4 tracking-tight border-b border-slate-800 pb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-400" /> {line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-xl font-extrabold text-slate-100 mt-5 mb-3 border-l-4 border-indigo-600 pl-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-bold text-indigo-300 mt-4 mb-2">{line.slice(4)}</h3>;
      }

      if (line.startsWith('- ') || line.startsWith('* ')) {
        const cleanLine = line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1');
        return (
          <li key={idx} className="ml-5 list-disc text-slate-300 my-1.5 leading-relaxed">
            {cleanLine}
          </li>
        );
      }

      if (line.trim() === '') return <div key={idx} className="h-2" />;

      let content = line;
      const isCritical = line.toLowerCase().includes('critical:') || line.toLowerCase().includes('vulnerability:') || line.toLowerCase().includes('security:');
      
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="text-indigo-200 font-bold bg-indigo-950/40 px-1 py-0.5 rounded">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      return (
        <p key={idx} className={`text-sm my-2 leading-relaxed text-slate-300 ${isCritical ? 'border-l-4 border-rose-500 pl-3 py-1.5 bg-rose-950/15 my-3 rounded-r-md' : ''}`}>
          {parts.length > 0 ? parts : content}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500/30 selection:text-white">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-indigo-600 text-white font-medium px-4 py-2.5 rounded-xl shadow-2xl border border-indigo-500 flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-300" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-700 to-violet-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400/20">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-wider text-white">KAYAD</span>
              <span className="text-xs bg-indigo-500/15 text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-500/30">AUDITOR ENGINE</span>
            </div>
            <p className="text-xs text-slate-400">Collaborative Code Auditing & Architecture Evaluation Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 max-w-sm w-full sm:w-auto">
          <div className="hidden sm:block">
            <div className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Manual Readiness</div>
            <div className="text-right text-sm font-bold text-emerald-400">{progressPercent}% Checked</div>
          </div>
          <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row">
        <nav className="w-full lg:w-64 bg-slate-900/40 lg:border-r border-slate-800 p-4 space-y-2 flex flex-row lg:flex-col justify-start lg:justify-start gap-1 overflow-x-auto lg:overflow-x-visible shrink-0">
          <button 
            onClick={() => setActiveTab('auditor')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full min-w-[130px] lg:min-w-0 whitespace-nowrap ${activeTab === 'auditor' ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/5' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            AI Code Auditor
          </button>
          
          <button 
            onClick={() => setActiveTab('checklists')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full min-w-[130px] lg:min-w-0 whitespace-nowrap ${activeTab === 'checklists' ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/5' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            Vulnerability Checklist
          </button>

          <button 
            onClick={() => setActiveTab('parameters')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full min-w-[130px] lg:min-w-0 whitespace-nowrap ${activeTab === 'parameters' ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/5' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
          >
            <Settings className="w-4 h-4 text-amber-400" />
            Project Settings
          </button>
          
          <div className="hidden lg:block pt-6 border-t border-slate-800 mt-6 space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-4">Audit Tips</h4>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-2.5">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>Toggle the web search module to ground findings in current CVE libraries.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Paste partial file streams, config values, or complete models.</span>
              </div>
            </div>
          </div>
        </nav>

        <section className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'auditor' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 p-6 rounded-2xl border border-slate-800 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                      Gemini Real-Time Repository Auditor
                    </h2>
                    <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                      Since your GitHub repo is currently secure or private, you can paste files or configurations directly below. We run full architectural and vulnerability audits using advanced Gemini model tooling.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-300 bg-indigo-900/40 px-3 py-1.5 rounded-lg border border-indigo-700/50 font-mono flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> Target: {projectMetadata.name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Test Drive Vulnerability Templates:</span>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleInsertTemplate('vulnerableJs')}
                    className="text-xs bg-slate-800 hover:bg-slate-700/80 text-rose-300 border border-rose-500/20 hover:border-rose-500/40 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    🚨 Vulnerable JS Auth
                  </button>
                  <button 
                    onClick={() => handleInsertTemplate('pythonSqli')}
                    className="text-xs bg-slate-800 hover:bg-slate-700/80 text-amber-300 border border-amber-500/20 hover:border-amber-500/40 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    🐍 Python SQLi / OS command
                  </button>
                  <button 
                    onClick={() => handleInsertTemplate('secureRef')}
                    className="text-xs bg-slate-800 hover:bg-slate-700/80 text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    🛡️ Secure Core Utility
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-6 space-y-4">
                  <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-[580px] shadow-lg">
                    <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm font-semibold text-slate-200">Source Files or Structure Definition</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCodeContent('');
                            triggerToast("Cleared Editor");
                          }}
                          className="p-1 hover:text-rose-400 text-slate-400 transition-colors"
                          title="Clear all text"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <select 
                          value={auditType} 
                          onChange={(e) => setAuditType(e.target.value)}
                          className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                        >
                          <option value="all">Full Structural Audit</option>
                          <option value="security">Security Vulnerabilities</option>
                          <option value="architecture">Architectural Assessment</option>
                          <option value="performance">Performance & Scalability</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex-1 relative">
                      <textarea
                        value={codeContent}
                        onChange={(e) => setCodeContent(e.target.value)}
                        className="w-full h-full bg-slate-950/80 text-slate-300 p-4 font-mono text-xs leading-relaxed focus:outline-none resize-none border-none placeholder-slate-600 selection:bg-indigo-500/30"
                        placeholder="Paste your source files, requirements, structure tree, or active packages here to evaluate..."
                      />
                    </div>

                    <div className="bg-slate-900/60 px-4 py-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={enableGrounding} 
                            onChange={(e) => setEnableGrounding(e.target.checked)}
                            className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer" 
                          />
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-indigo-400" /> Enable Web Search Grounding
                          </span>
                        </label>
                      </div>

                      <button
                        onClick={handleAiAudit}
                        disabled={loading || !codeContent}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/15"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Compiling Audit...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-indigo-200" />
                            <span>Launch AI Audit</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-6 space-y-4">
                  <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-[580px] shadow-lg">
                    <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-semibold text-slate-200">Interactive Security Audit Assessment</span>
                      </div>
                      {auditResult && (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(auditResult);
                            triggerToast("Markdown report copied to clipboard!");
                          }}
                          className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700/80 transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Clipboard className="w-3 h-3" />
                          Copy Report
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 bg-slate-950/40 select-text">
                      {loading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
                            <Shield className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-200">Executing Deep Analysis</p>
                            <p className="text-xs text-indigo-400 mt-1.5 animate-pulse font-mono">{loadingStep}</p>
                          </div>
                        </div>
                      ) : errorMsg ? (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-300 text-sm">
                          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Audit Interrupted</span>
                            <span>{errorMsg}</span>
                          </div>
                        </div>
                      ) : auditResult ? (
                        <div className="space-y-3">
                          {renderAuditReport(auditResult)}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                          <div className="bg-slate-900 p-4 rounded-full border border-slate-800 text-slate-500">
                            <FileText className="w-8 h-8" />
                          </div>
                          <div className="max-w-sm">
                            <h3 className="text-sm font-semibold text-slate-200">No active report compiled</h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                              Configure project credentials or load template files above, then select <span className="text-indigo-400 font-semibold">Launch AI Audit</span>.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80">
                <h3 className="font-bold text-white text-md mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Codebase Security Standards Guide
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 block mb-1">Critical Fault Detection</span>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Catches dangerous code evaluations, shell script executions with unvalidated parameters, and weak authentication schemes.
                    </p>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block mb-1">State & Connection Design</span>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Ensures proper scoping, asynchronous error handling, closed system sockets, and secure local memory configuration.
                    </p>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 block mb-1">Best-Practice Execution</span>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Aligns repository configuration with OWASP and static lint parameters, optimizing production containers for high scaling.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'checklists' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">Repository Safety Checklist</h2>
                    <p className="text-sm text-slate-400 mt-1">Cross off verified tasks or standard configuration setups in KAYAD to record structural compliance.</p>
                  </div>
                  <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-slate-200">{completedItems} of {totalItems} Guidelines Checked</span>
                  </div>
                </div>
              </div>

              {Object.keys(checklist).map(category => (
                <div key={category} className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden shadow-md">
                  <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      {category === 'security' && '🔒 Critical Security Configurations'}
                      {category === 'quality' && '⭐ Code Quality & Architecture Guides'}
                      {category === 'performance' && '⚡ High-Performance Resource Tuning'}
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-800/60">
                    {checklist[category].map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => toggleChecklist(category, item.id)}
                        className="p-4 flex items-start gap-4 hover:bg-slate-900/30 transition-all cursor-pointer"
                      >
                        <div className="mt-1 shrink-0">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${item.done ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-950/80'}`}>
                            {item.done && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <span className={`text-sm ${item.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                            {item.text}
                          </span>
                          <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded uppercase tracking-widest text-center shrink-0 w-24 border ${
                            item.severity === 'Critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            item.severity === 'High' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            item.severity === 'Medium' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                            'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {item.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'parameters' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
                <h2 className="text-lg font-bold text-white mb-4">Project Parameters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Project / Repo Name</label>
                    <input 
                      type="text" 
                      value={projectMetadata.name}
                      onChange={(e) => setProjectMetadata({...projectMetadata, name: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Engine Stack</label>
                    <input 
                      type="text" 
                      value={projectMetadata.language}
                      onChange={(e) => setProjectMetadata({...projectMetadata, language: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Environment Class</label>
                    <input 
                      type="text" 
                      value={projectMetadata.env}
                      onChange={(e) => setProjectMetadata({...projectMetadata, env: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Build Revision</label>
                    <input 
                      type="text" 
                      value={projectMetadata.version}
                      onChange={(e) => setProjectMetadata({...projectMetadata, version: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 text-sm space-y-2.5">
                <span className="font-bold text-white block flex items-center gap-1.5 text-indigo-300">
                  <Zap className="w-4 h-4" /> Tuning AI Performance Contexts
                </span>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Refining these settings helps the model contextualize your environment constraints during audits. It uses this context to suggest tailor-fit solutions specific to your deployment architecture (e.g. producing secure Node.js queries, safe subprocess parameters in Python, or lightweight shell scripts).
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div>
          <span>KAYAD Code Review & Safety Advisor Platform</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Gemini 3.1 Live Grounding Engine Active
          </span>
        </div>
      </footer>
    </div>
  );
}