import { useEffect, useRef, useState } from 'react';
import { validar } from '@/lib/rewards/codigos';
import type { TipoCodigo } from '@/lib/rewards/tipos';

const BCID: Record<Exclude<TipoCodigo, 'ninguno'>, string> = {
  qr: 'qrcode', code128: 'code128', ean13: 'ean13', ean8: 'ean8', upca: 'upca',
  code39: 'code39', pdf417: 'pdf417', aztec: 'azteccode',
};

/** Dibuja el código de una tarjeta en un canvas, sobre blanco (también en modo oscuro) y con zona de silencio. */
export function Codigo({ valor, tipo }: { valor: string; tipo: TipoCodigo }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [fallo, setFallo] = useState(false);
  const valido = validar(valor, tipo) === null;

  useEffect(() => {
    if (!lienzo.current || !valido || tipo === 'ninguno') return;
    let vigente = true;
    // bwip-js es grande (≈1 MB): se carga solo cuando hace falta dibujar un código.
    import('bwip-js/browser').then(({ default: bwipjs }) => {
      if (!vigente || !lienzo.current) return;
      try {
        const dosD = ['qr', 'pdf417', 'aztec'].includes(tipo);
        bwipjs.toCanvas(lienzo.current, {
          bcid: BCID[tipo], text: valor.trim(), scale: 3, height: dosD ? undefined : 18,
          paddingwidth: 10, paddingheight: 6, backgroundcolor: 'FFFFFF',
        });
        setFallo(false);
      } catch {
        setFallo(true);
      }
    }, () => setFallo(true));
    return () => { vigente = false; };
  }, [valor, tipo, valido]);

  if (tipo === 'ninguno' || !valido || fallo) return <p className="text-sm text-muted-foreground">No se puede dibujar este código.</p>;
  return (
    <div className="flex justify-center rounded-2xl bg-white p-4">
      <canvas ref={lienzo} className="max-h-60 max-w-full" aria-label={`Código ${valor}`} />
    </div>
  );
}
