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
var numSplits = 0;

var languageCode = "es";
var targetLanguage = "en";
var url = "https://gcs-vimeo.akamaized.net/exp=1572154372~acl=%2A%2F558285842.mp4%2A~hmac=ac6cefde06c57507c2ad7c391be6aca980980ae88d20c86d0d2c2ca2d00475c2/vimeo-prod-skyfire-std-us/01/4587/6/172935238/558285842.mp4";

var download = (url, res, tscript) => {
  const file = fs.createWriteStream("raw.mp4");
  const request = https.get(url, function (response) { response.pipe(file) });
  file.on('finish', () => split("raw.mp4", res, tscript));
}

var convert = (input, sampleRate, res, i, tscript) => {
  ffmpeg(input).toFormat('flac').on('error', (err) => {
    console.log('An error occurred: ' + err.message);
  }).on('progress', (progress) => {
    console.log('Processing: ' + progress.targetSize + ' KB converted');
  }).on('end', () => {
    console.log('Conversion finished!');
    const fname = "./" + input.slice(0, -3) + "flac";
    const result = recognize(fname, sampleRate, languageCode, res, i, tscript);
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
          convert(`split${i}.mp4`, sampleRate, res, i, tscript);
        }).save(`split${i}.mp4`);
      }
      splitter(i);
    }
  });
}

// ---------- < BEGIN GOOGLE CLOUD APIS > --------
var recognize = (filename, sampleRateHertz, languageCode, res, i, tscript) => {
  const client = new speech.SpeechClient();
  const config = {
    enableWordTimeOffsets: true,
    encoding: "FLAC",
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
  return client.recognize(request).then(raw => transcribe(raw, res, i, tscript));
}

var transcribe = (raw, res, i, tscript) => {
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
    result = _condense(result, i);
    result.forEach(word => {
      translate.translate(word.raw, targetLanguage).then(translated => {
        word.text = translated[0];
        count += 1
        if (count === result.length) {
          tscript.data[i] = result;
          tscript.num += 1;
          console.log(result);
          if (tscript.num == numSplits) {
            var combined = [].concat.apply([], tscript.data)
            res.send(combined);
          }
        }
      });
    });
  });
}

var _condense = (result, i) => {
  var array = [];
  var time = 0;
  var string = "";
  for (var j = 0; j < result.length; j++) {
    word = result[j]
    if (word.start < time + 5) {
      if (string.length != 0)
        string += " "
      string += word.raw;
    }
    if (word.start >= time + 5 || j == result.length - 1) {
      array.push({
        raw: string,
        start: time + i * 30,
        end: time + 5 + i * 30,
      })
      string = "";
      time += 5;
    }
  }
  return array;
}

app.get('/', function (req, res) {
  if (Object.keys(req.query).length !== 3) {
    res.send({status: "Invalid query"});
    return
  }
  languageCode = req.query.native
  targetLanguage = req.query.target
  url = req.query.url
  var tscript = { data: [], num: 0 };
  download(url, res, tscript);

});


app.listen(port, function () { }); 