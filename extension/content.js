chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log("content.js received message")
    if( request.message === "clicked_browser_action" ) {
      chrome.runtime.sendMessage({"message": "open_new_tab", "url": "https://google.com"});
    }
  }
);
// vim:et sw=2
