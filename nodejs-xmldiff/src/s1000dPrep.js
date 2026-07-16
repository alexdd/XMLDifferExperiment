'use strict';

const fs = require('fs');
const path = require('path');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

const BIKE_SAMPLES = path.join(
  __dirname,
  '..',
  '..',
  'vendor',
  's1000d-bike-mini-csdb-explorer',
  'data',
  'S1000D_4-1_Bike_Samples'
);

function stripDoctype(xml) {
  return String(xml)
    .replace(/<!DOCTYPE[\s\S]*?\[[\s\S]*?\]>/i, '')
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .trim();
}

function parseXml(xml) {
  const parser = new DOMParser({
    onError(level, msg) {
      if (level === 'warning') return;
      throw new Error(`${level}: ${msg}`);
    },
  });
  return parser.parseFromString(stripDoctype(xml), 'text/xml');
}

function serialize(node) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(node);
}

function localName(el) {
  return el.localName || el.nodeName.replace(/^.*:/, '');
}

function elementChildren(el) {
  const out = [];
  for (let c = el.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === 1) out.push(c);
  }
  return out;
}

function findFirst(el, name) {
  if (el.nodeType === 1 && localName(el) === name) return el;
  for (const c of elementChildren(el)) {
    const hit = findFirst(c, name);
    if (hit) return hit;
  }
  return null;
}

function findAll(el, name, acc = []) {
  if (el.nodeType === 1 && localName(el) === name) acc.push(el);
  for (const c of elementChildren(el)) findAll(c, name, acc);
  return acc;
}

/**
 * Stamp stable unique @id on every element (product invariant).
 * Prefer existing @id values from S1000D samples; synthesize uid-NNNN otherwise.
 */
function stampEditorIds(root) {
  const used = new Set();
  let seq = 1;
  function walk(el) {
    if (el.nodeType !== 1) return;
    let id = el.getAttribute && el.getAttribute('id');
    if (id) {
      if (used.has(id)) {
        id = `${id}__${seq++}`;
        el.setAttribute('id', id);
      }
      used.add(id);
    } else {
      while (used.has(`uid-${String(seq).padStart(4, '0')}`)) seq++;
      id = `uid-${String(seq).padStart(4, '0')}`;
      seq++;
      el.setAttribute('id', id);
      used.add(id);
    }
    for (const c of elementChildren(el)) walk(c);
  }
  walk(root);
  return root;
}

/** Load bike DM and return stamped <content> document element clone as standalone root. */
function loadStampedContent(dmFileName) {
  const full = path.join(BIKE_SAMPLES, dmFileName);
  if (!fs.existsSync(full)) {
    throw new Error(`Bike sample not found: ${full}`);
  }
  const doc = parseXml(fs.readFileSync(full, 'utf8'));
  const content = findFirst(doc.documentElement, 'content');
  if (!content) throw new Error(`No <content> in ${dmFileName}`);

  // Build a standalone document rooted at <content>, dropping DOCTYPE/entities.
  const wrapped = parseXml(`<?xml version="1.0"?><root/>`);
  const imported = wrapped.importNode(content, true);
  wrapped.replaceChild(imported, wrapped.documentElement);
  stampEditorIds(wrapped.documentElement);
  return wrapped;
}

function cloneDoc(doc) {
  return parseXml(serialize(doc.documentElement));
}

function byId(doc, id) {
  const all = [];
  function walk(el) {
    if (el.nodeType === 1 && el.getAttribute('id') === id) all.push(el);
    for (const c of elementChildren(el)) walk(c);
  }
  walk(doc.documentElement);
  return all[0] || null;
}

function setTextContent(el, text) {
  while (el.firstChild) el.removeChild(el.firstChild);
  el.appendChild(el.ownerDocument.createTextNode(text));
}

function deepText(el) {
  let s = '';
  for (let c = el.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === 3) s += c.nodeValue;
    else if (c.nodeType === 1) s += deepText(c);
  }
  return s;
}

module.exports = {
  BIKE_SAMPLES,
  stripDoctype,
  parseXml,
  serialize,
  localName,
  elementChildren,
  findFirst,
  findAll,
  stampEditorIds,
  loadStampedContent,
  cloneDoc,
  byId,
  setTextContent,
  deepText,
};
