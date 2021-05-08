
/**
 *
 */
export default class DataEncoder {
    /**
     *
     * @param {*} buffer
     * @returns
     */
    static arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;

        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        return window.btoa(binary);
    }

    /**
     *
     * @param {*} base64
     * @returns
     */
    static base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes.buffer;
    }

    /**
     * Encrypts chunk of data
     */
    static async encrypt(data, key, iv) {
        console.log('ENCRYPT:', data);
        await crypto.subtle.encrypt({ name: 'AES-GCM',
            tagLength: 32,
            iv }, key, new TextEncoder().encode(data))
        .then(encryptedFile => DataEncoder.arrayBufferToBase64(encryptedFile));
    }

    /**
     * Decrypts chunk of data
     * @param {object} data
     */
    static async decrypt(data, key, iv) {
        console.log('DECRYPT:', data, this);
        await crypto.subtle.decrypt({ name: 'AES-GCM',
            tagLength: 32,
            iv }, key, this.base64ToArrayBuffer(data))
        .then(decryptedData => new TextDecoder().decode(decryptedData));
    }

    /**
     * Setting AES key and IV
     */
    static async generateEncryption() {
        const key = await crypto.subtle.generateKey({ name: 'AES-GCM',
            length: 128 }, true, [ 'encrypt', 'decrypt' ]);

        // IV must be the same length (in bits) as the key
        const iv = await crypto.getRandomValues(new Uint8Array(16));

        return [ key, iv ];
    }

    /**
     *
     * @returns {string} generated name of the extraction channel
     */
    static generateName() {
        return Math.random().toString(36)
            .substring(7);
    }
}
