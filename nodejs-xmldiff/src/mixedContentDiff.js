'use strict';

/**
 * Fine-grained mixed-content alignment.
 *
 * For elements present in both documents, rebuild children by aligning
 * old/new child token sequences (text + element refs by @id).
 * Emits `_diff_text` markers (diffing-version old/new) for text changes
 * instead of dual-snapshotting the whole parent.
 *
 * Identified element children reuse the already-merged nodes (including
 * leaf dual-snapshots produced by XSLT).
 */

const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

function serialize(node) {
  return new XMLSerializer().serializeToString(node);
}

function isWs(s) {
  return !s || !/\S/.test(s);
}

function depthOf(el) {
  let d = 0;
  for (let n = el.parentNode; n; n = n.parentNode) d++;
  return d;
}

function tokenize(parent) {
  const tokens = [];
  for (let n = parent.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 3) {
      if (!isWs(n.nodeValue)) tokens.push({ kind: 'text', value: n.nodeValue });
    } else if (n.nodeType === 1) {
      const id = n.getAttribute && n.getAttribute('id');
      if (id) tokens.push({ kind: 'el', id, name: n.nodeName });
      else tokens.push({ kind: 'anon', name: n.nodeName, xml: serialize(n) });
    }
  }
  return tokens;
}

function lcsAlign(a, b, equal) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = equal(a[i], b[j])
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (equal(a[i], b[j])) {
      ops.push({ op: 'eq', a: a[i], b: b[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ op: 'del', a: a[i] });
      i++;
    } else {
      ops.push({ op: 'ins', b: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ op: 'del', a: a[i++] });
  while (j < m) ops.push({ op: 'ins', b: b[j++] });
  return ops;
}

function tokenEqual(x, y) {
  if (x.kind !== y.kind) return false;
  if (x.kind === 'text') return x.value === y.value;
  if (x.kind === 'el') return x.id === y.id;
  if (x.kind === 'anon') return x.name === y.name && x.xml === y.xml;
  return false;
}

function wordDiff(oldText, newText) {
  const ow = oldText.split(/(\s+)/);
  const nw = newText.split(/(\s+)/);
  return lcsAlign(ow, nw, (a, b) => a === b);
}

function appendTextMarker(doc, parent, version, text) {
  const el = doc.createElement('_diff_text');
  el.setAttribute('diffing-version', version);
  el.appendChild(doc.createTextNode(text));
  parent.appendChild(el);
}

function appendWordDiff(doc, parent, oldText, newText) {
  const ops = wordDiff(oldText, newText);
  for (const op of ops) {
    if (op.op === 'eq') {
      if (op.a) parent.appendChild(doc.createTextNode(op.a));
    } else if (op.op === 'del') {
      if (op.a && !isWs(op.a)) appendTextMarker(doc, parent, 'old', op.a);
      else if (op.a) parent.appendChild(doc.createTextNode(op.a));
    } else if (op.op === 'ins') {
      if (op.b && !isWs(op.b)) appendTextMarker(doc, parent, 'new', op.b);
      else if (op.b) parent.appendChild(doc.createTextNode(op.b));
    }
  }
}

function findById(doc, id) {
  const all = doc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].getAttribute && all[i].getAttribute('id') === id) return all[i];
  }
  return null;
}

function findAnon(parent, token) {
  for (let n = parent.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && n.nodeName === token.name && !n.getAttribute('id')) {
      if (serialize(n) === token.xml) return n;
    }
  }
  for (let n = parent.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && n.nodeName === token.name && !n.getAttribute('id')) {
      return n;
    }
  }
  return null;
}

/** Collect identified element children (dual-snapshots share an id). */
function collectSavedById(el) {
  const byId = new Map();
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType !== 1) continue;
    const id = n.getAttribute && n.getAttribute('id');
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(n);
  }
  return byId;
}

function appendSaved(parent, savedById, id) {
  const nodes = savedById.get(id);
  if (!nodes || !nodes.length) return false;
  for (const n of nodes) parent.appendChild(n);
  savedById.delete(id);
  return true;
}

function collapseAdjacentTextMarkers(doc, parent) {
  const nodes = Array.from(parent.childNodes);
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    if (
      a.nodeType === 1 &&
      b.nodeType === 1 &&
      a.nodeName === '_diff_text' &&
      b.nodeName === '_diff_text' &&
      a.getAttribute('diffing-version') === 'old' &&
      b.getAttribute('diffing-version') === 'new'
    ) {
      const oldT = a.textContent || '';
      const newT = b.textContent || '';
      const frag = doc.createDocumentFragment();
      appendWordDiff(doc, frag, oldT, newT);
      parent.insertBefore(frag, a);
      parent.removeChild(a);
      parent.removeChild(b);
      return collapseAdjacentTextMarkers(doc, parent);
    }
  }
}

/**
 * Rebuild mixed children for shared id-elements from old/new sources.
 */
