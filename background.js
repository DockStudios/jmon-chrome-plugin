let transitions = {};

chrome.webNavigation.onCommitted.addListener(function(details) {
  if (details.frameId === 0) {
    if (details.transitionType === 'typed') {
      transitions[details.tabId] = {type: 'goto', url: details.url};
    } else {
      transitions[details.tabId] = {type: 'urlChange', url: details.url};
    }
  }
});

chrome.webNavigation.onCompleted.addListener(function(details) {
  // Only check for requests of the actual tab
  if (transitions[details.tabId]) {
    chrome.tabs.sendMessage(details.tabId, transitions[details.tabId]);
    transitions[details.tabId] = undefined;
  }
});