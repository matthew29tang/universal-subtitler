import $ from "./vdp/jquery-3.1.1.min.js";
import { subtitles as TEST_SUBS } from "./testing_data.js";

var vd = {};

// Sends message from extension to content script
vd.sendMessage = function(message, callback) {
  chrome.runtime.sendMessage(message, callback);
};

vd.createDownloadSection = function(videoData) {
  // The old code used to create the download buttons
  oldElem = (
    '<li class="video"> \
        <a class="play-button" href="' +
    videoData.url +
    '" target="_blank"></a> \
        <div class="title" title="' +
    videoData.fileName +
    '">' +
    videoData.fileName +
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
        </li>'

  );

  // TODO: have a bunch of buttons -- their onclick events would make API call
  // which would retrieve subtitles and then inject them into the video
  // element.

  var onclick = function(){
    /* TODO: MAKE API CALL */
    subtitles = TEST_SUBS;
    vd.sendMessage({message: "send_subtitles", subtitles: TEST_SUBS});
  };
};

$(document).ready(function() {
  var videoList = $("#video-list");
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    console.log(tabs);
    vd.sendMessage({ message: "get-video-links", tabId: tabs[0].id }, function(
      tabsData
    ) {
      console.log(tabsData);
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
      videoLinks.forEach(function(videoLink) {
        videoList.append(vd.createDownloadSection(videoLink));
      });
    });
  });
  $("body").on("click", ".download-button", function(e) {
    e.preventDefault();
    vd.sendMessage({
      message: "download-video-link",
      url: $(this).attr("href"),
      fileName: $(this).attr("data-file-name")
    });
  });
});
// vim: et sw=2
