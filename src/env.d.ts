/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

// Global namespace extensions
declare global {
  namespace NodeJS {
    interface Timeout {
      unref?(): Timeout;
      ref?(): Timeout;
      hasRef?(): boolean;
      refresh?(): Timeout;
    }
  }

  namespace JSX {
    interface Element {}
  }
}

// Asset modules
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.mp3' {
  const content: string;
  export default content;
}

declare module '*.mp4' {
  const content: string;
  export default content;
}

declare module '*.webm' {
  const content: string;
  export default content;
}

declare module '*.m4a' {
  const content: string;
  export default content;
}

declare module '*.wav' {
  const content: string;
  export default content;
}

declare module '*.ogg' {
  const content: string;
  export default content;
}

export {};
