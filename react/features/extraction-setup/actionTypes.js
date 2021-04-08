/**
 * The type of the action which signals extraction was closed without submitting.
 *
 * {
 *     type: CANCEL_EXTRACTION,
 *     message: string,
 *     score: number
 * }
 */
export const CANCEL_EXTRACTION = 'CANCEL_EXTRACTION';

/**
 * The type of the action which signals extraction failed to be recorded.
 *
 * {
 *     type: CANCEL_EXTRACTION
 *     error: string
 * }
 */
export const SUBMIT_EXTRACTION_ERROR = 'SUBMIT_EXTRACTION_ERROR';

/**
 * The type of the action which signals extraction has been recorded.
 *
 * {
 *     type: SUBMIT_EXTRACTION_SUCCESS,
 * }
 */
export const SUBMIT_EXTRACTION_SUCCESS = 'SUBMIT_EXTRACTION_SUCCESS';
