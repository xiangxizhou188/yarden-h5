import {describe,it,expect} from 'vitest';
import {filterLaborPlans,nextUnarranged} from './labor-plan';
import type {LaborPlanItem} from './types';
const item=(id:string,date:string,arranged=false)=>({id,plannedDate:date,arranged,facilityName:'A',roomName:id} as LaborPlanItem);
describe('next pending arrangement',()=>{
  it('selects the oldest pending task without mutating list order',()=>{
    const rows=[item('future','2026-10-20'),item('done','2026-10-01',true),item('overdue','2026-10-10'),item('today','2026-10-13')];
    expect(nextUnarranged(rows)?.id).toBe('overdue');expect(rows[0].id).toBe('future');
    expect(nextUnarranged(rows.map(row=>row.id==='overdue'?{...row,arranged:true}:row))?.id).toBe('today');
  });
  it('uses only the supplied filter scope and handles all arranged/empty',()=>{
    expect(nextUnarranged([])).toBeNull();expect(nextUnarranged([item('a','2026-10-13',true)])).toBeNull();
    expect(nextUnarranged([item('z','2026-10-13'),item('a','2026-10-13')])?.id).toBe('a');
  });
});

describe('labor list filtering',()=>{
  it('puts pending dates first and combines date and arrangement filters',()=>{
    const rows=[item('done','2026-10-01',true),item('future','2026-10-20'),item('today','2026-10-13')];
    expect(filterLaborPlans(rows).map(row=>row.id)).toEqual(['today','future','done']);
    expect(rows[0].id).toBe('done');
    expect(filterLaborPlans(rows,'2026-10-13','pending').map(row=>row.id)).toEqual(['today']);
    expect(filterLaborPlans(rows,'2026-10-13','arranged')).toEqual([]);
    expect(filterLaborPlans(rows,'','arranged').map(row=>row.id)).toEqual(['done']);
    expect(filterLaborPlans(rows.map(row=>row.id==='today'?{...row,arranged:true}:row)).map(row=>row.id)).toEqual(['future','done','today']);
  });
});
