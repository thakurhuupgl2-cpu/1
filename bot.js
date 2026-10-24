// ╔══════════════════════════════════════════════╗
// ║   A R Y A  &  M E N T A L  C O L L A B  ⚡        ║
// ║   MULTI-OWNER · CRASH-PROOF · AUTO-PURGE      ║
// ╚══════════════════════════════════════════════╝

process.env.TZ = 'Asia/Kolkata';

// ── Force GC ─────────────────────────────────
import v8 from 'v8';
import vm from 'vm';
let GC_ENABLED = false;
try {
    if (typeof global.gc === 'function') {
        GC_ENABLED = true;
        console.log('[GC] ✅ Native --expose-gc detected');
    } else {
        v8.setFlagsFromString('--expose_gc');
        global.gc = vm.runInNewContext('gc');
        GC_ENABLED = true;
        console.log('[GC] ✅ Forced GC via V8 flags');
    }
} catch (e) {
    console.log('[GC] ⚠️ GC unavailable:', e.message);
}

import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    delay,
    fetchLatestBaileysVersion,
    Browsers
} from '@whiskeysockets/baileys';
import { Boom }            from '@hapi/boom';
import pino                from 'pino';
import fs                  from 'fs';
import http                from 'http';
import TelegramBot         from 'node-telegram-bot-api';

// ─────────────────────────────────────────────
//  ENV
// ─────────────────────────────────────────────
const PORT       = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR   = (process.env.DATA_DIR || '.').replace(/\/+$/, '');
const TG_TOKEN   = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_OWNER   = String(process.env.TELEGRAM_OWNER_ID || '').trim();

if (!TG_TOKEN || !TG_OWNER) {
    console.error('\n╔══════════════════════════════════════════════╗');
    console.error('║  ❌ MISSING ENVIRONMENT VARIABLES              ║');
    console.error('╚══════════════════════════════════════════════╝\n');
    console.error('  TELEGRAM_BOT_TOKEN :', TG_TOKEN ? '✅ set' : '❌ MISSING');
    console.error('  TELEGRAM_OWNER_ID  :', TG_OWNER ? '✅ set (' + TG_OWNER + ')' : '❌ MISSING');
    console.error('\n  📋 Render Dashboard → Environment → Add these vars.\n');
    process.exit(1);
}

const MAX_SLOTS    = 5;
const PURGE_HOURS  = [7, 19];
const MAX_RETRIES  = 5;

const RAM_LIMIT_MB  = 512;
const DISK_LIMIT_MB = 5120;
const MONTHLY_HOURS = 750;

const DENIAL_MSG = '𓆩💢𓆪𝐅𝚒𝚛𝚜𝚝 𝚜𝚎𝚢 𓆩𝐀𝚁𝚈𝙰 𝚡 𝐌𝙴𝙽𝚃𝙴𝙻 𝙿𝚊𝚙𝚊 𝙾𝙽 𝐓𝙾𝙿🕸️⃟𓆪 𓆩💢𓆪';

// ─────────────────────────────────────────────
//  PATHS
// ─────────────────────────────────────────────
const PATH_AUTH    = (id) => `${DATA_DIR}/sessions/${id}`;
const PATH_USERS   = `${DATA_DIR}/store/users.json`;
const PATH_NETWORK = `${DATA_DIR}/store/network.json`;
const PATH_TIMING  = `${DATA_DIR}/store/timing.json`;
const PATH_PURGE   = `${DATA_DIR}/store/purge.json`;
const PATH_SUDO    = `${DATA_DIR}/store/sudo.json`;

// ─────────────────────────────────────────────
//  WORD CYCLE
// ─────────────────────────────────────────────
const WORD_CYCLE = [
    'CHUD🪣','TMKL🫏','TMKC🪲','CHUDAI KHA🪳','CHUDJA🦠',
    'MAR JA🚽','MAR MAT🗑️','TMKC MAY SALT🧂','TERI MAA PANEER KHA KAR CHODUNGA🪤',
    'RNDI🧻','BITCH🦟','TERI MAA KA BLACKHOLE🕳️','BITCH SON🪰','DICKLESS🤡','TATTI💩'
];

// ─────────────────────────────────────────────
//  FONTS
// ─────────────────────────────────────────────
const GLYPH = {
    a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',
    m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ',
    A:'ᴀ',B:'ʙ',C:'ᴄ',D:'ᴅ',E:'ᴇ',F:'ғ',G:'ɢ',H:'ʜ',I:'ɪ',J:'ᴊ',K:'ᴋ',L:'ʟ',
    M:'ᴍ',N:'ɴ',O:'ᴏ',P:'ᴘ',Q:'ǫ',R:'ʀ',S:'ꜱ',T:'ᴛ',U:'ᴜ',V:'ᴠ',W:'ᴡ',X:'x',Y:'ʏ',Z:'ᴢ'
};
const g = str => str.split('').map(c => GLYPH[c] ?? c).join('');

const DRAGON_GLYPH = {
    A:'𝗔',B:'𝗕',C:'𝗖',D:'𝗗',E:'𝗘',F:'𝗙',G:'𝗚',H:'𝗛',I:'𝗜',J:'𝗝',K:'𝗞',L:'𝗟',
    M:'𝗠',N:'𝗡',O:'𝗢',P:'𝗣',Q:'𝗤',R:'𝗥',S:'𝗦',T:'𝗧',U:'𝗨',V:'𝗩',W:'𝗪',X:'𝗫',
    Y:'𝗬',Z:'𝗭',
    a:'𝗮',b:'𝗯',c:'𝗰',d:'𝗱',e:'𝗲',f:'𝗳',g:'𝗴',h:'𝗵',i:'𝗶',j:'𝗷',k:'𝗸',l:'𝗹',
    m:'𝗺',n:'𝗻',o:'𝗼',p:'𝗽',q:'𝗾',r:'𝗿',s:'𝘀',t:'𝘁',u:'𝘂',v:'𝘃',w:'𝘄',x:'𝘅',
    y:'𝘆',z:'𝘇',
    0:'𝟬',1:'𝟭',2:'𝟮',3:'𝟯',4:'𝟰',5:'𝟱',6:'𝟲',7:'𝟳',8:'𝟴',9:'𝟵'
};
const dark = str => [...String(str)].map(c => DRAGON_GLYPH[c] ?? c).join('');

