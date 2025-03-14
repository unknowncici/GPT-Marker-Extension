// Database configuration
const DB_NAME = 'AIResponsesDB';
const DB_VERSION = 1;
const STORE_NAME = 'responses';

// Initialize the database
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        
        // Create indexes for searching and filtering
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('source', 'source', { unique: false });
      }
    };
  });
}

// Database operations
const dbOperations = {
  async saveResponse(response) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.add({
        ...response,
        timestamp: new Date().toISOString()
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllResponses() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getResponsesByCategory(category) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('category');
      const request = index.getAll(category);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteResponse(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async findSimilarResponses(content, excludeId = null, limit = 3) {
    const db = await initDB();
    return new Promise(async (resolve, reject) => {
      try {
        const allResponses = await this.getAllResponses();
        
        if (!content || typeof content !== 'string') {
          throw new Error('Invalid content for similarity check');
        }

        // Calculate similarity scores with error handling
        const similarResponses = allResponses
          .filter(response => {
            try {
              return response.id !== excludeId && 
                     response.content && 
                     typeof response.content === 'string';
            } catch (error) {
              console.warn('Skipping invalid response:', error);
              return false;
            }
          })
          .map(response => {
            try {
              return {
                ...response,
                similarity: calculateSimilarity(content, response.content)
              };
            } catch (error) {
              console.warn('Error calculating similarity:', error);
              return { ...response, similarity: 0 };
            }
          })
          .filter(response => response.similarity > 0.2) // Lowered threshold
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit);

        resolve(similarResponses);
      } catch (error) {
        console.error('Error finding similar responses:', error);
        reject(error);
      }
    });
  },

  async testDB() {
    try {
      // Test save
      const testResponse = {
        title: "Test Note",
        content: "This is a test note",
        category: "Test",
        source: "Test Source",
        url: "http://test.com",
        timestamp: new Date().toISOString()
      };
      
      const id = await this.saveResponse(testResponse);
      console.log('Save successful, ID:', id);
      
      // Test retrieve
      const responses = await this.getAllResponses();
      console.log('Retrieved responses:', responses);
      
      // Test similar notes
      const similar = await this.findSimilarResponses(testResponse.content);
      console.log('Similar notes:', similar);
      
      return true;
    } catch (error) {
      console.error('DB Test failed:', error);
      return false;
    }
  }
};

// Add these helper functions outside dbOperations
function calculateSimilarity(text1, text2) {
  // Convert to word sets
  const words1 = new Set(tokenize(text1));
  const words2 = new Set(tokenize(text2));
  
  // Calculate Jaccard similarity
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/) // Split on whitespace
    .filter(word => word.length > 3); // Remove short words
}

export default dbOperations; 