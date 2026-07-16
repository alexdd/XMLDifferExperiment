'use strict';

const fs = require('fs');
const path = require('path');
const {
  parseXml,
  serialize,
  stampEditorIds,
  cloneDoc,
  byId,
  findAll,
  findFirst,
  elementChildren,
  localName,
  setTextContent,
  deepText,
} = require('./s1000dPrep');

const DITA_TEST_CASES = path.join(
  __dirname,
  '..',
  '..',
  'vendor',
  'dita-test-cases'
);
const METADITA = path.join(__dirname, '..', '..', 'vendor', 'metadita-sampledocs');

function resolveVendorFile(...parts) {
  const full = path.join(...parts);
  if (!fs.existsSync(full)) throw new Error(`DITA sample not found: ${full}`);
  return full;
}

/**
 * Load a DITA topic/task/concept file, strip DOCTYPE, stamp editor ids on every element.
 * Returns a DOM document rooted at the topic-like element.
 */
function loadStampedDita(relativePath, { root = DITA_TEST_CASES } = {}) {
  const full = resolveVendorFile(root, relativePath);
  const doc = parseXml(fs.readFileSync(full, 'utf8'));
  // Prefer topic/task/concept/reference/map as root; else documentElement
  const rootEl =
    findFirst(doc.documentElement, 'task') ||
    findFirst(doc.documentElement, 'concept') ||
    findFirst(doc.documentElement, 'reference') ||
    findFirst(doc.documentElement, 'topic') ||
    findFirst(doc.documentElement, 'map') ||
    doc.documentElement;

  const wrapped = parseXml(`<?xml version="1.0"?><root/>`);
  const imported = wrapped.importNode(rootEl, true);
  wrapped.replaceChild(imported, wrapped.documentElement);
  stampEditorIds(wrapped.documentElement);
  return wrapped;
}

function loadMetadita(relativePath) {
  return loadStampedDita(relativePath, { root: METADITA });
}

module.exports = {
  DITA_TEST_CASES,
  METADITA,
  loadStampedDita,
  loadMetadita,
  cloneDoc,
  serialize,
  byId,
  findAll,
  findFirst,
  elementChildren,
  localName,
  setTextContent,
  deepText,
};
