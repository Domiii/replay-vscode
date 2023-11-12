/**
 * @file VSCode Extension TreeView utility.
 * @see https://github.com/Domiii/dbux/tree/master/dbux-code/src/codeUtil/treeView/BaseTreeViewNodeProvider.js
 */

import isFunction from 'lodash/isFunction';
import { TreeItemCollapsibleState, EventEmitter, window, TreeView, TreeViewExpansionEvent, TreeDataProvider } from 'vscode';
/* @ts-ignore */
import SyncPromise from '@dbux/common/src/util/SyncPromise';
/* @ts-ignore */
import EmptyObject from '@dbux/common/src/util/EmptyObject';
/* @ts-ignore */
import NestedError from '@dbux/common/src/NestedError';
/* @ts-ignore */
import { throttle } from '@dbux/common/src/util/scheduling';
import BaseTreeViewNode from './BaseTreeViewNode';
import { registerCommand } from '../../code-util/registerCommand';
import { getThemeResourcePath } from '../../code-util/codePaths';
import EmptyTreeViewNode from './EmptyNode';
import { Logger, newLogger } from '../../util/logging';

// eslint-disable-next-line no-unused-vars
const { log, debug, warn, error: logError, exception: logException } = newLogger('BaseTreeViewNodeProvider');

const nodeClassIds = new Map<any, number>();
function makeNodeClassId<E, NC extends typeof BaseTreeViewNode<E>>(NodeClass: NC) {
  if (!(NodeClass as any).name) {
    // in production, names might get mangled and/or removed entirely, so we need a different class identifier here
    logError(`NodeClass.name is empty (Terser setup problem?)`);
    let id = nodeClassIds.get(NodeClass);
    if (!id) {
      id = nodeClassIds.size + 1;
      nodeClassIds.set(NodeClass, id);
    }

    return id;
  }
  return NodeClass.name;
}

export interface TreeViewNodeProviderOptions {
  showCollapseAll?: boolean;
  createTreeView?: boolean;
}

