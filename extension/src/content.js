import { getPagesSource } from './vdh/getPagesSource.js'

import { vd } from './vdp/contentscript.js'

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if( request.message === "clicked_browser_action" ) {
      console.log("content.js received clicked_browser_action");
      vd.findVideoLinks(document.body);
    }
  }
);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if ( request.message === "send_subtitles" ) {
      console.log(request.subtitles)
      var video = document.querySelector("video");
      var ttRaw = video.addTextTrack("subtitles");
      var ttTranslated = video.addTextTrack("subtitles");
      request.subtitles.forEach(function(subtitle){
        ttRaw.addCue(new VTTCue(subtitle.start, subtitle.end, subtitle.raw));
        ttTranslated.addCue(new VTTCue(subtitle.start, subtitle.end, subtitle.text));
      });
      ttTranslated.mode = "showing";
      alert("Translation complete.");
    }
    else if (request.message === "failure") {
      alert("Translation failure.");
    }
  }
)
// vim:et sw=2
