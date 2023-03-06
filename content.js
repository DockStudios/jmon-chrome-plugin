
function addStep(step) {
  chrome.storage.local.get('jmonData', function(previousSteps) {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    allSteps = previousSteps.jmonData || [];
    allSteps.push(step);

    console.debug("All steps:");
    console.debug(allSteps);

    chrome.storage.local.set({ jmonData: allSteps }, function() {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
    });
  });
}

function getUniqueClassForTarget(target) {
  if (! target.className) {
    console.debug("Could not find any classes attached to target")
  }
  // Iterate over each class of the target
  for (let className of target.className.split(' ')) {
    // Skip empty class names
    if (! className.trim()) {
      continue;
    }

    // Check if there's only one instance of class with the name
    if (document.getElementsByClassName(className).length == 1) {
      return className;
    } else {
      console.debug(`${className} is not unique`);
    }
  }
  return null;
}

function getUniqueContentForTarget(target) {
  // If target inner text is empty, return early
  if (! target.textContent) {
    return null;
  }

  // Iterate over each class that matches content
  let found = false;
  for (const div of document.querySelectorAll(target.nodeName)) {
    if (div.textContent == target.textContent) {
      if (found) {
        // If a duplicate is found, do not use as identifier
        console.debug("Found duplicate element with duplicate content")
        return null;
      }
      found = true;
    }
  }
  return target.textContent;
}

const identifierLooksRandomRegex = new RegExp("[a-z]+[0-9]+[a-z]+");

function identifierLooksRandom(id) {
  console.debug(`Checking if identifier looks random: ${id}`);
  const result = identifierLooksRandomRegex.exec(id) == null ? true : false;
  console.debug(`Result: ${result}`);
  return result;
}

function injectDomListener() {
  console.log("Injecting DOM Listener");
  document.addEventListener("click", function(event) {
    console.log("Clicked on", event.target);
    // Calculate how to find element
    let step = ` - find:\n`;
    let uniqueClassName = getUniqueClassForTarget(event.target);
    // Check for ID match
    if (event.target.id) {
      step += `   - id: ${event.target.id}`;

    // Otherwise check for placeholder, since this
    // is more user-friendly
    } else if (event.target.getAttribute ('placeholder')) {
      step += `   - placeholder: ${event.target.getAttribute ('placeholder')}`;

    // Check for non-unique class names
    } else if (uniqueClassName && identifierLooksRandom(uniqueClassName)) {
      step += `   - class: ${uniqueClassName}`;

    // Check for content
    } else if (getUniqueContentForTarget(event.target)) {
      step += `   - tag: ${event.target.nodeName}\n   - text: ${getUniqueContentForTarget(event.target)}`
    
    // Use non-unique class name
    } else if (uniqueClassName) {
      step += `class: ${uniqueClassName}`;
    } else {
      addStep('# WARNING: Unable to identifier for click step');
      return;
    }
    step += `\n   - actions:\n      - click`;
    addStep(step);
  });
}



// Listen for URL change messages from the background script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === 'goto') {
    addStep(` - goto: ${message.url}`);
  }
  if (message.type === 'urlChange') {
    // Log the new URL to the console
    addStep(` - check:
    - url: ${message.url}`);
  }
  if (message.type == 'injectDomListener') {
    injectDomListener();
  }
});
