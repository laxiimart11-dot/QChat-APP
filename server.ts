import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import { initializeApp as initFirebaseServerApp } from 'firebase/app';
import { getAuth as getServerAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { startStorageAutoSyncWatcher, rebuildServerStorage } from './server/buildSync.ts';

dotenv.config();

const rootDir = process.cwd();
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS middleware so external webhooks can connect without browser/cross-origin blocks
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-token, x-dami-token');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Initialize Firebase for server-side Dami HTTP API & Webhooks
const serverFirebaseApp = initFirebaseServerApp(firebaseConfig, 'qchat_server');
const serverAuth = getServerAuth(serverFirebaseApp);
signInAnonymously(serverAuth).catch((err) => {
  console.log('Server anonymous auth initialized:', err?.message || 'ready');
});

const serverDb = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== '' && firebaseConfig.firestoreDatabaseId !== '(default)')
  ? getFirestore(serverFirebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(serverFirebaseApp);

const PORT = 3000;
const GMAIL_USER = process.env.GMAIL_USER || 'laximart11@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'vnwx lbsy hrjc ukhs';
const AUTH_SECRET = process.env.AUTH_SECRET || 'qchat_secure_secret_key_2026_bd';

// Nodemailer Transporter configured with user's Gmail and App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

// In-memory & file-backed OTP cache: normalizedEmail -> { otp, expiresAt, purpose }
interface OtpRecord {
  otp: string;
  expiresAt: number;
  purpose: 'register' | 'forgot_password' | 'verify';
}

const OTP_CACHE_FILE = '/tmp/qchat_otp_cache.json';

function loadOtpCache(): Map<string, OtpRecord> {
  const map = new Map<string, OtpRecord>();
  try {
    if (fs.existsSync(OTP_CACHE_FILE)) {
      const raw = fs.readFileSync(OTP_CACHE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      const now = Date.now();
      for (const [k, v] of Object.entries(data)) {
        const rec = v as OtpRecord;
        if (rec && rec.expiresAt > now) {
          map.set(k, rec);
        }
      }
    }
  } catch {
    // ignore
  }
  return map;
}

function saveOtpCache(map: Map<string, OtpRecord>) {
  try {
    const obj = Object.fromEntries(map);
    fs.writeFileSync(OTP_CACHE_FILE, JSON.stringify(obj), 'utf-8');
  } catch {
    // ignore
  }
}

const otpStore = loadOtpCache();

// Helper: Generate deterministic internal Firebase Auth password for email
export function generateInternalCredential(email: string): string {
  const normalized = email.trim().toLowerCase();
  const hash = crypto.createHmac('sha256', AUTH_SECRET).update(normalized).digest('hex');
  return `Qc!${hash.slice(0, 18)}9A#`;
}

// Helper: Hash user's chosen password
export function hashUserPassword(password: string): string {
  return crypto.createHmac('sha256', AUTH_SECRET).update(password).digest('hex');
}

// 1. Endpoint: Send 6-Digit Verification Code (OTP) via Gmail (100% English, NO LINKS)
app.post('/api/send-otp', async (req: Request, res: Response) => {
  try {
    const { email, purpose = 'register', userName } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generate clean 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    otpStore.set(normalizedEmail, {
      otp,
      expiresAt,
      purpose,
    });
    saveOtpCache(otpStore);

    const isForgot = purpose === 'forgot_password';
    const subject = isForgot
      ? `QChat Password Reset Code: ${otp}`
      : `QChat Verification Code: ${otp}`;

    const titleText = isForgot ? 'Password Reset Code' : 'Account Verification Code';
    const subText = isForgot
      ? 'Use the 6-digit code below to reset your QChat account password:'
      : 'Use the 6-digit code below to verify your QChat account:';

    // Text format: strictly English, NO LINKS, with footer "Power by laxiimart.com"
    const textBody = `
${titleText}
${subText}

Verification Code: ${otp}

This code is valid for 10 minutes. For security reasons, do not share this code with anyone.
If you did not request this code, please ignore this email.

Power by laxiimart.com
`.trim();

    // HTML format: strictly English, NO LINKS, with footer "Power by laxiimart.com"
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
          <!-- Top Header -->
          <tr>
            <td style="padding: 28px 24px 20px; text-align: center; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">QChat</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #e0e7ff; font-weight: 500;">Real-time Messaging</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 24px 24px; text-align: center;">
              <h2 style="margin: 0 0 10px; font-size: 19px; font-weight: 700; color: #f1f5f9;">
                ${titleText}
              </h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.5; color: #94a3b8;">
                ${userName ? `Hello <strong>${userName}</strong>, ` : ''}${subText}
              </p>

              <!-- 6 Digit Big Numeric Box (NO LINKS!) -->
              <div style="background-color: #0f172a; border: 2px dashed #4f46e5; border-radius: 14px; padding: 18px 28px; margin: 0 auto 24px; display: inline-block;">
                <span style="font-family: monospace, 'Courier New', Courier; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #38bdf8;">
                  ${otp}
                </span>
              </div>

              <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
                ⏱️ This code will expire in <strong>10 minutes</strong>.
              </p>
              <p style="margin: 6px 0 0; font-size: 12px; color: #64748b;">
                Never share this verification code with anyone for your security.
              </p>
            </td>
          </tr>

          <!-- Notice -->
          <tr>
            <td style="padding: 16px 24px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 11px; color: #64748b;">
                If you did not request this verification code, please ignore this email.
              </p>
              <!-- Required Footer Attribution -->
              <p style="margin: 8px 0 0; font-size: 12px; font-weight: 600; color: #818cf8; letter-spacing: 0.3px;">
                Power by laxiimart.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

    await transporter.sendMail({
      from: `"QChat Security" <${GMAIL_USER}>`,
      to: normalizedEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });

    console.log(`[OTP Sent] Purpose: ${purpose} | To: ${normalizedEmail}`);
    res.json({
      success: true,
      message: 'A 6-digit verification code has been sent to your email.',
    });
  } catch (error: any) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to send verification email. Please try again.',
    });
  }
});

