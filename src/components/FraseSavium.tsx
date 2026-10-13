import { useEffect, useState } from 'react';

/** Las mismas que el login de la app del iPhone (LoginView.swift); si cambian allí, cambiarlas aquí. */
const frases = [
  'Cuadrando cuentas desde 2025',
  'Contando centavos desde 2025',
  'Domando gastos desde 2025',
  'Persiguiendo pesos desde 2025',
  'Sumando y restando desde 2025',
  'Vigilando la cartera desde 2025',
  'Haciendo números desde 2025',
  'Ahorrando con estilo desde 2025',
];

/** Una frase distinta cada vez que se monta, al estilo de los mensajes de Claude mientras piensa.
 *  Con `maquina` se escribe letra a letra con un cursor que parpadea (salvo con «reducir movimiento»). */
export const FraseSavium = ({ maquina = false, className }: { maquina?: boolean; className?: string }) => {
  const [frase] = useState(() => frases[Math.floor(Math.random() * frases.length)]);
  const [escritas, setEscritas] = useState(() =>
    maquina && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : frase.length,
  );

  useEffect(() => {
    if (escritas >= frase.length) return;
    const t = setTimeout(() => setEscritas((n) => n + 1), escritas === 0 ? 500 : 55);
    return () => clearTimeout(t);
  }, [escritas, frase]);

  return (
    <span className={className} aria-label={frase}>
      <span aria-hidden>{frase.slice(0, escritas)}</span>
      {maquina && <span aria-hidden className="ml-0.5 inline-block w-[0.5ch] animate-cursor">▍</span>}
    </span>
  );
};
