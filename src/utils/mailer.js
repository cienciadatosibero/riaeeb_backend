import tls from 'tls';

const clean = (v) => String(v ?? '').replace(/[\r\n]/g, ' ').trim();

function smtpConfig() {
  const host = clean(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE ?? 'true').toLowerCase() !== 'false';
  const user = clean(process.env.SMTP_USER || process.env.EMAIL_USER);
  const pass = String(process.env.SMTP_PASS || process.env.EMAIL_PASS || '');
  const from = clean(process.env.SMTP_FROM || user);
  const fromName = clean(process.env.SMTP_FROM_NAME || 'RIAAEB');
  return { host, port, secure, user, pass, from, fromName };
}

export function mailConfigured() {
  const c = smtpConfig();
  return !!(c.host && c.port && c.user && c.pass && c.from && c.secure);
}

function responseReader(socket) {
  let buffer = '';
  let current = [];
  const ready = [];
  const waiters = [];

  const push = (resp) => {
    const waiter = waiters.shift();
    if (waiter) waiter(resp);
    else ready.push(resp);
  };

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let idx;
    while ((idx = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (!line) continue;
      current.push(line);
      if (/^\d{3} /.test(line)) {
        push(current.join('\n'));
        current = [];
      }
    }
  });

  return () => {
    if (ready.length) return Promise.resolve(ready.shift());
    return new Promise((resolve) => waiters.push(resolve));
  };
}

function status(resp) {
  return Number(String(resp || '').slice(0, 3));
}

function expect(resp, allowed) {
  const code = status(resp);
  if (!allowed.includes(code)) {
    throw new Error(`El servidor de correo respondió ${code || 'sin código'}: ${resp}`);
  }
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(String(value), 'utf8').toString('base64')}?=`;
}

function dotStuff(text) {
  return String(text).replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}

export async function sendContactReply({ to, nombre, asunto, respuesta }) {
  const c = smtpConfig();
  if (!mailConfigured()) {
    const err = new Error('El correo aún no está configurado. Agrega SMTP_HOST, SMTP_PORT=465, SMTP_SECURE=true, SMTP_USER, SMTP_PASS y SMTP_FROM en Vercel.');
    err.code = 'MAIL_NOT_CONFIGURED';
    throw err;
  }
  if (!c.secure) {
    const err = new Error('Este envío usa SMTP seguro directo. Configura SMTP_SECURE=true y normalmente SMTP_PORT=465.');
    err.code = 'MAIL_SECURE_REQUIRED';
    throw err;
  }
  const destino = clean(to);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) {
    throw new Error('El correo del contacto no es válido.');
  }

  const socket = tls.connect({
    host: c.host,
    port: c.port,
    servername: c.host,
    rejectUnauthorized: true,
  });

  const read = responseReader(socket);
  const command = async (cmd, allowed) => {
    socket.write(`${cmd}\r\n`);
    const resp = await read();
    expect(resp, allowed);
    return resp;
  };

  try {
    await new Promise((resolve, reject) => {
      socket.once('secureConnect', resolve);
      socket.once('error', reject);
      socket.setTimeout(20000, () => reject(new Error('Tiempo de espera agotado al conectar con el servidor de correo.')));
    });

    expect(await read(), [220]);
    await command('EHLO riaaeb.vercel.app', [250]);
    await command('AUTH LOGIN', [334]);
    await command(Buffer.from(c.user).toString('base64'), [334]);
    await command(Buffer.from(c.pass).toString('base64'), [235]);
    await command(`MAIL FROM:<${c.from}>`, [250]);
    await command(`RCPT TO:<${destino}>`, [250, 251]);
    await command('DATA', [354]);

    const subject = `Respuesta RIAAEB: ${clean(asunto || 'Mensaje de contacto')}`;
    const body = [
      `Hola ${clean(nombre || '')},`,
      '',
      'Gracias por contactar a la Red de IA Aplicada para la Equidad y el Bienestar.',
      '',
      String(respuesta || '').trim(),
      '',
      'Atentamente,',
      'RIAAEB',
    ].join('\r\n');

    const data = [
      `From: ${encodeHeader(c.fromName)} <${c.from}>`,
      `To: <${destino}>`,
      `Subject: ${encodeHeader(subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      dotStuff(body),
      '.',
      '',
    ].join('\r\n');

    socket.write(data);
    expect(await read(), [250]);
    await command('QUIT', [221]);
    return true;
  } finally {
    socket.destroy();
  }
}
