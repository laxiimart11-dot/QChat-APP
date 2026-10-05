/**
 * Firebase Cloud Functions for QChat Webhook & API Integration
 *
 * Requirements fulfilled:
 * 1. Inbound Message System: HTTP Cloud Function (onRequest) that receives POST requests and saves to Firestore.
 * 2. Outbound Message System: Firestore Trigger (onDocumentCreated) that detects new messages and dispatches HTTP POST webhooks.
 * 3. Security: Token / API key verification system validating against Firestore credentials.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================================================
// 1. SECURITY & AUTHENTICATION HELPER
// ============================================================================

/**
 * Validates the API token / Key from headers or query parameters against Firestore dami_accounts
 */
async function authenticateApiRequest(req: any): Promise<{ dami: any; id: string } | null> {
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
  } else if (req.body && req.body.token) {
    token = String(req.body.token).trim();
  }

  if (!token) return null;

  try {
    const snap = await db.collection('dami_accounts').where('apiToken', '==', token).limit(1).get();
    if (snap.empty) {
      // Fallback scan in case index is pending
      const allAccounts = await db.collection('dami_accounts').get();
      for (const doc of allAccounts.docs) {
        const data = doc.data();
        if (data.apiToken === token) {
          return { dami: data, id: doc.id };
        }
      }
      return null;
    }

    const doc = snap.docs[0];
    return { dami: doc.data(), id: doc.id };
  } catch (error) {
    console.error('Error authenticating API token in Cloud Function:', error);
    return null;
  }
}

// ============================================================================
// 2. INBOUND MESSAGE SYSTEM (HTTP Cloud Function API Endpoint)
// ============================================================================

/**
 * Cloud Function: inboundMessageHandler
 * Trigger: HTTPS POST Request
 * Purpose: Receives message data from external automations (n8n, Make, scripts)
 *          and safely saves it to the Firebase Firestore database.
 */
export const inboundMessageHandler = onRequest(
  { cors: true, timeoutSeconds: 30, memory: '256MiB' },
  async (req, res) => {
    // Enable CORS for automation platforms (n8n, Make, Zapier, Web browsers)
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-token, x-dami-token');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method Not Allowed. Please send an HTTP POST request.'
      });
      return;
    }

    try {
      // Verify Secure Token / API Key
      const authResult = await authenticateApiRequest(req);
      if (!authResult) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Invalid or missing API token.',
          hint: 'Provide token via Authorization: Bearer <token>, x-api-token header, or ?token=<token> query param.'
        });
        return;
      }

      const { dami, id: damiId } = authResult;
      const channelId = dami.channelId;

      if (!channelId) {
        res.status(400).json({
          success: false,
          error: 'Bad Request: API token is not linked to an active chat channel.'
        });
        return;
      }

      // Check Token Permissions
      const permissions: string[] = dami.apiPermissions || ['read_messages', 'send_messages', 'send_media', 'read_info'];
      if (!permissions.includes('send_messages')) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: API token lacks "send_messages" permission.'
        });
        return;
      }

      // Extract message data safely (supporting flexible n8n, Make, and JSON fields)
      const body = req.body || {};
      const text = String(
        body.text ||
        body.message ||
        body.content ||
        body.output ||
        (body.data && body.data.text) ||
        body.reply ||
        ''
      ).trim();

      const senderName = String(
        body.senderName ||
        body.agentName ||
        body.botName ||
        body.from ||
        ''
      ).trim() || dami.name;

      const mediaType = (body.mediaType || 'text') as string;
      const mediaUrl = String(body.mediaUrl || '').trim();
      const fileName = String(body.fileName || '').trim();

      if (!text && !mediaUrl) {
        res.status(400).json({
          success: false,
          error: 'Validation Error: Please provide a "text" or "message" field in your JSON body.'
        });
        return;
      }

      const now = new Date().toISOString();

      // Safely write message document into Firebase Firestore
      const msgRef = await db.collection('channels').doc(channelId).collection('messages').add({
        channelId,
        senderId: `dami_${damiId}`,
        senderName,
        senderPhoto: dami.avatarUrl || '',
        tokenName: dami.name, // Clearly displays the Token Name
        apiTokenName: dami.name,
        isApiMessage: true,
        text: text || (fileName ? `[${mediaType.toUpperCase()}] ${fileName}` : `[${mediaType.toUpperCase()}]`),
        mediaType,
        mediaUrl,
        fileName,
        serverVanished: false,
        readBy: [`dami_${damiId}`],
        status: 'sent',
        createdAt: now
      });

      // Update parent channel preview metadata
      await db.collection('channels').doc(channelId).update({
        lastMessageText: text.slice(0, 120),
        lastMessageTime: now,
        lastMessageSenderId: `dami_${damiId}`
      });

      console.log(`[Cloud Function: Inbound Success] MsgId: ${msgRef.id} | Token: ${dami.name} | Sender: ${senderName}`);

      res.status(200).json({
        success: true,
        message: 'Message safely saved to Firebase database and delivered to chat.',
        data: {
          messageId: msgRef.id,
          tokenName: dami.name,
          senderName,
          channelId,
          text,
          timestamp: now
        }
      });
    } catch (error: any) {
      console.error('[Cloud Function: Inbound Error]', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Internal server error saving message to database.'
      });
    }
  }
);

