import DataStore from "../util/DataStore";

export type UserValue = {
  id: string;
};

export default class UserKeyValueStore extends DataStore<UserValue> {
  async getOrAskUser(key: string) {
    // TODO
  }
}
