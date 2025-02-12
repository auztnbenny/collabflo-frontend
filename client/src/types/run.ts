interface Language {
    language: string
    version: string
    aliases: string[]
}

interface RunContext {
    setInput: (input: string) => void
    output: string
    isRunning: boolean
    supportedLanguages: Language[]
    selectedLanguage: Language
    setSelectedLanguage: (language: Language) => voidz
    runCode: () => void
}

export type { Language, RunContext }
