let transitions = {};

// Send message to content to inject DOM listeners
function notifyInjectDomListener(tabId) {
  chrome.tabs.sendMessage(tabId, {type: 'injectDomListener'});
}

// Add listener for begin of page load to
// capture URL and reason for URL change.
chrome.webNavigation.onCommitted.addListener(function(details) {
  if (details.frameId === 0) {
    console.log(details.transitionType);
    if (details.transitionType === 'typed' || details.transitionType === 'reload') {
      transitions[details.tabId] = {type: 'goto', url: details.url};
    } else {
      transitions[details.tabId] = {type: 'urlChange', url: details.url};
    }
  }
});

// On navigation completed, send message to content to capture
// step
chrome.webNavigation.onCompleted.addListener(function(details) {
  // Only check for requests of the actual tab
  if (transitions[details.tabId]) {
    chrome.tabs.sendMessage(details.tabId, transitions[details.tabId]);
    transitions[details.tabId] = undefined;
  }

  notifyInjectDomListener(details.tabId);
});
