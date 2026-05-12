/// <reference types="vite/client" />

// SVG files — Vite transforms these into a URL string by default
declare module "*.svg" {
  const src: string
  export default src
}

// If you ever use ?react (SVGR), add this too:
// declare module "*.svg?react" {
//   import * as React from "react"
//   const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
//   export default ReactComponent
// }

// Image assets
declare module "*.png" {
  const src: string
  export default src
}

declare module "*.jpg" {
  const src: string
  export default src
}

declare module "*.jpeg" {
  const src: string
  export default src
}

declare module "*.gif" {
  const src: string
  export default src
}

declare module "*.webp" {
  const src: string
  export default src
}

// Font / other binary assets
declare module "*.woff2" {
  const src: string
  export default src
}