// 2. Endpoint: Verify 6-Digit OTP Code
app.post('/api/verify-otp', (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ success: false, error: 'Email and 6-digit code are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.toString().trim();

    const record = otpStore.get(normalizedEmail);
    if (!record) {
      res.status(400).json({
        success: false,
        error: 'No active verification code found or it has expired. Please request a new code.',
      });
      return;
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      saveOtpCache(otpStore);
      res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new code.',
      });
      return;
    }

    if (record.otp !== cleanCode) {
      res.status(400).json({
        success: false,
        error: 'Invalid verification code. Please check your email and try again.',
      });
      return;
    }

    // OTP is valid! Clear OTP and generate internal credential and hash
    otpStore.delete(normalizedEmail);
    saveOtpCache(otpStore);
    const internalCredential = generateInternalCredential(normalizedEmail);

    res.json({
      success: true,
      message: 'Verification successful!',
      internalCredential,
    });
  } catch (error: any) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  }
});

// 3. Endpoint: Get Auth Credential (for existing verified user login)
app.post('/api/auth-credential', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const internalCredential = generateInternalCredential(normalizedEmail);

    res.json({
      success: true,
      internalCredential,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// 4. Endpoint: Compute password hash
app.post('/api/hash-password', (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ success: false, error: 'Password is required' });
      return;
    }
    const hash = hashUserPassword(password);
    res.json({ success: true, hash });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// ==============================================================
// PUBLIC HTTP REST & WEBHOOK API (Webhook In, Webhook Out, GET, POST, cURL)
// ==============================================================

// Helper: Authenticate Dami HTTP request by Token
async function authenticateDamiToken(req: Request): Promise<{ dami: any; id: string } | null> {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.headers['x-api-token']) {
    token = String(req.headers['x-api-token']).trim();
  } else if (req.headers['x-dami-token']) {
    token = String(req.headers['x-dami-token']).trim();
  } else if (req.query.token) {
    token = String(req.query.token).trim();
  } else if (req.query.api_key) {
    token = String(req.query.api_key).trim();
  } else if (req.query.apiKey) {
    token = String(req.query.apiKey).trim();
  } else if (req.body && typeof req.body === 'object') {
    if (req.body.token) token = String(req.body.token).trim();
    else if (req.body.api_key) token = String(req.body.api_key).trim();
    else if (req.body.apiKey) token = String(req.body.apiKey).trim();
  }

  if (!token) return null;

  try {
    const snap = await getDocs(collection(serverDb, 'dami_accounts'));
    let matched: { dami: any; id: string } | null = null;
    snap.forEach((d) => {
      const data = d.data();
      if (data.apiToken && data.apiToken === token) {
        matched = { dami: data, id: d.id };
      }
    });
    return matched;
  } catch (err) {
    console.error('Error verifying Dami token in Firestore:', err);
    return null;
  }
}

// Common POST Handler for incoming messages from outside (Webhook In, cURL, REST)
async function handleIncomingApiMessage(req: Request, res: Response) {
  try {
    const authResult = await authenticateDamiToken(req);
    if (!authResult) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or missing API token.',
        hint: 'Provide token via Header "Authorization: Bearer <token>", Header "x-api-token: <token>", or query param "?token=<token>".'
      });
      return;
    }

    const { dami, id: damiId } = authResult;
    const channelId = dami.channelId;

    if (!channelId) {
      res.status(400).json({ success: false, error: 'This API Token is not linked to an active chat channel.' });
      return;
    }

    const permissions: string[] = dami.apiPermissions || ['read_messages', 'send_messages', 'send_media', 'read_info'];

    // Flexible field extraction supporting raw JSON payloads
    const body = req.body || {};
    const text = String(
      body.text ||
      body.message ||
      body.content ||
      body.output ||
      (body.data && body.data.text) ||
      body.prompt ||
      body.reply ||
      ''
    ).trim();

    const senderName = String(
      body.senderName ||
      body.agentName ||
      body.botName ||
      body.name ||
      body.from ||
      ''
    ).trim();

    const mediaType = (body.mediaType || 'text') as string;
    const mediaUrl = String(body.mediaUrl || '').trim();
    const fileName = String(body.fileName || '').trim();
    const fileSize = body.fileSize ? Number(body.fileSize) : null;
    const mediaDuration = body.mediaDuration ? Number(body.mediaDuration) : null;

    const isMedia = Boolean(mediaUrl || (mediaType && mediaType !== 'text') || fileName);

    if (isMedia && !permissions.includes('send_media')) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: This API token does not have permission to send media/files ("send_media").'
      });
      return;
    }

    if (!isMedia && !permissions.includes('send_messages')) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: This API token does not have permission to send text messages ("send_messages").'
      });
      return;
    }

    if (!text && !mediaUrl) {
      res.status(400).json({
        success: false,
        error: 'Validation error: Please provide a "text" or "message" field in your JSON body.'
      });
      return;
    }

    const now = new Date().toISOString();
    // Use specified agent/sender name or default to Token/Dami name
    const displayName = senderName || dami.name;

    // Create the message document in the linked channel
    const messagesCol = collection(serverDb, 'channels', channelId, 'messages');
    const msgDoc = await addDoc(messagesCol, {
      channelId,
      senderId: `dami_${damiId}`,
      senderName: displayName,
      senderPhoto: dami.avatarUrl || '',
      tokenName: dami.name, // The Token Name!
      apiTokenName: dami.name,
      isApiMessage: true,
      text: text || (fileName ? `[${mediaType.toUpperCase()}] ${fileName}` : `[${mediaType.toUpperCase()}]`),
      mediaType,
      mediaUrl,
      mediaDuration,
      fileName,
      fileSize,
      expiresAt: mediaType === 'image' ? Date.now() + 24 * 60 * 60 * 1000 : null,
      serverVanished: false,
      readBy: [`dami_${damiId}`],
      status: 'sent',
      createdAt: now
    });

    // Update parent channel last message preview
    const previewText = text || (fileName ? `[${mediaType.toUpperCase()}] ${fileName}` : `[${mediaType.toUpperCase()}]`);
    await updateDoc(doc(serverDb, 'channels', channelId), {
      lastMessageText: previewText.slice(0, 120),
      lastMessageTime: now,
      lastMessageSenderId: `dami_${damiId}`
    });

    console.log(`[API / Webhook Message Received] Token: ${dami.name} | Sender: ${displayName} | MsgId: ${msgDoc.id}`);

    res.json({
      success: true,
      message: 'Message delivered to chat successfully',
      data: {
        messageId: msgDoc.id,
        damiId,
        tokenName: dami.name,
        senderName: displayName,
        channelId,
        text,
        mediaType,
        timestamp: now
      }
    });
  } catch (error: any) {
    console.error('Error posting API message:', error);
    res.status(500).json({ success: false, error: error?.message || 'Internal server error while sending message.' });
  }
}

