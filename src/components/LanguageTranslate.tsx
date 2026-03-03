import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

const LANGUAGES = [
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "zh-CN", label: "中文(간체)", flag: "🇨🇳" },
  { code: "zh-TW", label: "中文(번체)", flag: "🇹🇼" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
] as const

function getCurrentLang(): string {
  if (typeof document === "undefined") return "ko"
  const match = document.cookie.match(/googtrans=([^;]+)/)
  if (!match) return "ko"
  const parts = match[1].split("/")
  return parts.length >= 2 ? parts[2] : "ko"
}

interface LanguageTranslateProps {
  variant?: "default" | "dark"
}

export function LanguageTranslate({ variant = "default" }: LanguageTranslateProps) {
  const [open, setOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState("ko")
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const isDark = variant === "dark"

  useEffect(() => {
    setCurrentLang(getCurrentLang())
  }, [])

  const handleOpen = () => {
    if (buttonRef.current) {
      setDropdownRect(buttonRef.current.getBoundingClientRect())
    }
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setDropdownRect(null)
  }

  const handleSelect = (targetCode: string) => {
    handleClose()
    if (targetCode === "ko") {
      document.cookie = "googtrans=; path=/; max-age=0"
    } else {
      document.cookie = `googtrans=/ko/${targetCode}; path=/`
    }
    window.location.reload()
  }

  const dropdownContent = open && dropdownRect && (
    <>
      <div
        className="fixed inset-0 z-[1200]"
        aria-hidden
        onClick={handleClose}
      />
      <div
        className="fixed z-[1250] w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white py-2 shadow-lg max-h-[70vh] overflow-y-auto notranslate"
        style={{
          top: dropdownRect.bottom + 4,
          right: window.innerWidth - dropdownRect.right,
        }}
      >
        <div className="px-3 py-2 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-500">언어 선택</span>
        </div>
        <ul className="py-1">
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                  currentLang === lang.code ? "bg-green-50 text-green-700" : "text-gray-700"
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="px-3 py-2 text-[10px] text-gray-400 border-t border-gray-100">
          Google 번역 적용
        </p>
      </div>
    </>
  )

  return (
    <div className="relative notranslate">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? handleClose() : handleOpen())}
        className={`flex items-center justify-center p-2.5 rounded-lg shrink-0 transition-colors min-h-[44px] min-w-[44px] ${
          isDark
            ? "text-white/80 hover:text-white"
            : "text-gray-600 hover:bg-green-100 hover:text-green-800"
        }`}
        aria-label="언어 변환"
        aria-expanded={open}
      >
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      </button>
      {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
    </div>
  )
}
