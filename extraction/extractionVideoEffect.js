
import {
    CLEAR_INTERVAL,
    INTERVAL_TIMEOUT,
    SET_INTERVAL,
    timerWorkerScript
} from '../react/features/stream-effects/presenter/TimeWorker';

/**
 * Stream effect to hide information inside the video.
 */
export default class VideoSteganoEffect {
    _canvas: HTMLCanvasElement;
    _ctx: CanvasRenderingContext2D;
    _desktopElement: HTMLVideoElement;
    _desktopStream: MediaStream;
    _frameRate: number;
    _onVideoFrameTimer: Function;
    _onVideoFrameTimerWorker: Function;
    _renderVideo: Function;
    _videoFrameTimerWorker: Worker;
    _videoElement: HTMLVideoElement;
    isEnabled: Function;
    startEffect: Function;
    stopEffect: Function;

    /**
     * Represents a modified MediaStream that adds a camera track at the
     * bottom right corner of the desktop track using a HTML canvas.
     * <tt>JitsiStreamPresenterEffect</tt> does the processing of the original
     * video stream.
     *
     * @param {MediaStream} videoStream - The video stream which is user for
     * creating the canvas.
     */
    constructor(videoStream: MediaStream, extractedData: Object) {
        const videoDiv = document.createElement('div');
        const firstVideoTrack = videoStream.getVideoTracks()[0];

        this.extractedData = extractedData;
        const { height, width, frameRate } = firstVideoTrack.getSettings() ?? firstVideoTrack.getConstraints();

        this._canvas = document.createElement('canvas');
        this._ctx = this._canvas.getContext('2d');

        this._desktopElement = document.createElement('video');
        this._videoElement = document.createElement('video');
        videoDiv.appendChild(this._videoElement);
        videoDiv.appendChild(this._desktopElement);
        if (document.body !== null) {
            document.body.appendChild(videoDiv);
        }

        // Set the video element properties
        this._frameRate = parseInt(frameRate, 10);
        this._videoElement.width = parseInt(width, 10);
        this._videoElement.height = parseInt(height, 10);
        this._videoElement.autoplay = true;
        this._videoElement.srcObject = videoStream;

        // autoplay is not enough to start the video on Safari, it's fine to call play() on other platforms as well
        this._videoElement.play();

        // set the style attribute of the div to make it invisible
        videoDiv.style.display = 'none';

        // Bind event handler so it is only bound once for every instance.
        this._onVideoFrameTimer = this._onVideoFrameTimer.bind(this);
    }

    /**
     * EventHandler onmessage for the videoFrameTimerWorker WebWorker.
     *
     * @private
     * @param {EventHandler} response - The onmessage EventHandler parameter.
     * @returns {void}
     */
    _onVideoFrameTimer(response) {
        if (response.data.id === INTERVAL_TIMEOUT) {
            this._renderVideo();
        }
    }

    /**
     * Loop function to render the video frame input and draw presenter effect.
     *
     * @private
     * @returns {void}
     */
    _renderVideo() {
    }

    /**
     * Checks if the local track supports this effect.
     *
     * @param {JitsiLocalTrack} jitsiLocalTrack - Track to apply effect.
     * @returns {boolean} - Returns true if this effect can run on the
     * specified track, false otherwise.
     */
    isEnabled(jitsiLocalTrack: Object) {
        return jitsiLocalTrack.isVideoTrack() && jitsiLocalTrack.videoType === 'desktop';
    }

    /**
     * Starts loop to capture video frame and render presenter effect.
     *
     * @param {MediaStream} desktopStream - Stream to be used for processing.
     * @returns {MediaStream} - The stream with the applied effect.
     */
    startEffect(desktopStream: MediaStream) {
    }

    /**
         * Stops the capture and render loop.
         *
         * @returns {void}
         */
    stopEffect() {
    }

}
