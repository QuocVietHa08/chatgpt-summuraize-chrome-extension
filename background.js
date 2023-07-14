// backgroundScript.js

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getDocument') {
    // Retrieve the document object
    const documentContent = sender.tab?.id ? chrome.tabs.get(sender.tab.id, (tab) => tab?.document) : null;
    // Send the document object back to the content script
    sendResponse({ document: documentContent });
  }
  
  // Return true to indicate that sendResponse will be called asynchronously
  return true;
});