// Keyphrase Generator using niceware library
import { bytesToPassphrase, passphraseToBytes } from 'niceware';

/**
 * Generate a memorable keyphrase (6 words + 3 random numbers)
 * @returns {string} Format: "word1 word2 word3 word4 word5 word6 123"
 */
export function generateKeyphrase() {
  // Generate 12 random bytes (96 bits) for 6 words
  // niceware uses 2 bytes per word, so 6 words = 12 bytes
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);
  
  // Convert bytes to passphrase (6 words)
  const words = bytesToPassphrase(randomBytes);
  
  // Generate 3 random digits
  const numbers = Math.floor(100 + Math.random() * 900).toString(); // 100-999
  
  // Combine: "word1 word2 word3 word4 word5 word6 123"
  return `${words.join(' ')} ${numbers}`;
}

/**
 * Validate a keyphrase format
 * @param {string} keyphrase - The keyphrase to validate
 * @returns {boolean} True if valid format
 */
export function validateKeyphrase(keyphrase) {
  if (!keyphrase || typeof keyphrase !== 'string') {
    return false;
  }
  
  // Split by spaces
  const parts = keyphrase.trim().split(/\s+/);
  
  // Should have 6 words + 1 number part (7 parts total)
  if (parts.length !== 7) {
    return false;
  }
  
  // Last part should be 3 digits
  const numberPart = parts[parts.length - 1];
  if (!/^\d{3}$/.test(numberPart)) {
    return false;
  }
  
  // First 6 parts should be words (letters only, lowercase)
  const words = parts.slice(0, 6);
  const wordRegex = /^[a-z]+$/;
  for (const word of words) {
    if (!wordRegex.test(word.toLowerCase())) {
      return false;
    }
  }
  
  return true;
}

/**
 * Normalize keyphrase (lowercase words, ensure proper spacing)
 * @param {string} keyphrase - The keyphrase to normalize
 * @returns {string} Normalized keyphrase
 */
export function normalizeKeyphrase(keyphrase) {
  if (!keyphrase) {
    return '';
  }
  
  // Trim and split
  const parts = keyphrase.trim().split(/\s+/);
  
  if (parts.length !== 7) {
    return keyphrase.trim(); // Return as-is if invalid format
  }
  
  // Lowercase words, keep numbers as-is
  const words = parts.slice(0, 6).map(w => w.toLowerCase());
  const numbers = parts[6];
  
  return `${words.join(' ')} ${numbers}`;
}

