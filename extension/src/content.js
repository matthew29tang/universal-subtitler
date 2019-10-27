import { getPagesSource } from './vdh/getPagesSource.js'

import { vd } from './vdp/contentscript.js'

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log("content.js received message")
    if( request.message === "clicked_browser_action" ) {
      // chrome.runtime.sendMessage({"message": "open_new_tab", "url": "https://google.com"});
      vd.findVideoLinks(document.body);
    }
  }
);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if ( request.message === "send_subtitles" ) {
      console.log(request.subtitles)
    }
  }
)
// vim:et sw=2