// Common GET Handler for retrieving messages (Webhook polling, REST)
async function handleGetApiMessages(req: Request, res: Response) {
  try {
    const authResult = await authenticateDamiToken(req);
    if (!authResult) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or missing API token.',
        hint: 'Pass token in Authorization: Bearer <token> or ?token=<token>'
      });
      return;
    }

    const { dami } = authResult;
    const channelId = dami.channelId;

    if (!channelId) {
      res.status(400).json({ success: false, error: 'Token is not linked to a valid chat channel.' });
      return;
    }

    const permissions: string[] = dami.apiPermissions || ['read_messages', 'send_messages', 'send_media', 'read_info'];
    if (!permissions.includes('read_messages')) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: This API token does not have permission to read messages ("read_messages").'
      });
      return;
    }

    const limitCount = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const sinceTimestamp = req.query.since ? String(req.query.since) : '';

    const messagesCol = collection(serverDb, 'channels', channelId, 'messages');
    const snap = await getDocs(messagesCol);

    const messages: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (!sinceTimestamp || data.createdAt > sinceTimestamp) {
        messages.push({ id: d.id, ...data });
      }
    });

    // Sort chronologically ascending
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const returnedMessages = messages.slice(-limitCount);

    res.json({
      success: true,
      tokenName: dami.name,
      damiType: dami.type,
      channelId,
      count: returnedMessages.length,
      messages: returnedMessages
    });
  } catch (error: any) {
    console.error('Error getting API messages:', error);
    res.status(500).json({ success: false, error: error?.message || 'Internal server error' });
  }
}

