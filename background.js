// Add a listener for URL changes
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    // Send a message to the content script with the new URL
    chrome.tabs.sendMessage(tabId, {type: 'urlChange', url: tab.url});
  }
});
