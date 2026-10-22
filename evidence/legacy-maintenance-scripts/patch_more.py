from pathlib import Path
p=Path('/mnt/data/p4')
# Remove unused sendSMS import
f=p/'backend/controllers/chatController.js'; s=f.read_text().replace('import { sendSMS } from "../utils/sms.js";\n',''); f.write_text(s)
# notification worker use canonical db + service
f=p/'backend/workers/notificationWorker.js'; s=f.read_text()
s=s.replace('import Notification from "../models/Notification.js";\nimport User from "../models/User.js";','import { findById } from "../db/index.js";\nimport { sendNotification } from "../services/notification.service.js";')
start=s.find('    // Create in-app notification')
end=s.find('    const processingTime = Date.now() - startTime;', start)
new='''    const user = await findById("users", userId, "id,email,phone");\n    if (!user) {\n      logWarn("User not found for notification", { userId });\n      return null;\n    }\n\n    const notification = await sendNotification({\n      userId, title, message, type, data,\n      email: channels.includes("email") && user.email ? user.email : undefined,\n      phone: channels.includes("sms") && user.phone ? user.phone : undefined,\n    });\n    const channelResults = { in_app: Boolean(notification) };\n    if (channels.includes("push")) channelResults.push = await sendPushNotification(userId, title, message, data);\n    if (channels.includes("email")) channelResults.email = Boolean(user.email);\n    if (channels.includes("sms")) channelResults.sms = Boolean(user.phone);\n    if (channels.includes("whatsapp")) channelResults.whatsapp = "not_configured";\n\n'''
if start!=-1 and end!=-1: s=s[:start]+new+s[end:]
s=s.replace('notificationId: notification._id,','notificationId: notification?.id,')
f.write_text(s)
# Rewrite ChatDrawer state/effects and handlers, preserving markup
f=p/'src/components/chat/ChatDrawer.tsx'; s=f.read_text()
s=s.replace("import { useState, type FC, type FormEvent } from 'react';", "import { useState, useEffect, type FC, type FormEvent } from 'react';")
s=s.replace("import { Input } from '../ui/Input';", "import { Input } from '../ui/Input';\nimport { chatAPI } from '../../api/api';")
start=s.find('  const [messageText, setMessageText]')
end=s.find('  if (!isChatOpen) return null;', start)
new='''  const [messageText, setMessageText] = useState('');\n  const [offerModalOpen, setOfferModalOpen] = useState(false);\n  const [offerAmount, setOfferAmount] = useState('');\n  const [chatId, setChatId] = useState<string | null>(null);\n  const [chatHistory, setChatHistory] = useState<any[]>([]);\n  const [chatLoading, setChatLoading] = useState(false);\n  const [chatError, setChatError] = useState<string | null>(null);\n\n  const targetVehicle = vehicles.find(v => v.id === activeChatVehicleId) || vehicles[0];\n\n  useEffect(() => {\n    if (!isChatOpen || !user || !targetVehicle?.sellerId || targetVehicle.sellerId === user.id) return;\n    let cancelled = false;\n    setChatLoading(true); setChatError(null);\n    chatAPI.start({ recipientId: targetVehicle.sellerId, carId: targetVehicle.id }).then(async (result: any) => {\n      const id = result?.chat?.id || result?.chat?._id;\n      if (!id || cancelled) return;\n      setChatId(id);\n      const data = await chatAPI.messages(id, { limit: 100 });\n      if (!cancelled) setChatHistory(data.messages || data.data || []);\n    }).catch((error: any) => {\n      if (!cancelled) setChatError(error?.response?.data?.message || error?.message || 'Unable to load conversation.');\n    }).finally(() => { if (!cancelled) setChatLoading(false); });\n    return () => { cancelled = true; };\n  }, [isChatOpen, user?.id, targetVehicle?.id, targetVehicle?.sellerId]);\n\n  useEffect(() => {\n    if (!isChatOpen || !chatId) return;\n    const timer = window.setInterval(async () => {\n      try { const data = await chatAPI.messages(chatId, { limit: 100 }); setChatHistory(data.messages || data.data || []); } catch { /* retain last good snapshot */ }\n    }, 5000);\n    return () => window.clearInterval(timer);\n  }, [isChatOpen, chatId]);\n\n  if (!isChatOpen) return null;\n'''
s=s[:start]+new+s[end+len('  if (!isChatOpen) return null;'):]
# Replace handlers section
old_start=s.find('  const handleSend = (e: FormEvent) => {')
old_end=s.find('  return (', old_start)
new_handlers='''  const handleSend = async (e: FormEvent) => {\n    e.preventDefault();\n    if (!messageText.trim() || !chatId) return;\n    const text = messageText.trim(); setMessageText('');\n    try {\n      const result = await chatAPI.send(chatId, { content: text });\n      const sent = result?.message?.id ? result.message : result;\n      setChatHistory(prev => [...prev, sent]);\n    } catch (error: any) {\n      setMessageText(text); setChatError(error?.message || 'Failed to send message.');\n    }\n  };\n\n  const handleMakeOffer = () => {\n    setOfferModalOpen(false);\n    setOfferAmount('');\n    setChatError('Direct offers are not part of the current chat API contract. Use the supported bidding or purchase flow instead.');\n  };\n\n'''
s=s[:old_start]+new_handlers+s[old_end:]
# map rendering fields: sender can object; time from createdAt
s=s.replace("className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}", "className={`flex flex-col ${(msg.sender === 'user' || msg.sender === user?.id || msg.sender?.id === user?.id) ? 'items-end' : 'items-start'}`}")
s=s.replace("msg.sender === 'user' ? 'bg-[#1E3063]", "(msg.sender === 'user' || msg.sender === user?.id || msg.sender?.id === user?.id) ? 'bg-[#1E3063]")
s=s.replace("{msg.text}", "{msg.message || msg.text || msg.content}")
s=s.replace("{msg.time}", "{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}")
# add error/loading block in messages body
needle='          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FCF9F4]">'
s=s.replace(needle, needle+'\n            {chatLoading && <div className="text-center text-xs text-slate-400 py-4">Loading conversation…</div>}\n            {chatError && <div className="text-center text-xs text-rose-500 py-3">{chatError}</div>}')
f.write_text(s)
# add validation script
script=p/'scripts/validate-communications-initiative.mjs'
script.write_text(r'''import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = process.cwd();
const checks = [
  ["notification controller uses canonical db", fs.readFileSync(path.join(root,"backend/controllers/notificationController.js"),"utf8").includes('findAll("notifications"')],
  ["notification controller has owner-scoped read", fs.readFileSync(path.join(root,"backend/controllers/notificationController.js"),"utf8").includes('notification.user')],
  ["notification service writes canonical notifications", fs.readFileSync(path.join(root,"backend/services/notification.service.js"),"utf8").includes('create("notifications"')],
  ["chat blocked state enforced", fs.readFileSync(path.join(root,"backend/controllers/chatController.js"),"utf8").includes('CHAT_BLOCKED')],
  ["chat create contract uses recipientId", fs.readFileSync(path.join(root,"backend/validation/chat.schema.js"),"utf8").includes('recipientId')],
  ["preferences use canonical db", fs.readFileSync(path.join(root,"backend/controllers/userPreferenceController.js"),"utf8").includes('user_preferences')],
  ["frontend notifications do not synthesize domain IDs", !fs.readFileSync(path.join(root,"src/context/NotificationContext.tsx"),"utf8").includes('local_escrow_released_')],
  ["chat drawer has no simulated dealer response", !fs.readFileSync(path.join(root,"src/components/chat/ChatDrawer.tsx"),"utf8").includes('Simulate dealer response')],
  ["communications polling is API-backed", fs.readFileSync(path.join(root,"src/features/UnifiedCommunicationHub.tsx"),"utf8").includes('getMyChats()')],
];
for (const [name, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) process.exitCode = 1; }
const syntax = [
  "backend/controllers/notificationController.js","backend/services/notification.service.js","backend/controllers/userPreferenceController.js","backend/controllers/chatController.js","backend/validation/chat.schema.js","backend/workers/notificationWorker.js"
];
for (const file of syntax) execFileSync(process.execPath,["--check",path.join(root,file)],{stdio:"inherit"});
console.log("Communications initiative static gate complete.");
''')
# package script
import json
pkg=p/'package.json'; d=json.loads(pkg.read_text()); d['scripts']['validate:communications']='node scripts/validate-communications-initiative.mjs'; pkg.write_text(json.dumps(d,indent=2)+'\n')
