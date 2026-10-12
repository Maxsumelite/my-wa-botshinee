const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('Masukkan nomor WhatsApp Bot (Gunakan format 628xxx): ');
        const code = await sock.requestPairingCode(phoneNumber.trim());
        console.log(`\n=================================\nKODE PAIRING WHATSAPP ANDA: ${code}\n=================================\n`);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('\n[!] Bot berhasil terhubung ke WhatsApp!\n');
        } else if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus. Menghubungkan ulang...');
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const messageContent = m.message.conversation || m.message.extendedTextMessage?.text;
        const senderJid = m.key.remoteJid;

        if (!messageContent) return;

        console.log(`Pesan masuk: ${messageContent}`);

        const textLower = messageContent.toLowerCase();
        if (textLower === 'halo') {
            await sock.sendMessage(senderJid, { text: 'Halo juga! Ada yang bisa saya bantu?' });
        } else if (textLower === 'ping') {
            await sock.sendMessage(senderJid, { text: 'Pong! Bot aktif di Termux.' });
        }
    });
}

connectToWhatsApp();
