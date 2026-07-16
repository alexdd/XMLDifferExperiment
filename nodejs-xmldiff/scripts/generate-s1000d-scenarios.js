'use strict';

/**
 * Build progressive S1000D bike-sample fixtures (S01…) from the vendor submodule.
 * Every element gets a stable @id (editor invariant). Edits go from simple → complex.
 */

const fs = require('fs');
const path = require('path');
const {
  loadStampedContent,
  cloneDoc,
  serialize,
  byId,
  findAll,
  findFirst,
  elementChildren,
  localName,
  setTextContent,
  deepText,
} = require('../src/s1000dPrep');

const OUT = path.join(__dirname, '..', 'testdata');

const DESC_DM = 'DMC-BRAKE-AAA-DA1-00-00-00AA-041A-A_001-00_EN-US.XML';
const PROC_DM = 'DMC-BRAKE-AAA-DA1-00-00-00AA-341A-A_001-00_EN-US.XML';

function writeScenario(dirName, meta, oldDoc, newDoc) {
  const dir = path.join(OUT, dirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'old.xml'), serialize(oldDoc.documentElement));
  fs.writeFileSync(path.join(dir, 'new.xml'), serialize(newDoc.documentElement));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  console.log('wrote', dirName);
}

function firstPara(el) {
  return findAll(el, 'para')[0] || null;
}

