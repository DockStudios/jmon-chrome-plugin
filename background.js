// Add a listener for URL changes
// chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
//   console.log(tabId);
//   if (changeInfo.status === 'complete') {
//     // Send a message to the content script with the new URL
    
//   }
// });


chrome.webNavigation.onCommitted.addListener(function(details) {
  // Only check for requests of the actual tab
  if (details.frameId === 0) {
    if (details.transitionType === 'typed') {
      chrome.tabs.sendMessage(details.tabId, {type: 'goto', url: details.url});
    } else {
      chrome.tabs.sendMessage(details.tabId, {type: 'urlChange', url: details.url});
    }
  }
});