// ─────────────────────────────────────────────
//  MENU
// ─────────────────────────────────────────────
const MENU_TEXT = (hub=null) => {
    const fleet = hub?.router?.getAll?.() || [];
    const online = fleet.filter(s=>s.online).length;
    const fleetText = fleet.length ? (online + '/' + fleet.length + ' 𝐀ᴄᴛɪᴠᴇ') : '𝐑ᴇᴀᴅʏ';

    return `╔═━─ 𓆩⚡𓆪 ─━═╗
『𓍼ֶָ֢˖ ࣪ꨄ 𝐀𝐑𝐘𝐀 & 𝐌𝐄𝐍𝐓𝐀𝐋 𝐂𝐎𝐋𝐋𝐀𝐁 .་༘࿐』
╚═━─ 𖤐🐉𖤐 ─━═╝

╭━━━𓆩 🐉 𝐍𝐄𝐗𝐔𝐒 𝐂𝐎𝐑𝐄 𓆪━━━╮
│ ✦ 🤖 𝐁ᴏᴛ: 𝐀ʀʏᴀ & 𝐌ᴇɴᴛᴀʟ 𝐂ᴏʟʟᴀʙ ꨄ
│ 𖤐 👑 𝐎ᴡɴᴇʀ: 𝐅ɪʀꜱᴛ 𝐀ᴅᴍɪɴ ✧
│ ✦ ⚙️ 𝐏ʀᴇꜰɪx: [ . ] ꨄ
│ 𖤐 🟢 𝐌ᴏᴅᴇ: 𝐔ʟᴛʀᴀ 𝐎ᴘᴇʀᴀᴛɪᴏɴ ✧
│ ✦ 🤖 𝐅ʟᴇᴇᴛ: ${fleetText} ꨄ
╰━━━༺❀༻━━━╯

╭━━━𓆩 🔐 𝐀𝐂𝐂𝐄𝐒𝐒 𓆪━━━╮
│ ✦ .𝐀𝐝𝐦𝐢𝐧       𝐂ʟᴀɪᴍ 𝐀ᴅᴍɪɴ ɪɴ 𝐃𝐌 ꨄ
╰━━━༺❀༻━━━╯

╭━━━𓆩 💣 𝐒𝐏𝐀𝐌 𝐂𝐎𝐑𝐄 𓆪━━━╮
│ ✦ .𝐒𝐩𝐚𝐦 [ᴛᴇxᴛ]     𝐓ᴇxᴛ 𝐒ᴘᴀᴍ ꨄ
│ 𖤐 .𝐒𝐭𝐨𝐩𝐬𝐩𝐚𝐦      𝐒ᴛᴏᴘ 𝐒ᴘᴀᴍ ✧
╰━━━༺❀༻━━━╯

╭━━━𓆩 🔁 𝐑𝐄𝐏𝐋𝐘 𝐑𝐀𝐈𝐃 𓆪━━━╮
│ ✦ .𝐑𝐫 [ᴛᴇxᴛ]       𝐑ᴇᴘʟʏ ʀᴀɪᴅ · 𝟎.𝟓ꜱ × 𝟐 ꨄ
│ 𖤐 .𝐒𝐭𝐨𝐩𝐫𝐫        𝐒ᴛᴏᴘ 𝐑ᴀɪᴅ ✧
╰━━━༺❀༻━━━╯

╭━━━𓆩 🌀 𝐂𝐘𝐂𝐋𝐄 𝐂𝐎𝐑𝐄 𓆪━━━╮
│ ✦ .𝐍𝐜 [ᴛᴇxᴛ]      𝐖ᴏʀᴅ 𝐂ʏᴄʟᴇ ꨄ
│ 𖤐 .𝐒𝐭𝐨𝐩𝐧𝐜        𝐒ᴛᴏᴘ 𝐖ᴏʀᴅ 𝐂ʏᴄʟᴇ ✧
╰━━━༺❀༻━━━╯

╭━━━𓆩 ⏱️ 𝐒𝐏𝐄𝐄𝐃 & 𝐂𝐎𝐍𝐓𝐑𝐎𝐋 𓆪━━━╮
│ ✦ .𝐒𝐩𝐞𝐞𝐝 [𝟎-𝟏𝟎]    𝐍ᴄ + 𝐒ᴘᴀᴍ ꨄ
│ 𖤐 .𝐌𝐞𝐧𝐮 / .𝐏𝐢𝐧𝐠 ✧
╰━━━༺❀༻━━━╯

┈┉┅━❀꧁ 𓆩♡𓆪 ꧂❀━┅┉┈
⋆｡°✩ ❝ 𝐀ʟʟ 𝐂ᴏᴍᴍᴀɴᴅꜱ 𝐑ᴇǫᴜɪʀᴇ . 𝐏ʀᴇꜰɪx ❞ ✩°｡⋆`;
};

// ─────────────────────────────────────────────
//  NOTIFICATIONS
// ─────────────────────────────────────────────
const TAG  = `╔═━─ 𓆩⚡𓆪 ─━═╗
『 🐉 ${dark('ARYA & MENTAL COLLAB ULTRA NODE V12')} 🛡️ 』
╚═━─ 𖤐🔥𖤐 ─━═╝`;
const win  = what => `${TAG}\n\n▶ ${dark(what)} ${dark('ACTIVATED')}`;
const lose = what => `${TAG}\n\n◼ ${dark(what)} ${dark('DEACTIVATED')}`;

// ─────────────────────────────────────────────
//  PERSISTENCE
// ─────────────────────────────────────────────
const ensureDir = p => { const d=p.includes('/')?p.substring(0,p.lastIndexOf('/')):'.'; if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true}); };
const readJson  = (p,def) => { try{ if(fs.existsSync(p)) return JSON.parse(fs.readFileSync(p,'utf8')); }catch{} return {...def}; };
const writeJson = (p,d)   => { try{ ensureDir(p); fs.writeFileSync(p,JSON.stringify(d,null,2)); }catch{} };

let userData  = readJson(PATH_USERS,  { owners:[] });
if(!userData || typeof userData !== 'object' || Array.isArray(userData)) userData={};
if(!Array.isArray(userData.owners)) userData.owners=[];

const _rawTiming = readJson(PATH_TIMING, { speed:0 });
let timingMap = { speed: typeof _rawTiming.speed === 'number' ? _rawTiming.speed : 0 };
let purgeData = readJson(PATH_PURGE, { lastPurgeAt:0, totalPurges:0, lastPurgeMs:0 });

let sudoData = readJson(PATH_SUDO, { ids: [] });
if(!sudoData || typeof sudoData !== 'object' || !Array.isArray(sudoData.ids)) sudoData = { ids: [] };
sudoData.ids = sudoData.ids.map(String).filter(id => id && id !== TG_OWNER);

const saveUsers  = () => writeJson(PATH_USERS,  userData);
const saveTiming = () => writeJson(PATH_TIMING, timingMap);
const savePurge  = () => writeJson(PATH_PURGE, purgeData);
const saveSudo   = () => writeJson(PATH_SUDO, sudoData);

const isOwner = j => userData.owners.includes(j);
const grantOwner = j => { if(!userData.owners.includes(j)){userData.owners.push(j);saveUsers();return true;} return false; };

const isTgOwner      = chatId => String(chatId) === TG_OWNER;
const isTgSudo       = chatId => sudoData.ids.includes(String(chatId));
const isTgAuthorized = chatId => isTgOwner(chatId) || isTgSudo(chatId);
const getAllTgOwners = () => [TG_OWNER, ...sudoData.ids];

// ─────────────────────────────────────────────
//  UTIL
// ─────────────────────────────────────────────
const isRateErr = e => {
    const msg=(e?.message||'').toLowerCase();
    const code=e?.output?.statusCode;
    return msg.includes('rate') || msg.includes('overlimit') || msg.includes('wait') ||
           msg.includes('spam') || msg.includes('too many') || code===429 || code===503;
};

const isBanOrLogout = (code, err) => {
    const msg = String(err?.message || '').toLowerCase();
    if (code === 401 || code === 403) return true;
    if (msg.includes('banned'))           return true;
    if (msg.includes('forbidden'))        return true;
    if (msg.includes('not-authorized'))   return true;
    if (msg.includes('account has been')) return true;
    if (msg.includes('logged out'))       return true;
    return false;
};

const unwrapIncomingMessage = message => {
    let current=message;
    for(let i=0;i<5;i++){
        const key=current && Object.keys(current)[0];
        if(key==='ephemeralMessage' || key==='viewOnceMessage' ||
           key==='viewOnceMessageV2' || key==='documentWithCaptionMessage'){
            current=current[key]?.message || current;
        }else break;
    }
    return current || {};
};

const normalizeJid = jid => String(jid || '').replace(/:\d+(?=@)/, '');
const sameJid = (a,b) => normalizeJid(a) === normalizeJid(b);

const fmtBytes = b => {
    if (b >= 1024*1024*1024) return (b/1024/1024/1024).toFixed(2) + ' GB';
    if (b >= 1024*1024)      return (b/1024/1024).toFixed(2) + ' MB';
    if (b >= 1024)           return (b/1024).toFixed(2) + ' KB';
    return b + ' B';
};

const fmtTime = ts => ts
    ? new Date(ts).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit', hour12: true
    }) + ' IST'
    : '—';

const getDirSize = dir => {
    let total = 0;
    try{
        for (const item of fs.readdirSync(dir, {withFileTypes:true})){
            const p = `${dir}/${item.name}`;
            if (item.isDirectory()) total += getDirSize(p);
            else if (item.isFile()) { try { total += fs.statSync(p).size; } catch {} }
        }
    }catch{}
    return total;
};

const getNextPurgeTime = () => {
    const now = new Date();
    for (const h of PURGE_HOURS){
        const t = new Date(now);
        t.setHours(h, 0, 0, 0);
        if (t.getTime() > now.getTime()) return t;
    }
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    t.setHours(PURGE_HOURS[0], 0, 0, 0);
    return t;
};

