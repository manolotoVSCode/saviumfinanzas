import { describe, expect, it } from "vitest";
import { porUnidad } from "./totales";
import type { Programa, Tarjeta } from "./tipos";

const tarjeta = (parcial: Partial<Tarjeta>): Tarjeta => ({
  id: crypto.randomUUID(), user_id: "u", programa_id: null, nombre: "X", color: null, unidad: null,
  numero_socio: null, codigo_valor: null, codigo_tipo: "ninguno", titular: null, saldo: null, saldo_fecha: null,
  caducidad: null, notas: null, compartida: false, orden: 0, actualizado: "2026-10-13T00:00:00Z", borrado: false,
  ...parcial,
});

const premier: Programa = { id: "p1", nombre: "Aeroméxico", tipo: "aerolinea", pais: "MX", color: "#000000", unidad: "puntos", codigo_tipo: "ninguno", activo: true };
const iberia: Programa = { ...premier, id: "p2", nombre: "Iberia", pais: "ES", unidad: "Avios" };
const programas = new Map([[premier.id, premier], [iberia.id, iberia]]);

describe("porUnidad", () => {
  it("suma por unidad sin mezclar", () => {
    const r = porUnidad([tarjeta({ saldo: 1000, programa_id: "p1" }), tarjeta({ saldo: 500, programa_id: "p1" }),
      tarjeta({ saldo: 300, programa_id: "p2" })], programas);
    expect(r).toEqual([{ unidad: "puntos", total: 1500 }, { unidad: "Avios", total: 300 }]);
  });

  it("normaliza la unidad", () => {
    const r = porUnidad([tarjeta({ saldo: 10, unidad: "Puntos" }), tarjeta({ saldo: 5, unidad: " puntos " })], new Map());
    expect(r).toHaveLength(1);
    expect(r[0].total).toBe(15);
  });

  it("ignora sin saldo y borradas; sin unidad usa puntos", () => {
    const r = porUnidad([tarjeta({}), tarjeta({ saldo: 7, unidad: "pts", borrado: true }), tarjeta({ saldo: 4 })], new Map());
    expect(r).toEqual([{ unidad: "puntos", total: 4 }]);
  });
});
