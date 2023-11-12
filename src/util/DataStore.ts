import { EventEmitter } from "tseep";
import EmptyArray from "./EmptyArray";

export type KeyType = number | string;

export type KeyedData<K> = {
  id: K;
};

type EventMap<V extends KeyedData<K>, K extends KeyType = V['id']> = {
  update: (data: readonly V[], newData: readonly V[]) => void;
};

export default class DataStore<V extends KeyedData<K>, K extends KeyType = V['id']> implements Iterable<V> {
  private _data: V[] = [];
  private dataByKey = new Map<K, V>;
  private _events = new EventEmitter<EventMap<V, K>>();

  get data(): readonly V[] {
    return this._data;
  }

  get events(): typeof this._events {
    return this._events;
  }

  /** ###########################################################################
   * queries
   * ##########################################################################*/

  /**
   * Some stores allow dynamically querying a value if its not cached yet.
   */
  async queryByKey(k: K) {
    throw new Error(`queryByKey not supported for ${this.constructor.name}`);
  }

  getByKey(k: K) {
    return this.dataByKey.get(k);
  }
  
  *[Symbol.iterator](): IterableIterator<V> {
    yield *this._data;
  }

  /** ###########################################################################
   * add
   * ##########################################################################*/

  private addSilent(v: V) {
    this._data.push(v);
    this.dataByKey.set(v.id, v);
  }

  add(v: V) {
    this.addSilent(v);
    this._events.emit("update", this._data, [v]);
  }

  addAll(vs: V[]) {
    for (const v of vs) {
      this.addSilent(v);
    }
    this._events.emit("update", this._data, vs);
  }

  /** ###########################################################################
   * set + clear
   * ##########################################################################*/

  set(vs: V[]) {
    this.clearSilent();
    this.addAll(vs);
  }

  clear() {
    this.clearSilent();
    this._events.emit("update", this._data, EmptyArray);
  }

  private clearSilent() {
    this._data = [];
    this.dataByKey = new Map();
  }
}