// ═════════════════════════════════════════════
//  DEEP CLEANUP
// ═════════════════════════════════════════════
const cleanSessionFiles = (authDir, maxAgeDays = 14) => {
    let deleted = 0, freed = 0;
    if (!fs.existsSync(authDir)) return { deleted, freed };

    const MAX_AGE = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    try {
        const files = fs.readdirSync(authDir);
        for (const file of files) {
            const isOldKey =
                file.startsWith('pre-key-') ||
                file.startsWith('sender-key-') ||
                file.startsWith('sender-key-memory-');
            if (!isOldKey) continue;
            const path = `${authDir}/${file}`;
            try {
                const stat = fs.statSync(path);
                if ((now - stat.mtimeMs) > MAX_AGE) {
                    freed += stat.size;
                    fs.unlinkSync(path);
                    deleted++;
                }
            } catch {}
        }
    } catch {}

    return { deleted, freed };
};

// ═════════════════════════════════════════════
//  ROUTER
// ═════════════════════════════════════════════
class Router {
    constructor(){
        this.registry = new Map();
        this.processed= new Map();
        setInterval(()=>{
            const n=Date.now();
            for(const[k,v]of this.processed) if(n-v>60000) this.processed.delete(k);
        }, 30000);
    }
    attach(id,session){ this.registry.set(id,session); }
    detach(id)        { this.registry.delete(id); }
    dedupe(msgId)     { if(this.processed.has(msgId))return false; this.processed.set(msgId,Date.now()); return true; }
    pushAll(cmd,payload,fromId,notify=true){
        const all=[...this.registry.values()];
        return Promise.all(all.map(s=>s.handle(cmd,payload,s.id===fromId&&notify).catch(e=>console.error(`[${s.id}]`,e.message))));
    }
    getAll()    { return [...this.registry.values()]; }
    getAlive()  { return [...this.registry.values()].filter(s=>s.online); }
    getPrimary(){ const a=this.getAlive(); return a[0]||null; }
}

// ═════════════════════════════════════════════
//  SESSION
// ═════════════════════════════════════════════
class Session {
    constructor(id, phone, hub, notifyChat = null){
        this.id         = id;
        this.phone      = phone;
        this.hub        = hub;
        this.notifyChat = notifyChat;
        this.socket     = null;
        this.online     = false;
        this.self       = null;
        this.didPair    = false;
        this.destroyed  = false;
        this.purgeMode  = false;
        this.banned     = false;
        this.reconnecting = false;
        this.retries    = 0;
        this.lastConnectAttempt = 0;

        this.nameLoops  = new Map();
        this.spamLoop   = new Map();
        this.rrLoop     = new Map();
    }

    killAllLoops(){
        for(const [,v] of this.nameLoops) if(v && typeof v==='object') v.on=false;
        this.nameLoops.clear();
        for(const [,v] of this.spamLoop) if(v && typeof v==='object') v.on=false;
        this.spamLoop.clear();
        for(const [,v] of this.rrLoop) if(v && typeof v==='object') v.live=false;
        this.rrLoop.clear();
    }

    async _sendPairCode(code){
        try {
            const msg =
                `🔑 *Pairing code for ${this.id}*\n` +
                `📱 Number: +${this.phone}\n\n` +
                `\`${code}\`\n\n` +
                `*Steps:*\n` +
                `1. Open WhatsApp on that phone\n` +
                `2. Settings → Linked Devices\n` +
                `3. Link a Device\n` +
                `4. Link with phone number\n` +
                `5. Enter the code above\n\n` +
                `_Code expires in ~60 seconds._`;
            await this.hub.sendTelegram(this.notifyChat, msg, {parse_mode: 'Markdown'});
            console.log(`[${this.id}] 🔑 Pair code → ${code}`);
        } catch (e) {
            console.error(`[${this.id}] pair code send err:`, e.message);
        }
    }

    async init(){
        if (this.destroyed || this.banned) return;
        this.lastConnectAttempt = Date.now();
        try{
            const authDir = PATH_AUTH(this.id);
            if(!fs.existsSync(authDir)) fs.mkdirSync(authDir,{recursive:true});
            const {state,saveCreds} = await useMultiFileAuthState(authDir);
            const {version}        = await fetchLatestBaileysVersion();
            const pairNeeded       = !state.creds.registered;

            this.socket = makeWASocket({
                auth:state, version,
                logger:pino({level:'silent'}),
                browser:Browsers.macOS('Safari'),
                printQRInTerminal:false,
                connectTimeoutMs:60000,
                defaultQueryTimeoutMs:0,
                keepAliveIntervalMs:20000,
                syncFullHistory:false,
                markOnlineOnConnect:false
            });

            this.socket.ev.on('connection.update', async upd => {
                try {
                    if(this.destroyed) return;
                    const {connection,lastDisconnect} = upd;

                    if(pairNeeded && this.phone && !this.didPair && !state.creds.registered){
                        this.didPair = true;
                        await delay(2500);
                        try{
                            const code = await this.socket.requestPairingCode(this.phone);
                            await this._sendPairCode(code);
                        }catch(e){
                            console.error(`[${this.id}] pair code err:`, e.message);
                            this.didPair = false;
                        }
                    }

                    if(connection === 'close'){
                        const err = lastDisconnect?.error;
                        const code = (err instanceof Boom) ? err.output.statusCode : 500;
                        this.online = false;
                        console.log(`[${this.id}] closed — code ${code}${this.purgeMode?' [purge]':''}`);
                        if(this.destroyed) return;

                        if (isBanOrLogout(code, err)) {
                            const reason = (code === 403) ? '🚫 BANNED / RESTRICTED'
                                         : (code === 401) ? '🔓 LOGGED OUT'
                                         : '⚠️ INVALID SESSION';
                            console.log(`[${this.id}] ${reason} — auto-removing`);
                            this.banned = true;
                            this.destroyed = true;
                            this.online = false;
                            this.socket = null;
                            await this.hub.sendTelegram(this.notifyChat,
                                `${reason}\n\n*${this.id}* (+${this.phone}) was removed.\nUse /addnum to add again.`,
                                {parse_mode:'Markdown'});
                            setTimeout(() => {
                                this.hub.unlink(this.id).catch(err => console.error('[unlink]', err.message));
                            }, 2000);
                            return;
                        }

                        if(this.purgeMode) return;

                        this.retries++;
                        if (this.retries > MAX_RETRIES) {
                            console.log(`[${this.id}] max retries hit — giving up`);
                            this.destroyed = true;
                            await this.hub.sendTelegram(this.notifyChat,
                                `❌ *${this.id}* failed ${MAX_RETRIES} times. Session removed.\nUse /addnum to add again.`,
                                {parse_mode:'Markdown'});
                            setTimeout(() => { this.hub.unlink(this.id).catch(()=>{}); }, 2000);
                            return;
                        }

                        const backoff = Math.min(4000 * Math.pow(2, this.retries - 1), 60000);
                        console.log(`[${this.id}] retry #${this.retries}/${MAX_RETRIES} in ${backoff}ms`);
                        await delay(backoff);
                        this.init().catch(err => console.error(`[${this.id}] retry init err:`, err.message));

                    } else if(connection === 'open'){
                        this.online = true;
                        this.retries = 0;
                        this.self   = this.socket.user.id.split(':')[0] + '@s.whatsapp.net';
                        console.log(`[${this.id}] ✅ connected — ${this.self}`);
                        if (!this.purgeMode) {
                            await this.hub.sendTelegram(this.notifyChat,
                                `✅ *${this.id}* (${this.phone}) is now *ONLINE* 🟢`,
                                {parse_mode:'Markdown'});
                        }
                    }
                } catch (e) {
                    console.error(`[${this.id}] connection.update handler err:`, e.message);
                }
            });

            this.socket.ev.on('creds.update', () => {
                try { saveCreds(); } catch (e) { console.error(`[${this.id}] saveCreds err:`, e.message); }
            });
            this.socket.ev.on('messages.upsert', m => {
                this.receive(m).catch(err => console.error(`[${this.id}] receive err:`, err.message));
            });
        }catch(e){
            console.error(`[${this.id}] init err:`, e.message);
            if (!this.destroyed && !this.purgeMode) {
                this.retries++;
                if (this.retries <= MAX_RETRIES) {
                    setTimeout(() => { this.init().catch(()=>{}); }, 5000);
                }
            }
        }
    }

