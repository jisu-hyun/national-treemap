import { useEffect, useRef } from "react"

declare global {
  interface Window {
    googleTranslateElementInit?: () => void
  }
}

export function GoogleTranslateLoader() {
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return

    const init = () => {
      if (!(window as any).google?.translate?.TranslateElement || initRef.current) return
      initRef.current = true
      const el = document.getElementById("google_translate_element")
      if (!el) return
      el.innerHTML = ""
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: "ko",
          includedLanguages: "en,ja,zh-CN,zh-TW,es,fr,de,vi,th",
          layout: 0,
          autoDisplay: false,
        },
        "google_translate_element"
      )
    }

    const runInit = () => {
      if ((window as any).google?.translate?.TranslateElement) {
        setTimeout(init, 300)
      } else {
        window.googleTranslateElementInit = () => setTimeout(init, 300)
        const script = document.createElement("script")
        script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        script.async = true
        document.body.appendChild(script)
      }
    }

    setTimeout(runInit, 500)
  }, [])

  return (
    <div id="google_translate_element" className="fixed opacity-0 pointer-events-none w-0 h-0 overflow-hidden" aria-hidden />
  )
}
