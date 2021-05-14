/* global APP */

import CovertCommunicationInitiator from './CovertCommunicationInitiator';


/**
 * Extracting data from covert channel
 */
export default class CovertReceiver extends CovertCommunicationInitiator {

    /**
     *
     */
    get option() {
        return {
            'endpoint': 'usedEndpoint',
            'video': 'usedVideo',
            'audio': 'usedAudio',
            'xmpp': 'usedXMPP'
        };
    }

    /**
     *
     * @param {object} user
     * @param {object} configuration
     * @param {array} data
     */
    constructor(user, configuration, communicationName, extractionProcess, dataStack) {
        super(user, configuration, communicationName, extractionProcess);
        this.dataStack = dataStack;
    }

    /**
     * Receiving data using video stream
     */
    async usedVideo() {
        // define MediaRecorder of received stream
        const mediaRecorder = new MediaRecorder(this.user._tracks[0].stream);

        mediaRecorder.ondataavailable = blob => {
            blob.data.arrayBuffer().then(data => {
                console.log('Video:', data);
            });
        };
        mediaRecorder.start(100);
    }

    /**
     * Receiving data using xmpp ping
     */
    async usedXMPP() {
        const handlerRef = APP.conference._room.xmpp.connection.addHandler(ping => {
            this.dataStack.push(ping.children[0].attributes.data.nodeValue);

            this.extractionPong(message => {
                console.log('successful message recieved:', message);
            }, message => {
                // console.log('failed message recieved:', message);
            });

            return true;
        }, this.communicationName);
    }

    /**
     * Receiving data using audio stream
     */
    async usedAudio(user) {}

    /**
     * TODO: change this
     * not used anymore
     * Receiving data using audio stream
     */
    async usedEndpoint(user) {}

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
