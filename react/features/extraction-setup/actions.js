// @flow

import type { Dispatch } from 'redux';

import { FEEDBACK_REQUEST_IN_PROGRESS } from '../../../modules/UI/UIErrors';
import { openDialog } from '../base/dialog';

import {
    CANCEL_EXTRACTION,
    SUBMIT_EXTRACTION_ERROR,
    SUBMIT_EXTRACTION_SUCCESS
} from './actionTypes';
import { ExtractionSetup } from './components';

declare var config: Object;
declare var interfaceConfig: Object;

/**
 * Caches the passed in feedback in the redux store.
 *
 * @param {string} message - A description entered by the participant that
 * explains the rating.
 * @returns {{
 *     type: CANCEL_EXTRACTION,
 *     message: string
 * }}
 */
export function cancelExtraction(message: string) {
    return {
        type: CANCEL_EXTRACTION,
        message
    };
}

/**
 * Potentially open the {@code ExtractionSetup}. It will not be opened if it is
 * already open or feedback has already been submitted.
 *
 * @param {JistiConference} conference - The conference for which the feedback
 * would be about. The conference is passed in because feedback can occur after
 * a conference has been left, so references to it may no longer exist in redux.
 * @returns {Promise} Resolved with value - false if the dialog is enabled and
 * resolved with true if the dialog is disabled or the feedback was already
 * submitted. Rejected if another dialog is already displayed.
 */
export function maybeOpenExtractionDialog(conference: Object) {
    type R = {
        feedbackSubmitted: boolean,
        showThankYou: boolean
    };

    return (dispatch: Dispatch<any>, getState: Function): Promise<R> => {
        const state = getState();

        if (config.iAmRecorder) {
            // Intentionally fall through the if chain to prevent further action
            // from being taken with regards to showing feedback.
        } else if (state['features/base/dialog'].component === ExtractionSetup) {
            // Feedback is currently being displayed.

            return Promise.reject(FEEDBACK_REQUEST_IN_PROGRESS);
        } else if (state['features/extraction-setup'].submitted) {
            // Feedback has been submitted already.

            return Promise.resolve({
                feedbackSubmitted: true,
                showThankYou: true
            });
        } else if (conference.isCallstatsEnabled() && feedbackPercentage > Math.random() * 100) {
            return new Promise(resolve => {
                dispatch(openExtractionDialog(conference, () => {
                    const { submitted } = getState()['features/feedback'];

                    resolve({
                        feedbackSubmitted: submitted,
                        showThankYou: false
                    });
                }));
            });
        }

        // If the feedback functionality isn't enabled we show a "thank you"
        // message. Signaling it (true), so the caller of requestFeedback can
        // act on it.
        return Promise.resolve({
            feedbackSubmitted: false,
            showThankYou: true
        });
    };
}

/**
 * Opens {@code ExtractionSetup}.
 *
 * @param {JitsiConference} conference - The JitsiConference that is being
 * rated. The conference is passed in because feedback can occur after a
 * conference has been left, so references to it may no longer exist in redux.
 * @param {Function} [onClose] - An optional callback to invoke when the dialog
 * is closed.
 * @returns {Object}
 */
export function openExtractionDialog(conference: Object, onClose: ?Function) {
    return openDialog(ExtractionSetup, {
        conference,
        onClose
    });
}

/**
 * Send the passed in feedback.
 *
 * @param {string} message - Detailed feedback from the user to explain the
 * rating.
 * @param {JitsiConference} conference - The JitsiConference for which the
 * feedback is being left.
 * @returns {Function}
 */
export function submitExtraction(
        message: string,
        conference: Object) {
    return (dispatch: Dispatch<any>) => conference.sendFeedback(message)
        .then(
            () => dispatch({ type: SUBMIT_EXTRACTION_SUCCESS }),
            error => {
                dispatch({
                    type: SUBMIT_EXTRACTION_ERROR,
                    error
                });

                return Promise.reject(error);
            }
        );
}
