// popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const statusSection = document.getElementById('status-section');
  const statusMessage = document.getElementById('status-message');
  const mainContent = document.getElementById('main-content');
  const usageCounter = document.getElementById('usage-counter');
  
  const riskScoreBadge = document.getElementById('risk-score-badge');
  const dataSummary = document.getElementById('data-summary');
  const redFlagsList = document.getElementById('red-flags-list');
  const thirdPartiesList = document.getElementById('third-parties-list');

  // Utility to update UI status
  function setStatus(message, type = 'info') {
    statusSection.style.display = 'block';
    mainContent.style.display = 'none';
    statusMessage.textContent = message;
    statusSection.className = `status-${type}`;
  }

  // Get active tab
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    setStatus('Unable to access current tab.', 'error');
    return;
  }

  // Request analysis from the service worker
  try {
    chrome.runtime.sendMessage(
      { action: "analyzePage", tabId: tab.id, url: tab.url },
      (response) => {
        if (chrome.runtime.lastError) {
          setStatus('Error connecting to extension.', 'error');
          console.error(chrome.runtime.lastError);
          return;
        }

        if (!response) {
          setStatus('No response from background process.', 'error');
          return;
        }

        // Handle states
        if (response.status === 'not_tc_page') {
          setStatus('Not a T&C or Privacy Policy page.', 'info');
          updateUsage(response.usage);
        } else if (response.status === 'loading') {
          setStatus('Analyzing page...', 'loading');
          updateUsage(response.usage); 
        } else if (response.status === 'success') {
          renderData(response.data);
          updateUsage(response.usage);
        } else if (response.status === 'error') {
          setStatus(`Error: ${response.error || 'Failed to analyze page'}`, 'error');
        } else if (response.status === 'limit_reached') {
          setStatus('Daily analysis limit reached. Try again tomorrow.', 'error');
          updateUsage(response.usage);
        } else if (response.status === 'limit_warning') {
          renderData(response.data);
          updateUsage(response.usage);
          // Show a warning somewhere? Status is overridden by main content, 
          // let's update counter styling
          usageCounter.style.color = '#ef6c00'; // orange
          usageCounter.style.fontWeight = 'bold';
        }
      }
    );
  } catch (err) {
    setStatus('Unexpected error occurred.', 'error');
    console.error(err);
  }

  // Render the fetched data into the DOM
  function renderData(data) {
    statusSection.style.display = 'none';
    mainContent.style.display = 'block';

    // Set Risk Score
    riskScoreBadge.textContent = data.riskScore || 'Unknown';
    riskScoreBadge.className = 'badge';
    if (data.riskScore === 'Low') riskScoreBadge.classList.add('risk-low');
    else if (data.riskScore === 'Medium') riskScoreBadge.classList.add('risk-medium');
    else if (data.riskScore === 'High') riskScoreBadge.classList.add('risk-high');
    else riskScoreBadge.classList.add('trust-unknown');

    // Set Summary
    dataSummary.textContent = data.dataSummary || 'No summary provided.';

    // Set Red Flags
    redFlagsList.innerHTML = '';
    if (data.redFlags && data.redFlags.length > 0) {
      data.redFlags.forEach(flag => {
        const li = document.createElement('li');
        li.textContent = flag;
        redFlagsList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No red flags found.';
      redFlagsList.appendChild(li);
    }

    // Set Third Parties
    thirdPartiesList.innerHTML = '';
    if (data.thirdParties && data.thirdParties.length > 0) {
      data.thirdParties.forEach(tp => {
        const li = document.createElement('li');
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = tp.name;
        
        const badgeSpan = document.createElement('span');
        badgeSpan.textContent = tp.trustLevel;
        badgeSpan.className = `badge trust-${(tp.trustLevel || 'unknown').toLowerCase()}`;
        
        li.appendChild(nameSpan);
        li.appendChild(badgeSpan);
        thirdPartiesList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'None detected.';
      thirdPartiesList.appendChild(li);
    }
  }

  // Update daily usage counter
  function updateUsage(usage) {
    if (usage && usage.count !== undefined && usage.limit !== undefined) {
      usageCounter.textContent = `${usage.count}/${usage.limit} domains today`;
    }
  }
});