    async receive({messages,type}){
        try{
            if(type !== 'notify' && type !== 'append') return;
            const raw = messages[0];
            if(!raw?.message) return;
            const fromMe = !!raw.key?.fromMe;
            raw.message = unwrapIncomingMessage(raw.message);
            const earlyText = (raw.message.conversation || raw.message.extendedTextMessage?.text || '').trim();

            const selfAccessCommand = fromMe &&
                !raw.key?.remoteJid?.endsWith('@g.us') &&
                /^\.(admin|menu)$/i.test(earlyText);
            if(fromMe && !selfAccessCommand) return;

            const mtype = Object.keys(raw.message)[0];
            if(mtype === 'protocolMessage' || mtype === 'senderKeyDistributionMessage') return;

            const chat    = raw.key.remoteJid;
            if(!chat) return;
            const isGroup = chat.endsWith('@g.us');
            const who     = isGroup ? raw.key.participant : chat;

            const primary = this.hub.router.getPrimary();
            if(primary && primary.id !== this.id){
                return primary.receive({messages:[raw], type});
            }
            if(!this.hub.router.dedupe(raw.key.id)) return;

            if(isGroup && this.rrLoop.has(`${chat}__rr`)){
                const rr = this.rrLoop.get(`${chat}__rr`);
                if(rr?.live && sameJid(rr.target, who)){
                    const earlyCmd = earlyText.toLowerCase();
                    if(!/^\.stoprr$/.test(earlyCmd)){
                        const rawRef = { key: raw.key, message: raw.message };
                        (async()=>{
                            for(let i=0;i<2;i++){
                                if(!rr.live || !this.socket || !this.online) break;
                                try{
                                    await this.socket.sendMessage(chat, {text: dark(rr.text)}, {quoted: rawRef});
                                }catch(e){ if(isRateErr(e)) await delay(2000); }
                                if(i<1) await delay(500);
                            }
                        })().catch(()=>{});
                    }
                }
            }

            const inputBody = (raw.message.conversation
                        || raw.message.extendedTextMessage?.text
                        || raw.message.imageMessage?.caption || '').trim();
            const body = inputBody;
            const cmd  = body.toLowerCase();

            const isDM    = !isGroup;
            const isOwn   = isOwner(who);

            const isExactAdminCommand = isDM &&
                (raw.message.conversation || raw.message.extendedTextMessage?.text) &&
                /^\.admin$/i.test(inputBody);
            if(isExactAdminCommand){
                const requesterIsLinkedBot = this.hub.router.getAll().some(s=>sameJid(s.self,who));
                if(!userData.owners.length || fromMe || requesterIsLinkedBot){
                    grantOwner(fromMe ? chat : who);
                    await this.send(chat,`${TAG}\n\n👑 ${g('you are now the owner')}\n\n${g('send')} .menu`);
                } else if(isOwn){
                    await this.send(chat,`⚠️ ${g('you already own this bot')}`);
                } else {
                    await this.send(chat, DENIAL_MSG);
                }
                return;
            }

            if(!isOwn){
                if(body.startsWith('.') && /^\.[a-z]/i.test(body)){
                    await this.send(chat, DENIAL_MSG);
                }
                return;
            }

            if(cmd === '.menu'){ await this.send(chat, MENU_TEXT(this.hub)); return; }

            if(cmd === '.ping'){
                const started = Date.now();
                try{
                    const probe = await this.socket.sendMessage(chat, {text:'🏓 Measuring…'});
                    const elapsed = Date.now() - started;
                    await this.socket.sendMessage(chat, {
                        text: `${TAG}\n\n🏓 ${dark('PING')}\n⏱️ ${elapsed} ms`,
                        edit: probe.key
                    });
                }catch(e){ await this.send(chat,`❌ ${g('ping failed')}`); }
                return;
            }

            if(cmd.startsWith('.speed ')){
                const seconds = parseFloat(body.slice(7).trim());
                if(isNaN(seconds) || seconds < 0 || seconds > 10){
                    await this.send(chat,`📋 ${g('usage')}: .speed [0-10]`); return;
                }
                const ms = Math.round(seconds * 1000);
                timingMap.speed = ms; saveTiming();
                await this.send(chat,`${TAG}\n\n⏱️ ${dark('SPEED')}: ${seconds}s (${ms}ms)`);
                return;
            }

            if(/^\.nc\s+\S/i.test(body) && !/^\.nc[0-9]/i.test(body)){
                if(!isGroup){ await this.send(chat,`👥 ${g('groups only')}`); return; }
                const txt = body.slice(4).trim();
                await this.hub.router.pushAll('word_start', {chat, txt}, this.id); return;
            }
            if(cmd === '.stopnc'){
                if(!isGroup){ await this.send(chat,`👥 ${g('groups only')}`); return; }
                await this.hub.router.pushAll('word_stop', {chat}, this.id); return;
            }

            if(cmd.startsWith('.spam ')){
                if(!isGroup){ await this.send(chat,`👥 ${g('groups only')}`); return; }
                const txt = body.slice(6).trim();
                if(!txt){ await this.send(chat,`📋 .spam [text]`); return; }
                await this.hub.router.pushAll('spam_start', {chat, txt}, this.id); return;
            }
            if(cmd === '.stopspam'){
                if(!isGroup){ await this.send(chat,`👥 ${g('groups only')}`); return; }
                await this.hub.router.pushAll('spam_stop', {chat}, this.id); return;
            }

            if(cmd.startsWith('.rr ')){
                if(!isGroup){ await this.send(chat,`👥 ${g('groups only')}`); return; }
                const ctx = raw.message.extendedTextMessage?.contextInfo;
                const target = ctx?.participant || ctx?.participantPn;
                if(!target){ await this.send(chat,`↩️ ${g('reply to someone first')}`); return; }
                const txt = body.slice(3).trim();
                if(!txt){ await this.send(chat,`📋 .rr [text]`); return; }
                const tid = `${chat}__rr`;
                const existing = this.rrLoop.get(tid);
                if(existing) existing.live = false;
                this.rrLoop.set(tid, {live:true, target, text:txt});
                await this.send(chat,
                    `${TAG}\n\n▶ ${dark('RR RAID ACTIVE')}\n`+
                    `🎯 @${target.split('@')[0]}\n💬 ${dark(txt)}\n🛑 .stoprr`,
                    [target]
                );
                return;
            }
            if(cmd === '.stoprr'){
                if(!isGroup){ await this.send(chat,`👥 ${g('groups only')}`); return; }
                const tid = `${chat}__rr`;
                if(this.rrLoop.has(tid)){
                    this.rrLoop.get(tid).live = false;
                    this.rrLoop.delete(tid);
                    await this.send(chat, lose('.rr'));
                } else await this.send(chat,`ℹ️ ${g('no active rr')}`);
                return;
            }

        }catch(e){ console.error(`[${this.id}] receive err:`, e.stack || e); }
    }

    async handle(cmd, payload, notify = true){
        const {chat} = payload;
        try{
            switch(cmd){
            case 'word_start':{
                const {txt} = payload;
                const tid = `${chat}__wl`;
                if(this.nameLoops.has(tid)){ this.nameLoops.get(tid).on = false; await delay(50); }
                const t = {on:true, i:0, txt, chat};
                this.nameLoops.set(tid, t);
                const ms = timingMap.speed || 0;
                let wBackoff = 0;
                (async()=>{
                    while(t.on){
                        if(!this.socket || !this.online){ await delay(2000); continue; }
                        try{
                            await this.socket.groupUpdateSubject(chat,`${dark(txt)} ${WORD_CYCLE[t.i++ % WORD_CYCLE.length]}`);
                            wBackoff = 0;
                            await delay(ms);
                        }catch(e){
                            if(isRateErr(e)){ wBackoff = Math.min(wBackoff+2000,15000); await delay(wBackoff); }
                            else await delay(ms);
                        }
                    }
                })().catch(()=>{});
                if(notify) await this.send(chat, win(`.nc (${ms}ms)`));
                break;
            }
            case 'word_stop':{
                for(const [k,v] of this.nameLoops) if(k.startsWith(chat)){ v.on = false; this.nameLoops.delete(k); }
                if(notify) await this.send(chat, lose('.nc'));
                break;
            }
            case 'spam_start':{
                const {txt} = payload;
                const tid = `${chat}__spam`;
                if(this.spamLoop.has(tid)){ this.spamLoop.get(tid).on = false; await delay(50); }
                const t = {on:true, txt, chat};
                this.spamLoop.set(tid, t);
                const ms = timingMap.speed || 0;
                let backoff = 0;
                (async()=>{
                    while(t.on){
                        if(!this.socket || !this.online){ await delay(2000); continue; }
                        try{
                            await this.socket.sendMessage(chat, {text: dark(txt)});
                            backoff = 0;
                            await delay(ms);
                        }catch(e){
                            if(isRateErr(e)){ backoff = Math.min(backoff+1500, 10000); await delay(backoff); }
                            else await delay(ms);
                        }
                    }
                })().catch(()=>{});
                if(notify) await this.send(chat, win(`.spam (${ms}ms)`));
                break;
            }
            case 'spam_stop':{
                for(const [k,v] of this.spamLoop){
                    if(k.startsWith(chat)){ v.on = false; this.spamLoop.delete(k); }
                }
                if(notify) await this.send(chat, lose('.spam'));
                break;
            }
            }
        }catch(e){ console.error(`[${this.id}] handle err:`, e.message); }
    }

