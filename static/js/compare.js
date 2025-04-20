document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const noCompare = document.getElementById('noCompare');
  const compareTableContainer = document.getElementById('compareTableContainer');
  const compareTable = document.getElementById('compareTable');
  const selectResumesBtn = document.getElementById('selectResumesBtn');
  const addResumeBtn = document.getElementById('addResumeBtn');
  const resumeSelectionModal = document.getElementById('resumeSelectionModal');
  const resumeSelectionList = document.getElementById('resumeSelectionList');
  const confirmSelectionBtn = document.getElementById('confirmSelectionBtn');
  const cancelSelectionBtn = document.getElementById('cancelSelectionBtn');
  const exportComparisonBtn = document.getElementById('exportComparisonBtn');
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  // Check if there are selected resumes from the results page
  let selectedResumeIds = [];
  try {
    const storedIds = sessionStorage.getItem('compareResumes');
    if (storedIds) {
      selectedResumeIds = JSON.parse(storedIds);
    }
  } catch (e) {
    console.error('Failed to parse stored resume IDs:', e);
  }
  
  // Initialize page
  initComparePage();
  
  // Initialize function
  function initComparePage() {
    if (selectedResumeIds.length >= 2) {
      // Fetch and display selected resumes
      fetchSelectedResumes(selectedResumeIds);
    } else {
      // Show empty state
      if (noCompare) noCompare.style.display = 'block';
      if (compareTableContainer) compareTableContainer.style.display = 'none';
    }
  }
  
  // Select resumes button
  if (selectResumesBtn) {
    selectResumesBtn.addEventListener('click', function() {
      showResumeSelectionModal();
    });
  }
  
  // Add resume button
  if (addResumeBtn) {
    addResumeBtn.addEventListener('click', function() {
      showResumeSelectionModal();
    });
  }
  
  // Confirm selection button
  if (confirmSelectionBtn) {
    confirmSelectionBtn.addEventListener('click', function() {
      const checkedResumes = Array.from(
        resumeSelectionList.querySelectorAll('input[type="checkbox"]:checked')
      ).map(checkbox => checkbox.value);
      
      if (checkedResumes.length < 2) {
        alert('Please select at least 2 resumes to compare.');
        return;
      }
      
      if (checkedResumes.length > 3) {
        alert('Please select a maximum of 3 resumes to compare.');
        return;
      }
      
      // Update selected resumes and refresh
      selectedResumeIds = checkedResumes;
      sessionStorage.setItem('compareResumes', JSON.stringify(selectedResumeIds));
      
      // Close modal
      resumeSelectionModal.classList.remove('active');
      
      // Fetch and display selected resumes
      fetchSelectedResumes(selectedResumeIds);
    });
  }
  
  // Cancel selection button
  if (cancelSelectionBtn) {
    cancelSelectionBtn.addEventListener('click', function() {
      resumeSelectionModal.classList.remove('active');
    });
  }
  
  // Close modal when clicking outside
  if (resumeSelectionModal) {
    resumeSelectionModal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('active');
      }
    });
  }
  
  // Filter buttons
  if (filterBtns.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        // Remove active class from all filter buttons
        filterBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        this.classList.add('active');
        
        // Apply filter
        const filter = this.getAttribute('data-filter');
        filterComparison(filter);
      });
    });
  }
  
  // Export comparison button
  if (exportComparisonBtn) {
    exportComparisonBtn.addEventListener('click', function() {
      exportComparisonData();
    });
  }
  
  // Show resume selection modal
  function showResumeSelectionModal() {
    if (!resumeSelectionModal || !resumeSelectionList) return;
    
    // Fetch all resumes to populate modal
    fetch('/api/resumes')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch resumes');
        }
        return response.json();
      })
      .then(resumes => {
        // Clear selection list
        resumeSelectionList.innerHTML = '';
        
        // Add resume selection items
        resumes.forEach((resume, index) => {
          const isSelected = selectedResumeIds.includes(index.toString());
          
          const item = document.createElement('div');
          item.className = 'resume-selection-item';
          item.innerHTML = `
            <input type="checkbox" id="select-resume-${index}" value="${index}" ${isSelected ? 'checked' : ''}>
            <div class="selection-details">
              <div class="selection-name">${resume.name || 'Unnamed Resume'}</div>
              <div class="selection-info">
                ${resume.job_role || 'N/A'} | ATS Score: ${resume.ats_score || 'N/A'}
              </div>
            </div>
          `;
          
          resumeSelectionList.appendChild(item);
        });
        
        // Show modal
        resumeSelectionModal.classList.add('active');
      })
      .catch(error => {
        console.error('Error fetching resumes:', error);
        alert('Failed to load resumes. Please try again.');
      });
  }
  
  // Fetch selected resumes
  function fetchSelectedResumes(resumeIds) {
    if (!compareTable) return;
    
    fetch('/api/compare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resume_ids: resumeIds }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch comparison data');
        }
        return response.json();
      })
      .then(resumes => {
        // Build comparison table
        buildComparisonTable(resumes);
        
        // Show comparison view
        if (noCompare) noCompare.style.display = 'none';
        if (compareTableContainer) compareTableContainer.style.display = 'block';
      })
      .catch(error => {
        console.error('Error fetching comparison data:', error);
        alert('Failed to load comparison data. Please try again.');
      });
  }
  
  // Build comparison table
  function buildComparisonTable(resumes) {
    if (!compareTable) return;
    
    // Get table head
    const thead = compareTable.querySelector('thead tr');
    
    // Clear existing columns (except the first one)
    while (thead.children.length > 1) {
      thead.removeChild(thead.lastChild);
    }
    
    // Add resume columns
    resumes.forEach(resume => {
      const th = document.createElement('th');
      th.textContent = resume.name || 'Unnamed Resume';
      thead.appendChild(th);
    });
    
    // Get table rows
    const rows = compareTable.querySelectorAll('tbody tr.data-row');
    
    // Process each row
    rows.forEach(row => {
      // Clear existing data cells
      while (row.children.length > 1) {
        row.removeChild(row.lastChild);
      }
      
      // Get category from the row
      const category = row.querySelector('.category-column').textContent;
      
      // Add data for each resume
      resumes.forEach(resume => {
        const td = document.createElement('td');
        
        // Fill data based on category
        switch (category) {
          case 'Name':
            td.textContent = resume.name || 'N/A';
            break;
            
          case 'Job Role':
            td.textContent = resume.job_role || 'N/A';
            break;
            
          case 'Contact':
            td.innerHTML = `
              <div>${resume.email || 'N/A'}</div>
              <div>${resume.phone || 'N/A'}</div>
            `;
            break;
            
          case 'Degree':
            if (resume.education && resume.education.length > 0) {
              td.textContent = resume.education[0].degree || 'N/A';
            } else {
              td.textContent = 'N/A';
            }
            break;
            
          case 'Institution':
            if (resume.education && resume.education.length > 0) {
              td.textContent = resume.education[0].institution || 'N/A';
            } else {
              td.textContent = 'N/A';
            }
            break;
            
          case 'Year':
            if (resume.education && resume.education.length > 0) {
              td.textContent = resume.education[0].year || 'N/A';
            } else {
              td.textContent = 'N/A';
            }
            break;
            
          case 'Latest Position':
            if (resume.experience && resume.experience.length > 0) {
              td.textContent = resume.experience[0].title || 'N/A';
            } else {
              td.textContent = 'N/A';
            }
            break;
            
          case 'Company':
            if (resume.experience && resume.experience.length > 0) {
              td.textContent = resume.experience[0].company || 'N/A';
            } else {
              td.textContent = 'N/A';
            }
            break;
            
          case 'Duration':
            if (resume.experience && resume.experience.length > 0) {
              td.textContent = resume.experience[0].dates || 'N/A';
            } else {
              td.textContent = 'N/A';
            }
            break;
            
          case 'Technical Skills':
            if (resume.skills && resume.skills.length > 0) {
              td.innerHTML = resume.skills.map(skill => 
                `<span class="skill-tag">${skill}</span>`
              ).join('');
            } else {
              td.textContent = 'N/A';
            }
            break;
            
          case 'Certifications':
            if (resume.certifications && resume.certifications.length > 0) {
              td.innerHTML = resume.certifications.map(cert => 
                `<div>${cert}</div>`
              ).join('');
            } else {
              td.textContent = 'N/A';
            }
            break;
            
          case 'ATS Score':
            const scoreClass = 
              resume.ats_score >= 90 ? 'excellent' :
              resume.ats_score >= 75 ? 'good' :
              resume.ats_score >= 60 ? 'average' : 'poor';
            
            td.innerHTML = `
              <div class="compare-score ${scoreClass}">
                <span>${resume.ats_score || 'N/A'}</span>
              </div>
            `;
            break;
            
          case 'Top Suggestions':
            if (resume.suggestions && resume.suggestions.length > 0) {
              td.innerHTML = resume.suggestions.slice(0, 3).map(suggestion => 
                `<div class="suggestion-item">${suggestion}</div>`
              ).join('');
            } else {
              td.textContent = 'N/A';
            }
            break;
            
          default:
            td.textContent = 'N/A';
        }
        
        row.appendChild(td);
      });
    });
  }
  
  // Filter comparison table
  function filterComparison(filter) {
    if (!compareTable) return;
    
    const rows = compareTable.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
      const section = row.getAttribute('data-section');
      
      if (filter === 'all' || section === filter) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }
  
  // Export comparison data
  function exportComparisonData() {
    fetch('/api/compare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resume_ids: selectedResumeIds }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch comparison data');
        }
        return response.json();
      })
      .then(resumes => {
        // Create comparison object
        const comparisonData = {
          date: new Date().toISOString(),
          resumes: resumes,
        };
        
        // Create JSON string
        const jsonStr = JSON.stringify(comparisonData, null, 2);
        
        // Create file blob
        const blob = new Blob([jsonStr], { type: 'application/json' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `resume_comparison_${new Date().toISOString().slice(0, 10)}.json`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => {
        console.error('Error exporting comparison data:', error);
        alert('Failed to export comparison data. Please try again.');
      });
  }
});