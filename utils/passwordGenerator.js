/**
 * Generate a secure, readable password for employees
 * Format: 2 letters + 2 numbers + 2 letters + 2 numbers
 * Example: Ab12Cd34
 */
function generateEmployeePassword() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let password = '';
  
  // First 2 letters (uppercase)
  for (let i = 0; i < 2; i++) {
    password += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // 2 numbers
  for (let i = 0; i < 2; i++) {
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  // 2 more letters (uppercase)
  for (let i = 0; i < 2; i++) {
    password += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // 2 more numbers
  for (let i = 0; i < 2; i++) {
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return password;
}

/**
 * Generate a simple employee ID
 * Format: EMP + 6 digits
 * Example: EMP123456
 */
function generateEmployeeId() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `EMP${timestamp}${random}`;
}

module.exports = {
  generateEmployeePassword,
  generateEmployeeId
}; 