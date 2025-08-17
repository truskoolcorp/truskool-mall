import * as THREE from './vendor/three/build/three.module.js';
import { OrbitControls } from './vendor/three/examples/jsm/controls/OrbitControls.js';

document.getElementById('mall').textContent = 'Loading stores...';

fetch('/stores.json')
  .then(res => res.json())
  .then(data => {
    const mall = document.getElementById('mall');
    mall.innerHTML = ''; // Clear "Loading..."

    data.forEach(store => {
      const div = document.createElement('div');
      div.className = 'store';
      div.innerHTML = `
        <a href="${store.link}" target="_blank" style="color:white; text-align:center;">
          <img src="${store.logo}" alt="${store.name}"/>
          <div>${store.name}</div>
        </a>`;
      mall.appendChild(div);
    });
  })
  .catch(err => {
    console.error('Failed to load stores:', err);
    document.getElementById('mall').textContent = 'Failed to load store data.';
  });