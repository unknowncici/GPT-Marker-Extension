import dbOperations from './db.js';

// Add error logging
function logError(error, context) {
  console.error(`Error in ${context}:`, error);
}

// Create single context menu item
chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({
      id: "saveAIResponse",
      title: "Save AI Response",
      contexts: ["selection"]
    }, () => {
      if (chrome.runtime.lastError) {
        logError(chrome.runtime.lastError, 'context menu creation');
      }
    });
  } catch (error) {
    logError(error, 'onInstalled');
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveAIResponse") {
    try {
      // Validate selected text
      if (!info.selectionText?.trim()) {
        throw new Error('No text selected');
      }

      // Create and show a popup for custom input
      chrome.windows.create({
        url: `saveDialog.html?text=${encodeURIComponent(info.selectionText)}&source=${encodeURIComponent(detectAISource(tab.url))}&url=${encodeURIComponent(tab.url)}`,
        type: 'popup',
        width: 500,  // Increased width
        height: 400, // Increased height
        focused: true
      }, (window) => {
        if (chrome.runtime.lastError) {
          logError(chrome.runtime.lastError, 'window creation');
        }
      });
    } catch (error) {
      logError(error, 'context menu click');
    }
  }
});

// Improved AI source detection
function detectAISource(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('chat.openai.com')) return 'ChatGPT';
    if (urlObj.hostname.includes('claude.ai')) return 'Claude';
    if (urlObj.hostname.includes('deepseek.com')) return 'Deepseek';
    return 'Unknown';
  } catch (error) {
    logError(error, 'detectAISource');
    return 'Unknown';
  }
}

// Test points:
// 1. Does the context menu appear on right-click?
// 2. Does it work on AI platforms?
// 3. Does the save dialog open correctly?

// ✅ Creates context menu
// ✅ Opens save dialog with correct size (500x400)
// ✅ Detects AI source correctly
// ✅ Handles errors for invalid text/URL 