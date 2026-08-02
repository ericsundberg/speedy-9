import type { Scene } from '../app/scene';

interface TitleSceneOptions {
  onBeginRun(): void;
}

export class TitleScene implements Scene {
  private readonly options: TitleSceneOptions;
  private beginButton: HTMLButtonElement | null = null;

  public constructor(options: TitleSceneOptions) {
    this.options = options;
  }

  public mount(root: HTMLElement): void {
    this.destroy();

    const scene = document.createElement('section');
    scene.className = 'title-scene';
    scene.dataset.scene = 'title';
    scene.setAttribute('aria-labelledby', 'game-title');

    const headingGroup = document.createElement('div');
    headingGroup.className = 'title-scene__heading';

    const jamLabel = document.createElement('p');
    jamLabel.className = 'title-scene__eyebrow';
    jamLabel.textContent = 'MICRO JAM 062 · SPEED IS YOUR WEAPON';

    const title = document.createElement('h1');
    title.id = 'game-title';
    title.className = 'title-scene__title';
    title.textContent = 'SPEEDY 9';

    const pitch = document.createElement('p');
    pitch.className = 'title-scene__pitch';
    pitch.textContent = 'Nine microgames. One relentless clock.';

    const weaponLine = document.createElement('p');
    weaponLine.className = 'title-scene__weapon-line';
    weaponLine.textContent = 'YOUR SPEED IS THE WEAPON';

    headingGroup.append(
      jamLabel,
      title,
      pitch,
      weaponLine,
    );

    const actions = document.createElement('div');
    actions.className = 'title-scene__actions';

    const beginButton = document.createElement('button');
    beginButton.className = 'vector-button vector-button--primary';
    beginButton.type = 'button';
    beginButton.textContent = 'BEGIN RUN';

    const audioButton = document.createElement('button');
    audioButton.className = 'vector-button vector-button--secondary';
    audioButton.type = 'button';
    audioButton.disabled = true;
    audioButton.textContent = 'AUDIO: OFFLINE';
    audioButton.title = 'Audio will be added in a later phase.';

    actions.append(beginButton, audioButton);

    const information = document.createElement('div');
    information.className = 'title-scene__information';
    information.append(
      this.createControlsPanel(),
      this.createCreditsPanel(),
    );

    const record = document.createElement('p');
    record.className = 'title-scene__record';

    const recordLabel = document.createElement('span');
    recordLabel.textContent = 'PERSONAL BEST';

    const recordValue = document.createElement('strong');
    recordValue.textContent = 'NO RECORDED RUN';

    record.append(recordLabel, recordValue);

    scene.append(
      headingGroup,
      actions,
      information,
      record,
    );

    this.beginButton = beginButton;
    beginButton.addEventListener(
      'click',
      this.handleBeginRun,
    );

    root.replaceChildren(scene);
    beginButton.focus();
  }

  public destroy(): void {
    this.beginButton?.removeEventListener(
      'click',
      this.handleBeginRun,
    );

    this.beginButton = null;
  }

  private readonly handleBeginRun = (): void => {
    if (this.beginButton === null) {
      return;
    }

    this.beginButton.disabled = true;
    this.beginButton.textContent = 'RUN SYSTEM PENDING';
    this.options.onBeginRun();
  };

  private createControlsPanel(): HTMLDetailsElement {
    const controls = document.createElement('details');
    controls.className = 'vector-details';

    const summary = document.createElement('summary');
    summary.textContent = 'CONTROLS';

    const controlsList = document.createElement('dl');
    controlsList.className = 'controls-list';

    const controlsData: readonly [string, string][] = [
      ['MOVE / NAVIGATE', 'WASD or Arrow Keys'],
      ['SELECT / ACTION', 'Enter, Space, or Primary Click'],
      ['RESTART STAGE', 'R'],
      ['PAUSE', 'Escape'],
    ];

    for (const [term, description] of controlsData) {
      const termElement = document.createElement('dt');
      termElement.textContent = term;

      const descriptionElement = document.createElement('dd');
      descriptionElement.textContent = description;

      controlsList.append(
        termElement,
        descriptionElement,
      );
    }

    controls.append(summary, controlsList);
    return controls;
  }

  private createCreditsPanel(): HTMLDetailsElement {
    const credits = document.createElement('details');
    credits.className = 'vector-details';

    const summary = document.createElement('summary');
    summary.textContent = 'CREDITS';

    const text = document.createElement('p');
    text.textContent =
      'Created for Micro Jam 062 using TypeScript, SVG, and the Web Audio API.';

    credits.append(summary, text);
    return credits;
  }
}