    async send(jid, text, mentions = []){
        if(!this.socket || !this.online) return false;
        let attempts = 0;
        while(attempts < 3){
            try{
                await this.socket.sendMessage(jid, {text, ...(mentions.length ? {mentions} : {})});
                return true;
            }catch(e){
                attempts++;
                if(isRateErr(e)) await delay(3000);
                else return false;
            }
        }
        return false;
    }
}

// ═════════════════════════════════════════════
//  HUB
// ═════════════════════════════════════════════
class Hub {
    constructor(){
        this.sessions    = new Map();
        this.router      = new Router();
        this.telegramBot = null;
        this.disk        = readJson(PATH_NETWORK, { list: [] });
        this.purging     = false;
        this._quotaAlerted = false;
    }

    _save(){
        writeJson(PATH_NETWORK, {
            list: [...this.sessions.entries()].map(([id, s]) => ({
                id, phone: s.phone, notifyChat: s.notifyChat, online: s.online
            }))
        });
    }

    async sendTelegram(chatId, text, options = {}){
        if(!this.telegramBot || !chatId) return false;
        try{
            await this.telegramBot.sendMessage(chatId, text, options);
            return true;
        }catch(e){
            console.error(`[TG] send error to ${chatId}:`, e.message);
            return false;
        }
    }

    async broadcastOwners(text, options = {}){
        const targets = getAllTgOwners();
        for (const id of targets) {
            await this.sendTelegram(id, text, options);
        }
    }

    _nextSlot(){
        for(let i = 1; i <= MAX_SLOTS; i++){
            if(!this.sessions.has(`X${i}`)) return i;
        }
        return null;
    }

    async boot(){
        const saved = this.disk.list || [];
        if(saved.length){
            console.log(`[BOOT] restoring ${saved.length} session(s)…`);
            for(const entry of saved){
                if(!/^X[1-5]$/.test(entry.id)) continue;
                try {
                    const s = new Session(entry.id, entry.phone, this, entry.notifyChat || null);
                    this.sessions.set(entry.id, s);
                    this.router.attach(entry.id, s);
                    await s.init();
                    await delay(1200);
                } catch(e){
                    console.error(`[BOOT] failed to restore ${entry.id}:`, e.message);
                }
            }
            this._save();
        } else {
            console.log('[BOOT] No saved sessions — send /addnum from Telegram.');
        }
    }

    async link(phone, notifyChat){
        if(this.sessions.size >= MAX_SLOTS){
            return `❌ All ${MAX_SLOTS} slots are full. Use /remove1 … /remove${MAX_SLOTS} first.`;
        }
        const slot = this._nextSlot();
        if(slot === null) return `❌ All ${MAX_SLOTS} slots are full.`;

        const id = `X${slot}`;
        const s = new Session(id, phone, this, notifyChat);
        this.sessions.set(id, s);
        this.router.attach(id, s);
        try{
            await s.init();
        }catch(e){
            this.sessions.delete(id);
            this.router.detach(id);
            return `❌ Failed to create slot ${slot}: ${e.message}`;
        }
        this._save();
        return `⏳ *Slot ${slot}* created for \`+${phone}\`\n_Pairing code aayega next message me…_`;
    }

    async unlink(id){
        try {
            const s = this.sessions.get(id);
            if(!s) return false;
            s.destroyed = true;
            s.online = false;
            s.killAllLoops();
            try{ s.socket?.end?.(new Error('Removed by owner')); } catch{}
            try{ s.socket?.ws?.close?.(); } catch{}
            this.router.detach(id);
            this.sessions.delete(id);
            this._save();
            setTimeout(()=>{
                try{ fs.rmSync(PATH_AUTH(id), {recursive:true, force:true}); }catch{}
            }, 1500);
            return true;
        } catch (e) {
            console.error(`[unlink] ${id} err:`, e.message);
            return false;
        }
    }

    async runPurge(trigger = 'auto'){
        if(this.purging) return { ok:false, reason:'already running' };
        this.purging = true;
        const started = Date.now();
        const memBefore = process.memoryUsage();
        console.log(`\n[PURGE] ─── START (${trigger}) ───`);

        const snapshot = [];
        for(const s of this.sessions.values()){
            if (s.destroyed || s.banned) continue;
            for(const [, v] of s.nameLoops) if(v?.on && v.txt && v.chat) snapshot.push({sid: s.id, type:'nc', data:{chat: v.chat, txt: v.txt}});
            for(const [, v] of s.spamLoop) if(v?.on && v.txt && v.chat) snapshot.push({sid: s.id, type:'spam', data:{chat: v.chat, txt: v.txt}});
            for(const [k, v] of s.rrLoop) if(v?.live) snapshot.push({sid: s.id, type:'rr', data:{chat: k.split('__')[0], target: v.target, text: v.text}});
        }

        for(const s of this.sessions.values()){
            s.purgeMode = true;
            s.killAllLoops();
            try{ s.socket?.end?.(new Error('purge')); } catch{}
            try{ s.socket?.ws?.close?.(); } catch{}
            s.socket = null;
            s.online = false;
        }

        await delay(1500);

        let gcRan = false;
        if (GC_ENABLED && typeof global.gc === 'function') {
            try { global.gc(); gcRan = true; } catch(e){}
        }

        let sessionCleaned = { deleted: 0, freed: 0 };
        for (let i = 1; i <= MAX_SLOTS; i++) {
            const dir = PATH_AUTH(`X${i}`);
            const r = cleanSessionFiles(dir, 14);
            sessionCleaned.deleted += r.deleted;
            sessionCleaned.freed += r.freed;
        }
        if (sessionCleaned.deleted > 0) {
            console.log(`[PURGE] session cleanup: ${sessionCleaned.deleted} files, ${fmtBytes(sessionCleaned.freed)}`);
        }

        for(const s of this.sessions.values()){
            if(s.destroyed || s.banned) continue;
            s.purgeMode = false;
            s.didPair = true;
            try{ await s.init(); } catch(e){ console.error(`[PURGE] reconnect ${s.id}:`, e.message); }
        }

        await delay(3500);

        let restored = 0;
        for(const item of snapshot){
            const s = this.sessions.get(item.sid);
            if(!s || s.destroyed || !s.online) continue;
            try{
                if(item.type === 'nc')         await s.handle('word_start',  {chat: item.data.chat, txt: item.data.txt}, false);
                else if(item.type === 'spam')  await s.handle('spam_start',  {chat: item.data.chat, txt: item.data.txt}, false);
                else if(item.type === 'rr'){
                    s.rrLoop.set(`${item.data.chat}__rr`, {live:true, target: item.data.target, text: item.data.text});
                }
                restored++;
            }catch(e){}
        }

        const memAfter = process.memoryUsage();
        const freedRss  = Math.max(0, memBefore.rss  - memAfter.rss);
        const freedHeap = Math.max(0, memBefore.heapUsed - memAfter.heapUsed);
        const elapsed   = Date.now() - started;

        purgeData.lastPurgeAt = Date.now();
        purgeData.totalPurges = (purgeData.totalPurges || 0) + 1;
        purgeData.lastPurgeMs = elapsed;
        savePurge();

        console.log(`[PURGE] freed RSS:${fmtBytes(freedRss)} heap:${fmtBytes(freedHeap)} restored:${restored}/${snapshot.length} files:${sessionCleaned.deleted} took:${elapsed}ms`);

        await this.broadcastOwners(
            `🔥 *AUTO-PURGE ${trigger.toUpperCase()}*\n\n` +
            `⏱️ Took: ${elapsed}ms\n` +
            `🧠 RSS freed: ${fmtBytes(freedRss)}\n` +
            `📦 Heap freed: ${fmtBytes(freedHeap)}\n` +
            `🗂️ Files cleaned: ${sessionCleaned.deleted} (${fmtBytes(sessionCleaned.freed)})\n` +
            `🔁 Restored: ${restored}/${snapshot.length}\n` +
            `♻️ GC: ${gcRan ? '✅' : '⚠️'}\n` +
            `📊 Total purges: ${purgeData.totalPurges}`,
            {parse_mode:'Markdown'});

        this.purging = false;
        return { ok:true, freedRss, freedHeap, restored, total:snapshot.length, elapsed, gcRan, filesCleaned: sessionCleaned.deleted };
    }

