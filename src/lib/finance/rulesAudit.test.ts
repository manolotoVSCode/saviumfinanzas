import { describe, expect, it } from 'vitest';
import {
  AuditRule,
  AuditTransaction,
  classifyOverlap,
  computeRuleOutcomes,
  computeRulesHealth,
} from './rulesAudit';

const rule = (over: Partial<AuditRule> & { id: string }): AuditRule => ({
  name: over.id, keyword: 'x', match_type: 'contains', priority: 0, active: true,
  amount_min: null, amount_max: null, cuenta_id: null, ...over,
});

const tx = (over: Partial<AuditTransaction> & { id: string }): AuditTransaction => ({
  comentario: 'COMPRA', gasto: 100, ingreso: 0, cuentaId: 'c1', ...over,
});

describe('computeRuleOutcomes', () => {
  // El caso real: "Amazon Suscripción" (99 exactos, prioridad alta) y "Amazon" (todo lo demás).
  const amazonSusc = rule({ id: 'susc', keyword: 'AMAZON', priority: 100, amount_min: 99, amount_max: 99 });
  const amazon = rule({ id: 'amazon', keyword: 'AMAZON', priority: 90 });

  it('la regla acotada gana las suyas y la general se queda con el resto', () => {
    const txs = [
      tx({ id: 't1', comentario: 'AMAZON MX RETAIL', gasto: 99 }),
      tx({ id: 't2', comentario: 'AMAZON MX RETAIL', gasto: 99 }),
      tx({ id: 't3', comentario: 'AMAZON MKTPL', gasto: 450 }),
    ];
    const out = computeRuleOutcomes([amazonSusc, amazon], txs);
    expect(out.susc).toMatchObject({ candidatas: 2, gana: 2 });
    expect(out.amazon).toMatchObject({ candidatas: 3, gana: 1 });
    expect(out.amazon.pierdeAnte).toEqual([{ ruleId: 'susc', n: 2 }]);
    expect(out.susc.quitaA).toEqual([{ ruleId: 'amazon', n: 2 }]);
  });

  it('el orden lo decide la prioridad, no el orden del array', () => {
    const baja = rule({ id: 'baja', keyword: 'CAFE', priority: 1 });
    const alta = rule({ id: 'alta', keyword: 'CAFE', priority: 99 });
    const out = computeRuleOutcomes([baja, alta], [tx({ id: 't', comentario: 'CAFE DUMAS' })]);
    expect(out.alta.gana).toBe(1);
    expect(out.baja.gana).toBe(0);
  });

  it('las reglas inactivas no compiten ni aparecen', () => {
    const apagada = rule({ id: 'off', keyword: 'CAFE', priority: 999, active: false });
    const viva = rule({ id: 'on', keyword: 'CAFE', priority: 1 });
    const out = computeRuleOutcomes([apagada, viva], [tx({ id: 't', comentario: 'CAFE DUMAS' })]);
    expect(out.off).toBeUndefined();
    expect(out.on.gana).toBe(1);
  });

  it('el filtro de cuenta acota las candidatas', () => {
    const soloAmex = rule({ id: 'amex', keyword: 'PAGO', priority: 10, cuenta_id: 'amex' });
    const out = computeRuleOutcomes([soloAmex], [
      tx({ id: 't1', comentario: 'GRACIAS POR SU PAGO', cuentaId: 'amex' }),
      tx({ id: 't2', comentario: 'GRACIAS POR SU PAGO', cuentaId: 'hsbc' }),
    ]);
    expect(out.amex).toMatchObject({ candidatas: 1, gana: 1 });
  });
});

describe('classifyOverlap', () => {
  const generica = rule({ id: 'g', keyword: 'UBER', priority: 80 });
  const acotada = rule({ id: 'a', keyword: 'UBER', priority: 95, amount_min: 360 });

  it('si alguna de las dos acota por monto o cuenta, el solape es intencional', () => {
    const outcome = { candidatas: 10, gana: 0, pierdeAnte: [], quitaA: [] };
    expect(classifyOverlap(acotada, generica, 10, outcome)).toBe('intencional');
    expect(classifyOverlap(generica, acotada, 10, outcome)).toBe('intencional');
  });

  it('sin acotar, la regla que no gana nada queda anulada', () => {
    const otra = rule({ id: 'o', keyword: 'SPA', priority: 100 });
    expect(classifyOverlap(otra, generica, 2, { candidatas: 2, gana: 0, pierdeAnte: [], quitaA: [] })).toBe('anulada');
  });

  it('sin acotar, perder la mitad o más es sospechoso; perder poco no se marca', () => {
    const otra = rule({ id: 'o', keyword: 'REST', priority: 100 });
    expect(classifyOverlap(otra, generica, 5, { candidatas: 10, gana: 5, pierdeAnte: [], quitaA: [] })).toBe('sospechoso');
    expect(classifyOverlap(otra, generica, 5, { candidatas: 30, gana: 25, pierdeAnte: [], quitaA: [] })).toBe('menor');
  });
});

describe('computeRulesHealth', () => {
  it('encuentra muertas, anuladas, duplicadas internas, compartidas y cortas', () => {
    const rules = [
      rule({ id: 'muerta', keyword: 'NADA COINCIDE', priority: 50 }),
      rule({ id: 'higiene', keyword: 'SPA, PELUQUERIA', priority: 10 }),
      rule({ id: 'rest', keyword: 'REST, CAFE, FIVE GUYS', priority: 90 }),
      rule({ id: 'dup', keyword: 'PET GROOMING, OTRA, PET GROOMING', priority: 5 }),
      rule({ id: 'ropa', keyword: 'DIESEL', priority: 1 }),
      rule({ id: 'gasolina', keyword: 'DIESEL', priority: 2 }),
    ];
    const txs = [
      tx({ id: 't1', comentario: 'FIVE GUYS SPAIN MADRID' }),
      tx({ id: 't2', comentario: 'REST LA BULLA' }),
    ];
    const outcomes = computeRuleOutcomes(rules, txs);
    const health = computeRulesHealth(rules, outcomes);

    expect(health.muertas.map(r => r.id)).toContain('muerta');
    // "SPA" atrapa "SPAIN" pero Restaurantes gana por prioridad: la regla no clasifica nada.
    expect(health.anuladas.map(a => a.rule.id)).toEqual(['higiene']);
    expect(health.anuladas[0].ganadoras).toEqual(['rest']);
    expect(health.duplicadasEnRegla).toEqual([{ rule: rules[3], keywords: ['pet grooming'] }]);
    expect(health.compartidas).toEqual([{ keyword: 'diesel', ruleIds: ['ropa', 'gasolina'] }]);
    expect(health.cortas.map(c => c.keyword)).toEqual(['spa']);
  });

  it('una regla sin problemas no aparece en ningún grupo', () => {
    const limpia = rule({ id: 'ok', keyword: 'NETFLIX, SPOTIFY', priority: 10 });
    const outcomes = computeRuleOutcomes([limpia], [tx({ id: 't', comentario: 'NETFLIX MX' })]);
    const health = computeRulesHealth([limpia], outcomes);
    expect(health).toMatchObject({ muertas: [], anuladas: [], duplicadasEnRegla: [], compartidas: [], cortas: [] });
  });
});
