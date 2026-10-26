import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** Savium Finance en el App Store (no listada: solo se llega con el enlace). */
export const URL_APP_STORE = 'https://apps.apple.com/app/id6820799492';

const CLAVE = 'savium.avisoApp';

/** iPhone o iPad (el iPad con iPadOS se presenta como Mac, pero con pantalla táctil). */
const esIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const yaAvisado = () => {
  try { return sessionStorage.getItem(CLAVE) === '1'; } catch { return false; }
};

/**
 * Al entrar desde el navegador de un iPhone o iPad, propone descargar la app nativa una vez por visita.
 * En Android no sale: no hay app.
 */
export function AvisoApp() {
  const [abierto, setAbierto] = useState(() => esIOS() && !yaAvisado());

  const cerrar = () => {
    try { sessionStorage.setItem(CLAVE, '1'); } catch { /* sin almacenamiento: volverá a salir */ }
    setAbierto(false);
  };

  return (
    <Dialog open={abierto} onOpenChange={o => { if (!o) cerrar(); }}>
      <DialogContent className="max-w-[340px] rounded-[1.25rem] text-center">
        <DialogHeader className="items-center sm:text-center">
          <img src="/icons/apple-touch-icon.png" alt="" className="h-16 w-16 rounded-[22%] mb-2" />
          <DialogTitle>Savium para iPhone</DialogTitle>
          <DialogDescription>
            La app va mejor en el móvil: Face ID, notificaciones y apuntar un gasto en segundos.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button asChild onClick={cerrar}>
            <a href={URL_APP_STORE}>Descargar la app</a>
          </Button>
          <Button variant="ghost" onClick={cerrar}>Seguir en la web</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
