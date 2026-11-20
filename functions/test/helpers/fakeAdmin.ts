/**
 * In-memory stand-in for the parts of firebase-admin the functions use.
 *
 * test/setup.ts swaps the firebase-admin/* modules for the fakes below in
 * every test file.
 *
 * Firestore documents live in `store`, keyed by full path
 * (e.g. "books/b1/records/r1"), so tests can seed data and then assert on
 * what is left after a function runs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Data = Record<string, any>;
type Filter = {field: string; op: string; value: any};

export const store = new Map<string, Data>();

/** Parent collection path of a document path. */
function parentOf(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

function matches(data: Data, filter: Filter): boolean {
  const actual = data[filter.field];
  switch (filter.op) {
    case "==":
      return actual === filter.value;
    case "<=":
      return actual != null && actual <= filter.value;
    default:
      throw new Error(`Unsupported operator in fake: ${filter.op}`);
  }
}

export class FakeDocSnapshot {
  constructor(readonly ref: FakeDocRef, private readonly _data?: Data) {}

  get id(): string {
    return this.ref.id;
  }

  get exists(): boolean {
    return this._data !== undefined;
  }

  data(): Data | undefined {
    return this._data;
  }

  get(field: string): any {
    return this._data?.[field];
  }
}

export class FakeDocRef {
  readonly id: string;

  constructor(readonly path: string) {
    this.id = path.split("/").pop() as string;
  }

  async get(): Promise<FakeDocSnapshot> {
    const data = store.get(this.path);
    return new FakeDocSnapshot(this, data && {...data});
  }

  async update(patch: Data): Promise<void> {
    const existing = store.get(this.path);
    if (!existing) {
      throw new Error(`NOT_FOUND: ${this.path}`);
    }
    store.set(this.path, {...existing, ...patch});
  }

  async delete(): Promise<void> {
    store.delete(this.path);
  }
}

export class FakeQuery {
  constructor(
      private readonly path: string,
      private readonly filters: Filter[] = [],
  ) {}

  doc(id: string): FakeDocRef {
    return new FakeDocRef(`${this.path}/${id}`);
  }

  where(field: string, op: string, value: any): FakeQuery {
    return new FakeQuery(this.path, [...this.filters, {field, op, value}]);
  }

  async get(): Promise<{docs: FakeDocSnapshot[]; size: number}> {
    const docs = [...store.entries()]
        .filter(([path]) => parentOf(path) === this.path)
        .filter(([, data]) => this.filters.every((f) => matches(data, f)))
        .map(([path, data]) => new FakeDocSnapshot(new FakeDocRef(path), {...data}));
    return {docs, size: docs.length};
  }
}

export const db = {
  collection: (path: string) => new FakeQuery(path),
  doc: (path: string) => new FakeDocRef(path),
};

export const messaging = {send: jest.fn()};
export const auth = {deleteUser: jest.fn()};

const apps: unknown[] = [];

/** Fakes for each firebase-admin entry point, keyed by module name. */
export const fakeModules = {
  "firebase-admin/app": {
    getApps: () => apps,
    initializeApp: jest.fn((options: unknown) => {
      apps.push(options);
    }),
    cert: jest.fn((serviceAccount: unknown) => ({serviceAccount})),
  },
  "firebase-admin/firestore": {getFirestore: () => db},
  "firebase-admin/messaging": {getMessaging: () => messaging},
  "firebase-admin/auth": {getAuth: () => auth},
};

/** Clears Firestore data and restores default mock behaviour. */
export function resetFakeAdmin(): void {
  store.clear();
  messaging.send.mockReset().mockResolvedValue("message-id");
  auth.deleteUser.mockReset().mockResolvedValue(undefined);
}

/** Seeds Firestore documents keyed by full path. */
export function seed(docs: Record<string, Data>): void {
  for (const [path, data] of Object.entries(docs)) {
    store.set(path, data);
  }
}

/** Paths of all documents currently stored, sorted. */
export function storedPaths(): string[] {
  return [...store.keys()].sort();
}
