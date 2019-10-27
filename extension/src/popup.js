import $ from "./vdp/jquery-3.1.1.min.js";

var vd = {};

vd.sendMessage = function(message, callback) {
  chrome.runtime.sendMessage(message, callback);
};

vd.createDownloadSection = function(videoData) {
  return (
    '<li class="video"> \
        <a class="play-button" href="' +
    videoData.url +
    '" target="_blank"></a> \
        <div class="title" title="' +
    videoData.fileName +
    '">' +
    '<select class="js-example-basic-single js-states form-control" id="id_label_single"></select>'
     +
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
      var smallest = null
      var smallestSize = Math.min()
      videoLinks.forEach(video => {
        if (Number(video.size) < smallestSize) {
          smallest = video;
          smallestSize = Number(video.size);
        }
      });
      videoList.append(vd.createDownloadSection(smallest));
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
