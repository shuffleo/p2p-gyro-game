// Utility Functions

/**
 * Copy text to clipboard
 */
export function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  
  // Fallback for older browsers
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success ? Promise.resolve() : Promise.reject(new Error('Copy failed'));
  } catch (err) {
    document.body.removeChild(textarea);
    return Promise.reject(err);
  }
}

/**
 * Show error alert with copy functionality
 */
export function showErrorWithCopy(message, title = 'Error') {
  const timestamp = new Date().toISOString();
  const fullMessage = `${title}\n\n${message}\n\nTimestamp: ${timestamp}\n\nClick OK, then copy this message for debugging.`;
  
  // Show alert
  alert(fullMessage);
  
  // Automatically copy error details
  const errorDetails = `Error: ${title}\n${message}\n\nTimestamp: ${timestamp}\n\nBrowser: ${navigator.userAgent}\nURL: ${window.location.href}`;
  
  copyToClipboard(errorDetails)
    .then(() => {
      console.log('Error details copied to clipboard');
    })
    .catch(err => {
      console.error('Failed to copy error details:', err);
      // Fallback: show error in console
      console.error('Error details:', errorDetails);
    });
}

/**
 * Throttle function calls
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Debounce function calls
 */
export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Normalize gyroscope data
 */
export function normalizeGyroData(alpha, beta, gamma) {
  return {
    alpha: alpha !== null ? alpha : 0,
    beta: beta !== null ? beta : 0,
    gamma: gamma !== null ? gamma : 0,
  };
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Linear interpolation
 */
export function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

