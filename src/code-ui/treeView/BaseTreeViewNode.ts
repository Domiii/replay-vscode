/* @ts-ignore */
import EmptyObject from "@dbux/common/src/util/EmptyObject";
/* @ts-ignore */
import EventHandlerList from "@dbux/common/src/util/EventHandlerList";
import { TreeItem } from "vscode";
import BaseTreeViewNodeProvider from "./BaseTreeViewNodeProvider";

/** @typedef {import('@dbux/data/src/pathways/UserActionType').default} UserActionType */
/** @typedef {import('./BaseTreeViewNodeProvider').default} BaseTreeViewNodeProvider */

export default class BaseTreeViewNode<
  E
> extends TreeItem {
  entry: E;
  parent: BaseTreeViewNode<E> | null;
  children?: BaseTreeViewNode<E>[] = undefined;

  /**
   * Classes of child nodes to be generated (one per class).
   * Is only used if `buildChildren` is not implemented.
   */
  childClasses?: BaseTreeViewNode<E>[] = undefined;

  treeNodeProvider: BaseTreeViewNodeProvider<BaseTreeViewNode<E>>;

  private _activeEventHandlers = new EventHandlerList();

  // NOTE: There is no proper way to have TS static function parameter types line up with the class parameters.
  static makeLabel(entry: any, parent: any, moreProps: any, provider: any) {
    return "(unnamed node)";
  }

  static makeProperties?: (
    entry: any,
    parent: any,
    moreProps: any,
    provider: any
  ) => any = undefined;

  static makeChildPropsDefault<
    E,
    N extends BaseTreeViewNode<E>,
    P extends BaseTreeViewNodeProvider<N>
  >(entry: E, parent: N | null, moreProps: any, provider: P) {
    return EmptyObject;
  }

  constructor(
    treeNodeProvider: BaseTreeViewNodeProvider<BaseTreeViewNode<E>>,
    label: string,
    entry: E = EmptyObject,
    parent: BaseTreeViewNode<E> | null = null,
    moreProps: any = null
  ) {
    super(label, moreProps?.collapsibleState);

    this.entry = entry;
    this.treeNodeProvider = treeNodeProvider;
    this.parent = parent;

    // treeItem data
    this.contextValue = this.constructor.name;

    // more custom props for this node
    Object.assign(this, moreProps);
  }

  get defaultCollapsibleState() {
    return null;
  }

  /**
   * If this returns a name, clicking this node will execute the given command.
   * 
   * @virtual
   * @return {string | null} The name of a pre-defined (package.json) command.
   */
  get clickCommandName(): string | null {
    return null;
  }

  /**
   * @virtual
   */
  init() {}

  /**
   * @virtual
   */
  buildChildren?: <N extends BaseTreeViewNode<E>>() => N[] = undefined;

  /**
   * @virtual
   * @return true if it has `children` or a `buildChildren` method or childClasses (used by buildChildrenDefault)
   */
  canHaveChildren() {
    return !!this.children || !!this.buildChildren || !!this.childClasses;
  }

  /**
   * @virtual
   */
  makeIconPath() {
    // default: no icon
    return "";
  }

  /**
   * @virtual
   */
  handleClick() {
    // default: do nothing
  }

  /**
   * @virtual
   */
  handleExpanded() {
    // default: do nothing
  }

  /**
   * @virtual
   */
  handleCollapsed() {
    // default: do nothing
  }

  buildChildrenDefault(): BaseTreeViewNode<E>[] | null {
    return this.treeNodeProvider.buildNodes(this.childClasses, this);
  }

  // /**
  //  * @virtual
  //  */
  // buildChildren() {
  //   // default: no children
  // }

  /** ###########################################################################
   * event handlers (usually active while node is expanded)
   * ##########################################################################*/

  _activated = 0;

  get isActivated() {
    return !!this._activated;
  }

  /**
   * @virtual
   */
  onActivate() {}

  _handleActivate() {
    if (!this.isActivated) {
      this.onActivate();
      ++this._activated;
    }
  }

  _handleDeactivate() {
    if (this.isActivated) {
      this._activeEventHandlers?.unsubscribe();
      this._activeEventHandlers = null;
      --this._activated;
    }
  }
}
