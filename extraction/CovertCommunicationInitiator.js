
/* global APP */

import { $iq } from 'strophe.js';

/**
 *
 */
export default class CovertCommunicationInitiator {

    /**
     * Redefined in sub-classess
     */
    options = {};

    /**
     *
     * @param {object} user
     * @param {object} configuration
     */
    constructor(user, configuration, communicationName) {
        this.user = user;
        this.configuration = configuration;
        this.communicationName = communicationName;
    }

    /**
     *
     * @param {*} iq
     * @param {*} success
     * @param {*} error
     * @param {*} timeout
     */
    ping(iq, success, error, timeout) {
        APP.conference._room.xmpp.connection.sendIQ2(iq, { timeout })
                .then(success, error);
    }

    /**
     * Sends "ping" to given <tt>jid</tt>
     * @param jid the JID to which ping request will be sent.
     * @param success callback called on success.
     * @param error callback called on error.
     * @param timeout ms how long are we going to wait for the response. On
     * @param data to send
     * timeout <tt>error<//t> callback is called with undefined error argument.
     */
    extractionPing(success, error, data) {
        const iq = $iq({
            type: 'get',
            to: this.user.getJid(),
            id: this.user.getId()
        });

        iq.c('ping', { xmlns: this.communicationName,
            data });
        APP.conference._room.xmpp.connection.sendIQ2(iq, { timeout: 10000 })
                .then(success, error);
    }

    /**
     * Sends "pong" to given <tt>jid</tt>
     * @param jid the JID to which ping request will be sent.
     * @param success callback called on success.
     * @param error callback called on error.
     * @param timeout ms how long are we going to wait for the response. On
     * @param data to send
     * timeout <tt>error<//t> callback is called with undefined error argument.
     */
    extractionPong(success, error) {
        const iq = $iq({
            type: 'result',
            to: this.user.getJid(),
            id: this.user.getId()
        });

        iq.c('ping', { xmlns: this.communicationName });
        APP.conference._room.xmpp.connection.sendIQ2(iq, { timeout: 10000 })
                .then(success, error);
    }

    /**
     *
     * @returns
     */
    getUsedMethod() {
        const usedMethod = this.configuration.method;

        console.log(`Method ${usedMethod} used`);

        return this.option[usedMethod];
    }
}
