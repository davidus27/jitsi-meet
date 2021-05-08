/* global APP */

import CovertCommunicationInitiator from './CovertCommunicationInitiator';


/**
 * Extracting data from covert channel
 */
export default class CovertReceiver extends CovertCommunicationInitiator {

    // reference to all other methods
    options = {
        'endpoint': CovertReceiver.usedEndpoint,
        'video': CovertReceiver.usedVideo,
        'audio': CovertReceiver.usedAudio,
        'xmpp': CovertReceiver.usedXMPP
    };

    /**
     *
     * @param {object} user
     * @param {object} configuration
     * @param {array} data
     */
    constructor(user, configuration, communicationName, dataStack) {
        super(user, configuration, communicationName);
        this.dataStack = dataStack;
    }

    /**
     * Receiving data using video stream
     */
    usedVideo() {
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
    usedXMPP() {
        const handlerRef = APP.conference._room.xmpp.connection.addHandler(ping => {
            this.dataStack.push(ping.children[0].attributes.data.nodeValue);
            console.log('data:', this.dataStack);

            console.log('usedXMPP', this.user.getJid(), ping);

            this.extractionPong(message => {
                console.log('successful message recieved:', message);
            }, message => {
                console.log('failed message recieved:', message);
                console.log('Data received:', this.dataStack);
            });

            return true;
        }, name);
    }

    /**
     * Receiving data using audio stream
     */
    usedAudio(user) {}

    /**
     * TODO: change this
     * not used anymore
     * Receiving data using audio stream
     */
    usedEndpoint(user) {}
}
