var port = process.env.PORT || 4000;  
var express = require('express'); 
var cors = require('cors');
const https = require('https');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const speech = require('@google-cloud/speech');
const { Translate } = require('@google-cloud/translate');
const translate = new Translate({ projectId: 'subgen' });
var app = express();
app.use(cors());
console.log("Starting up server...");

const splitLen = 30;
const url = "https://gcs-vimeo.akamaized.net/exp=1572138211~acl=%2A%2F585965178.mp4%2A~hmac=f3dbe3981b8ab8f5a681ff7efee9e844f62ee1de34f747d0d204fb5f4a7f7e85/vimeo-prod-skyfire-std-us/01/908/7/179543978/585965178.mp4";

var download = (url) => {
  const file = fs.createWriteStream("raw.mp4");
  const request = https.get(url, function (response) { response.pipe(file) });
  file.on('finish', () => split("raw.mp4"));
}

var convert = (input, sampleRate) => {
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
    numSplits = Math.floor(duration / splitLen) + 1;
    console.log("Sample rate: ", sampleRate);
    console.log("Duration: ", duration);
    console.log("Num splits: ", numSplits);
    for (var i = 0; i < numSplits; i++) {
      splitter = (i) => {
        ffmpeg(outfile).seekInput(splitLen * i).duration(splitLen).on('end', () => {
          console.log("Splitted", i);
          convert(`split${i}.mp4`, sampleRate);
        }).save(`split${i}.mp4`);
      }
      splitter(i);
    }
  });
}

//download(url)


// ---------- < BEGIN GOOGLE CLOUD APIS > --------
var recognize = (filename, encoding, sampleRateHertz, languageCode, res) => {
  const client = new speech.SpeechClient();
  const config = {
    enableWordTimeOffsets: true,
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
    enableAutomaticPunctuation: true,
  };
  const audio = {
    content: fs.readFileSync(filename).toString('base64'),
  };
  const request = {
    config: config,
    audio: audio,
  };
  console.log("Performing recognition...");
  return client.recognize(request).then(raw => transcribe(raw, res));
}

var transcribe = (raw, res) => {
  const [response] = raw
  response.results.forEach(raw => {
    result = []
    console.log(`Transcription: `, raw.alternatives[0].transcript);
    raw.alternatives[0].words.forEach(wordInfo => {
      const startSecs = `${wordInfo.startTime.seconds}` + `.` + wordInfo.startTime.nanos / 100000000;
      const endSecs = `${wordInfo.endTime.seconds}` + `.` + wordInfo.endTime.nanos / 100000000;
      result.push({
        raw: wordInfo.word,
        start: startSecs,
        end: endSecs
      })
    });
    var count = 0;
    result.forEach(word => {
      translate.translate(word.raw, 'en').then(translated => {
        word.text = translated[0];
        count += 1
        if (count === result.length) {
          console.log(result);
          res.send(result);
        }
      });
    });
  });
}

app.get('/', function (req, res) {
  const filename = './split0.flac';
  const encoding = 'FLAC';
  const sampleRateHertz = 48000;
  const languageCode = 'es';
  const result = recognize(filename, encoding, sampleRateHertz, languageCode, res);
});


app.listen(port, function () { }); 