
/**
 *
 */
export default class DataEncoder {

    static encryptionSettings = {
        algorithm: { name: 'AES-GCM',
            length: 128,
            tagLength: 32
        },
        extractable: true,
        usage: [ 'encrypt', 'decrypt' ]
    };

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
    static async encrypt(data, base64Key, ivObject) {
        console.log('ENCRYPT:', data);

        const key = await DataEncoder.getKeys(base64Key);
        const iv = new Uint8Array(Object.values(ivObject));

        return DataEncoder.arrayBufferToBase64(await crypto.subtle.encrypt({ name: 'AES-GCM',
            tagLength: 32,
            iv }, key, new TextEncoder().encode(data)));
    }

    /**
     * 
     * @param {*} base64Key 
     */
    static async getKeys(base64Key) {
        return crypto.subtle.importKey('raw', DataEncoder.base64ToArrayBuffer(base64Key),
            DataEncoder.encryptionSettings.algorithm, DataEncoder.encryptionSettings.extractable,
            DataEncoder.encryptionSettings.usage);
    }

    /**
     * Decrypts chunk of data
     * @param {object} data
     */
    static async decrypt(data, key, iv) {
        console.log('DECRYPT:', data);

        return new TextDecoder().decode(await crypto.subtle.decrypt(
            { name: DataEncoder.encryptionSettings.algorithm.name,
                tagLength: DataEncoder.encryptionSettings.algorithm.tagLength,
                iv }, key, DataEncoder.base64ToArrayBuffer(data)));
    }

    /**
     * Setting AES key and IV
     */
    static async generateEncryption() {
        const key = await crypto.subtle.generateKey(
            DataEncoder.encryptionSettings.algorithm, DataEncoder.encryptionSettings.extractable, DataEncoder.encryptionSettings.usage
        );

        // IV must be the same length (in bits) as the key
        const iv = await crypto.getRandomValues(new Uint8Array(16));

        const base64Key = DataEncoder.arrayBufferToBase64(await crypto.subtle.exportKey('raw', key));

        return [ key, base64Key, iv ];
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
