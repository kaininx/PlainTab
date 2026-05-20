const assert = require('assert');
const fs = require('fs');

const settings = fs.readFileSync('js/settings-panel.js', 'utf8');
const zh = fs.readFileSync('js/i18n/zh-CN.js', 'utf8');
const en = fs.readFileSync('js/i18n/en.js', 'utf8');

assert.ok(
  settings.includes('function ensureUploadVideoThumbnail'),
  'upload gallery should rebuild a missing video thumbnail from the saved video blob'
);
assert.ok(
  settings.includes('ensureUploadVideoThumbnail(videoId, videoRecord, thumbs)'),
  'refreshUploadGallery should ensure the video preview before rendering'
);
assert.ok(
  settings.includes("S.videoThumbnail(record.blob)"),
  'missing video previews should be regenerated from the stored video blob'
);

assert.ok(
  settings.includes('function confirmHighFrameRateVideo'),
  'high-frame-rate video handling should ask the user before transcoding'
);
assert.ok(
  settings.includes("appConfirm(formatLocalizedText('uploadVideoHighFpsConfirm'"),
  'high-frame-rate video prompt should use the custom confirm so users can decline transcoding'
);
assert.ok(
  settings.includes('return confirmHighFrameRateVideo(fps).then(function (ok)') &&
    settings.includes('if (!ok) return { file: file, info: info, optimized: false, skippedOptimization: true };'),
  'declining the prompt should upload the original video'
);
assert.ok(
  settings.includes('function startOptimizedVideoRecording'),
  'video optimization should start recording only after a decoded frame is available'
);
const optimizeStart = settings.indexOf('function optimizeVideoFrameRate');
const recordingStart = settings.indexOf('function startOptimizedVideoRecording', optimizeStart);
const waitStart = settings.indexOf('function waitForOptimizedVideoFrame', optimizeStart);
assert.ok(
  optimizeStart >= 0 &&
    recordingStart > optimizeStart &&
    waitStart > recordingStart &&
    settings.indexOf('recorder.start(1000)', recordingStart) < waitStart &&
    settings.indexOf("video.addEventListener('loadeddata', onFirstFrame", waitStart) > waitStart &&
    settings.indexOf('waitForOptimizedVideoFrame();', waitStart) > waitStart,
  'compressed videos should wait for loadeddata before MediaRecorder starts so gallery thumbnails are not blank'
);

assert.ok(zh.includes('"uploadVideoHighFpsConfirm"'), 'zh-CN should include the high-fps confirmation copy');
assert.ok(en.includes('"uploadVideoHighFpsConfirm"'), 'en should include the high-fps confirmation copy');
assert.ok(zh.includes('画质'), 'zh-CN prompt should disclose possible visual quality impact');
assert.ok(en.includes('visual quality'), 'en prompt should disclose possible visual quality impact');

console.log('video upload choice and preview behavior ok');