function build() {
  const descBase = loadStampedContent(DESC_DM);
  const procBase = loadStampedContent(PROC_DM);

  // ---- S01: simple para text change (descriptive) ----
  {
    const oldDoc = cloneDoc(descBase);
    const newDoc = cloneDoc(descBase);
    const paras = findAll(newDoc.documentElement, 'para');
    const target = paras[0];
    const oldText = deepText(target);
    setTextContent(
      target,
      oldText.replace(
        'The most important part of the bicycle is the brake system.',
        'The brake system is a safety-critical part of the bicycle.'
      )
    );
    writeScenario(
      'S01-s1000d-desc-para-text',
      {
        name: 'S1000D descriptive: single para text change',
        description:
          'Brake descriptive DM content; change first <para> text. Source: ' + DESC_DM,
        sourceDm: DESC_DM,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  }

  // ---- S02: delete listItem ----
  {
    const oldDoc = cloneDoc(descBase);
    const newDoc = cloneDoc(descBase);
    const items = findAll(newDoc.documentElement, 'listItem');
    // delete "the brake cable" item (index 1 in sample)
    const doomed = items[1];
    doomed.parentNode.removeChild(doomed);
    writeScenario(
      'S02-s1000d-desc-delete-listitem',
      {
        name: 'S1000D descriptive: delete listItem',
        description: 'Remove cantilever-brake component list item (brake cable).',
        sourceDm: DESC_DM,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  }

  // ---- S03: insert listItem + change title ----
  {
    const oldDoc = cloneDoc(descBase);
    const newDoc = cloneDoc(descBase);
    const list = findFirst(newDoc.documentElement, 'randomList');
    const docEl = newDoc;
    const item = newDoc.createElement('listItem');
    item.setAttribute('id', 'uid-new-listitem-01');
    const para = newDoc.createElement('para');
    para.setAttribute('id', 'uid-new-para-01');
    para.appendChild(newDoc.createTextNode('the straddle cable'));
    item.appendChild(para);
    list.appendChild(item);
    const title = findAll(newDoc.documentElement, 'title')[1]; // Cantilever brake
    setTextContent(title, 'Cantilever brake assembly');
    writeScenario(
      'S03-s1000d-desc-insert-listitem',
      {
        name: 'S1000D descriptive: insert listItem + title change',
        description: 'Add component list item and rename nested levelledPara title.',
        sourceDm: DESC_DM,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  }

  // ---- S04: reorder nested levelledPara (par-0002 / par-0003) ----
  {
    const oldDoc = cloneDoc(descBase);
    const newDoc = cloneDoc(descBase);
    const pads = byId(newDoc, 'par-0002');
    const lever = byId(newDoc, 'par-0003');
    const parent = pads.parentNode;
    parent.insertBefore(lever, pads);
    writeScenario(
      'S04-s1000d-desc-reorder-levelledpara',
      {
        name: 'S1000D descriptive: reorder levelledPara',
        description: 'Swap Brake pads (par-0002) and Brake lever (par-0003) order.',
        sourceDm: DESC_DM,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  }

  // ---- S05: move para between levelledParas ----
  {
    const oldDoc = cloneDoc(descBase);
    const newDoc = cloneDoc(descBase);
    const lever = byId(newDoc, 'par-0003');
    const pads = byId(newDoc, 'par-0002');
    const leverParas = elementChildren(lever).filter((e) => localName(e) === 'para');
    const moving = leverParas[leverParas.length - 1]; // last para under brake lever
    pads.appendChild(moving);
    writeScenario(
      'S05-s1000d-desc-move-para-across-sections',
      {
        name: 'S1000D descriptive: move para across levelledPara',
        description: 'Move trailing brake-lever para into brake-pads section.',
        sourceDm: DESC_DM,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  }

  // ---- S06: procedural step text change ----
  {
    const oldDoc = cloneDoc(procBase);
    const newDoc = cloneDoc(procBase);
    const steps = findAll(newDoc.documentElement, 'proceduralStep');
    const para = firstPara(steps[2]);
    setTextContent(para, 'Apply both front and rear brakes firmly.');
    writeScenario(
      'S06-s1000d-proc-step-text',
      {
        name: 'S1000D procedural: change step text',
        description: 'Brake manual-test procedure; edit third proceduralStep para.',
        sourceDm: PROC_DM,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  }

  // ---- S07: procedural delete + insert step ----
  {
    const oldDoc = cloneDoc(procBase);
    const newDoc = cloneDoc(procBase);
    const main = findFirst(newDoc.documentElement, 'mainProcedure');
    const steps = elementChildren(main).filter((e) => localName(e) === 'proceduralStep');
    main.removeChild(steps[1]); // remove "push the bicycle forwards"
    const step = newDoc.createElement('proceduralStep');
    step.setAttribute('id', 'uid-new-step-01');
    const para = newDoc.createElement('para');
    para.setAttribute('id', 'uid-new-step-para-01');
    para.appendChild(
      newDoc.createTextNode('Ensure the tire pressure is within the specified range.')
    );
    step.appendChild(para);
    // insert after first remaining step
    const first = elementChildren(main).filter((e) => localName(e) === 'proceduralStep')[0];
    if (first.nextSibling) main.insertBefore(step, first.nextSibling);
    else main.appendChild(step);
    writeScenario(
      'S07-s1000d-proc-delete-insert-step',
      {
        name: 'S1000D procedural: delete + insert step',
        description: 'Remove one proceduralStep and insert a new step after the first.',
        sourceDm: PROC_DM,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  }

  // ---- S08: procedural reorder steps ----
  {
    const oldDoc = cloneDoc(procBase);
    const newDoc = cloneDoc(procBase);
    const main = findFirst(newDoc.documentElement, 'mainProcedure');
    const steps = elementChildren(main).filter((e) => localName(e) === 'proceduralStep');
    // reverse order
    for (let i = steps.length - 1; i >= 0; i--) main.appendChild(steps[i]);
    writeScenario(
      'S08-s1000d-proc-reorder-steps',
      {
        name: 'S1000D procedural: reorder all steps',
        description: 'Reverse mainProcedure proceduralStep sequence.',
        sourceDm: PROC_DM,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  }

  // ---- S09: wrap figure+para block mentally via new levelledPara sibling insert + delete ----
  {
    const oldDoc = cloneDoc(descBase);
    const newDoc = cloneDoc(descBase);
    const cantilever = byId(newDoc, 'par-0001');
    // delete figure fig-0001
    const fig = byId(newDoc, 'fig-0001');
    fig.parentNode.removeChild(fig);
    // insert new warning-like levelledPara before pads
    const pads = byId(newDoc, 'par-0002');
    const wrap = newDoc.createElement('levelledPara');
    wrap.setAttribute('id', 'uid-new-levelled-01');
    const title = newDoc.createElement('title');
    title.setAttribute('id', 'uid-new-title-01');
    title.appendChild(newDoc.createTextNode('Safety note'));
    const para = newDoc.createElement('para');
    para.setAttribute('id', 'uid-new-safety-para-01');
    para.appendChild(
      newDoc.createTextNode(
        'Do not operate the bicycle if brake pads are worn beyond the wear indicator.'
      )
    );
    wrap.appendChild(title);
    wrap.appendChild(para);
    pads.parentNode.insertBefore(wrap, pads);
    // text tweak in cantilever title area para
    const cparas = elementChildren(cantilever).filter((e) => localName(e) === 'para');
    if (cparas[0]) {
      setTextContent(
        cparas[0],
        deepText(cparas[0]).replace('primary components', 'main components')
      );
    }
    writeScenario(
      'S09-s1000d-desc-figure-delete-and-section-insert',
      {
        name: 'S1000D descriptive: delete figure + insert section + text edit',
        description:
          'Remove fig-0001, insert Safety note levelledPara, edit cantilever para wording.',
        sourceDm: DESC_DM,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  }

  // ---- S10: complex combo on full descriptive content ----
  {
    const oldDoc = cloneDoc(descBase);
    const newDoc = cloneDoc(descBase);

    // 1) reorder pads/lever
    const pads = byId(newDoc, 'par-0002');
    const lever = byId(newDoc, 'par-0003');
    pads.parentNode.insertBefore(lever, pads);

    // 2) delete a listItem
    const items = findAll(newDoc.documentElement, 'listItem');
    items[3].parentNode.removeChild(items[3]); // brake clamp

    // 3) insert listItem
    const list = findFirst(newDoc.documentElement, 'randomList');
    const item = newDoc.createElement('listItem');
    item.setAttribute('id', 'uid-new-listitem-02');
    const ip = newDoc.createElement('para');
    ip.setAttribute('id', 'uid-new-para-02');
    ip.appendChild(newDoc.createTextNode('the mounting bolts'));
    item.appendChild(ip);
    list.appendChild(item);

    // 4) move last lever para into pads (pads is now after lever due to reorder)
    const pads2 = byId(newDoc, 'par-0002');
    const lever2 = byId(newDoc, 'par-0003');
    const leverParas = elementChildren(lever2).filter((e) => localName(e) === 'para');
    if (leverParas.length) pads2.appendChild(leverParas[leverParas.length - 1]);

    // 5) change root intro para
    const intro = findAll(newDoc.documentElement, 'para')[0];
    setTextContent(
      intro,
      'Regular inspection of the brake system is required for safe operation of the bicycle.'
    );

    // 6) change figure title
    const fig2 = byId(newDoc, 'fig-0002');
    const figTitle = elementChildren(fig2).find((e) => localName(e) === 'title');
    setTextContent(figTitle, 'Brake assembly — exploded view');

    writeScenario(
      'S10-s1000d-desc-complex-combo',
      {
        name: 'S1000D descriptive: complex nested combo',
        description:
          'Reorder sections, delete/insert list items, cross-section para move, intro text + figure title change.',
        sourceDm: DESC_DM,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  }

  // ---- S11: larger bike descriptive DM (full bike, not just brake) ----
  const BIG_DESC = 'DMC-S1000DBIKE-AAA-D00-00-00-00AA-041A-A_009-00_EN-US.XML';
  const bigPath = path.join(
    require('../src/s1000dPrep').BIKE_SAMPLES,
    BIG_DESC
  );
  if (fs.existsSync(bigPath)) {
    const bigBase = loadStampedContent(BIG_DESC);
    const oldDoc = cloneDoc(bigBase);
    const newDoc = cloneDoc(bigBase);
    const levelled = findAll(newDoc.documentElement, 'levelledPara');
    if (levelled.length >= 3) {
      // delete a mid-level section if it has an id, else delete third
      const doomed = levelled[2];
      doomed.parentNode.removeChild(doomed);
    }
    const paras = findAll(newDoc.documentElement, 'para');
    if (paras[0]) {
      setTextContent(paras[0], deepText(paras[0]) + ' (revised for field maintenance).');
    }
    // insert a new top-level note section under description
    const description = findFirst(newDoc.documentElement, 'description');
    const note = newDoc.createElement('levelledPara');
    note.setAttribute('id', 'uid-new-bike-note-01');
    const t = newDoc.createElement('title');
    t.setAttribute('id', 'uid-new-bike-note-title-01');
    t.appendChild(newDoc.createTextNode('Maintenance overview'));
    const p = newDoc.createElement('para');
    p.setAttribute('id', 'uid-new-bike-note-para-01');
    p.appendChild(
      newDoc.createTextNode(
        'Perform the checks in this data module before every ride when operating in wet conditions.'
      )
    );
    note.appendChild(t);
    note.appendChild(p);
    if (description.firstChild) description.insertBefore(note, description.firstChild);
    else description.appendChild(note);

    writeScenario(
      'S11-s1000d-bike-large-desc-combo',
      {
        name: 'S1000D large bike descriptive: delete section + insert + text',
        description:
          'Full-bike descriptive DM: delete a levelledPara, prepend Maintenance overview, append text to first para.',
        sourceDm: BIG_DESC,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  } else {
    console.warn('skip S11, missing', BIG_DESC);
  }

  // ---- S12: procedural preliminaryRqmts + step churn ----
  {
    const oldDoc = cloneDoc(procBase);
    const newDoc = cloneDoc(procBase);
    const trade = findFirst(newDoc.documentElement, 'trade');
    setTextContent(trade, 'Operator / maintainer');
    const est = findFirst(newDoc.documentElement, 'estimatedTime');
    setTextContent(est, '0,5');
    const main = findFirst(newDoc.documentElement, 'mainProcedure');
    const steps = elementChildren(main).filter((e) => localName(e) === 'proceduralStep');
    // move last step to front
    main.insertBefore(steps[steps.length - 1], steps[0]);
    // edit second step (previously first)
    const ordered = elementChildren(main).filter((e) => localName(e) === 'proceduralStep');
    setTextContent(firstPara(ordered[1]), 'Place the bicycle upright on level ground.');
    writeScenario(
      'S12-s1000d-proc-prereq-and-step-move',
      {
        name: 'S1000D procedural: prereq attrs/text + step move',
        description:
          'Change trade/estimatedTime; move last proceduralStep to front; edit another step text.',
        sourceDm: PROC_DM,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  }

  // ---- S13: mixed-content para with internalRef (descriptive) ----
  {
    const oldDoc = cloneDoc(descBase);
    const newDoc = cloneDoc(descBase);
    // second intro para contains internalRef to par-0001
    const paras = findAll(newDoc.documentElement, 'para');
    const mixed = paras[1];
    // replace only leading text node, keep child elements
    let textNode = null;
    for (let c = mixed.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3 && c.nodeValue && c.nodeValue.trim()) {
        textNode = c;
        break;
      }
    }
    if (textNode) {
      textNode.nodeValue = textNode.nodeValue.replace(
        'There are nine different types of brake systems.',
        'There are several types of brake systems in common use.'
      );
    }
    // also delete one listItem under cantilever
    const items = findAll(newDoc.documentElement, 'listItem');
    if (items[0]) items[0].parentNode.removeChild(items[0]);
    writeScenario(
      'S13-s1000d-desc-mixed-internalref-and-list-delete',
      {
        name: 'S1000D descriptive: mixed para (internalRef) + list delete',
        description:
          'Edit text around internalRef in a mixed-content para; delete first component listItem.',
        sourceDm: DESC_DM,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  }

  // ---- S14: unwrap-like — remove nested levelledPara wrapper by promoting children ----
  {
    const oldDoc = cloneDoc(descBase);
    const newDoc = cloneDoc(descBase);
    const pads = byId(newDoc, 'par-0002');
    const parent = pads.parentNode;
    // promote children of pads before pads, then remove pads wrapper
    const kids = elementChildren(pads).slice();
    for (const k of kids) parent.insertBefore(k, pads);
    parent.removeChild(pads);
    writeScenario(
      'S14-s1000d-desc-unwrap-levelledpara',
      {
        name: 'S1000D descriptive: unwrap levelledPara (promote children)',
        description:
          'Promote Brake pads section children to parent levelledPara and delete wrapper par-0002.',
        sourceDm: DESC_DM,
        model: 'S1000D-4.1-bike',
      },
      oldDoc,
      newDoc
    );
  }
}

build();
