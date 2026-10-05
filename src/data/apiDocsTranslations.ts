export type DocLanguage = 'en' | 'hi' | 'es' | 'ar' | 'fr' | 'de' | 'ja' | 'zh' | 'ru';

export interface DocTranslationContent {
  langName: string;
  docTitle: string;
  docSubtitle: string;
  selectLanguage: string;
  backBtn: string;
  copyBtn: string;
  copiedBtn: string;

  // Step 1: Authentication & API Token
  step1Badge: string;
  step1Title: string;
  step1Desc: string;
  baseUrlLabel: string;
  headerAuthLabel: string;
  headerCustomLabel: string;
  queryParamLabel: string;
  tokenNameLabel: string;
  tokenBadgeDesc: string;

  // Step 2: Webhook In
  step2Badge: string;
  step2Title: string;
  step2Desc: string;
  step2WorkflowTitle: string;
  step2WorkflowSteps: string[];
  reqPayloadTitle: string;
  payloadFieldsTitle: string;
  fieldTextField: string;
  fieldSenderField: string;
  fieldMediaUrlField: string;
  fieldMediaTypeField: string;
  resPayloadTitle: string;

  // Step 3: Webhook Out
  step3Badge: string;
  step3Title: string;
  step3Desc: string;
  step3WorkflowTitle: string;
  step3WorkflowSteps: string[];
  configuredUrlLabel: string;
  notConfiguredLabel: string;
  outboundPayloadTitle: string;
  autoReplyTitle: string;
  autoReplyDesc: string;

  // Step 4: GET (Read Messages)
  step4Badge: string;
  step4Title: string;
  step4Desc: string;
  queryParamsTitle: string;
  paramLimitDesc: string;
  paramSinceDesc: string;
  getResTitle: string;

  // Step 5: POST (Send Messages)
  step5Badge: string;
  step5Title: string;
  step5Desc: string;
  postReqTitle: string;
  postResTitle: string;

  // Step 6: cURL Commands
  step6Badge: string;
  step6Title: string;
  step6Desc: string;
  curlSendTitle: string;
  curlGetTitle: string;
  copyCurlBtn: string;

  // Step 7: HTTP Status Codes
  step7Badge: string;
  step7Title: string;
  status200: string;
  status400: string;
  status401: string;
  status403: string;
  status500: string;
}