    schedulePurge(){
        try {
            const next = getNextPurgeTime();
            const waitMs = next.getTime() - Date.now();
            console.log(`[PURGE] next auto-purge at ${fmtTime(next.getTime())} (in ${Math.round(waitMs/60000)} min)`);
            setTimeout(async () => {
                try{ await this.runPurge('auto'); }catch(e){ console.error('[PURGE] auto err:', e); }
                this.schedulePurge();
            }, Math.max(waitMs, 60_000));
        } catch (e) {
            console.error('[PURGE] schedule err:', e.message);
            setTimeout(() => this.schedulePurge(), 60_000);
        }
    }

    startWatchdog(){
        setInterval(() => {
            try {
                for (const s of this.sessions.values()) {
                    if (s.destroyed || s.banned || s.purgeMode || s.reconnecting || s.online) continue;
                    if (Date.now() - s.lastConnectAttempt < 5 * 60 * 1000) continue;
                    console.log(`[WATCHDOG] ${s.id} offline >5min — reconnecting…`);
                    s.reconnecting = true;
                    s.init().catch(()=>{}).finally(() => { s.reconnecting = false; });
                }
            } catch (e) {
                console.error('[WATCHDOG] err:', e.message);
            }
        }, 60_000);
        console.log('[WATCHDOG] ✅ started (60s interval)');
    }

    startMemoryMonitor(){
        const THRESHOLD_MB = 410;
        let lastPurgeWarn = 0;

        setInterval(async () => {
            try {
                const mu = process.memoryUsage();
                const rssMB = mu.rss / 1024 / 1024;

                if (rssMB > THRESHOLD_MB && !this.purging) {
                    const now = Date.now();
                    if (now - lastPurgeWarn < 10 * 60 * 1000) return;
                    lastPurgeWarn = now;

                    console.log(`[MEM-MONITOR] ⚠️ RSS ${rssMB.toFixed(1)}MB > ${THRESHOLD_MB}MB — auto-purge`);
                    await this.broadcastOwners(
                        `⚠️ *MEMORY THRESHOLD*\nRSS: ${rssMB.toFixed(1)} MB > ${THRESHOLD_MB} MB\nTriggering auto-purge…`,
                        {parse_mode:'Markdown'});

                    await this.runPurge('memory-threshold');
                }
            } catch (e) {
                console.error('[MEM-MONITOR] err:', e.message);
            }
        }, 2 * 60 * 1000);

        console.log('[MEM-MONITOR] ✅ started (threshold: 410 MB, check: 2min)');
    }

    startDiskMonitor(){
        const WARN_MB      = 3584;
        const CRITICAL_MB  = 4608;
        let lastWarn = 0;

        setInterval(async () => {
            try {
                const sessSize = getDirSize(`${DATA_DIR}/sessions`);
                const storeSize = getDirSize(`${DATA_DIR}/store`);
                const totalMB = (sessSize + storeSize) / 1024 / 1024;

                if (totalMB > CRITICAL_MB && !this.purging) {
                    console.log(`[DISK-MONITOR] 🚨 Disk ${totalMB.toFixed(1)}MB > ${CRITICAL_MB}MB — EMERGENCY purge`);
                    await this.broadcastOwners(
                        `🚨 *DISK CRITICAL*\n${totalMB.toFixed(1)} MB > ${CRITICAL_MB} MB\nEmergency purge running…`,
                        {parse_mode:'Markdown'});
                    await this.runPurge('disk-critical');
                    return;
                }

                if (totalMB > WARN_MB) {
                    const now = Date.now();
                    if (now - lastWarn < 30 * 60 * 1000) return;
                    lastWarn = now;

                    console.log(`[DISK-MONITOR] ⚠️ Disk ${totalMB.toFixed(1)}MB > ${WARN_MB}MB — deep cleanup`);
                    let cleaned = 0, freed = 0;
                    for (let i = 1; i <= MAX_SLOTS; i++) {
                        const r = cleanSessionFiles(PATH_AUTH(`X${i}`), 7);
                        cleaned += r.deleted;
                        freed += r.freed;
                    }
                    if (cleaned > 0) {
                        console.log(`[DISK-MONITOR] cleaned ${cleaned} files, ${fmtBytes(freed)}`);
                    }
                }
            } catch (e) {
                console.error('[DISK-MONITOR] err:', e.message);
            }
        }, 10 * 60 * 1000);

        console.log('[DISK-MONITOR] ✅ started (warn: 3.5GB, critical: 4.5GB, check: 10min)');
    }

    startQuotaMonitor(){
        setInterval(async () => {
            try {
                const mu = process.memoryUsage();
                const rssMB = mu.rss / 1024 / 1024;
                const ramPct = (rssMB / RAM_LIMIT_MB) * 100;
                const uptimePct = Math.min(100, (process.uptime() / 60 / 60 / MONTHLY_HOURS) * 100);
                const maxPct = Math.max(ramPct, uptimePct);

                if (maxPct > 80 && !this._quotaAlerted) {
                    this._quotaAlerted = true;
                    await this.broadcastOwners(
                        `⚠️ *QUOTA ALERT*\n\n` +
                        `🧠 RAM: ${ramPct.toFixed(1)}%\n` +
                        `⏱️ Hours: ${uptimePct.toFixed(1)}%\n\n` +
                        `Usage >80%. Consider /purge or removing unused slots.`,
                        {parse_mode:'Markdown'});
                } else if (maxPct < 60) {
                    this._quotaAlerted = false;
                }
            } catch (e) {
                console.error('[QUOTA-MONITOR] err:', e.message);
            }
        }, 5 * 60 * 1000);
        console.log('[QUOTA-MONITOR] ✅ started (5min interval)');
    }
}

// ═════════════════════════════════════════════
//  HTTP HEALTH SERVER
// ═════════════════════════════════════════════
const httpServer = http.createServer((req, res) => {
    try {
        if(req.url === '/' || req.url === '/health' || req.url === '/healthz'){
            const mu = process.memoryUsage();
            const sessions = [...hub.sessions.values()].map(s => ({
                id: s.id, phone: s.phone, online: s.online, banned: s.banned, destroyed: s.destroyed
            }));
            res.writeHead(200, {'Content-Type':'application/json'});
            res.end(JSON.stringify({
                status: 'ok',
                uptime: Math.floor(process.uptime()),
                sessions: hub.sessions.size,
                sessionList: sessions,
                sudoCount: sudoData.ids.length,
                rss: mu.rss,
                heapUsed: mu.heapUsed,
                lastPurgeAt: purgeData.lastPurgeAt,
                nextPurgeAt: getNextPurgeTime().getTime(),
                timezone: process.env.TZ,
                gc: GC_ENABLED,
                timestamp: new Date().toISOString()
            }));
        } else {
            res.writeHead(404, {'Content-Type':'text/plain'});
            res.end('Not Found');
        }
    } catch (e) {
        try {
            res.writeHead(200, {'Content-Type':'application/json'});
            res.end(JSON.stringify({ status: 'degraded', error: e.message }));
        } catch {}
    }
});

// ═════════════════════════════════════════════
//  GLOBAL HANDLERS
// ═════════════════════════════════════════════
process.on('uncaughtException', e => console.error('[FATAL] uncaughtException (continuing):', e?.stack || e));
process.on('unhandledRejection', e => console.error('[FATAL] unhandledRejection (continuing):', e?.stack || e));
process.on('SIGTERM', () => { console.log('[BOT] SIGTERM'); try{ httpServer.close(); }catch{} process.exit(0); });
process.on('SIGINT',  () => { console.log('[BOT] SIGINT');  try{ httpServer.close(); }catch{} process.exit(0); });