// ============================================================================
// 3. OUTBOUND MESSAGE SYSTEM (Firestore Database Trigger Webhook)
// ============================================================================

/**
 * Cloud Function: outboundWebhookTrigger
 * Trigger: Firestore onDocumentCreated ('channels/{channelId}/messages/{messageId}')
 * Purpose: Automatically detects any new message created in the Firebase database,
 *          looks up if the channel is configured with a Webhook URL,
 *          and dispatches an HTTPS POST request to that URL (n8n, Make, or custom endpoint).
 */
export const outboundWebhookTrigger = onDocumentCreated(
  'channels/{channelId}/messages/{messageId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const messageData = snap.data();
    const { channelId, messageId } = event.params;

    // Prevent infinite loops by skipping messages generated by API bots
    const senderId = String(messageData.senderId || '');
    if (senderId.startsWith('dami_') || messageData.isApiMessage) {
      console.log(`[Outbound Trigger] Skipping bot message ${messageId} to prevent loops.`);
      return;
    }

    try {
      // Find Dami account connected to this channel that has an outbound webhookUrl configured
      const damiSnap = await db.collection('dami_accounts')
        .where('channelId', '==', channelId)
        .limit(1)
        .get();

      if (damiSnap.empty) {
        return; // No Dami account for this channel
      }

      const damiDoc = damiSnap.docs[0];
      const dami = damiDoc.data();
      const webhookUrl = String(dami.webhookUrl || '').trim();

      if (!webhookUrl) {
        return; // No webhook URL configured
      }

      console.log(`[Outbound Trigger] Forwarding message ${messageId} from ${messageData.senderName} to: ${webhookUrl}`);

      // Dispatch HTTPS POST request to the configured Webhook URL
      const payload = {
        event: 'message.created',
        channelId,
        messageId,
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        text: messageData.text,
        mediaType: messageData.mediaType || 'text',
        mediaUrl: messageData.mediaUrl || '',
        tokenName: dami.name,
        apiToken: dami.apiToken,
        timestamp: messageData.createdAt || new Date().toISOString()
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'QChat-Firebase-Webhook/2.0',
          'x-qchat-token': dami.apiToken || ''
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000) // 15-second timeout
      });

      console.log(`[Outbound Trigger] Webhook delivery status: ${response.status} ${response.statusText}`);

      // If the external webhook (e.g. n8n AI agent response) synchronously replies with content, post it back!
      if (response.ok) {
        try {
          const resData: any = await response.json();
          const replyText = String(resData?.reply || resData?.text || resData?.output || resData?.message || '').trim();

          if (replyText) {
            const now = new Date().toISOString();
            await db.collection('channels').doc(channelId).collection('messages').add({
              channelId,
              senderId: `dami_${damiDoc.id}`,
              senderName: resData?.agentName || resData?.senderName || dami.name,
              senderPhoto: dami.avatarUrl || '',
              tokenName: dami.name,
              apiTokenName: dami.name,
              isApiMessage: true,
              text: replyText,
              mediaType: 'text',
              status: 'sent',
              createdAt: now
            });

            await db.collection('channels').doc(channelId).update({
              lastMessageText: replyText.slice(0, 120),
              lastMessageTime: now,
              lastMessageSenderId: `dami_${damiDoc.id}`
            });
            console.log(`[Outbound Trigger] Synchronous AI reply posted back to chat.`);
          }
        } catch {
          // Response is non-JSON or standard 200 OK, nothing further needed
        }
      }
    } catch (error: any) {
      console.error(`[Outbound Trigger Error] Failed delivering webhook to ${channelId}:`, error?.message);
    }
  }
);
