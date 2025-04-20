document.addEventListener('DOMContentLoaded', function() {
  // References to DOM elements
  const resumeForm = document.getElementById('resumeForm');
  const jobRoleSelect = document.getElementById('jobRole');
  const fileInput = document.getElementById('resumeFile');
  const dropArea = document.getElementById('dropArea');
  const fileInfo = document.getElementById('fileInfo');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const removeFileBtn = document.getElementById('removeFile');
  const uploadBtn = document.getElementById('uploadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const uploadProgress = document.getElementById('uploadProgress');
  const progressBar = document.querySelector('.progress-bar-fill');
  const progressPercent = document.getElementById('progressPercent');
  const uploadResult = document.getElementById('uploadResult');
  const resultTitle = document.getElementById('resultTitle');
  const resultMessage = document.getElementById('resultMessage');
  const viewResultsBtn = document.getElementById('viewResultsBtn');
  const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');
  
  // Initialize form state
  let selectedFile = null;
  
  // File drag and drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight() {
    dropArea.classList.add('dragover');
  }
  
  function unhighlight() {
    dropArea.classList.remove('dragover');
  }
  
  // Handle file drop
  dropArea.addEventListener('drop', handleDrop, false);
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length) {
      handleFileSelect(files[0]);
    }
  }
  
  // Handle file input change
  fileInput.addEventListener('change', function(e) {
    if (this.files.length) {
      handleFileSelect(this.files[0]);
    }
  });
  
  // Handle file selection
  function handleFileSelect(file) {
    // Check file type
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(fileExt)) {
      showError('Invalid file format. Please upload PDF, DOCX, or TXT files only.');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('File size exceeds the 5MB limit. Please upload a smaller file.');
      return;
    }
    
    // Update UI to show selected file
    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.style.display = 'flex';
    dropArea.style.display = 'none';
    uploadBtn.disabled = false;
  }
  
  // Remove selected file
  removeFileBtn.addEventListener('click', function() {
    resetFileSelection();
  });
  
  // Reset button
  resetBtn.addEventListener('click', function() {
    resetForm();
  });
  
  // Reset file selection
  function resetFileSelection() {
    selectedFile = null;
    fileInput.value = '';
    fileInfo.style.display = 'none';
    dropArea.style.display = 'block';
    uploadBtn.disabled = true;
  }
  
  // Reset entire form
  function resetForm() {
    resetFileSelection();
    jobRoleSelect.selectedIndex = 0;
    uploadProgress.style.display = 'none';
    uploadResult.style.display = 'none';
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
  }
  
  // Form submission
  resumeForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!selectedFile) {
      showError('Please select a file to upload.');
      return;
    }
    
    // Set form as pending submit (will be triggered after name dialog)
    this.dataset.pendingSubmit = 'true';
    
    // Show the name dialog
    window.showNameDialog();
  });
  
  // Submit the form with optional name
  window.submitResumeForm = function(formData) {
    // Add file and job role to form data if not already added
    if (!formData.has('resume')) {
      formData.append('resume', selectedFile);
    }
    if (!formData.has('job_role')) {
      formData.append('job_role', jobRoleSelect.value);
    }
    
    // Show progress UI
    uploadProgress.style.display = 'block';
    
    // Create and execute AJAX request
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    
    // Track upload progress
    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = percentComplete + '%';
        progressPercent.textContent = percentComplete + '%';
      }
    };
    
    // Handle response
    xhr.onload = function() {
      if (xhr.status === 200) {
        // Success
        const response = JSON.parse(xhr.responseText);
        showSuccess(response);
      } else {
        // Error
        try {
          const response = JSON.parse(xhr.responseText);
          showError(response.error || 'Failed to upload file. Please try again.');
        } catch (e) {
          showError('An unexpected error occurred. Please try again.');
        }
      }
    };
    
    // Handle network errors
    xhr.onerror = function() {
      showError('Network error. Please check your connection and try again.');
    };
    
    // Send the form data
    xhr.send(formData);
  };
  
  // Show success message
  function showSuccess(response) {
    uploadProgress.style.display = 'none';
    uploadResult.style.display = 'block';
    uploadResult.classList.add('success');
    uploadResult.classList.remove('error');
    
    resultTitle.textContent = 'Resume Uploaded Successfully!';
    resultMessage.textContent = 'Your resume has been parsed and analyzed.';
    
    // Set up the "View Results" button to navigate to the results page
    viewResultsBtn.href = '/results';
    // Remove any previous click handlers
    const newViewBtn = viewResultsBtn.cloneNode(true);
    viewResultsBtn.parentNode.replaceChild(newViewBtn, viewResultsBtn);
    // Add a robust click handler to ensure navigation
    newViewBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = '/results';
    });
    // Store resume ID in session storage if needed
    if (response.resume_id !== undefined) {
      sessionStorage.setItem('lastResumeId', response.resume_id);
    }
  }
  
  // Show error message
  function showError(message) {
    uploadProgress.style.display = 'none';
    uploadResult.style.display = 'block';
    uploadResult.classList.add('error');
    uploadResult.classList.remove('success');
    
    resultTitle.textContent = 'Upload Failed';
    resultMessage.textContent = message;
    
    // Change button text
    viewResultsBtn.textContent = 'Try Again';
    viewResultsBtn.href = '#';
    viewResultsBtn.addEventListener('click', function(e) {
      e.preventDefault();
      uploadResult.style.display = 'none';
      
      // Reset upload progress
      progressBar.style.width = '0%';
      progressPercent.textContent = '0%';
    });
  }
  
  // Handle "Upload Another" button
  uploadAnotherBtn.addEventListener('click', function() {
    resetForm();
  });
});