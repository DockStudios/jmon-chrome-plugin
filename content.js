
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

function getUniqueClassForTarget(target) {
  // Iterate over each class of the target
  for (let className of target.className.split(' ')) {
    // Check if there's only one instance of class with the name
    if (document.getElementsByClassName(className).length == 1) {
      return className;
    }
  }
  return null;
}

function injectDomListener() {
  console.log("Injecting DOM Listener");
  document.addEventListener("click", function(event) {
    console.log("Clicked on", event.target);
    // Calculate how to find element
    let step = ` - find:\n   - `;
    if (event.target.id) {
      step += `id: ${event.target.id}`;
    } else if (event.target.getAttribute ('placeholder')) {
      step += `placeholder: ${event.target.getAttribute ('placeholder')}`;
    } else if (getUniqueClassForTarget(event.target)) {
      step += `class: ${getUniqueClassForTarget(event.target)}`;
    } else {
      return;
    }
    step += `\n     - actions:\n        - click`;
    addStep(step);
  });
}



// Listen for URL change messages from the background script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log("Got message")
  console.log(message);
  if (message.type === 'goto') {
    addStep(` - goto: ${message.url}`);
  }
  if (message.type === 'urlChange') {
    // Log the new URL to the console
    console.log('New URL:', message.url);
    addStep(` - check:
    - url: ${message.url}`);
  }
  if (message.type == 'injectDomListener') {
    injectDomListener();
  }
});
