```javascript
/**
 * Video Datamosher
 * A tool to create glitchy video effects by manipulating frame data
 */

// DOM elements
const videoInput = document.getElementById('video-input');
const fileNameDisplay = document.getElementById('file-name');
const uploadBtn = document.getElementById('upload-btn');
const originalVideo = document.getElementById('original-video');
const datamoshedVideo = document.getElementById('datamoshed-video');
const resultContainer = document.getElementById('result-container');
const downloadBtn = document.getElementById('download-btn');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');

// Sliders and values
const iframeDropSlider = document.getElementById('iframe-drop');
const pframeBlendSlider = document.getElementById('pframe-blend');
const colorShiftSlider = document.getElementById('color-shift');
const iframeValue = document.getElementById('iframe-value');
const pframeValue = document.getElementById('pframe-value');
const colorValue = document.getElementById('color-value');
const applyCustomBtn = document.getElementById('apply-custom');
const presetBtns = document.querySelectorAll('.preset-btn');

// Variables to store video data
let originalVideoBlob = null;
let datamoshedVideoBlob = null;
let videoWidth = 640;
let videoHeight = 360;
let canvas = null;
let ctx = null;
let frameData = [];

/**
 * Initialize canvas for processing video frames
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function initCanvas(width, height) {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d');
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    errorMessage.textContent = message;
    loading.style.display = 'none';
}

/**
 * Update file name display when video is selected
 */
videoInput.addEventListener('change', (e) => {
    errorMessage.textContent = '';
    
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        fileNameDisplay.textContent = file.name;
        
        if (file.type.startsWith('video/')) {
            originalVideoBlob = file;
            const objectURL = URL.createObjectURL(file);
            originalVideo.src = objectURL;
        } else {
            showError('Please select a valid video file.');
            fileNameDisplay.textContent = 'No file selected';
        }
    } else {
        fileNameDisplay.textContent = 'No file selected';
    }
});

/**
 * Update slider value displays
 */
function setupSliderListeners() {
    iframeDropSlider.addEventListener('input', () => {
        iframeValue.textContent = `${iframeDropSlider.value}%`;
    });
    
    pframeBlendSlider.addEventListener('input', () => {
        pframeValue.textContent = `${pframeBlendSlider.value}%`;
    });
    
    colorShiftSlider.addEventListener('input', () => {
        colorValue.textContent = `${colorShiftSlider.value}%`;
    });
}

/**
 * Process video when upload button is clicked
 */
uploadBtn.addEventListener('click', () => {
    if (!originalVideoBlob) {
        showError('Please select a video file first.');
        return;
    }
    
    loading.style.display = 'block';
    errorMessage.textContent = '';
    
    // Set up video metadata listener
    originalVideo.onloadedmetadata = () => {
        videoWidth = originalVideo.videoWidth;
        videoHeight = originalVideo.videoHeight;
        
        // If video is too large, scale it down
        if (videoWidth > 1280) {
            const scale = 1280 / videoWidth;
            videoWidth = Math.floor(videoWidth * scale);
            videoHeight = Math.floor(videoHeight * scale);
        }
        
        initCanvas(videoWidth, videoHeight);
        extractFrames();
    };
    
    // Load video
    originalVideo.src = URL.createObjectURL(originalVideoBlob);
});

/**
 * Extract frames from the video at regular intervals
 */
function extractFrames() {
    frameData = [];
    originalVideo.currentTime = 0;
    
    const seekInterval = 0.1; // Extract frames every 0.1 seconds
    let currentTime = 0;
    
    // Listen for seeking events
    originalVideo.addEventListener('seeked', function frameExtractor() {
        try {
            // Draw current frame to canvas
            ctx.drawImage(originalVideo, 0, 0, videoWidth, videoHeight);
            
            // Get frame data
            const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight);
            frameData.push(new Uint8ClampedArray(imageData.data));
            
            // Move to next frame
            currentTime += seekInterval;
            
            if (currentTime < originalVideo.duration) {
                originalVideo.currentTime = currentTime;
            } else {
                // We've extracted all frames
                originalVideo.removeEventListener('seeked', frameExtractor);
                console.log(`Extracted ${frameData.length} frames`);
                
                // Apply datamosh effect with default settings
                applyDatmoshEffect(50, 30, 20);
            }
        } catch (error) {
            showError('Error processing video: ' + error.message);
            originalVideo.removeEventListener('seeked', frameExtractor);
        }
    });
    
    // Start extraction
    originalVideo.currentTime = 0;
}

/**
 * Apply datamosh effect to video frames
 * @param {number} iframeDrop - Percentage of I-frames to drop
 * @param {number} pframeBlend - Percentage of frame blending
 * @param {number} colorShift - Percentage of color channel shifting
 */
function applyDatmoshEffect(iframeDrop, pframeBlend, colorShift) {
    if (frameData.length < 2) {
        showError('Video is too short to process.');
        return;
    }
    
    try {
        // Make copies of original frames
        const processedFrames = [];
        let lastIFrame = new Uint8ClampedArray(frameData[0]);
        
        // Process each frame
        for (let i = 0; i < frameData.length; i++) {
            // Determine if this is an I-frame (keyframe)
            const isIFrame = i === 0 || 
                            i % 10 === 0 || 
                            Math.random() * 100 > iframeDrop;
                            
            if (isIFrame) {
                // Keep this I-frame
                lastIFrame = new Uint8ClampedArray(frameData[i]);
                processedFrames.push(new Uint8ClampedArray(frameData[i]));
            } else {
                // This is a P-frame, blend with previous
                const blendedFrame = new Uint8ClampedArray(frameData[i].length);
                
                // Apply P-frame blending and color shifting
                for (let j = 0; j < frameData[i].length; j += 4) {
                    const blendFactor = Math.random() * pframeBlend / 100;
                    
                    // RGB values
                    blendedFrame[j] = frameData[i][j] * (1 - blendFactor) + lastIFrame[j] * blendFactor;
                    blendedFrame[j+1] = frameData[i][j+1] * (1 - blendFactor) + lastIFrame[j+1] * blendFactor;
                    blendedFrame[j+2] = frameData[i][j+2] * (1 - blendFactor) + lastIFrame[j+2] * blendFactor;
                    
                    // Alpha channel
                    blendedFrame[j+3] = 255;
                    
                    // Apply color shift
                    if (Math.random() * 100 < colorShift) {
                        // Randomly swap color channels
                        const temp = blendedFrame[j];
                        blendedFrame[j] = blendedFrame[j+1];
                        blendedFrame[j+1] = blendedFrame[j+2];
                        blendedFrame[j+2] = temp;
                    }
                }
                
                processedFrames.push(blendedFrame);
            }
        }
        
        // Render processed frames to video
        renderFramesToVideo(processedFrames);
    } catch (error) {
        showError('Error applying effects: ' + error.message);
    }
}

/**
 * Render processed frames to video
 * @param {Array} frames - Array of processed frame data
 */
async function renderFramesToVideo(frames) {
    try {
        // Create a MediaRecorder to generate video from frames
        const stream = canvas.captureStream();
        const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm',
            videoBitsPerSecond: 5000000
        });
        
        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            datamoshedVideoBlob = blob;
            datamoshedVideo.src = URL.createObjectURL(blob);
            loading.style.display = 'none';
            resultContainer.classList.remove('hidden');
        };
        
        recorder.start();
        
        // Render each frame with delay
        const fps = 10;
        const frameTime = 1000 / fps;
        
        for (let i = 0; i < frames.length; i++) {
            // Create ImageData and put it on canvas
            const imgData = new ImageData(frames[i], videoWidth, videoHeight);
            ctx.putImageData(imgData, 0, 0);
            
            // Wait for the next frame time
            await new Promise(resolve => setTimeout(resolve, frameTime));
        }
        
        // Stop recording
        recorder.stop();
    } catch (error) {
        showError('Error rendering video: ' + error.message);
    }
}

/**
 * Apply custom settings
 */
applyCustomBtn.addEventListener('click', () => {
    if (frameData.length === 0) {
        showError('Please process a video first.');
        return;
    }
    
    loading.style.display = 'block';
    
    // Get values from sliders
    const iframeDrop = parseInt(iframeDropSlider.value);
    const pframeBlend = parseInt(pframeBlendSlider.value);
    const colorShift = parseInt(colorShiftSlider.value);
    
    // Apply effect with custom settings
    applyDatmoshEffect(iframeDrop, pframeBlend, colorShift);
});

/**
 * Handle preset buttons
 */
presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (frameData.length === 0) {
            showError('Please process a video first.');
            return;
        }
        
        loading.style.display = 'block';
        
        const preset = btn.dataset.preset;
        let iframeDrop, pframeBlend, colorShift;
        
        switch (preset) {
            case 'light':
                iframeDrop = 20;
                pframeBlend = 15;
                colorShift = 5;
                break;
            case 'medium':
                iframeDrop = 50;
                pframeBlend = 30;
                colorShift = 20;
                break;
            case 'heavy':
                iframeDrop = 75;
                pframeBlend = 45;
                colorShift = 35;
                break;
            case 'extreme':
                iframeDrop = 90;
                pframeBlend = 65;
                colorShift = 50;
                break;
        }
        
        // Update sliders to match preset
        iframeDropSlider.value = iframeDrop;
        pframeBlendSlider.value = pframeBlend;
        colorShiftSlider.value = colorShift;
        iframeValue.textContent = `${iframeDrop}%`;
        pframeValue.textContent = `${pframeBlend}%`;
        colorValue.textContent = `${colorShift}%`;
        
        // Apply effect with preset settings
        applyDatmoshEffect(iframeDrop, pframeBlend, colorShift);
    });
});

/**
 * Handle download button
 */
downloadBtn.addEventListener('click', () => {
    if (!datamoshedVideoBlob) {
        showError('No processed video available to download.');
        return;
    }
    
    const fileName = 'glitchwave_datamoshed.webm';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(datamoshedVideoBlob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

/**
 * Initialize the application
 */
function init() {
    setupSliderListeners();
    console.log('GlitchWave Video Datamosher initialized');
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
