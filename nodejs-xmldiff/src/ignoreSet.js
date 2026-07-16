'use strict';

const { parseXml, serialize, elementChildren, localName } = require('./s1000dPrep');

/**
 * Configurable ignore set for comparison.
 *
 * @typedef {object} IgnoreSet
 * @property {string[]} [attributes] - attribute local-names to strip before diff
 * @property {string[]} [elements] - element local-names to remove before diff
 */

function normalizeIgnore(ignore) {
  const attributes = new Set(
    (ignore && ignore.attributes ? ignore.attributes : []).map((s) => String(s))
  );
  const elements = new Set(
    (ignore && ignore.elements ? ignore.elements : []).map((s) => String(s))
  );
  return { attributes, elements };
}

function isEmptyIgnore(ignore) {
  const n = normalizeIgnore(ignore);
  return n.attributes.size === 0 && n.elements.size === 0;
}

/**
 * Strip ignored attributes and elements from an XML document string.
 * Diff/roundtrip should run on the filtered trees when an ignore set is active.
 */
function applyIgnoreSet(xml, ignore) {
  if (!ignore || isEmptyIgnore(ignore)) return xml;
  const { attributes, elements } = normalizeIgnore(ignore);
  const doc = parseXml(xml);

  function walk(el) {
    if (el.nodeType !== 1) return;
    // drop ignored attributes
    if (el.attributes) {
      const toRemove = [];
      for (let i = 0; i < el.attributes.length; i++) {
        const a = el.attributes[i];
        const ln = a.localName || a.name.replace(/^.*:/, '');
        if (attributes.has(ln) || attributes.has(a.name)) toRemove.push(a.name);
      }
      for (const name of toRemove) el.removeAttribute(name);
    }
    // process children; remove ignored elements
    const kids = elementChildren(el);
    for (const child of kids) {
      if (elements.has(localName(child))) {
        el.removeChild(child);
      } else {
        walk(child);
      }
    }
  }

  walk(doc.documentElement);
  return serialize(doc.documentElement);
}

module.exports = {
  normalizeIgnore,
  isEmptyIgnore,
  applyIgnoreSet,
};
