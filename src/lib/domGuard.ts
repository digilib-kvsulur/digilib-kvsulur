/**
 * DOM Mutation Guard
 *
 * Prevents React from crashing when external scripts or browser features
 * (such as Google Translate, Google AdSense auto-ads, Password Managers, or browser extensions)
 * modify, wrap, or re-parent DOM nodes behind React's back.
 *
 * Specifically addresses:
 * - DOMException: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.
 * - DOMException: Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.
 * - DOMException: Failed to execute 'replaceChild' on 'Node': The node to be replaced is not a child of this node.
 */

export function installDomMutationGuard() {
  if (typeof window === "undefined" || typeof Node === "undefined" || !Node.prototype) {
    return;
  }

  const g = window as any;
  if (g.__DLMS_DOM_GUARD_INSTALLED__) return;
  g.__DLMS_DOM_GUARD_INSTALLED__ = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (!child) return child;
    if (child.parentNode !== this) {
      if (import.meta.env?.DEV) {
        console.warn(
          "[DOMGuard] Prevented removeChild crash: node is not a direct child of parent.",
          { child, parent: this, actualParent: child.parentNode }
        );
      }
      if (child.parentNode) {
        try {
          return child.parentNode.removeChild(child) as T;
        } catch {
          return child;
        }
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (!newNode) return newNode;
    if (referenceNode && referenceNode.parentNode !== this) {
      if (import.meta.env?.DEV) {
        console.warn(
          "[DOMGuard] Prevented insertBefore crash: reference node is not a child of parent.",
          { newNode, referenceNode, parent: this, actualParent: referenceNode.parentNode }
        );
      }
      if (referenceNode.parentNode) {
        try {
          return referenceNode.parentNode.insertBefore(newNode, referenceNode) as T;
        } catch {
          return newNode;
        }
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };

  const originalReplaceChild = Node.prototype.replaceChild;
  Node.prototype.replaceChild = function <T extends Node>(newChild: Node, oldChild: T): T {
    if (!newChild || !oldChild) return oldChild;
    if (oldChild.parentNode !== this) {
      if (import.meta.env?.DEV) {
        console.warn(
          "[DOMGuard] Prevented replaceChild crash: old node is not a child of parent.",
          { newChild, oldChild, parent: this, actualParent: oldChild.parentNode }
        );
      }
      if (oldChild.parentNode) {
        try {
          return oldChild.parentNode.replaceChild(newChild, oldChild) as T;
        } catch {
          return oldChild;
        }
      }
      return oldChild;
    }
    return originalReplaceChild.call(this, newChild, oldChild) as T;
  };
}

// Auto-run on import
installDomMutationGuard();
