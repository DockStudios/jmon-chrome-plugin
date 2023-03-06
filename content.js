
function addStep(step) {
  chrome.storage.local.get('jmonData', function(previousSteps) {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    allSteps = previousSteps.jmonData || [];
    allSteps.push(step);

    console.log("All steps:");
    console.log(allSteps);

    chrome.storage.local.set({ jmonData: allSteps }, function() {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
    });
  });
}



// Listen for URL change messages from the background script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === 'urlChange') {
    // Log the new URL to the console
    console.log('New URL:', message.url);
    addStep({goto: message.url});
  }
});
