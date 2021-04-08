// @flow

import { FieldTextAreaStateless } from '@atlaskit/field-text-area';
import React, { Component } from 'react';
import type { Dispatch } from 'redux';

import {
    createFeedbackOpenEvent,
    sendAnalytics
} from '../../analytics';
import { Dialog } from '../../base/dialog';
import { translate } from '../../base/i18n';
import { connect } from '../../base/redux';
import { cancelExtraction, submitExtraction } from '../actions';

declare var APP: Object;
declare var interfaceConfig: Object;


/**
 * The type of the React {@code Component} props of {@link FeedbackDialog}.
 */
type Props = {

    /**
     * The cached feedback message, if any, that was set when closing a previous
     * instance of {@code FeedbackDialog}.
     */
    _message: string,

    /**
     * The JitsiConference that is being rated. The conference is passed in
     * because feedback can occur after a conference has been left, so
     * references to it may no longer exist in redux.
     */
    conference: Object,

    /**
     * Invoked to signal feedback submission or canceling.
     */
    dispatch: Dispatch<any>,

    /**
     * Callback invoked when {@code FeedbackDialog} is unmounted.
     */
    onClose: Function,

    /**
     * Invoked to obtain translated strings.
     */
    t: Function
};

/**
 * The type of the React {@code Component} state of {@link FeedbackDialog}.
 */
type State = {

    /**
     * The currently entered extraction setup message.
     */
    message: string,

};

/**
 * A React {@code Component} for displaying a dialog to rate the current
 * conference quality, write a message describing the experience, and submit
 * the feedback.
 *
 * @extends Component
 */
class ExtractionSetup extends Component<Props, State> {

    /**
     * Initializes a new {@code ExtractionSetupDialog} instance.
     *
     * @param {Object} props - The read-only React {@code Component} props with
     * which the new instance is to be initialized.
     */
    constructor(props: Props) {
        super(props);

        const { _message } = this.props;

        this.state = {
            /**
             * The currently entered extraction configuration message.
             *
             * @type {string}
             */
            message: _message

        };

        // Bind event handlers so they are only bound once for every instance.
        this._onCancel = this._onCancel.bind(this);
        this._onMessageChange = this._onMessageChange.bind(this);
        this._onSubmit = this._onSubmit.bind(this);
    }

    /**
     * Emits an analytics event to notify feedback has been opened.
     *
     * @inheritdoc
     */
    componentDidMount() {
        sendAnalytics(createFeedbackOpenEvent());
        if (typeof APP !== 'undefined') {
            APP.API.notifyFeedbackPromptDisplayed();
        }
    }

    /**
     * Invokes the onClose callback, if defined, to notify of the close event.
     *
     * @inheritdoc
     */
    componentWillUnmount() {
        if (this.props.onClose) {
            this.props.onClose();
        }
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { message } = this.state;

        const { t } = this.props;

        return (
            <Dialog
                okKey = 'dialog.Submit'
                onCancel = { this._onCancel }
                onSubmit = { this._onSubmit }
                submitDisabled = { true }
                titleKey = { 'extractionSetup.title' }
                width = 'small'>
                <div className = 'extract-setup-dialog'>
                    <FieldTextAreaStateless
                        autoFocus = { true }
                        className = 'extract-setup-text'
                        readOnly = { false } />
                </div>
            </Dialog>
        );
    }

    _onCancel: () => boolean;

    /**
     * Dispatches an action notifying feedback was not submitted. The submitted
     * score will have one added as the rest of the app does not expect 0
     * indexing.
     *
     * @private
     * @returns {boolean} Returns true to close the dialog.
     */
    _onCancel() {
        const { message } = this.state;

        this.props.dispatch(cancelExtraction(message));

        return true;
    }

    _onMessageChange: (Object) => void;

    /**
     * Updates the known entered extraction message.
     *
     * @param {Object} event - The DOM event from updating the textfield for the
     * feedback message.
     * @private
     * @returns {void}
     */
    _onMessageChange(event) {
        this.setState({ message: event.target.value });
    }

    _onSubmit: () => void;

    /**
     * Dispatches the entered feedback for submission. The submitted score will
     * have one added as the rest of the app does not expect 0 indexing.
     *
     * @private
     * @returns {boolean} Returns true to close the dialog.
     */
    _onSubmit() {
        const { conference, dispatch } = this.props;
        const { message } = this.state;

        dispatch(submitExtraction(message));
        dispatch(submitExtraction(message, conference));

        return true;
    }
}

/**
 * Maps (parts of) the Redux state to the associated {@code FeedbackDialog}'s
 * props.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {{
 * }}
 */
function _mapStateToProps(state) {
    const { message } = state['features/extraction-setup'];

    return {
        /**
         * The cached feedback message, if any, that was set when closing a
         * previous instance of {@code FeedbackDialog}.
         *
         * @type {string}
         */
        _message: message,
    };
}

export default translate(connect(_mapStateToProps)(ExtractionSetup));
