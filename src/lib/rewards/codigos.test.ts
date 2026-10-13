import { describe, expect, it } from "vitest";
import casos from "../../../shared/fixtures/rewards-codigos.json";
import { completar, digitoControl, validar } from "./codigos";
import type { TipoCodigo } from "./tipos";

describe("codigos (casos compartidos con la app iOS)", () => {
  it.each(casos.validacion)("$tipo «$valor» → $motivo", ({ tipo, valor, motivo }) => {
    expect(validar(valor, tipo as TipoCodigo)).toBe(motivo);
  });

  it.each(casos.digitoControl)("dígito de control de $digitos", ({ digitos, esperado }) => {
    expect(digitoControl(digitos)).toBe(esperado);
  });

  it("completa el dígito de control que falta", () => {
    expect(completar("400638133393", "ean13")).toBe("4006381333931");
    expect(completar("4006381333931", "ean13")).toBeNull();
    expect(completar("96385 07", "ean8")).toBe("96385074");
    expect(digitoControl("12a")).toBeNull();
  });
});
