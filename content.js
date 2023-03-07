
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

function getUniqueClassForTarget(target, parent) {
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
    if (parent.getElementsByClassName(className).length == 1) {
      return className;
    } else {
      console.debug(`${className} is not unique`);
    }
  }
  return null;
}

function getUniqueContentForTarget(target, parent) {
  // If target inner text is empty, return early
  if (! target.textContent) {
    return null;
  }
  // Ignore with large content or new lines
  if (target.textContent.length > 30 || target.textContent.indexOf("\n") !== -1) {
    return null;
  }

  // Iterate over each class that matches content
  let found = false;
  for (const div of parent.querySelectorAll(target.nodeName)) {
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

function identifierLooksNoneRandom(id) {
  console.debug(`Checking if identifier looks random: ${id}`);
  let countCaps = (id.match(/[A-Z]/g) || '').length;
  let countLower = (id.match(/[a-z]/g) || '').length;
  let countDigits = (id.match(/[0-9]/g) || '').length;

  
  // check if high proportion of string is numbers of capitals
  if (countCaps > (id.length / 3) || countDigits > (id.length / 3)) {
    console.debug("Looks random");
    return false;
  } else if ((countCaps + countDigits) > (countLower / 2) ) {
    console.debug("Looks random")
    return false;
  }
  console.debug("Does not look random");
  return true;
}

function getParentStep(target, indentationCount, rootParent) {
  let parent = target.parentNode;
  // Create find for parent
  let [parentStep, parentIndentation] = getExactFindForTarget(parent, indentationCount, rootParent);

  if (parentStep !== null) {
    let [childStep, childIndentation] = getExactFindForTarget(target, parentIndentation, parent);

    if (childStep !== null) {
      return [`${parentStep}\n${childStep}`, childIndentation];
    }
  }
  return [null, indentationCount];
}

function getExactFindForTarget(target, indentationCount, parent=undefined) {
  if (parent === undefined) {
    parent = document;
  }
  let ind = ' '.repeat(indentationCount);
  let step = `${ind}- find:\n`;
  let uniqueClassName = getUniqueClassForTarget(target, parent);
  let foundIdentifier = false;

  // Check for ID match
  if (target.id) {
    step += `${ind}  - id: ${target.id}`;
    foundIdentifier = true;

  // Otherwise check for placeholder, since this
  // is more user-friendly
  } else if (target.getAttribute('placeholder')) {
    step += `${ind}  - placeholder: ${target.getAttribute('placeholder')}`;
    foundIdentifier = true;

  // Check for non-unique class names
  } else if (uniqueClassName && identifierLooksNoneRandom(uniqueClassName)) {
    step += `${ind}  - class: ${uniqueClassName}`;
    foundIdentifier = true;

  // Check for content
  } else if (getUniqueContentForTarget(target, parent)) {
    step += `${ind}  - tag: ${target.nodeName}\n${ind}  - text: ${getUniqueContentForTarget(target, parent)}`;
    foundIdentifier = true;
  
  // Use non-unique class name
  } else if (uniqueClassName) {
    step += `${ind}  - class: ${uniqueClassName}`;
    foundIdentifier = true;
  }

  return [foundIdentifier ? step : null , indentationCount + 2];
}

function getFindForTarget(target, indentationCount=3, parent=undefined) {
  // Calculate how to find element
  if (parent === undefined) {
    parent = document;
  }
  let step = null;
  let childIndentation = indentationCount;

  // Check exact match
  let exactFind = null;
  [exactFind, childIndentation] = getExactFindForTarget(target, indentationCount, parent);
  if (exactFind !== null) {
    step = exactFind;
  } else {
    [parentFind, childIndentation] = getParentStep(target, indentationCount, parent);
    // Limit to only the root indentation lookup
    if (parentFind !== null) {
      step = parentFind;
    }
  } 

  return [step, childIndentation];
}

async function handleDomClick(event) {
  await checkCompleteStartStep("CLICK", event.target, undefined);
  let [step, indentationCount] = getFindForTarget(event.target);
  let indentation = ' '.repeat(indentationCount);
  if (!step) {
    await addStep('# WARNING: Unable to identifier for click step');
    return;
  }
  step += `\n${indentation}- actions:\n${indentation}  - click`;
  await addStep(step);
}

async function handleDomInput(event) {
  await checkCompleteStartStep("TYPE", event.target, event.data);
}

async function completeTypeStep(target, text) {
  let [step, indentationCount] = getFindForTarget(target);
  let indentation = ' '.repeat(indentationCount);
  if (!step) {
    await addStep('# WARNING: Unable to identifier for text typing');
    return;
  }
  step += `\n${indentation}- actions:\n${indentation}  - type: ${text}`;
  await addStep(step);
}

async function addCheckStepContextMenuContent() {
  await checkCompleteStartStep("CONTEXT_MENU_CONTENT", undefined, undefined);
  if (! currentContextMenuTarget || ! currentContextMenuTarget.target) {
    console.log("Cannot find current context menu item")
    return;
  }
  let [step, indentationCount] = getFindForTarget(currentContextMenuTarget.target);
  let indentation = ' '.repeat(indentationCount);
  if (!step) {
    await addStep("# WARNING: Unable to find identifier for element for manual content check");
    return;
  }
  step += `\n${indentation}- check:\n${indentation}   text: ${currentContextMenuTarget.target.textContent}`;
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
      if (currentStep[0] == "TYPE" && value) {
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
