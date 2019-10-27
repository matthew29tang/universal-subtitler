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

const encoding = "FLAC";
const languageCode = "es";
const splitLen = 30;
var numSplits = 0;
const url = "https://gcs-vimeo.akamaized.net/exp=1572150338~acl=%2A%2F558285842.mp4%2A~hmac=5c4be176f9dd2c372b965ac17b458236d7e62a7b57dfed3bd6c5cbe027726626/vimeo-prod-skyfire-std-us/01/4587/6/172935238/558285842.mp4";

var download = (url, res, tscript) => {
  const file = fs.createWriteStream("raw.mp4");
  const request = https.get(url, function (response) { response.pipe(file) });
  file.on('finish', () => split("raw.mp4", res, tscript));
}

var convert = (input, sampleRate, res, tscript) => {
  ffmpeg(input).toFormat('flac').on('error', (err) => {
    console.log('An error occurred: ' + err.message);
  }).on('progress', (progress) => {
    console.log('Processing: ' + progress.targetSize + ' KB converted');
  }).on('end', () => {
    console.log('Conversion finished!');
    tscript.num += 1;
    const result = recognize("./" + input.slice(0, -3) + "flac", encoding, sampleRate, languageCode, res, tscript);
  }).addOption('-ac', 1).save(input.slice(0, -3) + "flac")
}

var split = (outfile, res, tscript) => {
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
          convert(`split${i}.mp4`, sampleRate, res, tscript);
        }).save(`split${i}.mp4`);
      }
      splitter(i);
    }
  });
}

//download(url)


// ---------- < BEGIN GOOGLE CLOUD APIS > --------
var recognize = (filename, encoding, sampleRateHertz, languageCode, res, tscript) => {
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
  return client.recognize(request).then(raw => transcribe(raw, res, tscript));
}

var transcribe = (raw, res, tscript) => {
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
    result = _condense(result);
    result.forEach(word => {
      translate.translate(word.raw, 'en').then(translated => {
        word.text = translated[0];
        count += 1
        if (count === result.length) {
          tscript.data.push(result);
          console.log(result);
          if (tscript.num == numSplits) {
            res.send(result);
          }
        }
      });
    });
  });
}

var _condense = (result) => {
  var array = [];
  var time = 0;
  var string = "";
  result.forEach(word => {
    if (word.start < time + 5) {
      string = string + " " + word.raw;
    } else {
      array.push({
        raw: string,
        start: time,
        end: time + 5
      })
      string = "";
      time += 5;
    }
  })
  return array;
}

app.get('/', function (req, res) {
  var tscript = {data: [], num: 0};
  download(url, res, tscript);
  // const filename = './split0.flac';
  // const sampleRateHertz = 48000;
  // const result = recognize(filename, encoding, sampleRateHertz, languageCode, res);
});


app.listen(port, function () { }); 