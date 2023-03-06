function showSteps() {
    let stepsDiv = document.getElementById("steps");
    chrome.storage.local.get('jmonData', function(previousSteps) {
        // If there are steps defined, show them with an initial block
        if (previousSteps.jmonData.length > 0) {
            stepsDiv.innerHTML = "steps:\n" + previousSteps.jmonData.join("\n");
        } else {
            stepsDiv.innerHTML = "# No steps have been recorded"
        }
    });
}

function clearSteps() {
    chrome.storage.local.set({ jmonData: [] }, function() {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
        }
    });
    document.getElementById("steps").innerHTML = "";
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("updateStepsButton").addEventListener("click", showSteps);
    document.getElementById("clearStepsButton").addEventListener("click", clearSteps);
});
