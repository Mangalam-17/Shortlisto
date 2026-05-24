const crypto = require('crypto');

const getKey = () => {
    const base = process.env.CONFIG_ENC_KEY || process.env.JWT_SECRET || '';
    return crypto.createHash('sha256').update(base).digest();
};

const encrypt = (plain) => {
    if (!plain) return '';
    const key = getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
};

const decrypt = (enc) => {
    if (!enc) return '';
    const parts = enc.split(':');
    if (parts.length !== 4) return '';
    const [, ivB64, tagB64, dataB64] = parts;
    const key = getKey();
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
};

module.exports = { encrypt, decrypt };
