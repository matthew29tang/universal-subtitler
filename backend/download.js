const https = require('https');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const outfile = './output.flac'
const splitLen = 30;

const url = "https://gcs-vimeo.akamaized.net/exp=1572132846~acl=%2A%2F585965178.mp4%2A~hmac=37b25f605c536cae15628132d87a5b31d2e16bd20c38767bb09cc65eef664929/vimeo-prod-skyfire-std-us/01/908/7/179543978/585965178.mp4";

var download = (url) => {
  const file = fs.createWriteStream("raw.mp4");
  const request = https.get(url, function (response) {
    response.pipe(file);
  });

  file.on('finish', () => split("raw.mp4"));
}

var convert = (input) => {
  ffmpeg(input).toFormat('flac').on('error', (err) => {
    console.log('An error occurred: ' + err.message);
  }).on('progress', (progress) => {
    console.log('Processing: ' + progress.targetSize + ' KB converted');
  }).on('end', () => {
    console.log('Conversion finished!');
  }).save(input.slice(0, -3) + "flac")
}


var split = (outfile) => {
  ffmpeg(outfile).ffprobe(outfile, (err, metadata) => {
    var sampleRate = null;
    var duration = null;
    metadata.streams.forEach(function (stream) {
      if (stream.codec_type === "audio") {
        sampleRate = stream.sample_rate;
        duration = stream.duration;
      }
    });
    console.log("Sample rate: ", sampleRate);
    console.log("Duration: ", duration);
    numSplits = Math.floor(duration / splitLen) + 1;
    console.log("Num splits", numSplits);
    for (var i = 0; i < numSplits; i++) {
      splitter = (i) => {
        ffmpeg(outfile).seekInput(splitLen * i).duration(splitLen).on('end', () => {
          console.log("Splitted", i);
          convert(`split${i}.mp4`);
        }).save(`split${i}.mp4`);
      }
      splitter(i);
    }
    console.log("Split finished")
  });

}

download(url)