export type SceneId = 'invitation' | 'schedule' | 'venue' | 'address' | 'recap';

export type Scenario = {
  id: string;
  sender: string;
  guest: string;
  flow: SceneId[];
};

export const scenarios: Record<string, Scenario> = {
  '26090e3101b20461625aee51': {
    id: '26090e3101b20461625aee51',
    sender: 'Florent',
    guest: 'Cécile',
    flow: ['invitation', 'schedule', 'venue', 'address', 'recap'],
  },
};

export function getScenario(id: string) {
  return scenarios[id] ?? null;
}
