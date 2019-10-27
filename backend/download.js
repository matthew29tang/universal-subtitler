const https = require('https');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const splitLen = 30;

const url = "https://gcs-vimeo.akamaized.net/exp=1572139697~acl=%2A%2F558285845.mp4%2A~hmac=2e5f39f5455b573afb1b0ad4b5fabf3b35d2ea642677a61ac83c0064b6ba364b/vimeo-prod-skyfire-std-us/01/4587/6/172935238/558285845.mp4";

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
  }).addOption('-ac', 1).save(input.slice(0, -3) + "flac")
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
  });
}

download(url)