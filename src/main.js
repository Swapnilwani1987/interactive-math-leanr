import './style.css';
import { initUnitCircle } from './labs/unitCircle.js';
import { initPythagoras } from './labs/pythagoras.js';
import { initCircleArea } from './labs/circleArea.js';

initUnitCircle(document.getElementById('lab-trig'));
initPythagoras(document.getElementById('lab-pyth'));
initCircleArea(document.getElementById('lab-circle'));

document.querySelector('[data-el="year"]').textContent = new Date().getFullYear();
