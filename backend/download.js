const https = require('https');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const file = fs.createWriteStream("raw.mp4");
const url = "https://gcs-vimeo.akamaized.net/exp=1572127812~acl=%2A%2F585965178.mp4%2A~hmac=8b8ac70751c7aad03ebbe4eab8bf01390d874677df87eeea8722143f66dd626b/vimeo-prod-skyfire-std-us/01/908/7/179543978/585965178.mp4";
const request = https.get(url, function (response) {
    response.pipe(file);
});

file.on('finish', () => {
    ffmpeg('./raw.mp4').toFormat('flac').on('error', (err) => {
        console.log('An error occurred: ' + err.message);
    }).on('progress', (progress) => {
        // console.log(JSON.stringify(progress));
        console.log('Processing: ' + progress.targetSize + ' KB converted');
    }).on('end', () => {
        console.log('Processing finished !');
    }).save('./output.flac').ffprobe('./output.flac', (err, metadata) => {
        var sampleRate = null;
        metadata.streams.forEach(function (stream) {
            if (stream.codec_type === "audio")
                sampleRate = stream.sample_rate;
        });
        console.log("Sample rate: ", sampleRate);
    });
});