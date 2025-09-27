const { ipcRenderer } = require('electron');
const { marked } = require('marked');
const { countTokens } = require('gpt-tokenizer');

// Configure marked to handle line breaks properly
marked.setOptions({
  breaks: true,    // Convert single line breaks to <br> tags
  gfm: true,       // Enable GitHub Flavored Markdown
  sanitize: false, // Allow HTML (needed for proper rendering)
  smartypants: false
});

let currentChatExamples = [];
let currentExampleIndex = 0;
let filteredChatExamples = [];
let isSearchActive = false;
let currentSearchTerm = '';

// Helper function to unescape Unicode sequences
function unescapeUnicode(text) {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

// Function to count tokens in a message using o200k_base encoding
function countMessageTokens(text) {
  try {
    // Unescape Unicode sequences before tokenizing
    const unescapedText = unescapeUnicode(text);
    // Use o200k_base encoding (GPT-4 tokenizer)
    return countTokens(unescapedText, 'o200k_base');
  } catch (error) {
    console.warn('Failed to count tokens:', error);
    return 0;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loadButton = document.getElementById('load-button');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const searchInput = document.getElementById('search-input');
  const clearSearchButton = document.getElementById('clear-search');

  loadButton.addEventListener('click', loadChatFile);
  prevButton.addEventListener('click', showPreviousExample);
  nextButton.addEventListener('click', showNextExample);
  searchInput.addEventListener('input', handleSearch);
  clearSearchButton.addEventListener('click', clearSearch);
});

async function loadChatFile() {
  currentChatExamples = await ipcRenderer.invoke('open-file');
  currentExampleIndex = 0;
  displayCurrentExample();
}

function displayCurrentExample() {
  const chatContainer = document.querySelector('.chat-container');
  chatContainer.innerHTML = '';

  const currentDataset = getCurrentDataset();
  if (currentDataset.length === 0) {
    chatContainer.innerHTML = '<div class="text-center text-base-content/60 py-8">No examples to display</div>';
    return;
  }

  const currentExample = currentDataset[currentExampleIndex];
  
  currentExample.messages.forEach((message, messageIndex) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat ${message.role === 'user' ? 'chat-end' : 'chat-start'} mb-4`;
    
    let bubbleClass = 'chat-bubble';
    switch(message.role) {
      case 'user':
        bubbleClass += ' chat-bubble-primary';
        break;
      case 'assistant':
        bubbleClass += ' chat-bubble-secondary';
        break;
      case 'system':
        bubbleClass += ' chat-bubble-accent';
        break;
    }

    // Unescape Unicode sequences before markdown processing and token counting
    const unescapedContent = unescapeUnicode(message.content);
    const parsedContent = marked.parse(unescapedContent);
    
    // Count tokens for this message
    const tokenCount = countMessageTokens(message.content);
    const tokenDisplay = tokenCount > 0 ? ` • ${tokenCount} tokens` : '';
    
    // Special handling for system messages - make them collapsible
    if (message.role === 'system') {
      const messageId = `system-message-${currentExampleIndex}-${messageIndex}`;
      messageDiv.innerHTML = `
        <div class="chat-header opacity-50 mb-1">${message.role}${tokenDisplay}</div>
        <div class="${bubbleClass}">
          <div class="system-message-container">
            <div class="system-message-content collapsed" id="${messageId}">
              ${parsedContent}
            </div>
            <button class="system-message-toggle btn btn-ghost btn-xs mt-2" 
                    onclick="toggleSystemMessage('${messageId}')" 
                    id="toggle-${messageId}">
              <span class="toggle-text">Show more</span>
              <svg class="w-3 h-3 ml-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="chat-header opacity-50 mb-1">${message.role}${tokenDisplay}</div>
        <div class="${bubbleClass}">
          ${parsedContent}
        </div>
      `;
    }
    
    chatContainer.appendChild(messageDiv);
  });
}

function showPreviousExample() {
  const currentDataset = getCurrentDataset();
  if (currentExampleIndex > 0) {
    currentExampleIndex--;
    displayCurrentExample();
    if (isSearchActive) {
      updateSearchStatus();
    }
    // Scroll to top
    scrollToTop();
  }
}

function showNextExample() {
  const currentDataset = getCurrentDataset();
  if (currentExampleIndex < currentDataset.length - 1) {
    currentExampleIndex++;
    displayCurrentExample();
    if (isSearchActive) {
      updateSearchStatus();
    }
    // Scroll to top
    scrollToTop();
  }
}

function scrollToTop() {
  // Try multiple approaches to ensure scroll works
  
  // 1. Try to find the main scrollable container
  const scrollContainer = document.querySelector('.flex-1.overflow-y-auto');
  if (scrollContainer) {
    scrollContainer.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
  
  // 2. Also scroll the window itself as a fallback
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
  
  // 3. Try scrolling the document body
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}

function toggleSystemMessage(messageId) {
  const messageElement = document.getElementById(messageId);
  const toggleButton = document.getElementById(`toggle-${messageId}`);
  const toggleText = toggleButton.querySelector('.toggle-text');
  const toggleIcon = toggleButton.querySelector('svg');
  
  if (messageElement.classList.contains('collapsed')) {
    // Expand the message
    messageElement.classList.remove('collapsed');
    messageElement.classList.add('expanded');
    toggleText.textContent = 'Show less';
    toggleIcon.style.transform = 'rotate(180deg)';
  } else {
    // Collapse the message
    messageElement.classList.remove('expanded');
    messageElement.classList.add('collapsed');
    toggleText.textContent = 'Show more';
    toggleIcon.style.transform = 'rotate(0deg)';
  }
}

// Search functionality
function handleSearch(event) {
  const searchTerm = event.target.value.trim();
  currentSearchTerm = searchTerm;
  
  if (searchTerm === '') {
    clearSearch();
    return;
  }
  
  // Filter examples that contain the search term
  filteredChatExamples = currentChatExamples.filter((example, index) => {
    return example.messages.some(message => {
      const unescapedContent = unescapeUnicode(message.content);
      return unescapedContent.toLowerCase().includes(searchTerm.toLowerCase());
    });
  });
  
  // Update search state
  isSearchActive = true;
  currentExampleIndex = 0;
  
  // Update UI
  updateSearchStatus();
  displayCurrentExample();
  
  // Show clear button
  document.getElementById('clear-search').style.display = 'block';
}

function clearSearch() {
  const searchInput = document.getElementById('search-input');
  searchInput.value = '';
  currentSearchTerm = '';
  isSearchActive = false;
  filteredChatExamples = [];
  currentExampleIndex = 0;
  
  // Hide search status and clear button
  document.getElementById('search-status').style.display = 'none';
  document.getElementById('clear-search').style.display = 'none';
  
  // Refresh display
  displayCurrentExample();
}

function updateSearchStatus() {
  const searchStatus = document.getElementById('search-status');
  
  if (isSearchActive) {
    if (filteredChatExamples.length === 0) {
      searchStatus.textContent = 'No matches found';
    } else {
      searchStatus.textContent = `${currentExampleIndex + 1} of ${filteredChatExamples.length} matches`;
    }
    searchStatus.style.display = 'block';
  } else {
    searchStatus.style.display = 'none';
  }
}

// Get the currently active dataset (filtered or all)
function getCurrentDataset() {
  return isSearchActive ? filteredChatExamples : currentChatExamples;
}
