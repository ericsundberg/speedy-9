import './style.css';

const root = document.querySelector<HTMLDivElement>('#app');

if (root === null) {
  throw new Error('Missing #app application root.');
}

const screen = document.createElement('main');
screen.className = 'bootstrap-screen';

const jamLabel = document.createElement('p');
jamLabel.className = 'bootstrap-screen__eyebrow';
jamLabel.textContent = 'MICRO JAM 062';

const heading = document.createElement('h1');
heading.textContent = 'SPEEDY 9';

const status = document.createElement('p');
status.textContent = 'Project bootstrap complete.';

screen.append(jamLabel, heading, status);
root.append(screen);
