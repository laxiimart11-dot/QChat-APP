import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Lock,
  Globe,
  Trash2,
  Users,
  MessageSquare,
  Check,
  AlertCircle,
  Copy,
  RotateCw,
  Key,
  BookOpen,
  Code,
  Languages,
  Bot,
  Zap,
  Send,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Database
} from 'lucide-react';
import type { UserProfile, DamiAccount } from '../types.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { chatService } from '../services/chatService.ts';
import { cleanAvatarUrl } from '../utils/avatarUtils.ts';
import { API_DOCS_TRANSLATIONS, type DocLanguage } from '../data/apiDocsTranslations.ts';

interface DamiManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  damiAccounts: DamiAccount[];
  connectedContacts: UserProfile[];
  onOpenDamiChat: (channelId: string) => void;
}

const TOKEN_PERMISSIONS = [
  { permKey: 'send_messages', method: 'POST', label: 'Send Messages / SMS' },
  { permKey: 'send_media', method: 'POST', label: 'Send Photos, Audio & Files' },
  { permKey: 'read_messages', method: 'GET', label: 'Read / Receive Messages' },
  { permKey: 'read_info', method: 'GET', label: 'Account Info & Metadata' }
];

export const DamiManagerModal: React.FC<DamiManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  damiAccounts,
  connectedContacts,
  onOpenDamiChat
}) => {
  const { isDayMode } = useTheme();

  // Navigation tab for main screen
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  // Sub-screens (full-screen flat views, NO popups)
  const [selectedApiDami, setSelectedApiDami] = useState<DamiAccount | null>(null);
  const [managingMembersDami, setManagingMembersDami] = useState<DamiAccount | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create form state
  const [damiName, setDamiName] = useState('');
  const [damiType, setDamiType] = useState<'private' | 'public'>('private');
  const [damiDesc, setDamiDesc] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editing members for a public dami
  const [editMemberIds, setEditMemberIds] = useState<string[]>([]);
  const [isUpdatingMembers, setIsUpdatingMembers] = useState(false);

  // API Token & cURL State
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedGetUrl, setCopiedGetUrl] = useState(false);
  const [copiedPostUrl, setCopiedPostUrl] = useState(false);
  const [copiedDirectCurl, setCopiedDirectCurl] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [webhookSavedNotice, setWebhookSavedNotice] = useState(false);
  const [isTestingMessage, setIsTestingMessage] = useState(false);
  const [testMessageNotice, setTestMessageNotice] = useState<string | null>(null);
  const [copiedDocSnippetKey, setCopiedDocSnippetKey] = useState<string | null>(null);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
  const [showDocPage, setShowDocPage] = useState(false);
  const [docLang, setDocLang] = useState<DocLanguage>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qchat_doc_lang') as DocLanguage;
      if (saved && API_DOCS_TRANSLATIONS[saved]) return saved;
    }
    return 'en';
  });

  const handleSetDocLang = (lang: DocLanguage) => {
    setDocLang(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('qchat_doc_lang', lang);
    }
  };
  const [docCodeLanguage, setDocCodeLanguage] = useState<'curl' | 'python' | 'node' | 'php'>('curl');
  const [savedNotice, setSavedNotice] = useState(false);

  // Sync webhookUrlInput when selectedApiDami changes
  useEffect(() => {
    if (selectedApiDami) {
      setWebhookUrlInput(selectedApiDami.webhookUrl || '');
    }
  }, [selectedApiDami]);

  if (!isOpen) return null;

  // Validation: Check if name ends with a number
  const hasEndingNumber = /\d+$/.test(damiName.trim());

  // Toggle member selection in create form
  const toggleMemberSelection = (uid: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  // Toggle member selection in edit modal
  const toggleEditMemberSelection = (uid: string) => {
    setEditMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  // Handle creating a new Dami Account
  const handleCreateDami = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmed = damiName.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a name for the Dami Account.');
      return;
    }

    if (!hasEndingNumber) {
      setErrorMsg('Name must end with numbers (e.g. Alex01, VIP777) to be unique.');
      return;
    }

    setIsSubmitting(true);

    try {
      const memberNames: Record<string, string> = {};
      const memberPhotos: Record<string, string> = {};
      selectedMemberIds.forEach((uid) => {
        const contact = connectedContacts.find((c) => c.uid === uid);
        if (contact) {
          memberNames[uid] = contact.displayName;
          memberPhotos[uid] = contact.photoURL || '';
        }
      });

      const res = await chatService.createDamiAccount({
        name: trimmed,
        type: damiType,
        description: damiDesc.trim(),
        avatarUrl: damiType === 'private' ? 'lock' : 'globe',
        memberIds: damiType === 'public' ? selectedMemberIds : [],
        memberNames,
        memberPhotos,
        currentUser
      });

      if (res.success) {
        setSuccessMsg(res.message);
        setDamiName('');
        setDamiDesc('');
        setSelectedMemberIds([]);
        setTimeout(() => {
          setSuccessMsg('');
          setActiveTab('list');
          if (res.channelId) {
            onOpenDamiChat(res.channelId);
            onClose();
          }
        }, 1000);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create Dami Account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle saving updated members of a public Dami account
  const handleSaveMembers = async () => {
    if (!managingMembersDami) return;
    setIsUpdatingMembers(true);
    try {
      const allMemberIds = Array.from(new Set([currentUser.uid, ...editMemberIds]));
      const memberNames: Record<string, string> = {
        [currentUser.uid]: currentUser.displayName
      };
      const memberPhotos: Record<string, string> = {
        [currentUser.uid]: currentUser.photoURL || ''
      };

      editMemberIds.forEach((uid) => {
        const contact = connectedContacts.find((c) => c.uid === uid);
        if (contact) {
          memberNames[uid] = contact.displayName;
          memberPhotos[uid] = contact.photoURL || '';
        }
      });

      const ok = await chatService.updateDamiAccountMembers(
        managingMembersDami.id,
        managingMembersDami.channelId,
        allMemberIds,
        memberNames,
        memberPhotos
      );

      if (ok) {
        setManagingMembersDami(null);
      }
    } catch (err) {
      console.error('Failed to update dami members:', err);
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  // Handle deleting a Dami Account
  const handleDeleteDami = async (dami: DamiAccount) => {
    try {
      await chatService.deleteDamiAccount(dami.id, dami.channelId, currentUser.uid);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete dami account:', err);
    }
  };

  // Copy API Token to clipboard
  const handleCopyToken = () => {
    if (!selectedApiDami?.apiToken) return;
    navigator.clipboard.writeText(selectedApiDami.apiToken).then(() => {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    });
  };

  // Regenerate API Token
  const handleRegenerateToken = async () => {
    if (!selectedApiDami) return;
    setIsRegeneratingToken(true);
    try {
      const newToken = await chatService.regenerateDamiApiToken(selectedApiDami.id);
      setSelectedApiDami((prev) => (prev ? { ...prev, apiToken: newToken } : null));
    } catch (err) {
      console.error('Failed to regenerate token:', err);
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  // Toggle API Token Permission (like Facebook's toggle switches in the screenshot)
  const handleTogglePermission = async (permKey: string) => {
    if (!selectedApiDami) return;
    const currentPerms = selectedApiDami.apiPermissions || ['read_messages', 'send_messages', 'send_media', 'read_info'];
    const updated = currentPerms.includes(permKey)
      ? currentPerms.filter((p) => p !== permKey)
      : [...currentPerms, permKey];

    setSelectedApiDami((prev) => (prev ? { ...prev, apiPermissions: updated } : null));
    try {
      await chatService.updateDamiPermissions(selectedApiDami.id, updated);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1500);
    } catch (err) {
      console.error('Failed to save permissions:', err);
    }
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const apiToken = selectedApiDami?.apiToken || 'dami_tok_sample123';
  const publicWebhookUrl = `${originUrl}/api/webhook?token=${apiToken}`;
  const publicPostUrl = `${originUrl}/api/messages`;
  const publicGetUrl = `${originUrl}/api/messages?token=${apiToken}&limit=50`;
  const directCurlCommand = `curl -X POST "${publicPostUrl}" \\
  -H "Authorization: Bearer ${apiToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Hello world from external website!",
    "senderName": "External Client"
  }'`;

  // Save Outbound Webhook URL (QChat -> External Website / Server)
  const handleSaveWebhookUrl = async () => {
    if (!selectedApiDami) return;
    setIsSavingWebhook(true);
    try {
      await chatService.updateDamiWebhookUrl(selectedApiDami.id, webhookUrlInput);
      // Synchronize with server backend directly
      fetch('/api/dami/webhook-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${selectedApiDami.apiToken}`
        },
        body: JSON.stringify({ webhookUrl: webhookUrlInput })
      }).catch(() => {});

      setSelectedApiDami((prev) => (prev ? { ...prev, webhookUrl: webhookUrlInput } : null));
      setWebhookSavedNotice(true);
      setTimeout(() => setWebhookSavedNotice(false), 2500);
    } catch (err) {
      console.error('Failed to save webhook URL:', err);
    } finally {
      setIsSavingWebhook(false);
    }
  };

  // Send interactive test message from external website into chat
  const handleSendTestMessage = async () => {
    if (!selectedApiDami?.apiToken) return;
    setIsTestingMessage(true);
    setTestMessageNotice(null);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${selectedApiDami.apiToken}`
        },
        body: JSON.stringify({
          text: `Hello! This is a test message from external website via Webhook In (Token: ${selectedApiDami.name}).`,
          senderName: 'External Website'
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestMessageNotice('Success! Message delivered to chat successfully.');
      } else {
        setTestMessageNotice(`Failed: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      setTestMessageNotice(`Error: ${err?.message || 'Network error'}`);
    } finally {
      setIsTestingMessage(false);
      setTimeout(() => setTestMessageNotice(null), 4000);
    }
  };

  // Pre-configured Automation & Code Snippets
  const curlSnippets: Record<string, string> = {
    webhook_in: `// 1. Webhook In (Receive data/message from external website into QChat)
POST ${publicWebhookUrl}
Content-Type: application/json
Authorization: Bearer ${apiToken}

{
  "text": "Hello world from external website!",
  "senderName": "External Service"
}`,
    webhook_out: `// 2. Webhook Out (Forward chat messages to external website)
POST ${webhookUrlInput || 'https://your-website.com/api/chat-webhook'}
Content-Type: application/json
x-qchat-token: ${apiToken}

{
  "event": "message.created",
  "channelId": "${selectedApiDami?.channelId || ''}",
  "messageId": "msg_001",
  "senderName": "User",
  "text": "User typed message here",
  "tokenName": "${selectedApiDami?.name || ''}",
  "timestamp": "2026-10-02T12:00:00.000Z"
}`,
    get: `// 3. GET Messages API (Read messages from external website)
curl -X GET "${publicGetUrl}" \\
  -H "Authorization: Bearer ${apiToken}"`,
    curl: `// 4. cURL POST Message:
curl -X POST "${publicPostUrl}" \\
  -H "Authorization: Bearer ${apiToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Hello from external server",
    "senderName": "External Service"
  }'`
  };

  const handleCopyCurl = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    });
  };

  const activePermissions = selectedApiDami?.apiPermissions || ['read_messages', 'send_messages', 'send_media', 'read_info'];

  const docLanguageSnippets: Record<string, string> = {
    curl: `# 1. Send SMS / Text message
curl -X POST "${originUrl}/api/dami/messages" \\
  -H "Authorization: Bearer ${apiToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Hello, automated message from cURL!",
    "mediaType": "text",
    "senderName": "Alert Service"
  }'

# 2. Fetch incoming chat messages
curl -X GET "${originUrl}/api/dami/messages?limit=25" \\
  -H "Authorization: Bearer ${apiToken}"`,

    python: `import requests

TOKEN = "${apiToken}"
BASE_URL = "${originUrl}"

# 1. Send SMS or text message
response = requests.post(
    f"{BASE_URL}/api/dami/messages",
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    },
    json={
        "text": "Automated alert from Python backend",
        "mediaType": "text",
        "senderName": "Python Bot"
    }
)
print("Send Response:", response.json())

# 2. Fetch recent chat messages
messages_res = requests.get(
    f"{BASE_URL}/api/dami/messages?limit=25",
    headers={"Authorization": f"Bearer {TOKEN}"}
)
print("Recent Messages:", messages_res.json())`,

    node: `const TOKEN = "${apiToken}";
const BASE_URL = "${originUrl}";

// 1. Send SMS / Text or Media Message
async function sendMessage() {
  const res = await fetch(\`\${BASE_URL}/api/dami/messages\`, {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${TOKEN}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: "Hello from Node.js backend!",
      mediaType: "text",
      senderName: "Server Notification"
    })
  });
  const data = await res.json();
  console.log("Send result:", data);
}

// 2. Fetch Incoming Messages
async function getMessages() {
  const res = await fetch(\`\${BASE_URL}/api/dami/messages?limit=50\`, {
    headers: { "Authorization": \`Bearer \${TOKEN}\` }
  });
  const data = await res.json();
  console.log("Messages received:", data.messages);
}

sendMessage();`,

    php: `<?php
$token = "${apiToken}";
$baseUrl = "${originUrl}";

// 1. Send SMS / Message via cURL
$ch = curl_init("$baseUrl/api/dami/messages");
$data = json_encode([
    "text" => "Automated message from PHP",
    "mediaType" => "text",
    "senderName" => "PHP App"
]);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $token",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
curl_close($ch);
echo "Result: " . $response;
?>`
  };

  const handleCopyDocSnippet = (key: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedDocSnippetKey(key);
      setTimeout(() => setCopiedDocSnippetKey(null), 2000);
    });
  };

  // =========================================================================
  // SUB-SCREEN 1A: STEP-BY-STEP TECHNICAL DOCUMENTATION & PAYLOAD SCHEMAS
  // =========================================================================
  if (selectedApiDami && showDocPage) {
    const t = API_DOCS_TRANSLATIONS[docLang] || API_DOCS_TRANSLATIONS.en;

    const webhookInPayloadExample = JSON.stringify({
      text: "Hello world from external website!",
      senderName: "External Client"
    }, null, 2);

    const webhookInResponseExample = JSON.stringify({
      success: true,
      message: "Message delivered successfully",
      data: {
        messageId: "msg_abc12345",
        senderName: "External Client",
        tokenName: selectedApiDami.name,
        channelId: selectedApiDami.channelId,
        mediaType: "text",
        timestamp: "2026-10-02T12:00:00.000Z"
      }
    }, null, 2);

    const webhookOutPayloadExample = JSON.stringify({
      event: "message.created",
      channelId: selectedApiDami.channelId,
      messageId: "msg_98765432",
      senderName: currentUser.displayName || "User",
      text: "Hello! This is a message typed inside QChat.",
      tokenName: selectedApiDami.name,
      timestamp: "2026-10-02T12:00:00.000Z"
    }, null, 2);

    const getResponseExample = JSON.stringify({
      success: true,
      channelId: selectedApiDami.channelId,
      tokenName: selectedApiDami.name,
      count: 2,
      messages: [
        {
          id: "msg_001",
          text: "Welcome to the channel!",
          senderName: "Admin",
          timestamp: "2026-10-02T11:55:00.000Z"
        },
        {
          id: "msg_002",
          text: "Hello world from external website!",
          senderName: "External Client",
          tokenName: selectedApiDami.name,
          timestamp: "2026-10-02T12:00:00.000Z"
        }
      ]
    }, null, 2);

    const postPayloadExample = JSON.stringify({
      text: "Automated alert from server",
      senderName: "Server Notification"
    }, null, 2);

    const postResponseExample = JSON.stringify({
      success: true,
      message: "Message delivered to chat successfully",
      data: {
        messageId: "msg_55443322",
        senderName: "Server Notification",
        tokenName: selectedApiDami.name,
        channelId: selectedApiDami.channelId,
        timestamp: "2026-10-02T12:05:00.000Z"
      }
    }, null, 2);

    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col ${
          isDayMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'
        }`}
      >
        {/* Top Bar */}
        <div
          className={`h-14 px-4 border-b flex items-center justify-between shrink-0 ${
            isDayMode ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'
          }`}
        >
          <button
            onClick={() => setShowDocPage(false)}
            className="p-1 -ml-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Back to API and Webhooks"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-semibold text-sm truncate max-w-[200px]">
            {t.docTitle}
          </span>
          <img
            src={cleanAvatarUrl(currentUser.photoURL, currentUser.displayName)}
            alt="User"
            className="w-8 h-8 rounded-full object-cover"
          />
        </div>

        {/* Translation Language Selector Bar */}
        <div
          className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs ${
            isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <div className="flex items-center space-x-1.5 font-semibold opacity-90">
            <Languages className="w-4 h-4 text-indigo-500" />
            <span>{t.selectLanguage}:</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick Pills for popular languages */}
            <div className="hidden sm:flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleSetDocLang('en')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  docLang === 'en'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => handleSetDocLang('es')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  docLang === 'es'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15'
                }`}
              >
                Español
              </button>
              <button
                type="button"
                onClick={() => handleSetDocLang('hi')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  docLang === 'hi'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15'
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => handleSetDocLang('es')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  docLang === 'es'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15'
                }`}
              >
                Español
              </button>
            </div>

            {/* Full Language Selector Dropdown */}
            <select
              value={docLang}
              onChange={(e) => handleSetDocLang(e.target.value as DocLanguage)}
              className={`px-3 py-1 rounded-lg border text-xs font-semibold focus:outline-none cursor-pointer transition-colors ${
                isDayMode
                  ? 'bg-white border-slate-300 text-slate-800 hover:border-indigo-500'
                  : 'bg-slate-900 border-slate-700 text-slate-100 hover:border-indigo-400'
              }`}
            >
              {(Object.keys(API_DOCS_TRANSLATIONS) as DocLanguage[]).map((langKey) => (
                <option key={langKey} value={langKey}>
                  {API_DOCS_TRANSLATIONS[langKey].langName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Documentation Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 max-w-xl w-full mx-auto text-xs leading-relaxed">
          {/* Header */}
          <div>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <h1 className="text-xl font-bold tracking-tight">{t.docTitle}</h1>
            </div>
            <p className="text-xs opacity-75 mt-1 leading-relaxed">
              {t.docSubtitle}
            </p>
          </div>

          {/* Step 1: Authentication & Token Header */}
          <div className="space-y-3 border-t pt-4 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                {t.step1Badge}
              </span>
              <h2 className="text-sm font-bold">{t.step1Title}</h2>
            </div>
            <p className="opacity-80 leading-relaxed">
              {t.step1Desc}
            </p>

            <div
              className={`p-3 rounded-xl border space-y-1.5 font-mono text-[11px] ${
                isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div>
                <span className="font-bold opacity-60">{t.baseUrlLabel}: </span>
                <span className="text-sky-600 dark:text-sky-400 select-all">{originUrl}</span>
              </div>
              <div>
                <span className="font-bold opacity-60">{t.headerAuthLabel}: </span>
                <span className="select-all">Authorization: Bearer {apiToken}</span>
              </div>
              <div>
                <span className="font-bold opacity-60">{t.headerCustomLabel}: </span>
                <span className="select-all">x-api-token: {apiToken}</span>
              </div>
              <div>
                <span className="font-bold opacity-60">{t.queryParamLabel}: </span>
                <span className="select-all">?token={apiToken}</span>
              </div>
              <div>
                <span className="font-bold opacity-60">{t.tokenNameLabel}: </span>
                <span className="text-indigo-400">{selectedApiDami.name}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border bg-black/5 dark:bg-white/5 space-y-1 dark:border-slate-800">
              <p className="text-[11px] opacity-80 leading-relaxed">
                {t.tokenBadgeDesc}
              </p>
            </div>
          </div>

          {/* Step 2: Webhook In */}
          <div className="space-y-3 border-t pt-4 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                {t.step2Badge}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-bold">
                POST
              </span>
              <h2 className="text-sm font-bold">{t.step2Title}</h2>
            </div>
            <p className="opacity-80 leading-relaxed">
              {t.step2Desc}
            </p>

            <div
              className={`p-2.5 rounded-lg border font-mono text-[11px] break-all select-all ${
                isDayMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              POST {publicWebhookUrl}
            </div>

            {/* Workflow Steps Breakdown */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-black/5 dark:bg-white/5 dark:border-slate-800">
              <span className="font-bold text-[11px] uppercase tracking-wider opacity-85 flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t.step2WorkflowTitle}</span>
              </span>
              <ol className="space-y-2 mt-2">
                {t.step2WorkflowSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-[11px] opacity-85 leading-relaxed">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Request Payload Example */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] opacity-75 uppercase tracking-wider">
                  {t.reqPayloadTitle}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyDocSnippet('webhook_in_req', webhookInPayloadExample)}
                  className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  {copiedDocSnippetKey === 'webhook_in_req' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDocSnippetKey === 'webhook_in_req' ? t.copiedBtn : t.copyBtn}</span>
                </button>
              </div>

              <pre className="p-3 rounded-xl border text-[11px] font-mono bg-slate-950 text-slate-100 overflow-x-auto leading-relaxed select-all">
                {webhookInPayloadExample}
              </pre>
            </div>

            {/* Fields table */}
            <div className="space-y-1">
              <div className="font-bold text-[11px] opacity-70 uppercase tracking-wider">{t.payloadFieldsTitle}</div>
              <div className="space-y-2 border rounded-xl p-3 dark:border-slate-800">
                <div className="text-[11px] opacity-85 leading-relaxed border-b pb-1.5 dark:border-slate-800">
                  {t.fieldTextField}
                </div>
                <div className="text-[11px] opacity-85 leading-relaxed border-b pb-1.5 dark:border-slate-800">
                  {t.fieldSenderField}
                </div>
                <div className="text-[11px] opacity-85 leading-relaxed border-b pb-1.5 dark:border-slate-800">
                  {t.fieldMediaUrlField}
                </div>
                <div className="text-[11px] opacity-85 leading-relaxed">
                  {t.fieldMediaTypeField}
                </div>
              </div>
            </div>

            {/* Response Example */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] opacity-75 uppercase tracking-wider">
                  {t.resPayloadTitle}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyDocSnippet('webhook_in_res', webhookInResponseExample)}
                  className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  {copiedDocSnippetKey === 'webhook_in_res' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDocSnippetKey === 'webhook_in_res' ? t.copiedBtn : t.copyBtn}</span>
                </button>
              </div>

              <pre className="p-3 rounded-xl border text-[11px] font-mono bg-slate-950 text-emerald-400 overflow-x-auto leading-relaxed select-all">
                {webhookInResponseExample}
              </pre>
            </div>
          </div>

          {/* Step 3: Webhook Out */}
          <div className="space-y-3 border-t pt-4 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
                {t.step3Badge}
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-bold">
                POST
              </span>
              <h2 className="text-sm font-bold">{t.step3Title}</h2>
            </div>
            <p className="opacity-80 leading-relaxed">
              {t.step3Desc}
            </p>

            <div
              className={`p-2.5 rounded-lg border font-mono text-[11px] break-all select-all ${
                isDayMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              <span className="font-bold opacity-70">{t.configuredUrlLabel}: </span>
              <span>{selectedApiDami.webhookUrl || t.notConfiguredLabel}</span>
            </div>

            {/* Workflow Steps Breakdown */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-black/5 dark:bg-white/5 dark:border-slate-800">
              <span className="font-bold text-[11px] uppercase tracking-wider opacity-85 flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t.step3WorkflowTitle}</span>
              </span>
              <ol className="space-y-2 mt-2">
                {t.step3WorkflowSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-[11px] opacity-85 leading-relaxed">
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Outbound Event Payload Example */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] opacity-75 uppercase tracking-wider">
                  {t.outboundPayloadTitle}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyDocSnippet('webhook_out_payload', webhookOutPayloadExample)}
                  className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  {copiedDocSnippetKey === 'webhook_out_payload' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDocSnippetKey === 'webhook_out_payload' ? t.copiedBtn : t.copyBtn}</span>
                </button>
              </div>

              <pre className="p-3 rounded-xl border text-[11px] font-mono bg-slate-950 text-indigo-300 overflow-x-auto leading-relaxed select-all">
                {webhookOutPayloadExample}
              </pre>
            </div>

            {/* Auto-reply support */}
            <div className="p-3 rounded-xl border bg-black/5 dark:bg-white/5 space-y-1.5 dark:border-slate-800">
              <span className="font-bold text-[11px] flex items-center space-x-1.5 text-indigo-500">
                <Bot className="w-3.5 h-3.5" />
                <span>{t.autoReplyTitle}</span>
              </span>
              <p className="text-[11px] opacity-80 leading-relaxed">
                {t.autoReplyDesc}
              </p>
            </div>
          </div>

          {/* Step 4: GET */}
          <div className="space-y-3 border-t pt-4 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-500 border border-sky-500/30">
                {t.step4Badge}
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-600 text-white font-mono text-[10px] font-bold">
                GET
              </span>
              <h2 className="text-sm font-bold">{t.step4Title}</h2>
            </div>
            <p className="opacity-80 leading-relaxed">
              {t.step4Desc}
            </p>

            <div
              className={`p-2.5 rounded-lg border font-mono text-[11px] break-all select-all ${
                isDayMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              GET {publicGetUrl}
            </div>

            <div className="space-y-1">
              <div className="font-bold text-[11px] opacity-70 uppercase tracking-wider">{t.queryParamsTitle}</div>
              <div className="space-y-2 border rounded-xl p-3 dark:border-slate-800">
                <div className="text-[11px] opacity-85 leading-relaxed border-b pb-1.5 dark:border-slate-800">
                  {t.paramLimitDesc}
                </div>
                <div className="text-[11px] opacity-85 leading-relaxed">
                  {t.paramSinceDesc}
                </div>
              </div>
            </div>

            {/* GET Response Example */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] opacity-75 uppercase tracking-wider">
                  {t.getResTitle}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyDocSnippet('get_res', getResponseExample)}
                  className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  {copiedDocSnippetKey === 'get_res' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDocSnippetKey === 'get_res' ? t.copiedBtn : t.copyBtn}</span>
                </button>
              </div>

              <pre className="p-3 rounded-xl border text-[11px] font-mono bg-slate-950 text-sky-300 overflow-x-auto leading-relaxed select-all">
                {getResponseExample}
              </pre>
            </div>
          </div>

          {/* Step 5: POST */}
          <div className="space-y-3 border-t pt-4 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-500 border border-purple-500/30">
                {t.step5Badge}
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-mono text-[10px] font-bold">
                POST
              </span>
              <h2 className="text-sm font-bold">{t.step5Title}</h2>
            </div>
            <p className="opacity-80 leading-relaxed">
              {t.step5Desc}
            </p>

            <div
              className={`p-2.5 rounded-lg border font-mono text-[11px] break-all select-all ${
                isDayMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              POST {publicPostUrl}
            </div>

            {/* POST Request Example */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] opacity-75 uppercase tracking-wider">
                  {t.postReqTitle}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyDocSnippet('post_req', postPayloadExample)}
                  className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  {copiedDocSnippetKey === 'post_req' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDocSnippetKey === 'post_req' ? t.copiedBtn : t.copyBtn}</span>
                </button>
              </div>

              <pre className="p-3 rounded-xl border text-[11px] font-mono bg-slate-950 text-slate-100 overflow-x-auto leading-relaxed select-all">
                {postPayloadExample}
              </pre>
            </div>

            {/* POST Response Example */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] opacity-75 uppercase tracking-wider">
                  {t.postResTitle}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyDocSnippet('post_res', postResponseExample)}
                  className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  {copiedDocSnippetKey === 'post_res' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDocSnippetKey === 'post_res' ? t.copiedBtn : t.copyBtn}</span>
                </button>
              </div>

              <pre className="p-3 rounded-xl border text-[11px] font-mono bg-slate-950 text-purple-300 overflow-x-auto leading-relaxed select-all">
                {postResponseExample}
              </pre>
            </div>
          </div>

          {/* Step 6: cURL Commands */}
          <div className="space-y-3 border-t pt-4 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                {t.step6Badge}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-mono text-[10px] font-bold">
                cURL
              </span>
              <h2 className="text-sm font-bold">{t.step6Title}</h2>
            </div>
            <p className="opacity-80 leading-relaxed">
              {t.step6Desc}
            </p>

            <div className="space-y-3">
              {/* cURL Send Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] opacity-75">{t.curlSendTitle}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyDocSnippet('curl_post', directCurlCommand)}
                    className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedDocSnippetKey === 'curl_post' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDocSnippetKey === 'curl_post' ? t.copiedBtn : t.copyCurlBtn}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl border text-[11px] font-mono bg-slate-950 text-slate-100 overflow-x-auto leading-relaxed select-all">
                  {directCurlCommand}
                </pre>
              </div>

              {/* cURL GET Messages */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] opacity-75">{t.curlGetTitle}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyDocSnippet('curl_get', `curl -X GET "${publicGetUrl}" \\\n  -H "Authorization: Bearer ${apiToken}"`)}
                    className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedDocSnippetKey === 'curl_get' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDocSnippetKey === 'curl_get' ? t.copiedBtn : t.copyCurlBtn}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl border text-[11px] font-mono bg-slate-950 text-slate-100 overflow-x-auto leading-relaxed select-all">
{`curl -X GET "${publicGetUrl}" \\
  -H "Authorization: Bearer ${apiToken}"`}
                </pre>
              </div>
            </div>
          </div>

          {/* Step 7: HTTP Status Codes */}
          <div className="space-y-3 border-t pt-4 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
                {t.step7Badge}
              </span>
              <h2 className="text-sm font-bold">{t.step7Title}</h2>
            </div>
            <div className="space-y-2 border rounded-xl p-3 dark:border-slate-800">
              <div className="text-[11px] opacity-85 leading-relaxed border-b pb-1.5 dark:border-slate-800">
                {t.status200}
              </div>
              <div className="text-[11px] opacity-85 leading-relaxed border-b pb-1.5 dark:border-slate-800">
                {t.status400}
              </div>
              <div className="text-[11px] opacity-85 leading-relaxed border-b pb-1.5 dark:border-slate-800">
                {t.status401}
              </div>
              <div className="text-[11px] opacity-85 leading-relaxed border-b pb-1.5 dark:border-slate-800">
                {t.status403}
              </div>
              <div className="text-[11px] opacity-85 leading-relaxed">
                {t.status500}
              </div>
            </div>
          </div>

          {/* Clean text link back to Settings */}
          <div className="pt-2 pb-8 text-center">
            <button
              type="button"
              onClick={() => setShowDocPage(false)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-semibold inline-flex items-center space-x-1"
            >
              <span>&larr; {t.backBtn}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SUB-SCREEN 1B: API & TOKEN FLAT FULL-SCREEN VIEW (NO POPUP!)
  // =========================================================================
  if (selectedApiDami) {
    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col ${
          isDayMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'
        }`}
      >
        {/* Top Bar with Back Arrow (Like Facebook screen) */}
        <div
          className={`h-14 px-4 border-b flex items-center justify-between shrink-0 ${
            isDayMode ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'
          }`}
        >
          <button
            onClick={() => setSelectedApiDami(null)}
            className="p-1 -ml-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Back to Dami accounts"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-semibold text-sm truncate max-w-[200px]">
            {selectedApiDami.name}
          </span>
          <img
            src={cleanAvatarUrl(currentUser.photoURL, currentUser.displayName)}
            alt="User"
            className="w-8 h-8 rounded-full object-cover"
          />
        </div>

        {/* Flat Full-Screen Body (100% English, clean layout) */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 max-w-xl w-full mx-auto">
          {/* Header */}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight">Public API &amp; Webhooks</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                HTTPS Gateway
              </span>
            </div>
            <p className="text-xs opacity-75 mt-1 leading-relaxed">
              Connect external websites, servers, and applications to send and receive real-time chat messages via HTTPS.
            </p>
          </div>

          {/* 1. API Token */}
          <div className="space-y-2 p-3.5 rounded-2xl border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider opacity-75 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>API Token</span>
              </label>
              <span className="text-[11px] font-semibold text-indigo-500 font-mono">
                Token Name: {selectedApiDami.name}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={selectedApiDami.apiToken || ''}
                className={`flex-1 px-3 py-2 rounded-xl border font-mono text-xs select-all focus:outline-none ${
                  isDayMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
                }`}
              />
              <button
                type="button"
                onClick={handleCopyToken}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors shrink-0 shadow-sm"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedToken ? 'Copied' : 'Copy Token'}</span>
              </button>
              <button
                type="button"
                onClick={handleRegenerateToken}
                disabled={isRegeneratingToken}
                className={`p-2 rounded-xl border cursor-pointer transition-colors shrink-0 ${
                  isDayMode ? 'border-slate-300 hover:bg-slate-100' : 'border-slate-700 hover:bg-slate-800'
                }`}
                title="Generate new token"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRegeneratingToken ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-[10px] opacity-65">
              Authenticate requests using <code>Authorization: Bearer &lt;token&gt;</code>. Messages display the badge <strong>[Token: {selectedApiDami.name}]</strong>.
            </p>
          </div>

          {/* 2. Webhook In */}
          <div className="space-y-2 p-3.5 rounded-2xl border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider opacity-75 flex items-center space-x-1.5">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                <span>Webhook In (Receive Messages)</span>
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                HTTPS POST
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={publicWebhookUrl}
                className={`flex-1 px-3 py-2 rounded-xl border font-mono text-[11px] select-all focus:outline-none ${
                  isDayMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(publicWebhookUrl).then(() => {
                    setCopiedWebhookUrl(true);
                    setTimeout(() => setCopiedWebhookUrl(false), 2000);
                  });
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors shrink-0 shadow-sm"
              >
                {copiedWebhookUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWebhookUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <p className="text-[10px] opacity-65 leading-relaxed">
              Send an HTTPS POST request with JSON payload to deliver incoming messages directly into this chat room.
            </p>
          </div>

          {/* 3. Webhook Out */}
          <div className="space-y-2 p-3.5 rounded-2xl border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider opacity-75 flex items-center space-x-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
                <span>Webhook Out (Forward Messages)</span>
              </label>
              <div className="flex items-center space-x-1">
                {selectedApiDami.webhookUrl ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    Not Configured
                  </span>
                )}
                {webhookSavedNotice && (
                  <span className="text-[10px] text-emerald-500 font-bold animate-in fade-in ml-1">
                    Saved!
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="url"
                placeholder="https://your-website.com/api/receive-chat"
                value={webhookUrlInput}
                onChange={(e) => setWebhookUrlInput(e.target.value)}
                className={`flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  isDayMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={handleSaveWebhookUrl}
                disabled={isSavingWebhook}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors shrink-0 shadow-sm disabled:opacity-50"
              >
                <span>{isSavingWebhook ? 'Saving...' : 'Save URL'}</span>
              </button>
            </div>
            <p className="text-[10px] opacity-65 leading-relaxed">
              When any user sends a message in this chat room, QChat automatically forwards the event payload to this destination URL.
            </p>
          </div>

          {/* 4. GET (Read Messages) */}
          <div className="space-y-2 p-3.5 rounded-2xl border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider opacity-75 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-sky-500" />
                <span>GET (Read Messages API)</span>
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-500/15 text-sky-500 border border-sky-500/30">
                HTTPS GET
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={publicGetUrl}
                className={`flex-1 px-3 py-2 rounded-xl border font-mono text-[11px] select-all focus:outline-none ${
                  isDayMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(publicGetUrl).then(() => {
                    setCopiedGetUrl(true);
                    setTimeout(() => setCopiedGetUrl(false), 2000);
                  });
                }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors shrink-0 shadow-sm"
              >
                {copiedGetUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedGetUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <p className="text-[10px] opacity-65">
              Fetch chat message history and recent messages from your external application.
            </p>
          </div>

          {/* 5. POST (Send Message) */}
          <div className="space-y-2 p-3.5 rounded-2xl border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider opacity-75 flex items-center space-x-1.5">
                <Send className="w-3.5 h-3.5 text-purple-500" />
                <span>POST (Send Message API)</span>
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-500 border border-purple-500/30">
                HTTPS POST
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={publicPostUrl}
                className={`flex-1 px-3 py-2 rounded-xl border font-mono text-[11px] select-all focus:outline-none ${
                  isDayMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(publicPostUrl).then(() => {
                    setCopiedPostUrl(true);
                    setTimeout(() => setCopiedPostUrl(false), 2000);
                  });
                }}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors shrink-0 shadow-sm"
              >
                {copiedPostUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPostUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <p className="text-[10px] opacity-65">
              Direct REST endpoint to post messages using <code>Authorization: Bearer &lt;token&gt;</code> in headers.
            </p>
          </div>

          {/* 6. cURL */}
          <div className="p-3.5 rounded-2xl border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider opacity-75 flex items-center space-x-1.5">
                <Code className="w-3.5 h-3.5 text-amber-500" />
                <span>cURL</span>
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                Command Line
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(directCurlCommand).then(() => {
                    setCopiedDirectCurl(true);
                    setTimeout(() => setCopiedDirectCurl(false), 2000);
                  });
                }}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition-all shadow-sm"
              >
                {copiedDirectCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDirectCurl ? 'Copied cURL Command' : 'Copy cURL Command'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={isTestingMessage}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all shadow-sm disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTestingMessage ? 'Testing...' : 'Send Test Message'}</span>
              </button>
            </div>

            {testMessageNotice && (
              <p className={`text-[11px] font-semibold pt-1 animate-in fade-in ${
                testMessageNotice.includes('Success') ? 'text-emerald-500 font-bold' : 'text-rose-400'
              }`}>
                {testMessageNotice}
              </p>
            )}
          </div>

          {/* Documentation Link at bottom (All HTTP Payload Examples moved inside) */}
          <div className="pt-4 pb-8 text-center border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowDocPage(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer inline-flex items-center space-x-1.5 font-semibold opacity-90 hover:opacity-100"
            >
              <span>Complete Documentation &amp; Step-by-Step Guide &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SUB-SCREEN 2: MANAGE MEMBERS FLAT FULL-SCREEN VIEW (NO POPUP!)
  // =========================================================================
  if (managingMembersDami) {
    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col ${
          isDayMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'
        }`}
      >
        {/* Top Bar with Back Arrow */}
        <div
          className={`h-14 px-4 border-b flex items-center justify-between shrink-0 ${
            isDayMode ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'
          }`}
        >
          <button
            onClick={() => setManagingMembersDami(null)}
            className="p-1 -ml-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-semibold text-sm truncate max-w-[200px]">
            Manage Members: {managingMembersDami.name}
          </span>
          <button
            onClick={handleSaveMembers}
            disabled={isUpdatingMembers}
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer disabled:opacity-50"
          >
            {isUpdatingMembers ? 'Saving...' : 'Done'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 max-w-xl w-full mx-auto">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Members List</h1>
            <p className="text-xs opacity-75 mt-1">
              Select connected contacts to add to this public Dami account.
            </p>
          </div>

          <div className="space-y-2">
            {connectedContacts.length === 0 ? (
              <p className="text-xs opacity-60 py-4">No connected contacts found.</p>
            ) : (
              connectedContacts.map((contact) => {
                const isSelected = editMemberIds.includes(contact.uid);
                return (
                  <div
                    key={contact.uid}
                    onClick={() => toggleEditMemberSelection(contact.uid)}
                    className={`p-3 rounded-lg flex items-center justify-between cursor-pointer border transition-colors ${
                      isSelected
                        ? isDayMode ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'
                        : isDayMode ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-800 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={cleanAvatarUrl(contact.photoURL, contact.displayName)}
                        alt={contact.displayName}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <div>
                        <div className="text-sm font-medium">{contact.displayName}</div>
                        <div className="text-xs opacity-60 font-mono">@{contact.qid || 'user'}</div>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="w-5 h-5 rounded text-sky-600 accent-sky-600 cursor-pointer pointer-events-none"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN SCREEN: DAMI ACCOUNTS FLAT FULL-SCREEN VIEW (NO POPUP!)
  // =========================================================================
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${
        isDayMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'
      }`}
    >
      {/* Top Bar with Back Arrow & User Avatar (Exact Facebook style in screenshot) */}
      <div
        className={`h-14 px-4 border-b flex items-center justify-between shrink-0 ${
          isDayMode ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'
        }`}
      >
        <button
          onClick={onClose}
          className="p-1 -ml-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Back to chat"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <span className="font-semibold text-sm tracking-tight">
          Dami Manager
        </span>

        <img
          src={cleanAvatarUrl(currentUser.photoURL, currentUser.displayName)}
          alt="Profile"
          className="w-8 h-8 rounded-full object-cover"
        />
      </div>

      {/* Flat Navigation Tabs */}
      <div
        className={`flex border-b text-xs shrink-0 ${
          isDayMode ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'
        }`}
      >
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-3 text-center border-b-2 font-bold transition-colors cursor-pointer ${
            activeTab === 'list'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400'
              : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          My Accounts ({damiAccounts.length})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-3 text-center border-b-2 font-bold transition-colors cursor-pointer ${
            activeTab === 'create'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400'
              : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          + Create New Dami
        </button>
      </div>

      {/* Flat Full-Screen Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 max-w-xl w-full mx-auto">
        {/* TAB 1: ACCOUNTS LIST */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Accounts</h1>
              <p className="text-xs opacity-75 mt-1 leading-relaxed">
                Tap an account to enter chat, or click &ldquo;API&rdquo; for external integration.
              </p>
            </div>

            {damiAccounts.length === 0 ? (
              <div className="py-12 text-center opacity-70">
                <Users className="w-10 h-10 opacity-40 mx-auto mb-2" />
                <p className="font-semibold text-sm">No Dami accounts yet</p>
                <p className="text-xs opacity-60 mt-1">Create a new account to get started.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Create Dami Account
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {damiAccounts.map((dami) => {
                  const isCreator = dami.creatorId === currentUser.uid;
                  const memberCount = dami.memberIds?.length || 1;
                  const isDeletingThis = confirmDeleteId === dami.id;

                  return (
                    <div key={dami.id} className="py-3.5 first:pt-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm">{dami.name}</span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 opacity-80">
                              {dami.type === 'private' ? 'Private' : 'Public'}
                            </span>
                          </div>
                          <div className="text-xs opacity-60 mt-0.5">
                            {dami.type === 'private' ? 'Private (Only you)' : `${memberCount} members • Creator @${dami.creatorQid || dami.creatorName}`}
                          </div>
                        </div>

                        {/* Plain Flat Action Buttons */}
                        <div className="flex items-center space-x-2">
                          {/* Open Chat */}
                          <button
                            onClick={() => {
                              onOpenDamiChat(dami.channelId);
                              onClose();
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-sky-600 hover:text-white transition-colors cursor-pointer"
                          >
                            Chat
                          </button>

                          {/* API & Token (Switches to flat screen) */}
                          <button
                            onClick={() => setSelectedApiDami(dami)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-sky-600 hover:text-white transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            <Key className="w-3 h-3" />
                            <span>API</span>
                          </button>

                          {/* Manage Members (if public creator) */}
                          {isCreator && dami.type === 'public' && (
                            <button
                              onClick={() => {
                                setManagingMembersDami(dami);
                                setEditMemberIds((dami.memberIds || []).filter((id) => id !== currentUser.uid));
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              Members
                            </button>
                          )}

                          {/* Delete */}
                          {isCreator && (
                            <button
                              onClick={() => setConfirmDeleteId(dami.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline Delete Confirmation */}
                      {isDeletingThis && (
                        <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs flex items-center justify-between">
                          <span>Permanently delete <strong>{dami.name}</strong>?</span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 text-xs font-medium cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeleteDami(dami)}
                              className="px-2.5 py-0.5 bg-rose-600 text-white rounded text-xs font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREATE DAMI ACCOUNT */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateDami} className="space-y-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Create Dami</h1>
              <p className="text-xs opacity-75 mt-1 leading-relaxed">
                Create a private personal space for yourself or a public space for your contacts.
              </p>
            </div>

            {/* Type selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70">Type</label>
              <div className="flex space-x-3">
                <label className="flex items-center space-x-2 cursor-pointer text-xs font-medium">
                  <input
                    type="radio"
                    name="damiType"
                    checked={damiType === 'private'}
                    onChange={() => setDamiType('private')}
                    className="w-4 h-4 accent-sky-600"
                  />
                  <span>Private (Only you)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-xs font-medium">
                  <input
                    type="radio"
                    name="damiType"
                    checked={damiType === 'public'}
                    onChange={() => setDamiType('public')}
                    className="w-4 h-4 accent-sky-600"
                  />
                  <span>Public (With contacts)</span>
                </label>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70">
                Name (Must end with numbers) *
              </label>
              <input
                type="text"
                value={damiName}
                onChange={(e) => setDamiName(e.target.value)}
                placeholder="e.g. Alex01, VIP777, Knight99"
                required
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none ${
                  isDayMode ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-700'
                }`}
              />
              <p className="text-[11px] opacity-60">e.g. Alex01, VIP777</p>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70">
                Description (Optional)
              </label>
              <input
                type="text"
                value={damiDesc}
                onChange={(e) => setDamiDesc(e.target.value)}
                placeholder="Enter a short description..."
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none ${
                  isDayMode ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-700'
                }`}
              />
            </div>

            {/* Public Member Selection */}
            {damiType === 'public' && (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Select Contacts ({selectedMemberIds.length} selected)
                </label>
                {connectedContacts.length === 0 ? (
                  <p className="text-xs opacity-60">No contacts added yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {connectedContacts.map((contact) => {
                      const isSelected = selectedMemberIds.includes(contact.uid);
                      return (
                        <div
                          key={contact.uid}
                          onClick={() => toggleMemberSelection(contact.uid)}
                          className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? isDayMode ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'
                              : isDayMode ? 'border-slate-200' : 'border-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <img
                              src={cleanAvatarUrl(contact.photoURL, contact.displayName)}
                              alt={contact.displayName}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                            <div>
                              <div className="text-xs font-medium">{contact.displayName}</div>
                              <div className="text-[10px] opacity-60 font-mono">@{contact.qid || 'user'}</div>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="w-4 h-4 rounded text-sky-600 accent-sky-600 pointer-events-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Error & Success Notice */}
            {errorMsg && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !damiName.trim() || !hasEndingNumber}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-sm cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Dami Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
