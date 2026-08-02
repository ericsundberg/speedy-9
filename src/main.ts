import './styles/index.css';
import { AppController } from './app/app-controller';

let appController: AppController | null = null;

function requireElement<TElement extends Element>(
  selector: string,
): TElement {
  const element = document.querySelector<TElement>(selector);

  if (element === null) {
    throw new Error(`Missing required document element: ${selector}`);
  }

  return element;
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown startup error occurred.';
}

function showBootstrapFailure(error: unknown): void {
  console.error(error);

  const sceneRoot = document.querySelector<HTMLElement>('#scene-root');

  if (sceneRoot === null) {
    return;
  }

  const failure = document.createElement('section');
  failure.className = 'title-scene';
  failure.setAttribute('role', 'alert');

  const heading = document.createElement('h1');
  heading.className = 'title-scene__title';
  heading.textContent = 'BOOT ERROR';

  const message = document.createElement('p');
  message.className = 'title-scene__pitch';
  message.textContent = describeError(error);

  const instruction = document.createElement('p');
  instruction.className = 'title-scene__weapon-line';
  instruction.textContent = 'CHECK THE BROWSER CONSOLE';

  failure.append(heading, message, instruction);
  sceneRoot.replaceChildren(failure);
}

function bootstrapApplication(): void {
  try {
    const sceneRoot =
      requireElement<HTMLElement>('#scene-root');
    const runStatus =
      requireElement<HTMLElement>('#hud-run-status');

    appController?.destroy();

    appController = new AppController({
      sceneRoot,
      runStatus,
    });

    appController.start();
  } catch (error: unknown) {
    showBootstrapFailure(error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    bootstrapApplication,
    { once: true },
  );
} else {
  bootstrapApplication();
}

if (import.meta.hot !== undefined) {
  import.meta.hot.dispose(() => {
    appController?.destroy();
    appController = null;
  });
}