// 5. POST Endpoints for Sending Messages / Webhook Triggers
app.post('/api/inbound', handleIncomingApiMessage);
app.post('/api/v1/inbound', handleIncomingApiMessage);
app.post('/api/messages', handleIncomingApiMessage);
app.post('/api/dami/messages', handleIncomingApiMessage);
app.post('/api/webhook', handleIncomingApiMessage);
app.post('/api/v1/webhook', handleIncomingApiMessage);
app.post('/api/v1/messages', handleIncomingApiMessage);

// 6. GET Endpoints for Retrieving Messages
app.get('/api/inbound', handleGetApiMessages);
app.get('/api/messages', handleGetApiMessages);
app.get('/api/dami/messages', handleGetApiMessages);
app.get('/api/v1/messages', handleGetApiMessages);

// 7. Webhook status & connectivity verification endpoint
app.get('/api/webhook', async (req: Request, res: Response) => {
  const authResult = await authenticateDamiToken(req);
  res.json({
    status: 'online',
    service: 'QChat Public Webhook & REST API',
    authenticated: Boolean(authResult),
    tokenName: authResult ? authResult.dami.name : null,
    channelId: authResult ? authResult.dami.channelId : null,
    endpoints: {
      postMessage: 'POST /api/messages (or /api/webhook)',
      getMessages: 'GET /api/messages?token=<token>',
      webhookUrl: 'POST /api/webhook?token=<token>'
    },
    samplePayload: {
      text: 'Hello from external client!',
      senderName: 'External Client'
    }
  });
});
app.get('/api/v1/webhook', (req, res) => res.redirect('/api/webhook'));

