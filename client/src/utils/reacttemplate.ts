// src/utils/projectTemplates.ts
export const reactTemplate = {
 "index.html": `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    "package.json": `{
        "name": "my-react-app",
        "private": true,
        "version": "0.0.0",
        "type": "module",
        "scripts": {
            "dev": "vite",
            "build": "vite build",
            "preview": "vite preview"
        },
        "dependencies": {
            "react": "^18.2.0",
            "react-dom": "^18.2.0"
        },
        "devDependencies": {
            "@types/react": "^18.2.0",
            "@types/react-dom": "^18.2.0",
            "@vitejs/plugin-react": "^4.0.0",
            "typescript": "^5.0.2",
            "vite": "^4.4.5"
        }
    }`,
    "src/App.tsx": `import React from 'react'
function App() {
    return (
        <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
            <div className="relative py-3 sm:max-w-xl sm:mx-auto">
                <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
                    <div className="max-w-md mx-auto">
                        <div className="divide-y divide-gray-200">
                            <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                                <h1 className="text-3xl font-bold text-gray-900 mb-8">Welcome to React</h1>
                                <p>Edit App.tsx and save to reload.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default App`,
    "src/main.tsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><App /></React.StrictMode>
)`,
    "src/vite-env.d.ts": "/// <reference types=\"vite/client\" />",
    "vite.config.ts": `
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import path from 'path'
    
    export default defineConfig({
        plugins: [react()],
        server: {
            host: '0.0.0.0',
            port: 5174,
            strictPort: true,
            hmr: {
                clientPort: 5174
            }
        },
        build: {
            outDir: 'dist',
            emptyOutDir: true
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src')
            }
        }
    })`,
    "tsconfig.json": `{
        "compilerOptions": {
            "target": "ES2020",
            "useDefineForClassFields": true,
            "lib": ["ES2020", "DOM", "DOM.Iterable"],
            "module": "ESNext",
            "skipLibCheck": true,
            "moduleResolution": "bundler",
            "allowImportingTsExtensions": true,
            "resolveJsonModule": true,
            "isolatedModules": true,
            "noEmit": true,
            "jsx": "react-jsx",
            "strict": true,
            "noUnusedLocals": true,
            "noUnusedParameters": true,
            "noFallthroughCasesInSwitch": true
        },
        "include": ["src"],
        "references": [{ "path": "./tsconfig.node.json" }]
    }`,
    "tsconfig.node.json": `{
        "compilerOptions": {
            "composite": true,
            "skipLibCheck": true,
            "module": "ESNext",
            "moduleResolution": "bundler",
            "allowSyntheticDefaultImports": true
        },
        "include": ["vite.config.ts"]
    }`,
    ".gitignore": `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?`
};
