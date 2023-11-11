import EmptyObject from '../../util/EmptyObject';
import BaseTreeViewNode from './BaseTreeViewNode';

export default class EmptyTreeViewNode extends BaseTreeViewNode<object> {
  /**
   * @param {string} label 
   * @param {string} description 
   * @returns {TreeItem}
   */
  static get(description: string, label = '') {
    if (!EmptyTreeViewNode._instances[label]) {
      EmptyTreeViewNode._instances[label] = {};
    }
    if (!EmptyTreeViewNode._instances[label][description]) {
      EmptyTreeViewNode._instances[label][description] = new EmptyTreeViewNode(null as any, label, EmptyObject, null, { description });
    }
    return EmptyTreeViewNode._instances[label][description];
  }

  static _instances = {};
}