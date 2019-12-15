var port = process.env.PORT || 4000;
var express = require("express");
var cors = require("cors");
const http = require("http");
const https = require("https");
const stream = require("stream");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const speech = require("@google-cloud/speech");
const { Translate } = require("@google-cloud/translate");
const keyFilename = __dirname + "/subgen-credentials.json";

const translate = new Translate({
  projectId: "subgen",
  keyFilename: keyFilename
});

var app = express();
app.use(cors());
console.log("Starting up server...");
console.log("Port " + port);

const splitLen = 30;
var numSplits = 0;

var languageCode = "es";
var targetLanguage = "en";
var url =
  "https://gcs-vimeo.akamaized.net/exp=1572426072~acl=%2A%2F585965178.mp4%2A~hmac=fe15d19d6c8ee4f41a3af603e494e0bbae451e52cc21d22d36453460f43c0c5e/vimeo-prod-skyfire-std-us/01/908/7/179543978/585965178.mp4";

url = "http://localhost:" + port + "/test.mp4";

var timemarkToSeconds = timemark => {
  var split = timemark.split(":").map(d => parseFloat(d));
  return split[0] * 3600 + split[1] * 60 + split[2];
};

var testPipeline = async (req, res, url, languageCode) => {
  // get -> ffmpeg -> transcribe -> translate
  http.get(url, async videoStream => {
    var {audioStream, sampleRateHertz} = await extractAudioStream(videoStream);
    // audioStream.pipe(fs.createWriteStream("test.flac"));
    infiniteStream(
      audioStream,
      sampleRateHertz,
      "es",
      290000
    )
    // transcribeStream(audioStream, sampleRateHertz, languageCode);
  });
};


const extractAudioStream = async (input) => {
  console.log("extractAudio: begin");
  var audioStream = stream.PassThrough();
  var duration = null;
  var sampleRateHertz = null;
  var proc = new ffmpeg(input)
    .toFormat("flac")
    .outputOptions("-ac 1")
    .on("progress", progress => {
      console.log("extractAudio: Progress: ", progress.timemark);
    })
    .on("codecData", data => {
      console.log("extractAudio: codecData");
      sampleRateHertz = parseInt(
        data.audio_details.filter(s => s.endsWith("Hz"))[0].split(" ")[0]
      );
      proc.emit("streamReady");
    })
    .on("end", () => {
      console.log("extractAudio: done");
    })
    .on("error", (err, stdout, stderr) => {
      console.log("an error happened: " + err.message);
      console.log("ffmpeg stdout: " + stdout);
      console.log("ffmpeg stderr: " + stderr);
    })
    .pipe(
      audioStream,
      { end: true }
    );
  return new Promise((resolve, reject) => {
    proc.once("streamReady", e => {
      console.log("extractAudio: streamReady");
      resolve({audioStream, sampleRateHertz});
    })
  });
};

var transcribeStream = (
  audioStream,
  sampleRateHertz,
  languageCode
) => {
  console.log("recognizeStream: begin");
  const speechClient = new speech.v1p1beta1.SpeechClient({ keyFilename });
  const config = {
    enableWordTimeOffsets: true,
    encoding: "FLAC",
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
    enableAutomaticPunctuation: true
  };
  const request = {
    config: config,
    interimResults: true
  };
  var recognizeStream = speechClient
    .streamingRecognize(request)
    .on("data", data => {
      console.log(
        `Transcription: ${data.results[0].alternatives[0].transcript}`
      );
    })
    .on("error", err => {
      if (err.code == 11) {
        //restartStream()
      } else {
        console.error("Speech-to-text Error: " + err);
      }
    });
  audioStream.pipe(recognizeStream);
};

