import $ from "./vdp/jquery-3.1.1.min.js";
import { subtitles as TEST_SUBS } from "./testing_data.js";
var select2 = require('select2');
var targetLang = 'en';
var nativeLang = 'en';
var url = null;
const baseURL = 'https://subgen.localtunnel.me';

var vd = {};

var data = [
  {
    id: 0,
    text: 'English',
    value: 'en'
  },
  {
    id: 1,
    text: 'Japanese',
    value: 'ja'
  },
  {
    id: 2,
    text: 'Spanish',
    value: 'es'
  },
  {
    id: 3,
    text: 'French',
    value: 'fr'
  },
  {
    id: 4,
    text: 'German',
    value: 'de'
  }
];

// Sends message from extension to content script
vd.sendMessage = function (message, callback) {
  chrome.runtime.sendMessage(message, callback);
};

vd.createDownloadSection = function (videoData) {
  url = encodeURIComponent(videoData.url);
  var parent = document.getElementById("video-list");
  var nativeList = document.createElement("select");
  var targetList = document.createElement("select");
  nativeList.addEventListener("change", (newValue) => {
    var stored = document.getElementById("nativeIndex");
    nativeLang = data[newValue.target.selectedIndex].value
    stored.innerHTML = nativeLang;
  });
  targetList.addEventListener("change", (newValue) => {
    var stored = document.getElementById("targetIndex");
    targetLang = data[newValue.target.selectedIndex].value
    stored.innerHTML = targetLang;
  });
  parent.appendChild(nativeList);
  parent.appendChild(targetList);

  //Create and append the options
  for (var i = 0; i < data.length; i++) {
    var option = document.createElement("option");
    option.value = data[i].value;
    option.text = data[i].text;
    nativeList.appendChild(option);
  }
  for (var i = 0; i < data.length; i++) {
    var option = document.createElement("option");
    option.value = data[i].value;
    option.text = data[i].text;
    targetList.appendChild(option);
  }
  /*return (
    '<li class="video"> \
        <a class="play-button" href="' +
    videoData.url +
    '" target="_blank"></a> \
        <div class="title" title="' + videoData.fileName + '">'
    +
    '<div id="nativeIndex">' + nativeList.selectedIndex + '</div>'
    +
    '<div id="targetIndex">' + targetList.selectedIndex + '</div>'
    +
    '</div> \
        <a class="download-button" href="' +
    videoData.url +
    '" data-file-name="' +
    videoData.fileName +
    videoData.extension +
    '">Download - ' +
    Math.floor((videoData.size * 100) / 1024 / 1024) / 100 +
    ' MB</a>\
        <div class="sep"></div>\
        </li>');

  // TODO: have a bunch of buttons -- their onclick events would make API call
  // which would retrieve subtitles and then inject them into the video
  // element.
  */
  var butt = document.createElement("button");
  butt.classList.add("translate-button");
  butt.innerText = "Add Translation";
  parent.appendChild(butt);
  return;
};

$(document).ready(function () {
  var videoList = $("#video-list");
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    console.log(tabs);
    vd.sendMessage({ message: "get-video-links", tabId: tabs[0].id }, function (
      tabsData
    ) {
      console.log(tabsData);
      if (!tabsData) {
        return;
      }
      if (tabsData.url.indexOf("youtube.com") != -1) {
        vd.sendMessage({ message: "show-youtube-warning" });
        return;
      }
      var videoLinks = tabsData.videoLinks;
      console.log(videoLinks);
      if (videoLinks.length == 0) {
        $("#no-video-found").css("display", "block");
        videoList.css("display", "none");
        return;
      }
      $("#no-video-found").css("display", "none");
      videoList.css("display", "block");
      var smallest = null
      var smallestSize = Math.min()
      videoLinks.forEach(video => {
        chrome.extension.getBackgroundPage().console.log(video.url);
        if (Number(video.size) < smallestSize) {
          smallest = video;
          smallestSize = Number(video.size);
        }
      });
      videoList.append(vd.createDownloadSection(smallest));
    });
  });
  $("body").on("click", ".translate-button", function (e) {
    $(this).prop('disabled', true);
    var parent = document.getElementById("video-list");
    var para = document.createElement("P");
    para.innerText = "Loading..."
    parent.appendChild(para);
    console.log("translate button clicked");
    e.preventDefault();
    //var subtitles = TEST_SUBS;
    var finalurl = `${baseURL}\?native=${nativeLang}&target=${targetLang}&url=${url}`
    chrome.extension.getBackgroundPage().console.log("Fetching...");
    fetch(finalurl).then((response) => {
      response.json().then((resp) => {
        chrome.extension.getBackgroundPage().console.log(resp);
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, { message: "send_subtitles", subtitles: resp });
        });
      }).catch((err) => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, { message: "failure" });
        });
      });
    });
  });
});
// vim: et sw=2
