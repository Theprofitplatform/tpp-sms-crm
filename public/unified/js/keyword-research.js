/**
 * Keyword Research Module
 * Handles all keyword research functionality
 */

// Load keyword projects when section becomes active
async function loadKeywordProjects() {
  try {
    const response = await fetch('/api/keyword/projects');
    const data = await response.json();

    if (data.success) {
      displayKeywordProjects(data.projects);
      loadKeywordStats();
    } else {
      showToast('Failed to load projects: ' + data.error, 'error');
    }
  } catch (error) {
    console.error('Error loading keyword projects:', error);
    document.getElementById('keywordProjectsContainer').innerHTML = `
      <p class="text-muted" style="text-align:center;padding:20px;">
        ⚠️ Keyword service unavailable. Please ensure the Python service is running on port 5000.
      </p>
    `;
  }
}

function displayKeywordProjects(projects) {
  const container = document.getElementById('keywordProjectsContainer');

  if (projects.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <p class="text-muted">No research projects yet.</p>
        <button class="btn btn-primary" onclick="openNewResearchModal()" style="margin-top:20px;">
          Create Your First Project
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;">
      ${projects.map(project => `
        <div class="card" style="cursor:pointer;transition:transform 0.2s;"
             onclick="viewKeywordProject(${project.id})"
             onmouseover="this.style.transform='translateY(-2px)'"
             onmouseout="this.style.transform='translateY(0)'">
          <h4>${project.name}</h4>
          <div style="display:flex;gap:15px;margin:10px 0;font-size:14px;color:#666;">
            <span>📅 ${new Date(project.created_at).toLocaleDateString()}</span>
          </div>
          <div style="display:flex;gap:15px;margin:10px 0;">
            <span class="stat-badge">🔑 ${project.total_keywords || 0} keywords</span>
            <span class="stat-badge">📊 ${project.total_topics || 0} topics</span>
          </div>
          <div style="margin-top:10px;">
            <span class="status-badge ${project.status}">${project.status || 'pending'}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function loadKeywordStats() {
  try {
    const response = await fetch('/api/keyword/stats');
    const data = await response.json();

    if (data.success) {
      document.getElementById('totalKeywordProjects').textContent = data.stats.total_projects;
      document.getElementById('totalKeywords').textContent = data.stats.total_keywords;
      document.getElementById('totalTopics').textContent = data.stats.total_topics;
      document.getElementById('keywordStats').style.display = 'grid';
    }
  } catch (error) {
    console.error('Error loading keyword stats:', error);
  }
}

function openNewResearchModal() {
  const modalHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content" onclick="event.stopPropagation()" style="max-width:600px;">
        <div class="modal-header">
          <h2>New Keyword Research Project</h2>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="newResearchForm" onsubmit="submitNewResearch(event)">
            <div class="form-group">
              <label for="research-name">Project Name *</label>
              <input type="text" id="research-name" name="name" required
                     placeholder="e.g., Q4 Content Strategy"
                     style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
            </div>

            <div class="form-group" style="margin-top:15px;">
              <label for="research-seeds">Seed Keywords * (comma-separated)</label>
              <textarea id="research-seeds" name="seeds" required rows="3"
                        placeholder="seo tools, keyword research, content planning"
                        style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;"></textarea>
              <small style="color:#666;">Enter 3-10 seed keywords separated by commas</small>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:15px;">
              <div class="form-group">
                <label for="research-geo">Geographic Target</label>
                <select id="research-geo" name="geo"
                        style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="IN">India</option>
                </select>
              </div>

              <div class="form-group">
                <label for="research-language">Language</label>
                <select id="research-language" name="language"
                        style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>

            <div class="form-group" style="margin-top:15px;">
              <label for="research-focus">Focus</label>
              <select id="research-focus" name="focus"
                      style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                <option value="informational">Informational (How-to, Guides)</option>
                <option value="commercial">Commercial (Reviews, Comparisons)</option>
                <option value="transactional">Transactional (Buy, Price)</option>
              </select>
            </div>

            <div class="modal-footer" style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Start Research</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modalContainer').innerHTML = modalHTML;
}

async function submitNewResearch(event) {
  event.preventDefault();

  const form = document.getElementById('newResearchForm');
  const formData = new FormData(form);

  const data = {
    name: formData.get('name'),
    seeds: formData.get('seeds'),
    geo: formData.get('geo'),
    language: formData.get('language'),
    focus: formData.get('focus')
  };

  try {
    showToast('Starting keyword research... This may take a few minutes.', 'info');

    const response = await fetch('/api/keyword/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      showToast('Research started successfully! Project ID: ' + result.project_id, 'success');
      closeModal();
      setTimeout(() => {
        loadKeywordProjects();
      }, 1000);
    } else {
      showToast('Error: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Error starting research:', error);
    showToast('Failed to start research. Is the keyword service running?', 'error');
  }
}

async function viewKeywordProject(projectId) {
  try {
    const response = await fetch(`/api/keyword/projects/${projectId}`);
    const data = await response.json();

    if (data.success) {
      displayProjectDetails(data.project);
    } else {
      showToast('Error loading project: ' + data.error, 'error');
    }
  } catch (error) {
    console.error('Error loading project:', error);
    showToast('Failed to load project details', 'error');
  }
}

function displayProjectDetails(project) {
  const modalHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content" onclick="event.stopPropagation()" style="max-width:900px;">
        <div class="modal-header">
          <h2>${project.name}</h2>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:20px;">
            <div class="stat-card">
              <div class="stat-label">Total Keywords</div>
              <div class="stat-value">${project.total_keywords || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Topics</div>
              <div class="stat-value">${project.total_topics || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Status</div>
              <div class="stat-value" style="font-size:16px;">${project.status}</div>
            </div>
          </div>

          ${project.top_keywords && project.top_keywords.length > 0 ? `
            <div>
              <h3>Top Opportunity Keywords</h3>
              <table class="data-table" style="width:100%;margin-top:10px;">
                <thead>
                  <tr>
                    <th>Keyword</th>
                    <th>Volume</th>
                    <th>Difficulty</th>
                    <th>Opportunity</th>
                    <th>Intent</th>
                  </tr>
                </thead>
                <tbody>
                  ${project.top_keywords.map(kw => `
                    <tr>
                      <td>${kw.keyword}</td>
                      <td>${kw.volume || 'N/A'}</td>
                      <td>${kw.difficulty ? kw.difficulty.toFixed(0) : 'N/A'}</td>
                      <td>${kw.opportunity ? kw.opportunity.toFixed(0) : 'N/A'}</td>
                      <td>${kw.intent || 'unknown'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p class="text-muted">No keywords generated yet.</p>'}

          <div class="modal-footer" style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;">
            <button class="btn btn-secondary" onclick="exportProject(${project.id})">
              📥 Export CSV
            </button>
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modalContainer').innerHTML = modalHTML;
}

async function exportProject(projectId) {
  try {
    showToast('Generating export...', 'info');

    const response = await fetch(`/api/keyword/projects/${projectId}/export`, {
      method: 'POST'
    });

    const result = await response.json();

    if (result.success) {
      showToast('Export created: ' + result.file_path, 'success');
    } else {
      showToast('Export failed: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Error exporting project:', error);
    showToast('Failed to export project', 'error');
  }
}

function closeModal() {
  document.getElementById('modalContainer').innerHTML = '';
}

// Auto-load projects when keyword research section becomes active
(function() {
  // Watch for section changes
  const observer = new MutationObserver(() => {
    const section = document.getElementById('keyword-research-section');
    if (section && section.classList.contains('active')) {
      loadKeywordProjects();
    }
  });

  // Start observing when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class']
      });
    });
  } else {
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class']
    });
  }
})();
