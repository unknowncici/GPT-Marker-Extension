import dbOperations from './db.js';

document.addEventListener('DOMContentLoaded', () => {
  try {
    // Get and validate URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const selectedText = urlParams.get('text');
    const source = urlParams.get('source');
    const url = urlParams.get('url');

    if (!selectedText) {
      throw new Error('No text provided');
    }

    // Show preview of selected text
    const preview = document.getElementById('textPreview');
    preview.textContent = decodeURIComponent(selectedText);

    // Auto-generate title from content
    const suggestedTitle = selectedText
      .split('\n')[0]              // Get first line
      .substring(0, 50)            // Limit length
      .trim();                     // Clean up
    document.getElementById('title').value = suggestedTitle;

    // Handle save button click
    document.getElementById('saveButton').addEventListener('click', async () => {
      const title = document.getElementById('title').value.trim();
      const category = document.getElementById('category').value.trim();

      if (!title || !category) {
        alert('Please enter both title and category');
        return;
      }

      try {
        await dbOperations.saveResponse({
          title,
          content: decodeURIComponent(selectedText),
          category,
          source: decodeURIComponent(source),
          url: decodeURIComponent(url),
          timestamp: new Date().toISOString()
        });
        
        window.close();
      } catch (error) {
        console.error('Error saving:', error);
        alert('Error saving the response. Please try again.');
      }
    });

    // Handle cancel button
    document.getElementById('cancelButton').addEventListener('click', () => {
      window.close();
    });

    // Handle Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.close();
      }
    });

    // Update source info display
    const sourceInfo = document.getElementById('sourceInfo');
    sourceInfo.textContent = decodeURIComponent(source);

    // Log for debugging
    console.log('Dialog initialized:', {
      source: decodeURIComponent(source),
      textLength: selectedText.length,
      url: decodeURIComponent(url)
    });

  } catch (error) {
    console.error('Error initializing save dialog:', error);
    alert('Error initializing save dialog. Please try again.');
    window.close();
  }
}); 