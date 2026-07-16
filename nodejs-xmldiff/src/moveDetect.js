'use strict';

/**
 * LCS-based move detection for the ID-diff algorithm.
 *
 * An id is moved when it exists in both versions and either:
 *  - nearest parent @id differs, or
 *  - under the same parent, it is absent from an LCS of the two ordered
 *    child-id lists (positional change not explained by insert/delete alone).
 */

function lcsSet(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = 1 + dp[i + 1][j + 1];
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const set = new Set();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      set.add(a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return set;
}

/**
 * Parse id-bearing element tree.
 * Returns Map id -> { parentId: string|null }
 * and Map parentKey -> childIds[] where parentKey is parentId or ''.
 */
function indexById(xml) {
  const byId = new Map();
  const children = new Map([['', []]]);
  const stack = []; // { hasId: boolean, id: string|null }

  const tokenizer = /<\/?([A-Za-z_][\w.-]*)([^>]*?)\/?>/g;
  let match;
  while ((match = tokenizer.exec(xml))) {
    const full = match[0];
    const attrs = match[2] || '';
    const idMatch = attrs.match(/\bid\s*=\s*["']([^"']+)["']/);
    const id = idMatch ? idMatch[1] : null;

    if (full.startsWith('</')) {
      stack.pop();
      continue;
    }

    const selfClosing = /\/>$/.test(full);
    let parentId = null;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].id) {
        parentId = stack[i].id;
        break;
      }
    }

    if (id) {
      const pKey = parentId || '';
      if (!children.has(pKey)) children.set(pKey, []);
      children.get(pKey).push(id);
      byId.set(id, { parentId });
    }

    if (!selfClosing) {
      stack.push({ id: id || null });
    }
  }

  return { byId, children };
}

function findMovedIds(oldXml, newXml) {
  const oldI = indexById(oldXml);
  const newI = indexById(newXml);
  const moved = new Set();

  for (const [id, neu] of newI.byId) {
    const alt = oldI.byId.get(id);
    if (!alt) continue;
    if ((alt.parentId || null) !== (neu.parentId || null)) {
      moved.add(id);
    }
  }

  const parentKeys = new Set([...oldI.children.keys(), ...newI.children.keys()]);
  for (const pKey of parentKeys) {
    const oldAll = oldI.children.get(pKey) || [];
    const newAll = newI.children.get(pKey) || [];
    // Only ids that remain under this same parent in both versions participate in LCS
    const oldStay = oldAll.filter(
      (id) => newI.byId.has(id) && (newI.byId.get(id).parentId || '') === pKey
    );
    const newStay = newAll.filter(
      (id) => oldI.byId.has(id) && (oldI.byId.get(id).parentId || '') === pKey
    );
    if (!oldStay.length || !newStay.length) continue;
    const common = lcsSet(oldStay, newStay);
    for (const id of oldStay) {
      if (!common.has(id)) moved.add(id);
    }
  }

  return [...moved];
}

module.exports = { findMovedIds, lcsSet, indexById };
