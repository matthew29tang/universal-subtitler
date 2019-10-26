import { getPagesSource } from './vdh/getPagesSource.js'

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log("content.js received message")
    if( request.message === "clicked_browser_action" ) {
      // chrome.runtime.sendMessage({"message": "open_new_tab", "url": "https://google.com"});
      console.log("poo 1");
      getPagesSource();
      console.log("poo 2");
    }
  }
);
// vim:et sw=2