function infiniteStream(
  audioStream,
  sampleRateHertz,
  languageCode,
  streamingLimit
) {
  const speechClient = new speech.v1p1beta1.SpeechClient({ keyFilename });

  const config = {
    enableWordTimeOffsets: true,
    encoding: "FLAC",
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
    enableAutomaticPunctuation: true
  };

  console.log(config);

  const request = {
    config,
    interimResults: true,
  };

  let recognizeStream = null;
  let restartCounter = 0;
  let audioInput = [];
  let lastAudioInput = [];
  let resultEndTime = 0;
  let isFinalEndTime = 0;
  let finalRequestEndTime = 0;
  let newStream = true;
  let bridgingOffset = 0;
  let lastTranscriptWasFinal = false;

  function startStream() {
    // Clear current audioInput
    audioInput = [];
    // Initiate (Reinitiate) a recognize stream
    recognizeStream = speechClient
      .streamingRecognize(request)
      .on('error', err => {
        if (err.code === 11) {
          // restartStream();
        } else {
          console.error('API request error ' + err);
        }
      })
      .on('data', speechCallback);

    // Restart stream when streamingLimit expires
    setTimeout(restartStream, streamingLimit);
  }

  const speechCallback = stream => {
    // Convert API result end time from seconds + nanoseconds to milliseconds
    resultEndTime =
      stream.results[0].resultEndTime.seconds * 1000 +
      Math.round(stream.results[0].resultEndTime.nanos / 1000000);

    // Calculate correct time based on offset from audio sent twice
    const correctedTime =
      resultEndTime - bridgingOffset + streamingLimit * restartCounter;

    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    let stdoutText = '';
    if (stream.results[0] && stream.results[0].alternatives[0]) {
      stdoutText =
        correctedTime + ': ' + stream.results[0].alternatives[0].transcript;
    }

    if (stream.results[0].isFinal) {
      process.stdout.write(`${stdoutText}\n`);

      isFinalEndTime = resultEndTime;
      lastTranscriptWasFinal = true;
    } else {
      // Make sure transcript does not exceed console character length
      if (stdoutText.length > process.stdout.columns) {
        stdoutText =
          stdoutText.substring(0, process.stdout.columns - 4) + '...';
      }
      process.stdout.write(`${stdoutText}`);

      lastTranscriptWasFinal = false;
    }
  };

  const audioInputStreamTransform = new stream.Transform({
    transform: (chunk, encoding, callback) => {
      if (newStream && lastAudioInput.length !== 0) {
        // Approximate math to calculate time of chunks
        const chunkTime = streamingLimit / lastAudioInput.length;
        if (chunkTime !== 0) {
          if (bridgingOffset < 0) {
            bridgingOffset = 0;
          }
          if (bridgingOffset > finalRequestEndTime) {
            bridgingOffset = finalRequestEndTime;
          }
          const chunksFromMS = Math.floor(
            (finalRequestEndTime - bridgingOffset) / chunkTime
          );
          bridgingOffset = Math.floor(
            (lastAudioInput.length - chunksFromMS) * chunkTime
          );

          for (let i = chunksFromMS; i < lastAudioInput.length; i++) {
            recognizeStream.write(lastAudioInput[i]);
          }
        }
        newStream = false;
      }

      audioInput.push(chunk);

      if (recognizeStream) {
        recognizeStream.write(chunk);
      }

      callback();
    },
  });

  function restartStream() {
    if (recognizeStream) {
      recognizeStream.removeListener('data', speechCallback);
      recognizeStream = null;
    }
    if (resultEndTime > 0) {
      finalRequestEndTime = isFinalEndTime;
    }
    resultEndTime = 0;

    lastAudioInput = [];
    lastAudioInput = audioInput;

    restartCounter++;

    if (!lastTranscriptWasFinal) {
      process.stdout.write(`\n`);
    }
    process.stdout.write(`INFO: ${streamingLimit * restartCounter}: RESTARTING REQUEST\n`);

    newStream = true;

    startStream();
  }

  console.log("infiniteStream: starting...");
  audioStream.pipe(audioInputStreamTransform);
  startStream();
}


// ---------- < BEGIN GOOGLE CLOUD APIS > --------

var transcribe = (raw, res, i, tscript) => {
  const [response] = raw;
  response.results.forEach(raw => {
    result = [];
    console.log(`Transcription: `, raw.alternatives[0].transcript);
    raw.alternatives[0].words.forEach(wordInfo => {
      const startSecs =
        `${wordInfo.startTime.seconds}` +
        `.` +
        wordInfo.startTime.nanos / 100000000;
      const endSecs =
        `${wordInfo.endTime.seconds}` +
        `.` +
        wordInfo.endTime.nanos / 100000000;
      result.push({
        raw: wordInfo.word,
        start: startSecs,
        end: endSecs
      });
    });
    var count = 0;
    result = _condense(result, i);
    result.forEach(word => {
      translate.translate(word.raw, targetLanguage).then(translated => {
        word.text = translated[0];
        count += 1;
        if (count === result.length) {
          tscript.data[i] = result;
          tscript.num += 1;
          console.log(result);
          if (tscript.num == numSplits) {
            var combined = [].concat.apply([], tscript.data);
            res.send(combined);
          }
        }
      });
    });
  });
};

var _condense = (result, i) => {
  var array = [];
  var time = 0;
  var string = "";
  for (var j = 0; j < result.length; j++) {
    word = result[j];
    if (word.start < time + 5) {
      if (string.length != 0) string += " ";
      string += word.raw;
    }
    if (word.start >= time + 5 || j == result.length - 1) {
      array.push({
        raw: string,
        start: time + i * 30,
        end: time + 5 + i * 30
      });
      string = word.raw;
      time += 5;
    }
  }
  return array;
};

app.get("/", function(req, res) {
  if (Object.keys(req.query).length !== 3) {
    res.send({ status: "Invalid query" });
    return;
  }
  languageCode = req.query.native;
  targetLanguage = req.query.target;
  url = req.query.url;
  var tscript = { data: [], num: 0 };
  download(url, res, tscript);
});

app.get("/test/", function(req, res) {
  var tscript = { data: [], num: 0 };
  languageCode = "es";
  targetLanguage = "en";
  // download(http get) -> extract audio (ffmpeg) -> transcribe (speech) -> translate
  testPipeline(req, res, url, languageCode)
});

app.get("/long.mp4", function(req, res) {
  console.log("express: send long.mp4");
  fs.createReadStream(__dirname + "/long.mp4").pipe(res);
});

app.get("/test.mp4", function(req, res) {
  console.log("express: send test.mp4");
  fs.createReadStream(__dirname + "/test.mp4").pipe(res);
});

app.listen(port, function() {});

// vim: et sw=2
