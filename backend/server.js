var port = process.env.PORT || 4000;  
var express = require('express'); 
const fs = require('fs');
var cors = require('cors');
const speech = require('@google-cloud/speech');
const { Translate } = require('@google-cloud/translate');
const translate = new Translate({ projectId: 'subgen' });
var app = express();
app.use(cors());
console.log("Starting up server...");

var syncRecognizeWords = (filename, encoding, sampleRateHertz, languageCode, res) => {
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
  const filename = './video2.flac';
  const encoding = 'FLAC';
  const sampleRateHertz = 44100;
  const languageCode = 'fr';
  const result = syncRecognizeWords(filename, encoding, sampleRateHertz, languageCode, res);
});


app.listen(port, function () { }); 