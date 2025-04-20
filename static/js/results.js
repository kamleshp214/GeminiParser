document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const resumeGrid = document.getElementById('resumeGrid');
  const noResults = document.getElementById('noResults');
  const sortBtn = document.getElementById('sortBtn');
  const filterBtn = document.getElementById('filterBtn');
  const compareBtn = document.getElementById('compareBtn');
  const sortMenu = document.getElementById('sortMenu');
  const filterMenu = document.getElementById('filterMenu');
  const resumeModal = document.getElementById('resumeModal');
  
  // Check if there are resumes to display
  if (resumeGrid && resumeGrid.children.length === 0) {
    if (noResults) noResults.style.display = 'block';
    if (resumeGrid) resumeGrid.style.display = 'none';
  } else {
    if (noResults) noResults.style.display = 'none';
    if (resumeGrid) resumeGrid.style.display = 'grid';
  }
  
  // Sort button and menu
  if (sortBtn && sortMenu) {
    sortBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      // Position the menu
      const rect = sortBtn.getBoundingClientRect();
      sortMenu.style.top = (rect.bottom + window.scrollY) + 'px';
      sortMenu.style.left = rect.left + 'px';
      
      // Toggle menu visibility
      sortMenu.style.display = sortMenu.style.display === 'block' ? 'none' : 'block';
      // Hide other menus
      if (filterMenu) filterMenu.style.display = 'none';
    });
    
    // Sort functionality
    sortMenu.querySelectorAll('li').forEach(item => {
      item.addEventListener('click', function() {
        const sortBy = this.getAttribute('data-sort');
        sortResumes(sortBy);
        sortMenu.style.display = 'none';
      });
    });
  }
  
  // Filter button and menu
  if (filterBtn && filterMenu) {
    filterBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      // Position the menu
      const rect = filterBtn.getBoundingClientRect();
      filterMenu.style.top = (rect.bottom + window.scrollY) + 'px';
      filterMenu.style.left = rect.left + 'px';
      
      // Toggle menu visibility
      filterMenu.style.display = filterMenu.style.display === 'block' ? 'none' : 'block';
      // Hide other menus
      if (sortMenu) sortMenu.style.display = 'none';
    });
    
    // Apply filters
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', function() {
        applyFilters();
        filterMenu.style.display = 'none';
      });
    }
    
    // Clear filters
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', function() {
        clearFilters();
      });
    }
  }
  
  // Close menus when clicking outside
  document.addEventListener('click', function() {
    if (sortMenu) sortMenu.style.display = 'none';
    if (filterMenu) filterMenu.style.display = 'none';
  });
  
  // Prevent click propagation from menus
  [sortMenu, filterMenu].forEach(menu => {
    if (menu) {
      menu.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }
  });
  
  // "View" buttons for each resume card
  const viewButtons = document.querySelectorAll('.btn-view');
  if (viewButtons.length > 0) {
    viewButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const resumeId = this.getAttribute('data-id');
        openResumeModal(resumeId);
      });
    });
  }
  
  // "Export" buttons for each resume card
  const downloadButtons = document.querySelectorAll('.btn-download');
  if (downloadButtons.length > 0) {
    downloadButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const resumeId = this.getAttribute('data-id');
        exportResumeData(resumeId);
      });
    });
  }
  
  // Compare button functionality
  if (compareBtn) {
    compareBtn.addEventListener('click', function() {
      const selectedResumes = getSelectedResumes();
      if (selectedResumes.length < 2) {
        alert('Please select at least 2 resumes to compare.');
        return;
      }
      
      // Store selected resume IDs in session storage
      sessionStorage.setItem('compareResumes', JSON.stringify(selectedResumes));
      // Navigate to compare page
      window.location.href = '/compare';
    });
  }
  
  // Resume modal export button
  const exportResumeBtn = document.getElementById('exportResumeBtn');
  if (exportResumeBtn) {
    exportResumeBtn.addEventListener('click', function() {
      const resumeId = this.getAttribute('data-id');
      if (resumeId) {
        exportResumeData(resumeId);
      }
    });
  }
  
  // Support functions
  
  // Sort resumes
  function sortResumes(sortBy) {
    if (!resumeGrid) return;
    
    const cards = Array.from(resumeGrid.children);
    
    cards.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = a.querySelector('.resume-name').textContent.trim().toLowerCase();
          const nameB = b.querySelector('.resume-name').textContent.trim().toLowerCase();
          return nameA.localeCompare(nameB);
          
        case 'ats_score':
          const scoreA = parseInt(a.querySelector('.ats-score').getAttribute('data-score'));
          const scoreB = parseInt(b.querySelector('.ats-score').getAttribute('data-score'));
          return scoreB - scoreA; // High to low
          
        case 'date':
          // Assuming newer resumes are added to the end of the grid
          // So we reverse the order to get newest first
          return cards.indexOf(b) - cards.indexOf(a);
          
        default:
          return 0;
      }
    });
    
    // Remove all cards
    while (resumeGrid.firstChild) {
      resumeGrid.removeChild(resumeGrid.firstChild);
    }
    
    // Add sorted cards back
    cards.forEach(card => {
      resumeGrid.appendChild(card);
    });
  }
  
  // Apply filters
  function applyFilters() {
    if (!resumeGrid) return;
    
    // Get selected job roles
    const selectedRoles = Array.from(
      filterMenu.querySelectorAll('.filter-group:nth-child(1) input:checked')
    ).map(input => input.value);
    
    // Get selected ATS score ranges
    const selectedScores = Array.from(
      filterMenu.querySelectorAll('.filter-group:nth-child(2) input:checked')
    ).map(input => input.value);
    
    // Apply filters to each card
    const cards = Array.from(resumeGrid.children);
    let visibleCount = 0;
    
    cards.forEach(card => {
      const jobRole = card.getAttribute('data-job-role');
      const atsScore = parseInt(card.getAttribute('data-ats-score'));
      
      let showByRole = selectedRoles.length === 0 || selectedRoles.includes(jobRole);
      let showByScore = selectedScores.length === 0;
      
      // Check score ranges
      if (!showByScore) {
        for (const rangeStr of selectedScores) {
          if (rangeStr === '90-100' && atsScore >= 90 && atsScore <= 100) {
            showByScore = true;
            break;
          } else if (rangeStr === '75-89' && atsScore >= 75 && atsScore <= 89) {
            showByScore = true;
            break;
          } else if (rangeStr === '60-74' && atsScore >= 60 && atsScore <= 74) {
            showByScore = true;
            break;
          } else if (rangeStr === '0-59' && atsScore < 60) {
            showByScore = true;
            break;
          }
        }
      }
      
      // Show or hide the card
      if (showByRole && showByScore) {
        card.style.display = 'block';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });
    
    // Show "No Results" if all cards are filtered out
    if (visibleCount === 0) {
      if (noResults) {
        noResults.style.display = 'block';
        noResults.querySelector('h3').textContent = 'No Matching Resumes';
        noResults.querySelector('p').textContent = 'Try adjusting your filters to see more resumes.';
      }
    } else {
      if (noResults) noResults.style.display = 'none';
    }
  }
  
  // Clear filters
  function clearFilters() {
    if (!filterMenu) return;
    
    // Uncheck all filter checkboxes
    filterMenu.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false;
    });
    
    // Show all cards
    if (resumeGrid) {
      Array.from(resumeGrid.children).forEach(card => {
        card.style.display = 'block';
      });
    }
    
    // Hide "No Results" message
    if (noResults) noResults.style.display = 'none';
  }
  
  // Get selected resumes
  function getSelectedResumes() {
    const checkboxes = document.querySelectorAll('.resume-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => checkbox.getAttribute('data-id'));
  }
  
  // Open resume modal
  function openResumeModal(resumeId) {
    if (!resumeModal) return;
    
    // Make AJAX request to get resume data
    fetch(`/api/resumes/${resumeId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch resume data');
        }
        return response.json();
      })
      .then(data => {
        // Populate modal with resume data
        populateResumeModal(data, resumeId);
        // Show modal
        resumeModal.classList.add('active');
      })
      .catch(error => {
        console.error('Error fetching resume data:', error);
        alert('Failed to load resume details. Please try again.');
      });
  }
  
  // Populate resume modal with data
  function populateResumeModal(data, resumeId) {
    // Store resume ID for export button
    if (exportResumeBtn) {
      exportResumeBtn.setAttribute('data-id', resumeId);
    }
    
    // Basic info
    document.getElementById('modalResumeTitle').textContent = `Resume Details: ${data.name}`;
    document.getElementById('modalName').textContent = data.name || 'N/A';
    document.getElementById('modalJobRole').textContent = data.job_role || 'N/A';
    document.getElementById('modalEmail').textContent = data.email || 'N/A';
    document.getElementById('modalPhone').textContent = data.phone || 'N/A';
    
    // ATS Score
    document.getElementById('modalAtsScore').textContent = data.ats_score || 'N/A';
    document.getElementById('modalChartScore').textContent = data.ats_score || 'N/A';
    
    // Set score as CSS variable for circle charts
    document.documentElement.style.setProperty('--score', data.ats_score || 0);
    
    // Education summary
    const eduSummary = document.getElementById('modalEducationSummary');
    if (eduSummary) {
      if (data.education && data.education.length > 0) {
        eduSummary.innerHTML = data.education.map(edu => `
          <div class="summary-item">
            <div class="item-title">${edu.degree || 'N/A'}</div>
            <div class="item-subtitle">${edu.institution || 'N/A'}</div>
            <div class="item-meta">${edu.year || 'N/A'}</div>
          </div>
        `).join('');
      } else {
        eduSummary.innerHTML = '<p>No education information found.</p>';
      }
    }
    
    // Experience summary
    const expSummary = document.getElementById('modalExperienceSummary');
    if (expSummary) {
      if (data.experience && data.experience.length > 0) {
        expSummary.innerHTML = data.experience.map(exp => `
          <div class="summary-item">
            <div class="item-title">${exp.title || 'N/A'}</div>
            <div class="item-subtitle">${exp.company || 'N/A'}</div>
            <div class="item-meta">${exp.dates || 'N/A'}</div>
          </div>
        `).join('');
      } else {
        expSummary.innerHTML = '<p>No experience information found.</p>';
      }
    }
    
    // Skills summary
    const skillsSummary = document.getElementById('modalSkillsSummary');
    if (skillsSummary) {
      if (data.skills && data.skills.length > 0) {
        skillsSummary.innerHTML = data.skills.map(skill => 
          `<span class="skill-tag">${skill}</span>`
        ).join('');
      } else {
        skillsSummary.innerHTML = '<p>No skills found.</p>';
      }
    }
    
    // Education details
    const eduDetails = document.getElementById('modalEducationDetails');
    if (eduDetails) {
      if (data.education && data.education.length > 0) {
        eduDetails.innerHTML = data.education.map(edu => `
          <div class="detail-card">
            <h5>${edu.degree || 'N/A'}</h5>
            <div class="detail-info">
              <div class="info-label">Institution:</div>
              <div class="info-value">${edu.institution || 'N/A'}</div>
            </div>
            <div class="detail-info">
              <div class="info-label">Year:</div>
              <div class="info-value">${edu.year || 'N/A'}</div>
            </div>
          </div>
        `).join('');
      } else {
        eduDetails.innerHTML = '<p>No education information found.</p>';
      }
    }
    
    // Experience details
    const expDetails = document.getElementById('modalExperienceDetails');
    if (expDetails) {
      if (data.experience && data.experience.length > 0) {
        expDetails.innerHTML = data.experience.map(exp => `
          <div class="detail-card">
            <h5>${exp.title || 'N/A'}</h5>
            <div class="detail-info">
              <div class="info-label">Company:</div>
              <div class="info-value">${exp.company || 'N/A'}</div>
            </div>
            <div class="detail-info">
              <div class="info-label">Duration:</div>
              <div class="info-value">${exp.dates || 'N/A'}</div>
            </div>
            <div class="detail-info">
              <div class="info-label">Responsibilities:</div>
              <div class="info-value">${exp.responsibilities || 'N/A'}</div>
            </div>
          </div>
        `).join('');
      } else {
        expDetails.innerHTML = '<p>No experience information found.</p>';
      }
    }
    
    // Skills details
    const skillsDetails = document.getElementById('modalSkillsDetails');
    if (skillsDetails) {
      if (data.skills && data.skills.length > 0) {
        skillsDetails.innerHTML = data.skills.map(skill => 
          `<span class="skill-tag">${skill}</span>`
        ).join('');
      } else {
        skillsDetails.innerHTML = '<p>No skills found.</p>';
      }
    }
    
    // Certifications
    const certifications = document.getElementById('modalCertifications');
    if (certifications) {
      if (data.certifications && data.certifications.length > 0) {
        certifications.innerHTML = data.certifications.map(cert => 
          `<div class="certification-item">${cert}</div>`
        ).join('');
      } else {
        certifications.innerHTML = '<p>No certifications found.</p>';
      }
    }
    
    // Suggestions
    const suggestions = document.getElementById('modalSuggestions');
    if (suggestions) {
      if (data.suggestions && data.suggestions.length > 0) {
        suggestions.innerHTML = data.suggestions.map(suggestion => 
          `<li>${suggestion}</li>`
        ).join('');
      } else {
        suggestions.innerHTML = '<li>No specific suggestions available.</li>';
      }
    }
  }
  
  // Export resume data as JSON
  function exportResumeData(resumeId) {
    fetch(`/api/resumes/${resumeId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch resume data');
        }
        return response.json();
      })
      .then(data => {
        // Create JSON string
        const jsonStr = JSON.stringify(data, null, 2);
        
        // Create file blob
        const blob = new Blob([jsonStr], { type: 'application/json' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `resume_${data.name.replace(/\s+/g, '_')}.json`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => {
        console.error('Error exporting resume data:', error);
        alert('Failed to export resume data. Please try again.');
      });
  }
});