import dbOperations from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('responses-container');
  const searchBar = document.querySelector('.search-bar');
  let savedResponses = [];

  async function loadResponses(searchTerm = '') {
    try {
      savedResponses = await dbOperations.getAllResponses();
      
      if (savedResponses.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>No saved responses yet</p>
            <p>Right-click on any text to save it</p>
          </div>`;
        return;
      }

      const filteredResponses = searchTerm 
        ? savedResponses.filter(response => 
            response.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            response.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            response.content.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : savedResponses;

      container.innerHTML = '';
      
      filteredResponses
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .forEach(response => {
          const responseElement = createResponseElement(response);
          container.appendChild(responseElement);
        });

      // Add event listeners for copy and delete buttons
      document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const response = savedResponses.find(r => r.id === parseInt(e.target.dataset.id));
          await navigator.clipboard.writeText(response.content);
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = 'Copy', 2000);
        });
      });

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          if (confirm('Are you sure you want to delete this response?')) {
            await dbOperations.deleteResponse(parseInt(e.target.dataset.id));
            loadResponses(searchBar.value);
          }
        });
      });
    } catch (error) {
      console.error('Error loading responses:', error);
      container.innerHTML = '<p class="empty-state">Error loading responses</p>';
    }
  }

  function createResponseElement(response) {
    const responseElement = document.createElement('div');
    responseElement.className = 'response-item';
    
    // Add the main content
    responseElement.innerHTML = `
      <h3 class="response-title">${response.title}</h3>
      <div class="meta-info">
        <span class="category-tag">${response.category}</span>
        <span class="source-tag">${response.source} • ${new Date(response.timestamp).toLocaleDateString()}</span>
      </div>
      <p class="content-preview">${response.content.substring(0, 150)}${response.content.length > 150 ? '...' : ''}</p>
      <div class="related-notes"></div>
      <div class="actions">
        <button class="action-button copy-btn" data-id="${response.id}">Copy</button>
        <button class="action-button delete-btn" data-id="${response.id}">Delete</button>
        <button class="action-button show-related-btn" data-id="${response.id}">Show Related</button>
      </div>
    `;

    // Add click handler for showing related notes
    const showRelatedBtn = responseElement.querySelector('.show-related-btn');
    const relatedNotesContainer = responseElement.querySelector('.related-notes');
    
    showRelatedBtn.addEventListener('click', async () => {
      try {
        const similarResponses = await dbOperations.findSimilarResponses(response.content, response.id);
        
        if (similarResponses.length === 0) {
          relatedNotesContainer.innerHTML = '<p class="no-related">No related notes found</p>';
          return;
        }

        relatedNotesContainer.innerHTML = `
          <h4>Related Notes</h4>
          ${similarResponses.map(similar => `
            <div class="related-note" data-id="${similar.id}">
              <span class="related-title">${similar.title}</span>
              <span class="similarity-score">${Math.round(similar.similarity * 100)}% match</span>
            </div>
          `).join('')}
        `;

        // Add click handlers for related notes
        relatedNotesContainer.querySelectorAll('.related-note').forEach(note => {
          note.addEventListener('click', () => {
            const relatedResponse = similarResponses.find(r => r.id === parseInt(note.dataset.id));
            showNoteDetail(relatedResponse);
          });
        });
      } catch (error) {
        console.error('Error finding related notes:', error);
      }
    });

    return responseElement;
  }

  // Add this function to show note details
  function showNoteDetail(response) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>${response.title}</h3>
        <div class="meta-info">
          <span class="category-tag">${response.category}</span>
          <span class="source-tag">${response.source} • ${new Date(response.timestamp).toLocaleDateString()}</span>
        </div>
        <div class="full-content">${response.content}</div>
        <button class="close-modal">Close</button>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.remove();
    });
  }

  // Initial load
  await loadResponses();

  // Search functionality
  searchBar.addEventListener('input', (e) => {
    loadResponses(e.target.value);
  });
}); 