const https = require('https');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const file = fs.createWriteStream("file.mp4");
const request = https.get("https://gcs-vimeo.akamaized.net/exp=1572086558~acl=%2A%2F585965178.mp4%2A~hmac=f9f1ff40beffd19c5ec5bb30b350875e553d220d8f92216bcae6855db32cad9a/vimeo-prod-skyfire-std-us/01/908/7/179543978/585965178.mp4", function(response) {
  response.pipe(file);
});

const proc = new ffmpeg({source:"file.mp4"});
proc.setFfmpegPath('/Applications/ffmpeg');
//proc.saveToFile("f.mp3", (stdout, stderr) => err ? console.log(stderr) : console.log('done'));
