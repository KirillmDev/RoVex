export const contributors = [
  { id: '10436912462', username: 'VexorCreator', owner: true },
  { id: '4828786884', username: 'Othrylz', owner: false },
  { id: '11153363529', username: 'DevNamedKirill', owner: false },
] as const;

export type Contributor = (typeof contributors)[number];
export type ContributorId = Contributor['id'];