export default class BaseTreeViewNodeProvider<
    N extends BaseTreeViewNode<E>,
    E = N['entry']
  > implements TreeDataProvider<N> {
  _onDidChangeTreeData = new EventEmitter<N>();
  onDidChangeTreeData = this._onDidChangeTreeData.event;

  logger: Logger;
  treeViewName: string;
  clickCommandName?: string;
  rootNodes: N[] = [];
  idsCollapsibleState = new Map();
  treeView?: TreeView<N>;

  refreshPromise: SyncPromise;

  /**
   * 
   */
  constructor(viewName: string, options: TreeViewNodeProviderOptions = {}) {
    this.treeViewName = viewName;
    this.logger = newLogger(this.constructor.name);
    this.refreshPromise = new SyncPromise(500);
    const { showCollapseAll = false, createTreeView = true } = options;

    // NOTE: view creation inside the data provider is not ideal, 
    //      but it makes things a lot easier for now
    if (createTreeView) {
      this.treeView = window.createTreeView<N>(viewName, {
        showCollapseAll: showCollapseAll,
        treeDataProvider: this as TreeDataProvider<N>
      });

      this.treeView.onDidCollapseElement(this.handleCollapsibleStateChanged);
      this.treeView.onDidExpandElement(this.handleCollapsibleStateChanged);
    }
    
    registerCommand(
      this.clickCommandName = `${this.treeViewName}.click`,
      (node: N) => this.handleClick(node)
    );
  }

  get defaultTitle() {
    return this.treeView?.title || "";
  }

  /** ###########################################################################
   * treeview controll
   *  #########################################################################*/

  resetTitle() {
    this.setTitle(this.defaultTitle);
  }

  decorateTitle(decoration: string) {
    this.setTitle(`${this.defaultTitle} ${decoration}`);
  }

  setTitle(title: string) {
    if (this.treeView) {
      this.treeView.title = title;
    }
    else {
      throw new Error(`Cannot setTitle before treeView is created.`);
    }
  }

  /**
   * Hackfix: VSCode API does not guarantee `TreeView.reveal` works with `undefined`, but we've tested that it works in VSCode 1.63.2.
   * @see https://code.visualstudio.com/api/references/vscode-api#TreeView
   */
  async showView() {
    return await this.treeView?.reveal(
      /* @ts-ignore */
      undefined
    );
  }

  // ###########################################################################
  // basic event handling
  // ###########################################################################

  /**
   * Re-generate (only starting from root for now)
   * 
   * TODO: allow refreshing sub tree only
   */
  // refresh = () => {
  refresh = throttle(() => {
    try {
      this.rootNodes = this.buildRoots();
      this._decorateNodes(null, this.rootNodes);
      this.handleRefresh();
      this.#invalidate();

      this.refreshPromise.startIfNotStarted();
    }
    catch (err) {
      logException(err, `${this.constructor.name}.refresh() failed`);
    }
  }, 50);

  refreshOnData() {
    return this.refresh();
  }
  // refreshOnData = throttle(() => {
  //   this.refresh();
  // }, 50);

  // repaint = throttle(() => {
  //   this._onDidChangeTreeData.fire();
  // }, 10);

  #invalidate() {
    // NOTE: This works, but the API, for some reason, does not allow a non-Node to be passed in.
    this._onDidChangeTreeData.fire(undefined as any);
  }

  refreshNode = throttle((treeItem: N) => {
    this._onDidChangeTreeData.fire(treeItem);
  }, 50);

  /**
   * Refresh iconPath of rootNodes and its children, then repaint the view
   */
  refreshIcon() {
    this._refreshNodesIconPath(this.rootNodes);
    this.#invalidate();
  }

  _refreshNodesIconPath(nodes: N[] | undefined) {
    if (nodes) {
      nodes.forEach(node => {
        node.iconPath = this.makeNodeIconPath(node);
        this._refreshNodesIconPath(node.children as N[]);
      });
    }
  }

  handleCollapsibleStateChanged = (evt: TreeViewExpansionEvent<N>) => {
    // the event does not actually tell us or modify the state; we have to keep track manually
    const node = evt.element;
    let evtHandler: ((n: N) => void) | undefined;
    switch (node.collapsibleState) {
      case TreeItemCollapsibleState.Collapsed:
        node.collapsibleState = TreeItemCollapsibleState.Expanded;
        evtHandler = this.handleExpanded;
        break;
      case TreeItemCollapsibleState.Expanded:
        node.collapsibleState = TreeItemCollapsibleState.Collapsed;
        evtHandler = this.handleCollapsed;
        break;
      default:
        this.logger.error('invalid node collapsibleState on state change: ', node.collapsibleState, node);
        break;
    }
    node.id && this.idsCollapsibleState.set(node.id, node.collapsibleState);

    // record user action
    const { treeViewName } = this;
    const action = ''; // not a button click
    const nodeId = node.id;
    const args = {
      description: node.description,
      clazz: node.constructor.name,
      collapsibleState: node.collapsibleState
    };

    // node.debug && this.logger.debug(
    //   `[TREEITEM DEBUG] collapsible state changed: ${node.collapsibleState === TreeItemCollapsibleState.Expanded}`);

    // trigger event handlers
    evtHandler?.call(this, node);
  };

  handleExpanded(node: N) {
    node.handleExpanded();
  }

  handleCollapsed(node: N) {
    if (node._handleDeactivate) {
      node._handleDeactivate();
    }
    node.handleCollapsed?.();
  }

  /**
   * @virtual
   */
  handleRefresh() {
    // can be overridden by children
  }

  /**
   * @virtual
   */
  async handleClick(node: N) {
    const { treeViewName } = this;
    const action = ''; // not a button click
    const nodeId = node.id;
    const args = {
      description: node.description,
      clazz: node.constructor.name
    };


    try {
      await node.handleClick?.();
    }
    catch (err) {
      throw new NestedError(`handleClick failed`, err);
    }
  }

  // ###########################################################################
  // building
  // ###########################################################################

  /**
   * 
   * @param node 
   */
  handleBeforeChildren(node: N) {
    // Activate the node.
    if (node._handleActivate) {
      node._handleActivate();
    }
  }

  DefaultNodeClass?: typeof BaseTreeViewNode<E>;
  EmptyNodeDescription?: string;
  getRootEntries?: () => readonly E[];

  buildRoots(): N[] {
    if (this.getRootEntries && this.DefaultNodeClass) {
      const roots = this.getRootEntries().map(entry => this.buildNode(this.DefaultNodeClass!, entry, null));
      if (!roots.length && this.EmptyNodeDescription) {
        roots.push(EmptyTreeViewNode.get(this.EmptyNodeDescription));
      }
      return roots;
    }
    throw new Error('Either "buildRoots" or both, getRootEntries && defaultNodeClass must be implemented.');
  }

  buildNode<NC extends typeof BaseTreeViewNode<E>>(NodeClass: NC, entry: E, parent: N | null, moreProps = EmptyObject) {
    const newProps = NodeClass.makeProperties?.(entry, parent, moreProps, this) || EmptyObject;
    moreProps = {
      entry,
      ...moreProps,
      ...newProps
    };
    const label = moreProps.labelOverride || NodeClass.makeLabel(entry, parent, moreProps, this);
    return new NodeClass(this as any, label, entry, parent, moreProps) as N;
  }

  /**
   * 
   */
  async buildChildren(node: N) {
    node.children = node.buildChildren && await node.buildChildren() || await node.buildChildrenDefault() || [];
    this.decorateChildren(node);
    return node.children;
  }

  /**
   * TODO: Figure out how to better type classes involving generics.
   */
  buildNodes(nodeClasses: any[] | undefined, parent: N) {
    if (!nodeClasses) {
      return null;
    }

    return nodeClasses
      .map(Clazz => {
        const props = (Clazz.makeChildPropsDefault || BaseTreeViewNode.makeChildPropsDefault)?.(Clazz);
        return this.buildNode(Clazz, parent.entry, parent, props);
      })
      .filter(node => !!node);
  }

  decorateChildren(node: N) {
    if (node.children) {
      this._decorateNodes(node, node.children as N[]);
    }
  }

  // ###########################################################################
  // per-node operations
  // ###########################################################################

  makeNodeId<NC extends typeof BaseTreeViewNode<E>>(NodeClass: NC, parent: N | null, i: number) {
    const nodeClassId = makeNodeClassId(NodeClass as any);
    return [parent?.id || '', nodeClassId, i].join('..');
  }

  makeNodeIconPath(node: N) {
    const relativeIconPath = node.makeIconPath?.();
    return relativeIconPath && getThemeResourcePath(relativeIconPath) || undefined;
  }

  _decorateNodes(parent: N | null, children: readonly N[]) {
    const childIndexes = new Map();

    // assign ids
    children.forEach((child) => {
      if (isFunction(child)) {
        throw new Error(`TreeNode should not be (but is) a function. Maybe you forgot to call makeTreeItem(s)? - ${child.toString()}`);
      }
      // generate id (based on node type and position in tree)
      const lastIdx = childIndexes.get(child.constructor) || 0;
      const index = lastIdx + 1;
      childIndexes.set(child.constructor, index);

      const id = child.id || this.makeNodeId(child.constructor as any, parent, index);

      // decorate based on id
      this._decorateNewNode(child, id);
    });
  }

  private _decorateNewNode(node: N, id: string) {
    // id
    if (id) {
      /**
       * WARNING: if an `id` is set, VSCode will IGNORE any explicit setting of `collapsibleState` or selection state,
       * when rendering a second or any following time, no matter if `TreeItem` is newly created or not.
       * @see https://code.visualstudio.com/api/references/vscode-api#TreeItem → #id
       */
      node.id = id;
    }

    // TODO: keep track of all node ids, since VSCode shows an error to the user if we don't do it right (and does not allow us to even log it)

    // iconPath
    node.iconPath = this.makeNodeIconPath(node);

    // collapsibleState
    // if ('collapsibleStateOverride' in node) {
    if (node.collapsibleState !== TreeItemCollapsibleState.None || !id) {
      // just keep it
      node.collapsibleState = node.collapsibleState;
    }
    else if (node.children?.length || this._canNodeProduceChildren(node)) {
      let collapsibleState = this.idsCollapsibleState.get(id);
      if (collapsibleState === undefined) {
        collapsibleState = node.defaultCollapsibleState || TreeItemCollapsibleState.Collapsed;
        // this.idsCollapsibleState.set(id, collapsibleState);
      }
      node.collapsibleState = collapsibleState;
    }
    else {
      // future-work: DON'T OVERRIDE TreeItemCollapsibleState IF THE NODE ALREADY WAS DEFINED WITH THE STATE IT WANTS (*yargs*)
      node.collapsibleState = node.defaultCollapsibleState || TreeItemCollapsibleState.None;
    }

    // node.debug && this.logger.debug(
    //   `[TREEITEM DEBUG] new node: ${node.collapsibleState === TreeItemCollapsibleState.Expanded}`);

    // click handler
    this._initializeNodeCommand(node);

    // if (node.collapsibleState === TreeItemCollapsibleState.Expanded) {
    //   // generate children right away?
    // }

    // init
    node.init?.();
    node._handleActivate();

    if (node.children) {
      // this node has built-in children
      this._decorateNodes(node, node.children as N[]);
    }

    return node;
  }

  private _initializeNodeCommand(node: N) {
    const commandName = node.clickCommandName || this.clickCommandName;

    if (!commandName) {
      return;
    }

    node.command = {
      title: commandName,
      command: commandName,
      arguments: [node]
    };
  }


  // ###########################################################################
  // overriding TreeDataProvider
  // ###########################################################################

  getTreeItem = (node: N) => {
    return node;
  };

  /**
   * 
   */
  async getChildren(node: N) {
    // this.logger.debug(`getChildren ${node?.label || node}`);
    const children = await this._getChildren(node);
    this.refreshPromise.resolve(children);
    return children;
  }

  private async _getChildren(node: N): Promise<N[]> {
    try {
      if (node) {
        this.handleBeforeChildren(node);
        if (this._canNodeProduceChildren(node)) {
          return (node.children = await this.buildChildren(node)) as N[];
        }
        if (node.children) {
          return node.children as N[];
        }
        return [];
      }
      else {
        return this.rootNodes;
      }
    }
    catch (err) {
      this.logger.error(`${this.constructor.name}.getChildren() failed`, err);
      // debugger;
      throw err;
    }
  }

  _canNodeProduceChildren(node: N) {
    if (node.canHaveChildren) {
      // if it has `canHaveChildren`, then use it!
      return node.canHaveChildren();
    }
    return !!node.buildChildren;
  }

  /** ###########################################################################
    * helper
    *  #########################################################################*/

  /**
   * Find root of given class.
   * @param {*} clazz A node class that extends `BaseTreeViewNode` 
   * @return {BaseTreeViewNode}
   */
  getRootByClass(clazz: any) {
    return this.rootNodes.find(node => node instanceof clazz);
  }
}