// 8. Configure Outbound Webhook URL
app.post('/api/dami/webhook-config', async (req: Request, res: Response) => {
  try {
    const authResult = await authenticateDamiToken(req);
    if (!authResult) {
      res.status(401).json({ success: false, error: 'Unauthorized: Invalid API token.' });
      return;
    }

    const { dami, id: damiId } = authResult;
    const webhookUrl = String(req.body.webhookUrl || '').trim();

    await updateDoc(doc(serverDb, 'dami_accounts', damiId), {
      webhookUrl,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Outbound webhook URL saved successfully',
      damiId,
      tokenName: dami.name,
      webhookUrl
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

// 9. Outbound Webhook Trigger: Forward user message in QChat to external webhook
app.post('/api/dami/trigger-webhook', async (req: Request, res: Response) => {
  try {
    const { channelId, messageId, senderId, senderName, text } = req.body;
    if (!channelId || !text) {
      res.status(400).json({ success: false, error: 'channelId and text are required' });
      return;
    }

    // Ignore bot messages to avoid infinite feedback loops
    if (senderId && String(senderId).startsWith('dami_')) {
      res.json({ success: true, skipped: 'Ignored bot message' });
      return;
    }

    // Find any Dami account connected to this channel that has a webhookUrl
    const snap = await getDocs(collection(serverDb, 'dami_accounts'));
    let targetDami: { dami: any; id: string } | null = null;
    snap.forEach((d) => {
      const data: any = d.data();
      if (data.channelId === channelId && data.webhookUrl && data.webhookUrl.trim() !== '') {
        targetDami = { dami: data, id: d.id };
      }
    });

    const target = targetDami as { dami: any; id: string } | null;
    if (!target) {
      res.json({ success: true, forwarded: false, reason: 'No outbound webhook configured for this channel' });
      return;
    }

    const dami: any = target.dami;
    const damiId: string = target.id;
    console.log(`[Outbound Webhook] Forwarding message from ${senderName} to: ${dami.webhookUrl}`);

    // Send HTTP POST to the configured outbound webhook URL
    const response = await fetch(dami.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'QChat-Webhook/1.0',
        'x-qchat-token': dami.apiToken || ''
      },
      body: JSON.stringify({
        event: 'message.created',
        channelId,
        messageId,
        senderId,
        senderName,
        text,
        tokenName: dami.name,
        apiToken: dami.apiToken,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(12000) // 12 seconds timeout
    }).catch((err) => {
      console.warn('[Outbound Webhook Error]:', err?.message);
      return null;
    });

    // If external server responds synchronously with reply text, automatically post it back into the chat!
    if (response && response.ok) {
      try {
        const resData: any = await response.json();
        const replyText = resData?.reply || resData?.text || resData?.output || resData?.message;
        if (replyText && typeof replyText === 'string' && replyText.trim() !== '') {
          const now = new Date().toISOString();
          const messagesCol = collection(serverDb, 'channels', channelId, 'messages');
          await addDoc(messagesCol, {
            channelId,
            senderId: `dami_${damiId}`,
            senderName: resData?.agentName || resData?.senderName || dami.name,
            senderPhoto: dami.avatarUrl || '',
            tokenName: dami.name,
            apiTokenName: dami.name,
            isApiMessage: true,
            text: replyText.trim(),
            mediaType: 'text',
            reactions: {},
            readBy: [`dami_${damiId}`],
            status: 'sent',
            createdAt: now
          });

          await updateDoc(doc(serverDb, 'channels', channelId), {
            lastMessageText: replyText.trim().slice(0, 120),
            lastMessageTime: now,
            lastMessageSenderId: `dami_${damiId}`
          });
        }
      } catch {
        // Non-JSON or empty response from webhook, perfectly fine
      }
    }

    res.json({ success: true, forwarded: true, tokenName: dami.name });
  } catch (error: any) {
    console.error('Trigger webhook error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

// 10. GET /api/dami/info
// Get Dami account info and metadata
app.get('/api/dami/info', async (req: Request, res: Response) => {
  try {
    const authResult = await authenticateDamiToken(req);
    if (!authResult) {
      res.status(401).json({ success: false, error: 'Unauthorized: Invalid Dami token.' });
      return;
    }

    const { dami, id: damiId } = authResult;

    const permissions: string[] = dami.apiPermissions || ['read_messages', 'send_messages', 'send_media', 'read_info'];
    if (!permissions.includes('read_info')) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: This Dami API token does not have permission to view account info ("read_info").'
      });
      return;
    }

    res.json({
      success: true,
      dami: {
        id: damiId,
        name: dami.name,
        type: dami.type,
        creatorName: dami.creatorName,
        creatorQid: dami.creatorQid,
        description: dami.description,
        memberCount: dami.memberIds?.length || 1,
        channelId: dami.channelId,
        webhookUrl: dami.webhookUrl || '',
        createdAt: dami.createdAt,
        updatedAt: dami.updatedAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

// 11. POST /api/messages/vanish
// Vanish a one-time message from receiver while preserving color-change for sender
app.post('/api/messages/vanish', async (req: Request, res: Response) => {
  try {
    const { channelId, messageId } = req.body;
    if (!channelId || !messageId) {
      res.status(400).json({ error: 'Missing channelId or messageId' });
      return;
    }
    const msgRef = doc(serverDb, 'channels', channelId, 'messages', messageId);
    await updateDoc(msgRef, {
      vanishedFromReceiver: true,
      vanishedAt: Date.now()
    });
    res.json({ success: true, vanished: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to vanish message' });
  }
});

// Digital Asset Links for Google Play Store TWA verification
app.get('/.well-known/assetlinks.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  const assetLinksPath = path.resolve(rootDir, 'public', '.well-known', 'assetlinks.json');
  if (fs.existsSync(assetLinksPath)) {
    res.sendFile(assetLinksPath);
  } else {
    res.json([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.qchat.messenger',
          sha256_cert_fingerprints: [
            '14:6D:E9:7D:3B:56:88:51:71:0D:37:46:1D:C4:F3:D5:19:9C:2B:65:21:54:99:99:8A:2A:B2:D6:0B:A4:91:02'
          ]
        }
      }
    ]);
  }
});

// Web-based Directory Browser for Server Storage (Accessible directly via browser)
app.get(['/downloads', '/server-storage', '/server-files'], async (_req: Request, res: Response) => {
  const getFileSize = (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const bytes = fs.statSync(filePath).size;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      }
    } catch {
      // ignore
    }
    return '--';
  };

  const apkSize = getFileSize(path.resolve(rootDir, 'server-storage', 'apk-and-bundles', 'QChat-release.apk'));
  const zipSize = getFileSize(path.resolve(rootDir, 'server-storage', 'offline-full-bundle', 'qchat-playstore-complete-package.zip'));
  const aabSize = getFileSize(path.resolve(rootDir, 'server-storage', 'apk-and-bundles', 'QChat-release-signed.aab'));

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QChat Server Storage - Offline Files & Play Store Bundle</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #0b1120; color: #f8fafc; padding: 24px 16px; min-height: 100vh; }
    .container { max-width: 860px; margin: 0 auto; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 24px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .badge-purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #ffffff; }
    p.sub { font-size: 14px; color: #94a3b8; margin-bottom: 20px; line-height: 1.5; }
    .file-list { display: flex; flex-direction: column; gap: 12px; }
    .file-item { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .file-info { display: flex; flex-direction: column; gap: 4px; }
    .file-name { font-size: 15px; font-weight: 700; color: #f1f5f9; display: flex; align-items: center; gap: 8px; }
    .file-desc { font-size: 12px; color: #94a3b8; }
    .file-size { font-size: 12px; font-family: monospace; color: #38bdf8; font-weight: 600; }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none; transition: all 0.2s; cursor: pointer; }
    .btn-primary { background: #10b981; color: #042f2e; }
    .btn-primary:hover { background: #34d399; }
    .btn-secondary { background: #334155; color: #f8fafc; }
    .btn-secondary:hover { background: #475569; }
    .info-box { background: #0f172a; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; font-size: 13px; color: #cbd5e1; line-height: 1.6; margin-top: 16px; }
    code { background: #020617; padding: 2px 6px; border-radius: 4px; color: #38bdf8; font-family: monospace; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <span class="badge badge-green">LIVE AUTO-SYNC STORAGE</span>
        <span style="font-size: 12px; color: #64748b;">Firebase Project: <code>my-qchat</code></span>
      </div>
      <h1>QChat Server Storage</h1>
      <p class="sub">Direct download portal for offline APKs, Play Store packages, and configuration files. All files are automatically kept up-to-date by the server build engine.</p>

      <div class="file-list">
        <!-- 1. Offline APK -->
        <div class="file-item">
          <div class="file-info">
            <div class="file-name">
              <span>📱 QChat-release.apk</span>
              <span class="badge badge-green">Android APK</span>
            </div>
            <div class="file-desc">Ready-to-install Android APK file for direct offline installation</div>
            <div class="file-size">Size: ${apkSize} &bull; Path: /server-storage/apk-and-bundles/QChat-release.apk</div>
          </div>
          <a href="/downloads/QChat-release.apk" class="btn btn-primary" download>Download APK</a>
        </div>

        <!-- 2. Full Complete ZIP Bundle -->
        <div class="file-item">
          <div class="file-info">
            <div class="file-name">
              <span>📦 qchat-playstore-complete-package.zip</span>
              <span class="badge badge-purple">Complete Package</span>
            </div>
            <div class="file-desc">Complete bundle containing all Play Store upload assets and offline build files in a single ZIP</div>
            <div class="file-size">Size: ${zipSize} &bull; Path: /server-storage/offline-full-bundle/qchat-playstore-complete-package.zip</div>
          </div>
          <a href="/downloads/qchat-playstore-complete-package.zip" class="btn btn-primary" download>Download Full ZIP</a>
        </div>

        <!-- 3. Signed AAB for Google Play Store -->
        <div class="file-item">
          <div class="file-info">
            <div class="file-name">
              <span>🚀 QChat-release-signed.aab</span>
              <span class="badge badge-blue">Play Store AAB</span>
            </div>
            <div class="file-desc">Signed Android App Bundle ready for direct upload to Google Play Console</div>
            <div class="file-size">Size: ${aabSize} &bull; Path: /server-storage/apk-and-bundles/QChat-release-signed.aab</div>
          </div>
          <a href="/downloads/QChat-release-signed.aab" class="btn btn-secondary" download>Download AAB</a>
        </div>

        <!-- 4. AndroidManifest.xml -->
        <div class="file-item">
          <div class="file-info">
            <div class="file-name">
              <span>📄 AndroidManifest.xml</span>
              <span class="badge badge-blue">Config</span>
            </div>
            <div class="file-desc">Android Manifest with camera, microphone, GPS, and notification permissions</div>
          </div>
          <a href="/downloads/AndroidManifest.xml" class="btn btn-secondary" target="_blank">View / Download</a>
        </div>

        <!-- 5. MainActivity.java (FLAG_SECURE Hardware Screenshot Blocker) -->
        <div class="file-item">
          <div class="file-info">
            <div class="file-name">
              <span>🛡️ MainActivity.java</span>
              <span class="badge badge-green">FLAG_SECURE</span>
            </div>
            <div class="file-desc">Android OS hardware-level screenshot and screen recording blocker (WindowManager.LayoutParams.FLAG_SECURE)</div>
          </div>
          <a href="/downloads/MainActivity.java" class="btn btn-secondary" target="_blank">View / Download</a>
        </div>

        <!-- 6. assetlinks.json -->
        <div class="file-item">
          <div class="file-info">
            <div class="file-name">
              <span>🔗 assetlinks.json</span>
              <span class="badge badge-blue">Verification</span>
            </div>
            <div class="file-desc">Google Play Store Digital Asset Links for full-screen TWA verification</div>
          </div>
          <a href="/.well-known/assetlinks.json" class="btn btn-secondary" target="_blank">View / Download</a>
        </div>

        <!-- 7. playstore-metadata.json -->
        <div class="file-item">
          <div class="file-info">
            <div class="file-name">
              <span>📝 playstore-metadata.json</span>
              <span class="badge badge-blue">Store Listing</span>
            </div>
            <div class="file-desc">Google Play Store listing metadata with title, short description, and full description</div>
          </div>
          <a href="/downloads/playstore-metadata.json" class="btn btn-secondary" target="_blank">View / Download</a>
        </div>

        <!-- 8. PLAY_STORE_GUIDE.md -->
        <div class="file-item">
          <div class="file-info">
            <div class="file-name">
              <span>📖 PLAY_STORE_GUIDE.md</span>
              <span class="badge badge-blue">Instructions</span>
            </div>
            <div class="file-desc">Complete step-by-step instructions for publishing and uploading to Google Play Console</div>
          </div>
          <a href="/downloads/PLAY_STORE_GUIDE.md" class="btn btn-secondary" target="_blank">View / Download</a>
        </div>
      </div>

      <div class="info-box">
        <strong>💡 Server & Firebase Information:</strong><br>
        • These files are stored directly in your Cloud Server's <code>/server-storage/</code> directory.<br>
        • Firebase Project ID: <code>my-qchat</code> (Firestore & Auth database).<br>
        • Whenever changes are made, the server automatically rebuilds and syncs updated files to this storage.
      </div>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Direct offline file download route from server-storage with automatic live rebuild
app.get('/downloads/:filename', async (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);

  // If requesting an archive or package, automatically rebuild to guarantee latest code/assets
  if (filename.endsWith('.apk') || filename.endsWith('.aab') || filename.endsWith('.zip')) {
    await rebuildServerStorage();
  }

  const storagePaths = [
    path.resolve(rootDir, 'server-storage', 'apk-and-bundles', filename),
    path.resolve(rootDir, 'server-storage', 'offline-full-bundle', filename),
    path.resolve(rootDir, 'server-storage', 'android-playstore', filename),
    path.resolve(rootDir, 'public', 'downloads', filename)
  ];

  for (const filePath of storagePaths) {
    if (fs.existsSync(filePath)) {
      res.download(filePath, filename);
      return;
    }
  }

  res.status(404).send('File not found in server-storage');
});

// Vite Middleware Setup
async function startServer() {
  // Start server storage auto-sync watcher
  startStorageAutoSyncWatcher();

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(rootDir, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(rootDir, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QChat Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
