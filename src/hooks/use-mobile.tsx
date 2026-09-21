import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * true por debajo de 768px. Se inicializa de forma síncrona para que el primer
 * render ya sea el correcto (antes arrancaba en undefined → false y en móvil
 * montaba la página de escritorio un instante).
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(
    () => window.innerWidth < MOBILE_BREAKPOINT
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
