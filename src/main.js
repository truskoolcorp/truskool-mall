import * as THREE from '../three.module.js'; // Go up one level from /src/

document.addEventListener('DOMContentLoaded', () => {
  fetch('./src/stores.json')
    .then(response => response.json())
    .then(data => {
      const mallContainer = document.getElementById('mall');
      data.forEach(store => {
        const storeDiv = document.createElement('div');
        storeDiv.className = 'store';
        storeDiv.style.backgroundColor = store.color;
        storeDiv.innerHTML = `
          <a href="${store.link}" target="_blank" rel="noopener noreferrer">
            <img src="${store.logo}" alt="${store.name} Logo">
            <p>${store.name}</p>
          </a>`;
        mallContainer.appendChild(storeDiv);
      });
    })
    .catch(error => {
      console.error('Failed to load store data:', error);
    });
});
