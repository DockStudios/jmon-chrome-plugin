function showSteps() {
    console.log("called");
    let stepsDiv = document.getElementById("steps");
    chrome.storage.local.get('jmonData', function(previousSteps) {
        stepsDiv.innerHTML = previousSteps.jmonData.join("\n");
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
