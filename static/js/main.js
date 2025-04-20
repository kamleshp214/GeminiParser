document.addEventListener('DOMContentLoaded', function() {
  // Initialize the dialog functionality
  initNameDialog();
  
  // Add event listeners for any dropdowns in the header
  document.querySelectorAll('.dropdown-toggle').forEach(dropdown => {
    dropdown.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('data-target'));
      if (target) {
        target.classList.toggle('active');
      }
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown-toggle') && !e.target.closest('.dropdown-menu')) {
      document.querySelectorAll('.dropdown-menu.active').forEach(menu => {
        menu.classList.remove('active');
      });
    }
  });
  
  // Modal functionality
  const modals = document.querySelectorAll('.modal');
  if (modals.length) {
    // Close modal when clicking close button or outside the modal
    modals.forEach(modal => {
      const closeBtn = modal.querySelector('.close-btn, #closeModalBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          modal.classList.remove('active');
        });
      }
      
      // Close when clicking outside
      modal.addEventListener('click', function(e) {
        if (e.target === this) {
          modal.classList.remove('active');
        }
      });
    });
    
    // Open modal when related buttons are clicked
    document.querySelectorAll('[data-modal]').forEach(btn => {
      btn.addEventListener('click', function() {
        const modalId = this.getAttribute('data-modal');
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.classList.add('active');
        }
      });
    });
  }
  
  // Tab functionality
  const tabBtns = document.querySelectorAll('.tab-btn');
  if (tabBtns.length) {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        // Remove active class from all tabs and content
        const tabsContainer = this.closest('.tabs');
        tabsContainer.querySelectorAll('.tab-btn').forEach(tab => {
          tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        this.classList.add('active');
        
        // Show related content
        const tabId = this.getAttribute('data-tab');
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
          content.classList.remove('active');
        });
        
        const activeContent = document.getElementById(tabId + 'Tab');
        if (activeContent) {
          activeContent.classList.add('active');
        }
      });
    });
  }
});

// Dialog functionality for name input
function initNameDialog() {
  const nameDialog = document.getElementById('nameDialog');
  if (!nameDialog) return;
  
  const submitNameBtn = document.getElementById('submitNameBtn');
  const cancelNameBtn = document.getElementById('cancelNameBtn');
  const nameInput = document.getElementById('nameInput');
  
  // Close dialog
  function closeDialog() {
    nameDialog.classList.remove('active');
  }
  
  // Show dialog
  window.showNameDialog = function() {
    nameDialog.classList.add('active');
    nameInput.focus();
  };
  
  // Submit name
  if (submitNameBtn) {
    submitNameBtn.addEventListener('click', function() {
      const name = nameInput.value;
      if (validateName(name)) {
        // Store the name in session/local storage or send to server
        sessionStorage.setItem('candidateName', name);
        
        // Trigger form submission if needed
        const form = document.getElementById('resumeForm');
        if (form && form.dataset.pendingSubmit === 'true') {
          form.dataset.pendingSubmit = 'false';
          const formData = new FormData(form);
          formData.append('candidate_name', name);
          submitResumeForm(formData);
        }
        
        closeDialog();
      } else {
        alert('Please enter a valid name (e.g., John Doe).');
      }
    });
  }
  
  // Handle Enter key in input
  if (nameInput) {
    nameInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        submitNameBtn.click();
      }
    });
  }
  
  // Cancel dialog
  if (cancelNameBtn) {
    cancelNameBtn.addEventListener('click', function() {
      nameInput.value = '';
      closeDialog();
      
      // If form was waiting to be submitted, submit without a name
      const form = document.getElementById('resumeForm');
      if (form && form.dataset.pendingSubmit === 'true') {
        form.dataset.pendingSubmit = 'false';
        submitResumeForm(new FormData(form));
      }
    });
  }
}

// Validate name format
function validateName(name) {
  // Name should be in format "First Last" with proper capitalization
  const namePattern = /^[A-Z][a-z]+ [A-Z][a-z]+$/;
  return namePattern.test(name);
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to generate a unique ID
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Helper function to truncate text
function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Add smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href !== '#') {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        window.scrollTo({
          top: target.offsetTop,
          behavior: 'smooth'
        });
      }
    }
  });
});