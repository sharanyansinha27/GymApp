declare module 'firebase/firestore' {
  export interface Firestore {}
  export interface DocumentData {
    [key: string]: any;
  }
  export interface DocumentSnapshot<T = DocumentData> {
    exists(): boolean;
    data(): T | undefined;
    id: string;
  }
  export interface QuerySnapshot<T = DocumentData> {
    docs: DocumentSnapshot<T>[];
    forEach(callback: (result: DocumentSnapshot<T>) => void, thisArg?: any): void;
    empty: boolean;
    size: number;
  }
  export interface Transaction {
    get<T = DocumentData>(documentRef: any): Promise<DocumentSnapshot<T>>;
    set(documentRef: any, data: any, options?: any): Transaction;
    update(documentRef: any, data: any): Transaction;
    delete(documentRef: any): Transaction;
  }

  export function initializeFirestore(app: any, settings: any, databaseId?: string): Firestore;
  export function getFirestore(app?: any, databaseId?: string): Firestore;
  export function persistentLocalCache(options?: any): any;
  export function persistentMultipleTabManager(): any;
  export function doc(db: Firestore | any, path: string, ...pathSegments: string[]): any;
  export function collection(db: Firestore | any, path: string, ...pathSegments: string[]): any;
  export function onSnapshot(
    reference: any,
    onNext: (snapshot: any) => void,
    onError?: (error: any) => void
  ): () => void;
  export function setDoc(reference: any, data: any, options?: any): Promise<void>;
  export function updateDoc(reference: any, data: any): Promise<void>;
  export function getDoc(reference: any): Promise<DocumentSnapshot>;
  export function serverTimestamp(): any;
  export function query(collectionRef: any, ...queryConstraints: any[]): any;
  export function where(fieldPath: string, opStr: string, value: any): any;
  export function runTransaction<T>(
    db: Firestore,
    updateFunction: (transaction: Transaction) => Promise<T>
  ): Promise<T>;
}
