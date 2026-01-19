declare module 'https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm' {
  export class GUI {
    constructor(options?: { autoPlace?: boolean; container?: HTMLElement; width?: number; title?: string });
    add(object: Record<string, unknown>, property: string, options?: number | number[] | { [key: string]: number }, max?: number, step?: number): Controller;
    addFolder(title: string): GUI;
    onChange(callback: (value: unknown) => void): this;
    title(title: string): this;
    destroy(): void;
    hide(): void;
    show(): void;
    open(open?: boolean): this;
  }

  export class Controller {
    name(name: string): this;
    onChange(callback: (value: unknown) => void): this;
    onFinishChange(callback: (value: unknown) => void): this;
    setValue(value: unknown): this;
    getValue(): unknown;
    disable(disabled?: boolean): this;
    enable(): this;
    show(): this;
    hide(): this;
    listen(): this;
    updateDisplay(): this;
    destroy(): void;
    $disable: boolean;
    domElement: HTMLElement;
  }
}