function refineMixedContent(mergedXml, oldXml, newXml, options = {}) {
  const doWordDiff = options.wordDiff === true;
  const parser = new DOMParser();
  const merged = parser.parseFromString(mergedXml, 'application/xml');
  const oldDoc = parser.parseFromString(oldXml, 'application/xml');
  const newDoc = parser.parseFromString(newXml, 'application/xml');

  const candidates = [];
  const all = merged.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    const id = el.getAttribute && el.getAttribute('id');
    if (!id) continue;
    if (el.nodeName === '_diff_text' || el.nodeName === '_diff_old_attrs') continue;
    const ver = el.getAttribute('diffing-version');
    if (ver === 'old' || ver === 'new') continue;
    // Skip dual-snapshot parents (anonymous structural children)
    const kids = [];
    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1) kids.push(n);
    }
    if (kids.some((c) => c.getAttribute && c.getAttribute('diffing-version') === 'old'
      && c.getAttribute('id') === id)) {
      // parent dualized as whole (same id on versioned copies) — not our case
    }
    // Parent that is itself a dual pair member already skipped via ver check.
    // Skip if first child element is a same-tag dual snapshot wrapper pattern:
    // when children include a node with diffing-version=old AND same nodeName as parent? No.
    // Dual-snapshot of THIS element appears as sibling, not child.
    // Dual-snapshot of anonymous content: children marked diffing-version old/new
    // with the parent's content — detected when a child has diffing-version and
    // NO id (or when two children are full dual of parent content).
    // Existing XSLT marks the dualized PARENT with diffing-version, so those
    // are already skipped. Anonymous dual puts two copies of the parent.
    candidates.push(el);
  }

  // Deepest first so nested leaves keep XSLT duals before parent rebuild
  candidates.sort((a, b) => depthOf(b) - depthOf(a));

  for (const el of candidates) {
    const id = el.getAttribute('id');
    const oldEl = findById(oldDoc, id);
    const newEl = findById(newDoc, id);
    if (!oldEl || !newEl) continue;

    // Do not refine parents that XSLT dual-snapshotted for anonymous children:
    // those appear as two sibling elements with diffing-version; this el wouldn't
    // have ver. Instead check: if any direct child has diffing-version old and
    // is NOT an identified leaf dual (i.e. child id differs or missing).
    // Actually anonymous dual replaces the parent itself with two versions.
    // Identified-child duals are fine to keep via savedById.

    const oldTok = tokenize(oldEl);
    const newTok = tokenize(newEl);
    const hasText =
      oldTok.some((t) => t.kind === 'text') || newTok.some((t) => t.kind === 'text');
    if (!hasText) continue;

    const same =
      oldTok.length === newTok.length &&
      oldTok.every((t, i) => tokenEqual(t, newTok[i]));
    if (same) continue;

    const savedById = collectSavedById(el);
    const ops = lcsAlign(oldTok, newTok, tokenEqual);

    // Preserve attribute restore marker across rebuild
    let attrMarker = null;
    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1 && n.nodeName === '_diff_old_attrs') {
        attrMarker = n;
        break;
      }
    }

    while (el.firstChild) el.removeChild(el.firstChild);
    if (attrMarker) el.appendChild(attrMarker);

    for (const op of ops) {
      if (op.op === 'eq') {
        if (op.a.kind === 'text') {
          el.appendChild(merged.createTextNode(op.a.value));
        } else if (op.a.kind === 'el') {
          if (!appendSaved(el, savedById, op.a.id)) {
            const src = findById(newDoc, op.a.id) || findById(oldDoc, op.a.id);
            if (src) el.appendChild(src.cloneNode(true));
          }
        } else if (op.a.kind === 'anon') {
          const src = findAnon(newEl, op.b || op.a);
          if (src) el.appendChild(src.cloneNode(true));
        }
      } else if (op.op === 'del') {
        if (op.a.kind === 'text') {
          appendTextMarker(merged, el, 'old', op.a.value);
        } else if (op.a.kind === 'el') {
          if (!appendSaved(el, savedById, op.a.id)) {
            const src = findById(oldDoc, op.a.id);
            if (src) {
              const clone = src.cloneNode(true);
              clone.setAttribute('diffing', 'deleted');
              el.appendChild(clone);
            }
          }
        } else if (op.a.kind === 'anon') {
          const src = findAnon(oldEl, op.a);
          if (src) {
            const clone = src.cloneNode(true);
            clone.setAttribute('diffing', 'deleted');
            el.appendChild(clone);
          }
        }
      } else if (op.op === 'ins') {
        if (op.b.kind === 'text') {
          appendTextMarker(merged, el, 'new', op.b.value);
        } else if (op.b.kind === 'el') {
          if (!appendSaved(el, savedById, op.b.id)) {
            const src = findById(newDoc, op.b.id);
            if (src) {
              const clone = src.cloneNode(true);
              if (!clone.getAttribute('diffing')) clone.setAttribute('diffing', 'new');
              el.appendChild(clone);
            }
          }
        } else if (op.b.kind === 'anon') {
          const src = findAnon(newEl, op.b);
          if (src) {
            const clone = src.cloneNode(true);
            clone.setAttribute('diffing', 'new');
            el.appendChild(clone);
          }
        }
      }
    }

    if (doWordDiff) collapseAdjacentTextMarkers(merged, el);
  }

  return serialize(merged);
}

module.exports = {
  refineMixedContent,
  tokenize,
  lcsAlign,
  wordDiff,
  tokenEqual,
};
