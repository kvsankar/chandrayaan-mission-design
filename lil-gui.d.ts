declare module 'https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm' {
  export class GUI {
    constructor(options?: { autoPlace?: boolean; container?: HTMLElement; width?: number; title?: string });
    add(object: any, property: string, options?: number | number[] | { [key: string]: number }, max?: number, step?: number): Controller;
    addFolder(title: string): GUI;
    onChange(callback: (value: any) => void): this;
    title(title: string): this;
    destroy(): void;
    hide(): void;
    show(): void;
    open(open?: boolean): this;
  }

  export class Controller {
    name(name: string): this;
    onChange(callback: (value: any) => void): this;
    onFinishChange(callback: (value: any) => void): this;
    setValue(value: any): this;
    getValue(): any;
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