export const API_DOCS_TRANSLATIONS: Record<DocLanguage, DocTranslationContent> = {
  // 1. ENGLISH
  en: {
    langName: 'English (US)',
    docTitle: 'API & Webhook Documentation',
    docSubtitle: 'Complete technical reference and step-by-step guide for integrating external websites and servers via HTTPS Webhooks and REST endpoints.',
    selectLanguage: 'Documentation Language',
    backBtn: 'Back to API & Webhooks',
    copyBtn: 'Copy',
    copiedBtn: 'Copied',

    step1Badge: 'STEP 1',
    step1Title: 'Authentication & API Token',
    step1Desc: 'All incoming API requests are cryptographically authenticated using your account token. The token can be transmitted via standard Authorization headers, custom headers, or query parameters.',
    baseUrlLabel: 'Base URL',
    headerAuthLabel: 'Header',
    headerCustomLabel: 'Custom Header',
    queryParamLabel: 'Query Param',
    tokenNameLabel: 'Token Name',
    tokenBadgeDesc: 'When an incoming message arrives via this token, QChat automatically tags it with the [Token: Name] badge next to the sender name in the chat.',

    step2Badge: 'STEP 2',
    step2Title: 'Webhook In (Receive Messages from External Sites)',
    step2Desc: 'Webhook In is an inbound HTTPS POST gateway. Any external website, backend server, automated bot, or IoT device can push messages directly into this chat room in real-time.',
    step2WorkflowTitle: 'How Webhook In Operates:',
    step2WorkflowSteps: [
      'Your external website or server dispatches an HTTPS POST request containing JSON data to the Webhook In URL.',
      'QChat server verifies the Bearer token against the account database.',
      'The server parses the text, sender name, and optional media attachments.',
      'The message is written to the chat channel and instantly pushed via real-time WebSocket/Firestore listeners to all connected users.',
      'A response with HTTP 200 OK and the generated message ID is returned to your server.'
    ],
    reqPayloadTitle: 'HTTP Request Payload Example (JSON)',
    payloadFieldsTitle: 'Request Payload Fields',
    fieldTextField: 'text (string, required): The main text content of the message.',
    fieldSenderField: 'senderName (string, optional): Display name for the external author.',
    fieldMediaUrlField: 'mediaUrl (string, optional): Public direct URL of an image, voice note, or file.',
    fieldMediaTypeField: 'mediaType (string, optional): "text" | "image" | "file" | "audio"',
    resPayloadTitle: 'HTTP Success Response (200 OK)',

    step3Badge: 'STEP 3',
    step3Title: 'Webhook Out (Forward Chat Messages to External Server)',
    step3Desc: 'Webhook Out is an automated outbound event trigger. Whenever any user types and sends a message in this QChat room, the server immediately forwards the message payload to your configured external URL.',
    step3WorkflowTitle: 'How Webhook Out Operates:',
    step3WorkflowSteps: [
      'A user submits a new message inside this QChat channel.',
      'The server checks if an Outbound Webhook URL is saved for this channel.',
      'Loop Protection: Messages originating from automated tokens or bots are ignored to prevent infinite feedback loops.',
      'The server sends an HTTPS POST request to your external URL with a 12-second timeout and header x-qchat-token.',
      'Bidirectional Auto-Reply: If your external server responds with JSON containing {"reply": "..."} or {"text": "..."}, QChat automatically posts that reply back into the chat room!'
    ],
    configuredUrlLabel: 'Configured Destination URL',
    notConfiguredLabel: 'Not configured yet (enter in Webhook Out field on main screen)',
    outboundPayloadTitle: 'HTTP Outbound Event Payload (Sent to your server)',
    autoReplyTitle: 'Automatic Bidirectional Reply Support',
    autoReplyDesc: 'Your server can reply synchronously to the Webhook Out POST request. If your server returns {"reply": "Hello back!"}, QChat will immediately deliver that reply into the chat thread.',

    step4Badge: 'STEP 4',
    step4Title: 'GET (Retrieve Chat Messages API)',
    step4Desc: 'Fetch recent chat messages and history from your external website or application via HTTPS GET.',
    queryParamsTitle: 'Supported Query Parameters',
    paramLimitDesc: 'limit (number, default: 50, max: 200): Maximum number of recent messages to return.',
    paramSinceDesc: 'since (string, ISO 8601 timestamp, optional): Filter messages created after this timestamp.',
    getResTitle: 'HTTP Response Payload Example (200 OK)',

    step5Badge: 'STEP 5',
    step5Title: 'POST (Direct REST Message API)',
    step5Desc: 'Standard RESTful endpoint to deliver messages into the chat using Authorization: Bearer <token>.',
    postReqTitle: 'HTTP Request Payload Example (JSON)',
    postResTitle: 'HTTP Success Response (200 OK)',

    step6Badge: 'STEP 6',
    step6Title: 'cURL Command Line Examples',
    step6Desc: 'Execute these commands directly in your terminal or automation scripts to test integration:',
    curlSendTitle: '1. Send Message via cURL (POST / Webhook In)',
    curlGetTitle: '2. Fetch Messages via cURL (GET / Read Messages)',
    copyCurlBtn: 'Copy cURL Command',

    step7Badge: 'STEP 7',
    step7Title: 'HTTP Status Codes & Troubleshooting',
    status200: '200 OK: Request processed and message delivered successfully.',
    status400: '400 Bad Request: Missing required fields (e.g. empty message text).',
    status401: '401 Unauthorized: Invalid, expired, or missing API token.',
    status403: '403 Forbidden: Action not permitted for this token configuration.',
    status500: '500 Server Error: Internal server error. Verify server connectivity.'
  },

  // 2. HINDI (हिन्दी)
  hi: {
    langName: 'हिन्दी (Hindi)',
    docTitle: 'एपीआई और वेबहुक दस्तावेज़ीकरण (Documentation)',
    docSubtitle: 'बाहरी वेबसाइटों और सर्वरों को HTTPS वेबहुक और REST एंडपॉइंट्स के माध्यम से चैट संदेश भेजने और प्राप्त करने की पूर्ण तकनीकी मार्गदर्शिका।',
    selectLanguage: 'दस्तावेज़ की भाषा चुनें',
    backBtn: 'एपीआई और वेबहुक पर वापस जाएं',
    copyBtn: 'कॉपी करें',
    copiedBtn: 'कॉपी हो गया',

    step1Badge: 'चरण 1',
    step1Title: 'प्रमाणीकरण और एपीआई टोकन (API Token)',
    step1Desc: 'सभी आने वाले अनुरोधों को आपके खाते के टोकन का उपयोग करके सत्यापित किया जाता है। टोकन को हेडर या क्वेरी पैरामीटर के रूप में भेजा जा सकता है।',
    baseUrlLabel: 'बेस यूआरएल (Base URL)',
    headerAuthLabel: 'ऑथराइज़ेशन हेडर',
    headerCustomLabel: 'कस्टम हेडर',
    queryParamLabel: 'क्वेरी पैरामीटर',
    tokenNameLabel: 'टोकन का नाम',
    tokenBadgeDesc: 'इस टोकन से आने वाले संदेशों के साथ चैट में [Token: Name] बैज स्वतः प्रदर्शित होता है।',

    step2Badge: 'चरण 2',
    step2Title: 'वेबहुक इन (Webhook In - संदेश प्राप्त करें)',
    step2Desc: 'वेबहुक इन एक इनबाउंड HTTPS POST गेटवे है। कोई भी बाहरी वेबसाइट या सर्वर सीधे इस चैट रूम में संदेश भेज सकता है।',
    step2WorkflowTitle: 'वेबहुक इन कैसे कार्य करता है:',
    step2WorkflowSteps: [
      'आपकी बाहरी वेबसाइट वेबहुक इन यूआरएल पर JSON डेटा के साथ एक HTTPS POST अनुरोध भेजती है।',
      'सर्वर डेटाबेस से टोकन की प्रामाणिकता की जाँच करता है।',
      'सर्वर संदेश सामग्री और प्रेषक का नाम पार्स करता है।',
      'संदेश चैट में सहेजा जाता है और सभी उपयोगकर्ताओं को तुरंत दिखाई देता है।',
      'सफल संदेश आईडी के साथ HTTP 200 OK प्रतिक्रिया वापस भेजी जाती है।'
    ],
    reqPayloadTitle: 'अनुरोध पेलोड उदाहरण (JSON)',
    payloadFieldsTitle: 'पेलोड फ़ील्ड विवरण',
    fieldTextField: 'text (string, अनिवार्य): संदेश का मुख्य पाठ।',
    fieldSenderField: 'senderName (string, वैकल्पिक): प्रेषक का नाम।',
    fieldMediaUrlField: 'mediaUrl (string, वैकल्पिक): मीडिया या फ़ाइल का सीधा यूआरएल।',
    fieldMediaTypeField: 'mediaType (string, वैकल्पिक): "text" | "image" | "file" | "audio"',
    resPayloadTitle: 'सफल प्रतिक्रिया उदाहरण (200 OK)',

    step3Badge: 'चरण 3',
    step3Title: 'वेबहुक आउट (Webhook Out - संदेश अग्रेषित करें)',
    step3Desc: 'जब भी चैट रूम में कोई उपयोगकर्ता संदेश भेजता है, तो सर्वर उस संदेश को तुरंत आपके बाहरी यूआरएल पर भेज देता है।',
    step3WorkflowTitle: 'वेबहुक आउट कैसे कार्य करता है:',
    step3WorkflowSteps: [
      'उपयोगकर्ता चैट रूम में एक संदेश भेजता है।',
      'सर्वर जाँच करता है कि क्या कोई वेबहुक आउट यूआरएल कॉन्फ़िगर किया गया है।',
      'लूप सुरक्षा: बॉट या एपीआई संदेशों को दोबारा नहीं भेजा जाता है ताकि लूप न बने।',
      'सर्वर आपके गंतव्य यूआरएल पर डेटा के साथ HTTPS POST अनुरोध भेजता है।',
      'स्वचालित उत्तर: यदि आपका सर्वर {"reply": "..."} लौटाता है, तो वह उत्तर चैट में स्वतः पोस्ट हो जाता है!'
    ],
    configuredUrlLabel: 'कॉन्फ़िगर किया गया गंतव्य यूआरएल',
    notConfiguredLabel: 'अभी कॉन्फ़िगर नहीं किया गया है (मुख्य स्क्रीन पर वेबहुक आउट में दर्ज करें)',
    outboundPayloadTitle: 'आउटबाउंड इवेंट पेलोड (आपके सर्वर को भेजा गया)',
    autoReplyTitle: 'स्वचालित द्विदिश उत्तर (Auto-Reply)',
    autoReplyDesc: 'आपका सर्वर प्रतिक्रिया में सीधे उत्तर भेज सकता है, जैसे {"reply": "नमस्ते!"}, जो तुरंत चैट में जुड़ जाएगा।',

    step4Badge: 'चरण 4',
    step4Title: 'गेट (GET - संदेश पढ़ें)',
    step4Desc: 'बाहरी एप्लिकेशन से चैट संदेशों का इतिहास प्राप्त करने के लिए HTTPS GET एंडपॉइंट।',
    queryParamsTitle: 'क्वेरी पैरामीटर',
    paramLimitDesc: 'limit (number, डिफ़ॉल्ट: 50, अधिकतम: 200): प्राप्त करने के लिए संदेशों की संख्या।',
    paramSinceDesc: 'since (string, ISO 8601 टाइमस्टैम्प, वैकल्पिक): इस समय के बाद के संदेश।',
    getResTitle: 'प्रतिक्रिया पेलोड उदाहरण (200 OK)',

    step5Badge: 'चरण 5',
    step5Title: 'पोस्ट (POST - संदेश भेजें)',
    step5Desc: 'Authorization: Bearer <token> का उपयोग करके संदेश भेजने के लिए REST एंडपॉइंट।',
    postReqTitle: 'अनुरोध पेलोड उदाहरण (JSON)',
    postResTitle: 'सफल प्रतिक्रिया (200 OK)',

    step6Badge: 'चरण 6',
    step6Title: 'cURL कमांड उदाहरण',
    step6Desc: 'टर्मिनल में परीक्षण करने के लिए इन कमांड्स का उपयोग करें:',
    curlSendTitle: '1. cURL से संदेश भेजें (Webhook In / POST)',
    curlGetTitle: '2. cURL से संदेश पढ़ें (GET)',
    copyCurlBtn: 'cURL कमांड कॉपी करें',

    step7Badge: 'चरण 7',
    step7Title: 'HTTP स्थिति कोड और समाधान',
    status200: '200 OK: अनुरोध सफलतापूर्वक संसाधित हुआ।',
    status400: '400 Bad Request: आवश्यक फ़ील्ड खाली हैं।',
    status401: '401 Unauthorized: टोकन अमान्य या गायब है।',
    status403: '403 Forbidden: यह क्रिया अनुमत नहीं है।',
    status500: '500 Server Error: सर्वर त्रुटि। सर्वर लॉग की जाँच करें।'
  },

  // 4. SPANISH (Español)
  es: {
    langName: 'Español (Spanish)',
    docTitle: 'Documentación de API y Webhooks',
    docSubtitle: 'Referencia técnica completa y guía paso a paso para integrar sitios web y servidores externos mediante Webhooks HTTPS y REST.',
    selectLanguage: 'Idioma de la documentación',
    backBtn: 'Volver a API y Webhooks',
    copyBtn: 'Copiar',
    copiedBtn: 'Copiado',

    step1Badge: 'PASO 1',
    step1Title: 'Autenticación y Token de API',
    step1Desc: 'Todas las solicitudes entrantes se autentican de forma segura mediante el token de su cuenta, enviado en encabezados o parámetros de consulta.',
    baseUrlLabel: 'URL base',
    headerAuthLabel: 'Encabezado',
    headerCustomLabel: 'Encabezado personalizado',
    queryParamLabel: 'Parámetro de consulta',
    tokenNameLabel: 'Nombre del token',
    tokenBadgeDesc: 'Cuando llega un mensaje mediante este token, se muestra la insignia [Token: Nombre] junto al remitente en el chat.',

    step2Badge: 'PASO 2',
    step2Title: 'Webhook In (Recibir mensajes de sitios externos)',
    step2Desc: 'Webhook In es una puerta de enlace HTTPS POST entrante para entregar mensajes en tiempo real en la sala de chat.',
    step2WorkflowTitle: 'Cómo funciona Webhook In:',
    step2WorkflowSteps: [
      'Su sitio web externo envía una solicitud HTTPS POST con datos JSON a la URL de Webhook In.',
      'El servidor de QChat verifica el token contra la base de datos.',
      'El servidor procesa el texto, el remitente y los archivos multimedia adjuntos.',
      'El mensaje se escribe en el canal de chat y se muestra inmediatamente a todos los usuarios.',
      'Se devuelve una respuesta HTTP 200 OK con el ID del mensaje a su servidor.'
    ],
    reqPayloadTitle: 'Ejemplo de carga útil de solicitud (JSON)',
    payloadFieldsTitle: 'Campos de la carga útil',
    fieldTextField: 'text (string, obligatorio): Contenido principal del mensaje.',
    fieldSenderField: 'senderName (string, opcional): Nombre que se mostrará en el chat.',
    fieldMediaUrlField: 'mediaUrl (string, opcional): URL directa pública del archivo multimedia.',
    fieldMediaTypeField: 'mediaType (string, opcional): "text" | "image" | "file" | "audio"',
    resPayloadTitle: 'Ejemplo de respuesta exitosa (200 OK)',

    step3Badge: 'PASO 3',
    step3Title: 'Webhook Out (Reenviar mensajes a servidor externo)',
    step3Desc: 'Cada vez que un usuario envía un mensaje en este chat, el servidor lo reenvía automáticamente a la URL externa configurada.',
    step3WorkflowTitle: 'Cómo funciona Webhook Out:',
    step3WorkflowSteps: [
      'Un usuario envía un nuevo mensaje en la sala de chat.',
      'El servidor verifica si hay una URL de Webhook Out guardada.',
      'Protección de bucles: Se ignoran los mensajes de bots para evitar bucles infinitos.',
      'El servidor envía una solicitud HTTPS POST a su URL externa con un límite de 12 segundos.',
      'Respuesta automática bidireccional: Si su servidor responde con {"reply": "..."}, QChat publica esa respuesta en el chat.'
    ],
    configuredUrlLabel: 'URL de destino configurada',
    notConfiguredLabel: 'No configurado aún (ingrese la URL en Webhook Out en la pantalla principal)',
    outboundPayloadTitle: 'Carga útil del evento saliente (Enviada a su servidor)',
    autoReplyTitle: 'Soporte de respuesta automática bidireccional',
    autoReplyDesc: 'Su servidor puede responder sincrónicamente con {"reply": "Mensaje de respuesta"} y QChat lo entregará inmediatamente en el chat.',

    step4Badge: 'PASO 4',
    step4Title: 'GET (API para leer mensajes)',
    step4Desc: 'Obtenga mensajes recientes e historial de chat desde su aplicación externa mediante HTTPS GET.',
    queryParamsTitle: 'Parámetros de consulta',
    paramLimitDesc: 'limit (number, predeterminado: 50, máx: 200): Límite de mensajes a devolver.',
    paramSinceDesc: 'since (string, marca de tiempo ISO 8601, opcional): Filtrar mensajes creados después.',
    getResTitle: 'Ejemplo de respuesta (200 OK)',

    step5Badge: 'PASO 5',
    step5Title: 'POST (API REST directa para enviar mensajes)',
    step5Desc: 'Punto final REST estándar para enviar mensajes utilizando Authorization: Bearer <token>.',
    postReqTitle: 'Ejemplo de solicitud JSON',
    postResTitle: 'Ejemplo de respuesta exitosa (200 OK)',

    step6Badge: 'PASO 6',
    step6Title: 'Ejemplos de comandos cURL',
    step6Desc: 'Comandos listos para ejecutar en su terminal:',
    curlSendTitle: '1. Enviar mensaje con cURL (Webhook In / POST)',
    curlGetTitle: '2. Leer mensajes con cURL (GET)',
    copyCurlBtn: 'Copiar comando cURL',

    step7Badge: 'PASO 7',
    step7Title: 'Códigos de estado HTTP y solución de problemas',
    status200: '200 OK: Solicitud procesada y mensaje entregado con éxito.',
    status400: '400 Bad Request: Faltan campos requeridos.',
    status401: '401 Unauthorized: Token ausente o inválido.',
    status403: '403 Forbidden: Acción no permitida.',
    status500: '500 Server Error: Error interno del servidor.'
  },

  // 5. ARABIC (العربية)
  ar: {
    langName: 'العربية (Arabic)',
    docTitle: 'توثيق واجهة برمجة التطبيقات وWebhooks',
    docSubtitle: 'الدليل الفني الشامل وخطوة بخطوة لربط المواقع والخوادم الخارجية لإرسال واستقبال رسائل الدردشة عبر HTTPS.',
    selectLanguage: 'لغة التوثيق',
    backBtn: 'العودة إلى واجهة برمجة التطبيقات',
    copyBtn: 'نسخ',
    copiedBtn: 'تم النسخ',

    step1Badge: 'الخطوة 1',
    step1Title: 'المصادقة ورمز API (API Token)',
    step1Desc: 'تتم مصادقة جميع الطلبات الواردة بأمان باستخدام رمز حسابك عبر ترويسة Authorization أو معلمات الاستعلام.',
    baseUrlLabel: 'رابط الأساس (Base URL)',
    headerAuthLabel: 'الترويسة (Header)',
    headerCustomLabel: 'ترويسة مخصصة',
    queryParamLabel: 'معلمة الاستعلام',
    tokenNameLabel: 'اسم الرمز',
    tokenBadgeDesc: 'عند وصول رسالة عبر هذا الرمز، تظهر شارة [Token: Name] بجوار اسم المرسل في الدردشة تلقائياً.',

    step2Badge: 'الخطوة 2',
    step2Title: 'Webhook In (استقبال الرسائل من المواقع الخارجية)',
    step2Desc: 'بوابة HTTPS POST واردة تتيح لأي موقع أو خادم خارجي إرسال رسائل فورية إلى غرفة الدردشة.',
    step2WorkflowTitle: 'آلية عمل Webhook In:',
    step2WorkflowSteps: [
      'يرسل خادمك الخارجي طلب HTTPS POST يحتوي على بيانات JSON إلى رابط Webhook In.',
      'يتحقق خادم QChat من صحة الرمز في قاعدة البيانات.',
      'يحلل الخادم نص الرسالة واسم المرسل والملفات المرفقة إن وجدت.',
      'تُحفظ الرسالة وتظهر في الوقت الحقيقي لجميع المستخدمين.',
      'يُرجع الخادم استجابة HTTP 200 OK مع معرف الرسالة.'
    ],
    reqPayloadTitle: 'مثال على حمولة الطلب (JSON)',
    payloadFieldsTitle: 'حقول حمولة الطلب',
    fieldTextField: 'text (string, مطلوب): نص الرسالة الرئيسي.',
    fieldSenderField: 'senderName (string, اختياري): اسم المرسل المعروض.',
    fieldMediaUrlField: 'mediaUrl (string, اختياري): رابط مباشر للملف أو الصورة.',
    fieldMediaTypeField: 'mediaType (string, اختياري): "text" | "image" | "file" | "audio"',
    resPayloadTitle: 'مثال على الاستجابة الناجحة (200 OK)',

    step3Badge: 'الخطوة 3',
    step3Title: 'Webhook Out (إعادة توجيه الرسائل للخادم الخارجي)',
    step3Desc: 'يقوم الخادم تلقائياً بإرسال أي رسالة جديدة يكتبها المستخدم في هذه الغرفة إلى رابطك الخارجي.',
    step3WorkflowTitle: 'آلية عمل Webhook Out:',
    step3WorkflowSteps: [
      'يرسل المستخدم رسالة جديدة في غرفة الدردشة.',
      'يتحقق الخادم مما إذا كان هناك رابط Webhook Out مسجل.',
      'حماية الحلقات: يتم تجاهل رسائل البوتات لتجنب الحلقات اللانهائية.',
      'يرسل الخادم طلب HTTPS POST إلى رابطك مع مهلة 12 ثانية وترويسة x-qchat-token.',
      'رد تلقائي ثنائي الاتجاه: إذا أرجع خادمك {"reply": "..."}، يتم نشر الرد فوراً في الدردشة!'
    ],
    configuredUrlLabel: 'الرابط الخارجي المسجل',
    notConfiguredLabel: 'غير مسجل بعد (أدخله في خانة Webhook Out في الشاشة الرئيسية)',
    outboundPayloadTitle: 'حمولة الحدث الصادر (المرسلة إلى خادمك)',
    autoReplyTitle: 'دعم الرد التلقائي ثنائي الاتجاه',
    autoReplyDesc: 'يمكن لخادمك الرد مباشرة على طلب الويب هوك بنص مثل {"reply": "مرحباً!"} وسيتم إيصاله فوراً إلى المحادثة.',

    step4Badge: 'الخطوة 4',
    step4Title: 'GET (قراءة الرسائل وسجل المحادثة)',
    step4Desc: 'نقطة نهاية HTTPS GET لاسترجاع سجل الرسائل الأخيرة من تطبيقك الخارجي.',
    queryParamsTitle: 'معلمات الاستعلام',
    paramLimitDesc: 'limit (number, الافتراضي: 50، الأقصى: 200): الحد الأقصى لعدد الرسائل.',
    paramSinceDesc: 'since (string, طابع زمني ISO 8601, اختياري): تصفية الرسائل الأحدث من هذا الوقت.',
    getResTitle: 'مثال على استجابة القراءة (200 OK)',

    step5Badge: 'الخطوة 5',
    step5Title: 'POST (إرسال الرسائل عبر REST)',
    step5Desc: 'نقطة نهاية REST قياسية لإرسال الرسائل باستخدام Authorization: Bearer <token>.',
    postReqTitle: 'مثال على طلب JSON',
    postResTitle: 'مثال على استجابة النجاح (200 OK)',

    step6Badge: 'الخطوة 6',
    step6Title: 'أمثلة أوامر cURL',
    step6Desc: 'أوامر جاهزة للتشغيل المباشر في الطرفية:',
    curlSendTitle: '1. إرسال رسالة عبر cURL (Webhook In / POST)',
    curlGetTitle: '2. قراءة الرسائل عبر cURL (GET)',
    copyCurlBtn: 'نسخ أمر cURL',

    step7Badge: 'الخطوة 7',
    step7Title: 'رموز حالة HTTP واستكشاف الأخطاء',
    status200: '200 OK: تم بنجاح وتسليم الرسالة.',
    status400: '400 Bad Request: الحقول المطلوبة فارغة.',
    status401: '401 Unauthorized: الرمز غير صالح أو مفقود.',
    status403: '403 Forbidden: الإجراء غير مصرح به.',
    status500: '500 Server Error: خطأ داخلي في الخادم.'
  },

  // 6. FRENCH (Français)
  fr: {
    langName: 'Français (French)',
    docTitle: 'Documentation API & Webhooks',
    docSubtitle: 'Guide technique complet pour envoyer et recevoir des messages de chat via Webhooks HTTPS et points de terminaison REST.',
    selectLanguage: 'Langue de la documentation',
    backBtn: 'Retour à l\'API et Webhooks',
    copyBtn: 'Copier',
    copiedBtn: 'Copié',

    step1Badge: 'ÉTAPE 1',
    step1Title: 'Authentification & Jeton API',
    step1Desc: 'Toutes les requêtes entrantes sont authentifiées à l\'aide de votre jeton de compte, transmis via les en-têtes ou paramètres URL.',
    baseUrlLabel: 'URL de base',
    headerAuthLabel: 'En-tête',
    headerCustomLabel: 'En-tête personnalisé',
    queryParamLabel: 'Paramètre URL',
    tokenNameLabel: 'Nom du jeton',
    tokenBadgeDesc: 'Lorsqu\'un message arrive via ce jeton, le badge [Token: Nom] s\'affiche automatiquement à côté du nom de l\'expéditeur.',

    step2Badge: 'ÉTAPE 2',
    step2Title: 'Webhook In (Recevoir des messages externes)',
    step2Desc: 'Passerelle HTTPS POST entrante permettant aux serveurs et sites externes de pousser des messages en temps réel dans le chat.',
    step2WorkflowTitle: 'Fonctionnement de Webhook In :',
    step2WorkflowSteps: [
      'Votre serveur externe envoie une requête HTTPS POST avec des données JSON à l\'URL Webhook In.',
      'Le serveur QChat valide le jeton Bearer.',
      'Le serveur extrait le texte, le nom de l\'expéditeur et les pièces jointes.',
      'Le message est enregistré et s\'affiche instantanément pour tous les utilisateurs.',
      'Une réponse HTTP 200 OK avec l\'ID du message est renvoyée.'
    ],
    reqPayloadTitle: 'Exemple de charge utile JSON (Requête)',
    payloadFieldsTitle: 'Champs de la charge utile',
    fieldTextField: 'text (string, requis) : Texte principal du message.',
    fieldSenderField: 'senderName (string, optionnel) : Nom affiché dans le chat.',
    fieldMediaUrlField: 'mediaUrl (string, optionnel) : URL directe du fichier ou de l\'image.',
    fieldMediaTypeField: 'mediaType (string, optionnel) : "text" | "image" | "file" | "audio"',
    resPayloadTitle: 'Exemple de réponse réussie (200 OK)',

    step3Badge: 'ÉTAPE 3',
    step3Title: 'Webhook Out (Transférer vers un serveur externe)',
    step3Desc: 'Dès qu\'un utilisateur envoie un message dans cette salle, le serveur le transmet automatiquement à votre URL externe.',
    step3WorkflowTitle: 'Fonctionnement de Webhook Out :',
    step3WorkflowSteps: [
      'Un utilisateur envoie un message dans la salle de chat.',
      'Le serveur vérifie si une URL Webhook Out est configurée.',
      'Protection anti-boucle : Les messages de bots sont ignorés pour éviter les boucles infinies.',
      'Le serveur envoie une requête HTTPS POST à votre URL avec un délai de 12 secondes.',
      'Réponse automatique bidirectionnelle : Si votre serveur répond avec {"reply": "..."}, QChat publie la réponse dans le chat !'
    ],
    configuredUrlLabel: 'URL de destination configurée',
    notConfiguredLabel: 'Non configurée (définir dans le champ Webhook Out de l\'écran principal)',
    outboundPayloadTitle: 'Charge utile de l\'événement sortant (Envoyée à votre serveur)',
    autoReplyTitle: 'Support de réponse automatique',
    autoReplyDesc: 'Votre serveur peut répondre avec {"reply": "Mon message"} et QChat l\'insérera immédiatement dans le fil de discussion.',

    step4Badge: 'ÉTAPE 4',
    step4Title: 'GET (Lire les messages du chat)',
    step4Desc: 'Point de terminaison HTTPS GET pour récupérer l\'historique des messages récents.',
    queryParamsTitle: 'Paramètres de requête',
    paramLimitDesc: 'limit (number, défaut : 50, max : 200) : Nombre de messages à retourner.',
    paramSinceDesc: 'since (string, horodatage ISO 8601) : Filtrer les messages ultérieurs.',
    getResTitle: 'Exemple de réponse (200 OK)',

    step5Badge: 'ÉTAPE 5',
    step5Title: 'POST (Envoyer un message via REST)',
    step5Desc: 'Point de terminaison REST classique utilisant Authorization: Bearer <token>.',
    postReqTitle: 'Exemple de requête JSON',
    postResTitle: 'Exemple de réponse réussie (200 OK)',

    step6Badge: 'ÉTAPE 6',
    step6Title: 'Exemples de commandes cURL',
    step6Desc: 'Commandes prêtes à exécuter dans votre terminal :',
    curlSendTitle: '1. Envoyer un message avec cURL (Webhook In / POST)',
    curlGetTitle: '2. Lire les messages avec cURL (GET)',
    copyCurlBtn: 'Copier la commande cURL',

    step7Badge: 'ÉTAPE 7',
    step7Title: 'Codes d\'état HTTP et dépannage',
    status200: '200 OK : Requête traitée et message délivré avec succès.',
    status400: '400 Bad Request : Champs requis manquants.',
    status401: '401 Unauthorized : Jeton invalide ou manquant.',
    status403: '403 Forbidden : Action non autorisée.',
    status500: '500 Server Error : Erreur interne du serveur.'
  },

  // 7. GERMAN (Deutsch)
  de: {
    langName: 'Deutsch (German)',
    docTitle: 'API- & Webhook-Dokumentation',
    docSubtitle: 'Vollständige technische Referenz und Anleitung zur Integration externer Systeme über HTTPS Webhooks und REST-Endpunkte.',
    selectLanguage: 'Dokumentationssprache',
    backBtn: 'Zurück zu API & Webhooks',
    copyBtn: 'Kopieren',
    copiedBtn: 'Kopiert',

    step1Badge: 'SCHRITT 1',
    step1Title: 'Authentifizierung & API-Token',
    step1Desc: 'Alle eingehenden Anfragen werden über Ihren Account-Token authentifiziert, entweder per Authorization-Header oder Query-Parameter.',
    baseUrlLabel: 'Basis-URL',
    headerAuthLabel: 'Header',
    headerCustomLabel: 'Benutzerdefinierter Header',
    queryParamLabel: 'Query-Parameter',
    tokenNameLabel: 'Token-Name',
    tokenBadgeDesc: 'Bei über diesen Token gesendeten Nachrichten erscheint automatisch das [Token: Name]-Badge im Chat.',

    step2Badge: 'SCHRITT 2',
    step2Title: 'Webhook In (Nachrichten empfangen)',
    step2Desc: 'Inbound HTTPS POST-Gateway, über das externe Websites oder Server Nachrichten direkt in den Chatroom einspeisen.',
    step2WorkflowTitle: 'So funktioniert Webhook In:',
    step2WorkflowSteps: [
      'Ihr externer Server sendet eine HTTPS POST-Anfrage mit JSON-Daten an die Webhook In-URL.',
      'Der QChat-Server validiert den Token in der Datenbank.',
      'Der Server verarbeitet Text, Absendernamen und eventuelle Mediendateien.',
      'Die Nachricht wird im Kanal gespeichert und sofort allen Benutzern in Echtzeit angezeigt.',
      'Eine Erfolgsantwort mit HTTP 200 OK und Nachrichten-ID wird zurückgegeben.'
    ],
    reqPayloadTitle: 'Beispiel-Anfrage-Payload (JSON)',
    payloadFieldsTitle: 'Payload-Felder',
    fieldTextField: 'text (string, erforderlich): Der Haupttext der Nachricht.',
    fieldSenderField: 'senderName (string, optional): Angezeigter Absendername.',
    fieldMediaUrlField: 'mediaUrl (string, optional): Direkte öffentliche Medien-URL.',
    fieldMediaTypeField: 'mediaType (string, optional): "text" | "image" | "file" | "audio"',
    resPayloadTitle: 'Beispiel-Erfolgsantwort (200 OK)',

    step3Badge: 'SCHRITT 3',
    step3Title: 'Webhook Out (Nachrichten weiterleiten)',
    step3Desc: 'Sobald ein Benutzer im Chatroom eine Nachricht sendet, wird diese automatisch per HTTPS POST an Ihre externe URL weitergeleitet.',
    step3WorkflowTitle: 'So funktioniert Webhook Out:',
    step3WorkflowSteps: [
      'Ein Benutzer sendet eine Nachricht im Chatroom.',
      'Der Server prüft, ob eine Webhook Out-Ziel-URL hinterlegt ist.',
      'Schleifenschutz: Bot-Nachrichten werden ignoriert, um Endlosschleifen zu verhindern.',
      'Der Server sendet die Nachricht per HTTPS POST mit 12 Sekunden Timeout an Ihre URL.',
      'Automatische bidirektionale Antwort: Antwortet Ihr Server mit {"reply": "..."}, wird dieser Text sofort im Chat gepostet!'
    ],
    configuredUrlLabel: 'Konfigurierte Ziel-URL',
    notConfiguredLabel: 'Noch nicht konfiguriert (im Hauptbildschirm unter Webhook Out eintragen)',
    outboundPayloadTitle: 'Ausgehendes Event-Payload (an Ihren Server gesendet)',
    autoReplyTitle: 'Automatische Antwortfunktion',
    autoReplyDesc: 'Ihr Server kann direkt mit {"reply": "Meine Antwort"} antworten, woraufhin QChat dies sofort als Chat-Nachricht anzeigt.',

    step4Badge: 'SCHRITT 4',
    step4Title: 'GET (Chat-Nachrichten lesen)',
    step4Desc: 'HTTPS GET-Endpunkt zum Abrufen des Chat-Verlaufs und aktueller Nachrichten.',
    queryParamsTitle: 'Query-Parameter',
    paramLimitDesc: 'limit (number, Standard: 50, max: 200): Maximale Anzahl von Nachrichten.',
    paramSinceDesc: 'since (string, ISO 8601-Zeitstempel): Nur Nachrichten nach diesem Zeitpunkt.',
    getResTitle: 'Beispiel-Antwort (200 OK)',

    step5Badge: 'SCHRITT 5',
    step5Title: 'POST (Direkter REST-Nachrichtenversand)',
    step5Desc: 'Standard REST-Endpunkt mit Authorization: Bearer <token>.',
    postReqTitle: 'Beispiel-Anfrage-Payload (JSON)',
    postResTitle: 'Beispiel-Erfolgsantwort (200 OK)',

    step6Badge: 'SCHRITT 6',
    step6Title: 'cURL-Befehlsbeispiele',
    step6Desc: 'Befehle zur direkten Ausführung im Terminal:',
    curlSendTitle: '1. Nachricht senden via cURL (Webhook In / POST)',
    curlGetTitle: '2. Nachrichten lesen via cURL (GET)',
    copyCurlBtn: 'cURL-Befehl kopieren',

    step7Badge: 'SCHRITT 7',
    step7Title: 'HTTP-Statuscodes & Fehlerbehebung',
    status200: '200 OK: Anfrage erfolgreich verarbeitet.',
    status400: '400 Bad Request: Erforderliche Felder fehlen.',
    status401: '401 Unauthorized: Ungültiger oder fehlender Token.',
    status403: '403 Forbidden: Aktion nicht gestattet.',
    status500: '500 Server Error: Interner Serverfehler.'
  },

  // 8. JAPANESE (日本語)
  ja: {
    langName: '日本語 (Japanese)',
    docTitle: 'APIおよびWebhook技術仕様書',
    docSubtitle: '外部ウェブサイトやサーバーからHTTPS WebhookおよびRESTエンドポイント経由でチャットメッセージを送受信するための詳細ガイド。',
    selectLanguage: 'ドキュメント言語の選択',
    backBtn: 'API・Webhook画面に戻る',
    copyBtn: 'コピー',
    copiedBtn: 'コピー完了',

    step1Badge: 'ステップ 1',
    step1Title: '認証およびAPIトークン (API Token)',
    step1Desc: 'すべての受信APIリクエストはアカウントトークンで認証されます。ヘッダーまたはクエリパラメータで送信可能です。',
    baseUrlLabel: 'ベースURL',
    headerAuthLabel: 'Authorizationヘッダー',
    headerCustomLabel: 'カスタムヘッダー',
    queryParamLabel: 'クエリパラメータ',
    tokenNameLabel: 'トークン名',
    tokenBadgeDesc: 'このトークン経由で送信されたメッセージには、チャット上で送信者名の横に[Token: 名前]バッジが表示されます。',

    step2Badge: 'ステップ 2',
    step2Title: 'Webhook In (外部サイトからのメッセージ受信)',
    step2Desc: '外部ウェブサイト、サーバー、またはIoTデバイスからチャットルームにメッセージをリアルタイムで送信するためのHTTPS POSTエンドポイント。',
    step2WorkflowTitle: 'Webhook In の動作手順:',
    step2WorkflowSteps: [
      '外部サーバーがWebhook In URLに対してJSONデータを含むHTTPS POSTリクエストを送信します。',
      'QChatサーバーがデータベースでトークンを照合して認証します。',
      '本文、送信者名、メディアファイルを解析します。',
      'メッセージが保存され、接続中のすべてのユーザーに即座に配信されます。',
      'メッセージIDを含むHTTP 200 OKレスポンスが外部サーバーに返されます。'
    ],
    reqPayloadTitle: 'リクエストペイロードの例 (JSON)',
    payloadFieldsTitle: 'リクエストペイロードのフィールド',
    fieldTextField: 'text (string, 必須): メッセージ本文。',
    fieldSenderField: 'senderName (string, 任意): チャットに表示される送信者名。',
    fieldMediaUrlField: 'mediaUrl (string, 任意): 画像やファイルの直接URL。',
    fieldMediaTypeField: 'mediaType (string, 任意): "text" | "image" | "file" | "audio"',
    resPayloadTitle: '成功レスポンスの例 (200 OK)',

    step3Badge: 'ステップ 3',
    step3Title: 'Webhook Out (外部サーバーへのメッセージ転送)',
    step3Desc: 'チャットルームでユーザーがメッセージを送信するたびに、設定した外部URLへHTTPS POSTで自動転送されます。',
    step3WorkflowTitle: 'Webhook Out の動作手順:',
    step3WorkflowSteps: [
      'ユーザーがチャットルームでメッセージを送信します。',
      'サーバーはWebhook Out URLが設定されているか確認します。',
      'ループ防止: ボットやAPI経由のメッセージは除外され、無限ループを防ぎます。',
      'サーバーは12秒のタイムアウト設定で外部URLへHTTPS POSTリクエストを送信します。',
      '自動双方向返信: 外部サーバーが{"reply": "..."}を返すと、その内容がチャットへ自動投稿されます！'
    ],
    configuredUrlLabel: '設定済み送信先URL',
    notConfiguredLabel: '未設定（メイン画面のWebhook Out欄に入力して保存）',
    outboundPayloadTitle: '送信イベントペイロード（外部サーバーへ届くデータ）',
    autoReplyTitle: '自動双方向返信機能',
    autoReplyDesc: '外部サーバーが同期レスポンスとして{"reply": "返信内容"}を返すと、QChatはそれをチャットルームへ即座に投稿します。',

    step4Badge: 'ステップ 4',
    step4Title: 'GET (メッセージ履歴の取得API)',
    step4Desc: '外部アプリケーションからチャット履歴や新着メッセージを取得するためのHTTPS GETエンドポイント。',
    queryParamsTitle: 'クエリパラメータ',
    paramLimitDesc: 'limit (number, デフォルト: 50, 最大: 200): 取得するメッセージの最大件数。',
    paramSinceDesc: 'since (string, ISO 8601形式): 指定時刻以降のメッセージのみを取得。',
    getResTitle: 'レスポンス例 (200 OK)',

    step5Badge: 'ステップ 5',
    step5Title: 'POST (直接RESTメッセージ送信API)',
    step5Desc: 'Authorization: Bearer <token> を使用してメッセージを投稿する標準的なRESTエンドポイント。',
    postReqTitle: 'リクエストペイロード例 (JSON)',
    postResTitle: '成功レスポンス例 (200 OK)',

    step6Badge: 'ステップ 6',
    step6Title: 'cURL コマンドの例',
    step6Desc: 'ターミナルで直接テストできるコマンド:',
    curlSendTitle: '1. cURLでメッセージ送信 (Webhook In / POST)',
    curlGetTitle: '2. cURLでメッセージ取得 (GET)',
    copyCurlBtn: 'cURLコマンドをコピー',

    step7Badge: 'ステップ 7',
    step7Title: 'HTTPステータスコードとトラブルシューティング',
    status200: '200 OK: 正常に処理され、メッセージが配信されました。',
    status400: '400 Bad Request: 必須フィールドが不足しています。',
    status401: '401 Unauthorized: トークンが無効または未入力です。',
    status403: '403 Forbidden: 権限がありません。',
    status500: '500 Server Error: サーバー内部エラー。'
  },

  // 9. CHINESE (中文)
  zh: {
    langName: '中文 (Chinese)',
    docTitle: 'API 与 Webhook 技术文档',
    docSubtitle: '通过 HTTPS Webhook 和 REST 端点发送与接收实时聊天消息的完整技术参考指南。',
    selectLanguage: '文档语言选择',
    backBtn: '返回 API 与 Webhook 界面',
    copyBtn: '复制',
    copiedBtn: '已复制',

    step1Badge: '步骤 1',
    step1Title: '身份验证与 API 令牌 (API Token)',
    step1Desc: '所有传入请求均通过账户令牌进行加密验证。可通过 Authorization 请求头、自定义标头或查询参数传递。',
    baseUrlLabel: '基础 URL',
    headerAuthLabel: '标头 (Header)',
    headerCustomLabel: '自定义标头',
    queryParamLabel: '查询参数',
    tokenNameLabel: '令牌名称',
    tokenBadgeDesc: '通过此令牌传入的消息，聊天室内将自动在发送者名称旁显示 [Token: 名称] 标识。',

    step2Badge: '步骤 2',
    step2Title: 'Webhook In（接收外部网站消息）',
    step2Desc: '入站 HTTPS POST 网关。外部网站、后台服务器或自动化程序可直接向该聊天室实时推送消息。',
    step2WorkflowTitle: 'Webhook In 工作流程：',
    step2WorkflowSteps: [
      '外部服务器向 Webhook In URL 发送包含 JSON 数据的 HTTPS POST 请求。',
      'QChat 服务器在数据库中验证 Bearer 令牌。',
      '服务器解析消息文本、发送者姓名及附件信息。',
      '消息写入聊天室并即时通过实时连接推送到所有在线用户的屏幕上。',
      '返回包含消息 ID 的 HTTP 200 OK 成功响应。'
    ],
    reqPayloadTitle: 'HTTP 请求负载示例 (JSON)',
    payloadFieldsTitle: '请求负载字段说明',
    fieldTextField: 'text (string, 必需): 消息的主要文本内容。',
    fieldSenderField: 'senderName (string, 可选): 聊天室中显示的发送者名称。',
    fieldMediaUrlField: 'mediaUrl (string, 可选): 图片或文件的公开直链 URL。',
    fieldMediaTypeField: 'mediaType (string, 可选): "text" | "image" | "file" | "audio"',
    resPayloadTitle: '成功响应示例 (200 OK)',

    step3Badge: '步骤 3',
    step3Title: 'Webhook Out（向外部服务器转发聊天消息）',
    step3Desc: '自动出站事件触发器。当任何用户在该聊天室发送消息时，服务器会自动将该消息转发到您配置的外部 URL。',
    step3WorkflowTitle: 'Webhook Out 工作流程：',
    step3WorkflowSteps: [
      '用户在聊天室发送一条新消息。',
      '服务器检查该聊天室是否配置了 Webhook Out 目标 URL。',
      '防无限循环保护：忽略来自机器人或令牌的消息以防止循环转发。',
      '服务器向您的外部 URL 发送包含消息数据的 HTTPS POST 请求（超时时间 12 秒）。',
      '双向自动回复：如果您的服务器响应包含 {"reply": "..."}，QChat 会自动将该内容发布到聊天室！'
    ],
    configuredUrlLabel: '已配置的目标 URL',
    notConfiguredLabel: '尚未配置（在主界面的 Webhook Out 框中输入并保存）',
    outboundPayloadTitle: '出站事件负载（发送到您的服务器）',
    autoReplyTitle: '双向自动回复支持',
    autoReplyDesc: '您的外部服务器可以在收到 Webhook 时同步回复 {"reply": "回复内容"}，该内容会即时发送到当前聊天室。',

    step4Badge: '步骤 4',
    step4Title: 'GET（读取消息与历史记录 API）',
    step4Desc: '通过 HTTPS GET 端点从外部系统检索聊天室消息记录。',
    queryParamsTitle: '支持的查询参数',
    paramLimitDesc: 'limit (number, 默认: 50, 最大: 200): 返回的最大消息条数。',
    paramSinceDesc: 'since (string, ISO 8601 时间戳, 可选): 仅筛选此时间之后的新消息。',
    getResTitle: '响应负载示例 (200 OK)',

    step5Badge: '步骤 5',
    step5Title: 'POST（直接通过 REST API 发送消息）',
    step5Desc: '使用 Authorization: Bearer <token> 发送消息的标准 REST 端点。',
    postReqTitle: '请求负载示例 (JSON)',
    postResTitle: '成功响应示例 (200 OK)',

    step6Badge: '步骤 6',
    step6Title: 'cURL 命令行测试示例',
    step6Desc: '可在终端中直接运行以测试消息收发的命令：',
    curlSendTitle: '1. 通过 cURL 发送消息 (Webhook In / POST)',
    curlGetTitle: '2. 通过 cURL 获取消息 (GET)',
    copyCurlBtn: '复制 cURL 命令',

    step7Badge: '步骤 7',
    step7Title: 'HTTP 状态码与故障排查',
    status200: '200 OK: 请求处理成功，消息已送达。',
    status400: '400 Bad Request: 缺少必填字段（如文本为空）。',
    status401: '401 Unauthorized: 令牌无效或未提供。',
    status403: '403 Forbidden: 权限受限，不允许此操作。',
    status500: '500 Server Error: 服务器内部错误，请检查服务器日志。'
  },

  // 10. RUSSIAN (Русский)
  ru: {
    langName: 'Русский (Russian)',
    docTitle: 'Документация по API и Webhook',
    docSubtitle: 'Полное техническое руководство по интеграции внешних сайтов и серверов через HTTPS Webhooks и REST API.',
    selectLanguage: 'Язык документации',
    backBtn: 'Назад к API и Webhooks',
    copyBtn: 'Копировать',
    copiedBtn: 'Скопировано',

    step1Badge: 'ШАГ 1',
    step1Title: 'Аутентификация и API-токен',
    step1Desc: 'Все входящие запросы аутентифицируются с использованием вашего токена через заголовки Authorization или параметры запроса.',
    baseUrlLabel: 'Базовый URL',
    headerAuthLabel: 'Заголовок',
    headerCustomLabel: 'Пользовательский заголовок',
    queryParamLabel: 'Параметр запроса',
    tokenNameLabel: 'Имя токена',
    tokenBadgeDesc: 'Для сообщений, отправленных через этот токен, в чате отображается значок [Token: Имя] рядом с автором.',

    step2Badge: 'ШАГ 2',
    step2Title: 'Webhook In (Прием входящих сообщений)',
    step2Desc: 'Входящий HTTPS POST шлюз для отправки сообщений в чат в реальном времени с любых внешних сайтов.',
    step2WorkflowTitle: 'Как работает Webhook In:',
    step2WorkflowSteps: [
      'Внешний сервер отправляет HTTPS POST запрос с данными JSON на URL Webhook In.',
      'Сервер QChat проверяет токен в базе данных.',
      'Сервер анализирует текст, имя отправителя и медиафайлы.',
      'Сообщение сохраняется и мгновенно доставляется всем пользователям чата.',
      'Сервер возвращает ответ HTTP 200 OK с идентификатором сообщения.'
    ],
    reqPayloadTitle: 'Пример полезной нагрузки запроса (JSON)',
    payloadFieldsTitle: 'Поля полезной нагрузки',
    fieldTextField: 'text (string, обязательно): Текст сообщения.',
    fieldSenderField: 'senderName (string, опционально): Отображаемое имя отправителя.',
    fieldMediaUrlField: 'mediaUrl (string, опционально): Прямой URL медиафайла.',
    fieldMediaTypeField: 'mediaType (string, опционально): "text" | "image" | "file" | "audio"',
    resPayloadTitle: 'Пример успешного ответа (200 OK)',

    step3Badge: 'ШАГ 3',
    step3Title: 'Webhook Out (Пересылка сообщений на внешний сервер)',
    step3Desc: 'Когда любой пользователь отправляет сообщение в чат, сервер автоматически пересылает его на ваш внешний URL.',
    step3WorkflowTitle: 'Как работает Webhook Out:',
    step3WorkflowSteps: [
      'Пользователь отправляет сообщение в чат-комнату.',
      'Сервер проверяет наличие настроенного URL Webhook Out.',
      'Защита от зацикливания: сообщения от ботов игнорируются для предотвращения бесконечных циклов.',
      'Сервер отправляет HTTPS POST запрос на ваш внешний URL с таймаутом 12 секунд.',
      'Двусторонний автоответ: если ваш сервер возвращает {"reply": "..."}, этот ответ публикуется в чате!'
    ],
    configuredUrlLabel: 'Настроенный целевой URL',
    notConfiguredLabel: 'Не настроен (укажите в поле Webhook Out на главном экране)',
    outboundPayloadTitle: 'Полезная нагрузка исходящего события (отправляется вам)',
    autoReplyTitle: 'Поддержка автоматического ответа',
    autoReplyDesc: 'Ваш сервер может синхронно вернуть {"reply": "Текст ответа"}, и QChat немедленно опубликует его в чате.',

    step4Badge: 'ШАГ 4',
    step4Title: 'GET (Чтение сообщений чата)',
    step4Desc: 'Эндпоинт HTTPS GET для получения истории сообщений из внешних приложений.',
    queryParamsTitle: 'Параметры запроса',
    paramLimitDesc: 'limit (number, по умолчанию: 50, макс: 200): Максимальное количество сообщений.',
    paramSinceDesc: 'since (string, метка времени ISO 8601): Фильтр сообщений после указанного времени.',
    getResTitle: 'Пример ответа (200 OK)',

    step5Badge: 'ШАГ 5',
    step5Title: 'POST (Прямая отправка через REST API)',
    step5Desc: 'Стандартный REST эндпоинт с использованием Authorization: Bearer <token>.',
    postReqTitle: 'Пример JSON запроса',
    postResTitle: 'Пример успешного ответа (200 OK)',

    step6Badge: 'ШАГ 6',
    step6Title: 'Примеры команд cURL',
    step6Desc: 'Готовые команды для запуска в терминале:',
    curlSendTitle: '1. Отправка сообщения через cURL (Webhook In / POST)',
    curlGetTitle: '2. Получение сообщений через cURL (GET)',
    copyCurlBtn: 'Скопировать команду cURL',

    step7Badge: 'ШАГ 7',
    step7Title: 'HTTP коды состояния и устранение неполадок',
    status200: '200 OK: Запрос успешно обработан, сообщение доставлено.',
    status400: '400 Bad Request: Отсутствуют обязательные поля.',
    status401: '401 Unauthorized: Токен недействителен или отсутствует.',
    status403: '403 Forbidden: Действие запрещено.',
    status500: '500 Server Error: Внутренняя ошибка сервера.'
  }
};