// ═════════════════════════════════════════════
//  START
// ═════════════════════════════════════════════
console.log(`
◈  A R Y A  &  M E N T A L  C O L L A B  ⚡
   MULTI-OWNER · CRASH-PROOF · IST · AUTO-PURGE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   owner      : ${TG_OWNER}
   sudo       : ${sudoData.ids.length} user(s)
   port       : ${PORT}
   data       : ${DATA_DIR}
   slots      : 1 – ${MAX_SLOTS}
   prefix     : .  (dot-prefixed commands only)
   timezone   : ${process.env.TZ} (${new Date().toLocaleString('en-IN', {timeZone:'Asia/Kolkata'})})
   purge      : ${PURGE_HOURS.map(h=>`${String(h).padStart(2,'0')}:00`).join(' & ')} IST
   gc         : ${GC_ENABLED ? '✅ enabled' : '⚠️ unavailable'}
   monitors   : schedule + memory + disk + quota
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

const hub = new Hub();

// ── TELEGRAM BOT ────────────────────────────
let tgBot = null;
const pendingAdd = new Map();

const HELP_TEXT = `🤖 *ARYA & MENTAL COLLAB — TELEGRAM CONTROL*

*Fleet:*
/addnum     — Add WhatsApp bot (max ${MAX_SLOTS})
/remove1-5  — Remove specific slot
/alive      — Quick fleet view
/status     — Full live meter + usage %
/purge      — Manually trigger purge
/cancel     — Cancel input

*Sudo Management* 👑
/addsudo <id>     — Add co-owner (owner only)
/removesudo <id>  — Remove co-owner (owner only)
/listsudo         — List all co-owners

*Auto-Purge Triggers:*
🕖 Scheduled — 7:00 AM & 7:00 PM IST
🧠 Memory — RAM > 410MB (auto)
💾 Disk warn — >3.5GB (deep clean)
🚨 Disk critical — >4.5GB (emergency purge)
📊 Quota alert — >80% usage

*WhatsApp cmds:* all need \`.\` prefix
\`.admin\` \`.menu\` \`.nc\` \`.spam\` \`.rr\` \`.ping\` \`.speed\` etc.`;

async function handleTgMessage(msg) {
    try{
        const chatId = String(msg.chat.id);
        if(!isTgAuthorized(chatId)){
            console.log(`[TG] ignored unauthorized: ${chatId}`);
            return;
        }

        const text  = (msg.text || '').trim();
        const lower = text.toLowerCase();
        if(!text) return;

        if(text.startsWith('/')) pendingAdd.delete(chatId);

        if(lower === '/start' || lower === '/help' || lower === '/menu'){
            await tgBot.sendMessage(chatId, HELP_TEXT, {parse_mode:'Markdown'});
            return;
        }

        if(lower === '/listsudo'){
            let out = `👥 *SUDO LIST*\n━━━━━━━━━━━━━━━━━━\n\n`;
            out += `👑 *Owner:* \`${TG_OWNER}\`\n\n`;
            if(sudoData.ids.length === 0){
                out += `_No sudo users yet._\n\n`;
            } else {
                out += `*Sudo Users (${sudoData.ids.length}):*\n`;
                sudoData.ids.forEach((id, i) => out += `${i+1}. \`${id}\`\n`);
                out += `\n`;
            }
            out += `_Owner can add/remove with /addsudo & /removesudo_`;
            await tgBot.sendMessage(chatId, out, {parse_mode:'Markdown'});
            return;
        }

        const addSudoMatch = text.match(/^\/addsudo\s+(.+)$/i);
        if(addSudoMatch){
            if(!isTgOwner(chatId)){
                await tgBot.sendMessage(chatId,
                    '❌ *Only the primary owner can add sudo users.*',
                    {parse_mode:'Markdown'});
                return;
            }
            const newId = addSudoMatch[1].trim().replace(/\D/g, '');
            if(!newId || newId.length < 5){
                await tgBot.sendMessage(chatId,
                    `❌ Invalid Telegram ID.\nUsage: \`/addsudo 123456789\``,
                    {parse_mode:'Markdown'});
                return;
            }
            if(newId === TG_OWNER){
                await tgBot.sendMessage(chatId, '❌ That is already the owner.');
                return;
            }
            if(sudoData.ids.includes(newId)){
                await tgBot.sendMessage(chatId,
                    `ℹ️ \`${newId}\` is already a sudo user.`,
                    {parse_mode:'Markdown'});
                return;
            }
            sudoData.ids.push(newId);
            saveSudo();
            await tgBot.sendMessage(chatId,
                `✅ *Sudo Added*\n\n👤 ID: \`${newId}\`\n📊 Total: ${sudoData.ids.length}`,
                {parse_mode:'Markdown'});
            await hub.sendTelegram(newId,
                `🎉 *You've been added as SUDO*\n\n` +
                `The owner has granted you access to this bot.\n\n` +
                `Send /menu to see all commands.`,
                {parse_mode:'Markdown'});
            console.log(`[TG] ✅ Sudo added: ${newId}`);
            return;
        }

        const rmSudoMatch = text.match(/^\/removesudo\s+(.+)$/i);
        if(rmSudoMatch){
            if(!isTgOwner(chatId)){
                await tgBot.sendMessage(chatId,
                    '❌ *Only the primary owner can remove sudo users.*',
                    {parse_mode:'Markdown'});
                return;
            }
            const rmId = rmSudoMatch[1].trim().replace(/\D/g, '');
            const idx = sudoData.ids.indexOf(rmId);
            if(idx === -1){
                await tgBot.sendMessage(chatId,
                    `ℹ️ \`${rmId}\` is not a sudo user.`,
                    {parse_mode:'Markdown'});
                return;
            }
            sudoData.ids.splice(idx, 1);
            saveSudo();
            await tgBot.sendMessage(chatId,
                `✅ *Sudo Removed*\n\n👤 ID: \`${rmId}\`\n📊 Remaining: ${sudoData.ids.length}`,
                {parse_mode:'Markdown'});
            await hub.sendTelegram(rmId,
                `⚠️ *Your SUDO access was removed by the owner.*\n\n` +
                `You can no longer use this bot.`,
                {parse_mode:'Markdown'});
            console.log(`[TG] ❌ Sudo removed: ${rmId}`);
            return;
        }

        if(lower === '/addnum'){
            if(hub.sessions.size >= MAX_SLOTS){
                await tgBot.sendMessage(chatId, `❌ All ${MAX_SLOTS} slots are full.\nUse /remove1 … /remove${MAX_SLOTS} first.`);
                return;
            }
            pendingAdd.set(chatId, true);
            await tgBot.sendMessage(chatId,
                `📱 Send the WhatsApp phone number with country code.\nExample: \`919876543210\`\n\n_Cancel with /cancel_`,
                {parse_mode:'Markdown'});
            return;
        }

        if(lower === '/cancel'){
            pendingAdd.delete(chatId);
            await tgBot.sendMessage(chatId, '✅ Cancelled.');
            return;
        }

        if(lower === '/purge'){
            if(hub.purging){
                await tgBot.sendMessage(chatId, '⚠️ Purge already running.');
                return;
            }
            await tgBot.sendMessage(chatId, '⏳ Running purge…');
            const r = await hub.runPurge('manual');
            await tgBot.sendMessage(chatId,
                r.ok
                    ? `✅ Done. RSS: ${fmtBytes(r.freedRss)}, heap: ${fmtBytes(r.freedHeap)}, files: ${r.filesCleaned}, restored: ${r.restored}/${r.total}.`
                    : `❌ ${r.reason || 'failed'}`);
            return;
        }

        const rmMatch = lower.match(/^\/remove([1-5])$/);
        if(rmMatch){
            const slot = parseInt(rmMatch[1], 10);
            const id   = `X${slot}`;
            if(!hub.sessions.has(id)){
                await tgBot.sendMessage(chatId, `ℹ️ Slot ${slot} already empty.`);
                return;
            }
            await tgBot.sendMessage(chatId, `⏳ Removing slot ${slot}…`);
            const ok = await hub.unlink(id);
            await tgBot.sendMessage(chatId, ok ? `✅ Slot ${slot} removed.` : `❌ Failed.`);
            return;
        }

        if(lower === '/alive'){
            const list = hub.router.getAll();
            const online = list.filter(s=>s.online).length;
            if(!list.length){
                await tgBot.sendMessage(chatId, `📡 *Fleet:* empty\n\nUse /addnum.`, {parse_mode:'Markdown'});
                return;
            }
            let out = `📡 *Fleet* — ${online}/${list.length} online\n\n`;
            list.sort((a,b)=>a.id.localeCompare(b.id));
            for(const s of list){
                const status = s.banned ? '🚫 BANNED' : (s.online ? '🟢 ONLINE' : '🔴 OFFLINE');
                out += `*${s.id}* • ${status} +${s.phone}\n`;
            }
            await tgBot.sendMessage(chatId, out, {parse_mode:'Markdown'});
            return;
        }

        if(lower === '/status'){
            const mu        = process.memoryUsage();
            const sessSize  = getDirSize(`${DATA_DIR}/sessions`);
            const storeSize = getDirSize(`${DATA_DIR}/store`);
            const diskUsed  = sessSize + storeSize;
            const nextPurge = getNextPurgeTime();
            const list      = hub.router.getAll();

            const rssMB   = mu.rss / 1024 / 1024;
            const diskMB  = diskUsed / 1024 / 1024;

            const ramPct  = Math.min(100, (rssMB  / RAM_LIMIT_MB)  * 100);
            const diskPct = Math.min(100, (diskMB / DISK_LIMIT_MB) * 100);

            const uptimeMin    = process.uptime() / 60;
            const usedHours    = Math.min(uptimeMin / 60, MONTHLY_HOURS);
            const remainHours  = Math.max(0, MONTHLY_HOURS - usedHours);
            const uptimePct    = Math.min(100, (usedHours / MONTHLY_HOURS) * 100);

            const overallPct = Math.max(ramPct, diskPct, uptimePct);

            const bar = (pct, len = 10) => {
                const filled = Math.min(len, Math.round((pct / 100) * len));
                return '█'.repeat(filled) + '░'.repeat(len - filled);
            };

            const emo = pct =>
                pct < 50  ? '🟢' :
                pct < 75  ? '🟡' :
                pct < 90  ? '🟠' :
                            '🔴';

            const health =
                overallPct < 30 ? '💚 EXCELLENT' :
                overallPct < 50 ? '💚 HEALTHY'   :
                overallPct < 75 ? '💛 MODERATE'  :
                overallPct < 90 ? '🟠 HIGH'      :
                                  '🔴 CRITICAL';

            let out  = `📊 *LIVE METER*\n━━━━━━━━━━━━━━━━━━\n\n`;
            out += `🏆 *OVERALL USAGE*\n`;
            out += `${emo(overallPct)} *${overallPct.toFixed(1)}%*  ${health}\n`;
            out += `\`[${bar(overallPct)}]\`\n\n`;

            out += `📈 *USAGE BREAKDOWN*\n━━━━━━━━━━━━━━━━━━\n`;
            out += `${emo(ramPct)} *RAM*   — ${ramPct.toFixed(1)}%\n`;
            out += `   \`[${bar(ramPct)}]\`\n`;
            out += `   ${rssMB.toFixed(2)} MB / ${RAM_LIMIT_MB} MB\n\n`;

            out += `${emo(diskPct)} *Disk*  — ${diskPct.toFixed(2)}%\n`;
            out += `   \`[${bar(diskPct)}]\`\n`;
            out += `   ${diskMB.toFixed(2)} MB / ${DISK_LIMIT_MB} MB (5 GB)\n\n`;

            out += `${emo(uptimePct)} *Hours* — ${uptimePct.toFixed(1)}%\n`;
            out += `   \`[${bar(uptimePct)}]\`\n`;
            out += `   ${usedHours.toFixed(1)} h used / ${MONTHLY_HOURS} h limit\n`;
            out += `   ${remainHours.toFixed(1)} h remaining\n\n`;

            out += `🔧 *DETAILS*\n━━━━━━━━━━━━━━━━━━\n`;
            out += `🧠 Heap: ${fmtBytes(mu.heapUsed)} / ${fmtBytes(mu.heapTotal)}\n`;
            out += `💾 Sessions: ${fmtBytes(sessSize)}\n`;
            out += `💾 Store: ${fmtBytes(storeSize)}\n`;
            out += `⏱️ Uptime: ${Math.floor(uptimeMin)} min\n\n`;

            out += `👥 *Owners*\n`;
            out += `👑 Primary: \`${TG_OWNER}\`\n`;
            out += `🛡️ Sudo: ${sudoData.ids.length}${sudoData.ids.length ? ' — ' + sudoData.ids.map(id => `\`${id}\``).join(', ') : ''}\n\n`;

            out += `🔥 *Auto-Purge*\n`;
            out += `   Last: ${fmtTime(purgeData.lastPurgeAt)}\n`;
            out += `   Next: ${fmtTime(nextPurge.getTime())}\n`;
            out += `   Total: ${purgeData.totalPurges || 0} runs\n`;
            out += `   Last took: ${purgeData.lastPurgeMs || 0}ms\n`;
            out += `   Schedule: 07:00 & 19:00 IST\n\n`;

            out += `♻️ *GC:* ${GC_ENABLED ? '✅ enabled' : '⚠️ unavailable'}\n\n`;

            out += `🤖 *Fleet* — ${list.filter(s=>s.online).length}/${list.length} online\n`;
            if(list.length){
                list.sort((a,b)=>a.id.localeCompare(b.id));
                for(const s of list){
                    const status = s.banned ? '🚫 BANNED' : (s.online ? '🟢 ONLINE' : '🔴 OFFLINE');
                    out += `\n*${s.id}* • ${status}\n   📱 +${s.phone || '—'}\n   🆔 ${s.self?.split('@')[0] || '—'}\n   ⚙️ nc:${s.nameLoops.size} spam:${s.spamLoop.size} rr:${s.rrLoop.size}\n`;
                }
            } else {
                out += `   _empty — use /addnum_\n`;
            }
            await tgBot.sendMessage(chatId, out, {parse_mode:'Markdown'});
            return;
        }

        if(pendingAdd.has(chatId)){
            const num = text.replace(/\D/g, '');
            if(num.length < 10 || num.length > 15){
                await tgBot.sendMessage(chatId, `❌ Invalid. Send digits with country code (e.g. \`919876543210\`).`, {parse_mode:'Markdown'});
                return;
            }
            pendingAdd.delete(chatId);
            await tgBot.sendMessage(chatId, `⏳ Creating slot for +${num}…`);
            const result = await hub.link(num, chatId);
            await tgBot.sendMessage(chatId, result, {parse_mode:'Markdown'});
            return;
        }

        await tgBot.sendMessage(chatId, `❓ Unknown. Send /menu for commands.`);
    }catch(e){
        console.error('[TG] handler err (continuing):', e?.stack || e);
    }
}

