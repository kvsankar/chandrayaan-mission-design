// Type declarations for Vite asset imports

declare module '*.jpg?url' {
    const value: string;
    export default value;
}

declare module '*.png?url' {
    const value: string;
    export default value;
}

declare module '*.glb?url' {
    const value: string;
    export default value;
}
