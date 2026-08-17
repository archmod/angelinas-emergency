import type { AsciiLevelDef } from '@/core/level/asciiLevel';

/**
 * School 1 — "Hall Pass". Indoors: lockers along the corridors are hiding spots, teachers watch
 * their classroom doors, a hall monitor sprints the middle corridor and a camera covers the exit
 * corridor. The bathroom stall is the pinned spot; the optional exposed one is… the middle of the room.
 */
export const SCHOOL_01: AsciiLevelDef = {
  meta: { id: 'school-01', world: 'school', name: 'Hall Pass', parSeconds: 90, urgencySeconds: 120 },
  defaultGround: 'floor',
  map: [
    '#############################################',
    '#P__________________________________________#',
    '#L_______________________________________c__#',
    '#L____#######____#######____#######________X#',
    '#_____#_____#____#_____#____#_____#________X#',
    '#_____#__k__#____#__m__#____#__n__#_________#',
    '#_____#_____#____#_____#____#_____#_________#',
    '#_____###_###____###_###____###_###_________#',
    '#___________________________________________#',
    '#_a______________________________________b__#',
    '#___________________________________________#',
    '#_____###_###____###_###____###_#####_______#',
    '#_____#_____#____#_____#____#___S___#_______#',
    '#_____#__j__#____#_____#____#___%___#_______#',
    '#_____#_____#____#_____#____#########_______#',
    '#L__________________________________________#',
    '#L_______d____________________________e_____#',
    '#############################################',
  ],
  enemies: [
    { kind: 'teacher', at: 'k', scanDeg: [60, 120] },
    { kind: 'teacher', at: 'm', scanDeg: [60, 120] },
    { kind: 'teacher', at: 'n', scanDeg: [60, 120] },
    { kind: 'hallMonitor', patrol: 'ab', mode: 'pingpong' },
    { kind: 'janitor', patrol: 'de', mode: 'pingpong' },
    { kind: 'teacher', at: 'j', scanDeg: [-120, -60] },
    { kind: 'camera', at: 'c', scanDeg: [120, 240] },
  ],
  rules: { exitRequired: true },
};
