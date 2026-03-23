/* eslint-disable no-undef */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface IDBDatabase {
  close(): void;
  transaction(storeNames: string[], mode: IDBTransactionMode): IDBTransaction;
  objectStore(name: string): IDBObjectStore;
}

interface IDBOpenDBRequest extends IDBRequest<IDBDatabase> {
  result: IDBDatabase;
  onupgradeneeded: ((event: Event) => void) | null;
}

interface IDBRequest<T> extends EventTarget {
  result: T;
  error: DOMException | null;
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
}

interface IDBTransaction extends EventTarget {
  objectStore(name: string): IDBObjectStore;
  oncomplete: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
}

interface IDBObjectStore {
  put(value: any, key?: IDBValidKey): IDBRequest<any>;
  clear(): IDBRequest<void>;
  getAll(): IDBRequest<any[]>;
  createIndex(name: string, keyPath: string, options?: IDBIndexParameters): IDBIndex;
}

interface IDBIndex {
  name: string;
}

interface IDBIndexParameters {
  unique?: boolean;
}

type IDBTransactionMode = 'readonly' | 'readwrite';

type IDBValidKey = string | number | Date | ArrayBufferView | ArrayBuffer | IDBArrayKey[];

interface IDBArrayKey extends Array<IDBValidKey> {
  [index: number]: IDBValidKey;
}

declare var indexedDB: {
  open(name: string, version?: number): IDBOpenDBRequest;
};
