
var currentStep = [];
var currentContextMenuTarget = undefined;


async function addStep(step) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('jmonData', function(previousSteps) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        reject();
      }
      allSteps = previousSteps.jmonData || [];
      allSteps.push(step);

      console.debug("All steps:");
      console.debug(allSteps);

      chrome.storage.local.set({ jmonData: allSteps }, function() {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        }
        return resolve();
      });
    });
  });
}

function getUniqueClassForTarget(target) {
  if ((! target.className) || typeof target.className !== "string") {
    console.debug("Could not find any classes attached to target");
    return;
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

function getFindForTarget(target) {
  // Calculate how to find element
  let step = `   - find:\n`;
  let uniqueClassName = getUniqueClassForTarget(target);
  // Check for ID match
  if (target.id) {
    step += `     - id: ${target.id}`;

  // Otherwise check for placeholder, since this
  // is more user-friendly
  } else if (target.getAttribute('placeholder')) {
    step += `     - placeholder: ${target.getAttribute ('placeholder')}`;

  // Check for non-unique class names
  } else if (uniqueClassName && identifierLooksRandom(uniqueClassName)) {
    step += `     - class: ${uniqueClassName}`;

  // Check for content
  } else if (getUniqueContentForTarget(target)) {
    step += `     - tag: ${target.nodeName}\n     - text: ${getUniqueContentForTarget(target)}`
  
  // Use non-unique class name
  } else if (uniqueClassName) {
    step += `     - class: ${uniqueClassName}`;
  } else {
    return null;
  }
  return step;
}

async function handleDomClick(event) {
  await checkCompleteStartStep("CLICK", event.target, undefined);
  let step = getFindForTarget(event.target);
  if (!step) {
    await addStep('# WARNING: Unable to identifier for click step');
    return;
  }
  step += `\n     - actions:\n        - click`;
  await addStep(step);
}

async function handleDomInput(event) {
  await checkCompleteStartStep("TYPE", event.target, event.data);
}

async function completeTypeStep(target, text) {
  let step = getFindForTarget(target);
  if (!step) {
    await addStep('# WARNING: Unable to identifier for text typing');
    return;
  }
  step += `\n     - actions:\n        - type: ${text}`;
  await addStep(step);
}

async function addCheckStepContextMenuContent() {
  await checkCompleteStartStep("CONTEXT_MENU_CONTENT", undefined, undefined);
  if (! currentContextMenuTarget || ! currentContextMenuTarget.target) {
    console.log("Cannot find current context menu item")
    return;
  }
  let step = getFindForTarget(currentContextMenuTarget.target);
  if (!step) {
    await addStep("# WARNING: Unable to find identifier for element for manual content check");
    return;
  }
  step += `\n     - check:\n        text: ${currentContextMenuTarget.target.textContent}`;
  await addStep(step);
}

async function checkCompleteStartStep(stepType, target, value) {
  return new Promise(async (resolve, reject) => {
    // Check if a step is in progress and doens't match
    // the current step
    if (!currentStep || (currentStep[0] != stepType || currentStep[1] != target)) {

      if (currentStep[0] == "TYPE") {
        // Complete previous type step
        await completeTypeStep(currentStep[1], currentStep[2]);
      }

      // Set current step to this step type
      currentStep = [stepType, target, value];
    } else {
      // If step type and target are the same, append data
      if (currentStep[0] == "TYPE") {
        currentStep[2] += value;
      }
    }
    resolve();
  });
}

function updateContextMenuElement(target) {
  currentContextMenuTarget = target;
}

function injectDomListeners() {
  console.log("Injecting DOM Listeners");
  // Add listener for click/input events
  document.addEventListener("click", handleDomClick);
  document.addEventListener("input", handleDomInput);

  // Add listener for context menu events, so that
  // triggers to our context menu can capture the element
  // it was triggered on
  document.addEventListener("contextmenu", updateContextMenuElement);

}

// Listen for URL change messages from the background script
chrome.runtime.onMessage.addListener(async function(message, sender, sendResponse) {
  if (message.type === 'goto') {
    checkCompleteStartStep("GOTO", undefined, undefined);
    await addStep(`   - goto: "${message.url}"`);
  } else if (message.type === 'urlChange') {
    checkCompleteStartStep("REDIRECT", undefined, undefined);
    await addStep(`   - check:\n        url: "${message.url}"`);
  } else if (message.type == 'injectDomListener') {
    injectDomListeners();
  } else if (message.type == "checkContextMenuContent") {
    addCheckStepContextMenuContent();
  }
});