function startTelegram() {
    try {
        tgBot = new TelegramBot(TG_TOKEN, {polling: {interval: 2000, autoStart: true}});
        hub.telegramBot = tgBot;
        tgBot.on('message', handleTgMessage);
        tgBot.on('polling_error', err => console.error('[TG] polling:', err.message));
        tgBot.on('webhook_error', err => console.error('[TG] webhook:', err.message));
        tgBot.on('error', err => console.error('[TG] error:', err.message));
        console.log('[TG] ✅ Telegram polling started');
    } catch (e) {
        console.error('[TG] failed to start:', e.message);
        setTimeout(startTelegram, 5000);
    }
}

setInterval(async () => {
    try {
        if (tgBot) await tgBot.getMe();
    } catch (e) {
        console.error('[TG] heartbeat failed:', e.message);
    }
}, 5 * 60 * 1000);

// ── Boot ─────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[HTTP] ✅ Health server on 0.0.0.0:${PORT}`);
});

startTelegram();

try {
    await hub.boot();
    hub.schedulePurge();
    hub.startWatchdog();
    hub.startMemoryMonitor();
    hub.startDiskMonitor();
    hub.startQuotaMonitor();
} catch (e) {
    console.error('[BOOT] error (continuing):', e?.stack || e);
}

console.log(`\n  ✅ Bot is live (MULTI-OWNER mode)`);
console.log(`  →   Telegram: /addnum to add WhatsApp bot`);
console.log(`  →   Telegram: /addsudo <id> to add co-owner`);
console.log(`  →   Telegram: /listsudo to view co-owners`);
console.log(`  →   Telegram: /status for live meter`);
console.log(`  →   UptimeRobot: ping /health every 5 min\n`);
