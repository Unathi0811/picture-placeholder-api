document.addEventListener('DOMContentLoaded', () => {
  const greetingElement = document.getElementById('greeting');
  const nameInput = document.getElementById('nameInput');
  const greetBtn = document.getElementById('greetBtn');
  const apiResponse = document.getElementById('apiResponse');
  
  // Initial greeting
  fetch('/api/greet')
    .then(response => response.json())
    .then(data => {
      greetingElement.textContent = data.message;
    });
  
  // Button click handler
  greetBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    apiResponse.textContent = 'Loading...';
    
    fetch(`/api/greet?name=${encodeURIComponent(name)}`)
      .then(response => response.json())
      .then(data => {
        apiResponse.textContent = data.message;
      })
      .catch(error => {
        apiResponse.textContent = `Error: ${error.message}`;
      });
  });
});