'use strict';

/**
 * Progressive DITA fixtures (D01…) from vendor submodules + invented deep/mixed cases (X01…).
 */

const fs = require('fs');
const path = require('path');
const {
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
} = require('../src/ditaPrep');
const { parseXml } = require('../src/s1000dPrep');

const OUT = path.join(__dirname, '..', 'testdata');

function writeScenario(dirName, meta, oldDoc, newDoc) {
  const dir = path.join(OUT, dirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'old.xml'), serialize(oldDoc.documentElement));
  fs.writeFileSync(path.join(dir, 'new.xml'), serialize(newDoc.documentElement));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  console.log('wrote', dirName);
}

function first(el, name) {
  return findAll(el, name)[0] || null;
}

function build() {
  const taskWh = loadStampedDita(
    'content-references/conkeyref/topics/task-warehouse-01.dita'
  );
  const olul = loadMetadita('nesting/olul.dita');
  const figures = loadMetadita('nesting/figures.dita');
  const taskTables = loadMetadita('simpletables/tasktables.dita');
  const nestedTopics = loadMetadita('nesting/topics.dita');

  // D01: task cmd text change
  {
    const oldDoc = cloneDoc(taskWh);
    const newDoc = cloneDoc(taskWh);
    const cmd = first(newDoc.documentElement, 'cmd');
    setTextContent(cmd, 'This is a revised step with the ID "step-01".');
    writeScenario(
      'D01-dita-task-cmd-text',
      {
        name: 'DITA task: change cmd text',
        description: 'task-warehouse-01: edit step cmd text.',
        source: 'vendor/dita-test-cases/.../task-warehouse-01.dita',
        model: 'DITA',
      },
      oldDoc,
      newDoc
    );
  }

  // D02: insert step
  {
    const oldDoc = cloneDoc(taskWh);
    const newDoc = cloneDoc(taskWh);
    const steps = first(newDoc.documentElement, 'steps');
    const step = newDoc.createElement('step');
    step.setAttribute('id', 'uid-new-step-d02');
    const cmd = newDoc.createElement('cmd');
    cmd.setAttribute('id', 'uid-new-cmd-d02');
    cmd.appendChild(newDoc.createTextNode('Verify the warehouse key binding.'));
    step.appendChild(cmd);
    steps.appendChild(step);
    writeScenario(
      'D02-dita-task-insert-step',
      {
        name: 'DITA task: insert step',
        description: 'Append a new step under steps.',
        source: 'task-warehouse-01.dita',
        model: 'DITA',
      },
      oldDoc,
      newDoc
    );
  }

  // D03: delete context + change title
  {
    const oldDoc = cloneDoc(taskWh);
    const newDoc = cloneDoc(taskWh);
    const ctx = first(newDoc.documentElement, 'context');
    ctx.parentNode.removeChild(ctx);
    setTextContent(first(newDoc.documentElement, 'title'), 'Task Warehouse Topic (revised)');
    writeScenario(
      'D03-dita-task-delete-context',
      {
        name: 'DITA task: delete context + title change',
        description: 'Remove context block and rename title.',
        source: 'task-warehouse-01.dita',
        model: 'DITA',
      },
      oldDoc,
      newDoc
    );
  }

  // D04: choicetable row delete + cmd edit
  {
    const oldDoc = cloneDoc(taskTables);
    const newDoc = cloneDoc(taskTables);
    const rows = findAll(newDoc.documentElement, 'chrow');
    rows[1].parentNode.removeChild(rows[1]);
    const cmds = findAll(newDoc.documentElement, 'cmd');
    setTextContent(cmds[0], 'Give me a choice, with headers (updated)');
    writeScenario(
      'D04-dita-task-choicetable-row-delete',
      {
        name: 'DITA task: choicetable row delete + cmd edit',
        description: 'From metadita tasktables.dita.',
        source: 'vendor/metadita-sampledocs/simpletables/tasktables.dita',
        model: 'DITA',
      },
      oldDoc,
      newDoc
    );
  }

  // D05: reorder steps (choicetable task)
  {
    const oldDoc = cloneDoc(taskTables);
    const newDoc = cloneDoc(taskTables);
    const stepsEl = first(newDoc.documentElement, 'steps');
    const steps = elementChildren(stepsEl).filter((e) => localName(e) === 'step');
    stepsEl.appendChild(steps[0]); // move first to end
    writeScenario(
      'D05-dita-task-reorder-steps',
      {
        name: 'DITA task: reorder steps',
        description: 'Move first step after the second.',
        source: 'tasktables.dita',
        model: 'DITA',
      },
      oldDoc,
      newDoc
    );
  }

  // D06: deeply nested ol — edit deepest li text
  {
    const oldDoc = cloneDoc(olul);
    const newDoc = cloneDoc(olul);
    const lis = findAll(newDoc.documentElement, 'li');
    const deepest = lis[lis.length - 1];
    // may contain only text
    setTextContent(deepest, 'This nested list depth is intentionally extreme — edited.');
    writeScenario(
      'D06-dita-deep-ol-text-edit',
      {
        name: 'DITA deep OL: edit deepest list item',
        description: 'metadita nesting/olul.dita deepest <li> text change.',
        source: 'vendor/metadita-sampledocs/nesting/olul.dita',
        model: 'DITA',
      },
      oldDoc,
      newDoc
    );
  }

  // D07: deep ol — delete a mid-level li branch tip sibling... delete deepest and insert sibling
  {
    const oldDoc = cloneDoc(olul);
    const newDoc = cloneDoc(olul);
    const section = findAll(newDoc.documentElement, 'section')[0]; // ordered lists
    const topOl = first(section, 'ol');
    // insert new top-level li
    const li = newDoc.createElement('li');
    li.setAttribute('id', 'uid-new-li-d07');
    li.appendChild(newDoc.createTextNode('New top-level ordered item'));
    topOl.appendChild(li);
    writeScenario(
      'D07-dita-deep-ol-insert-top-li',
      {
        name: 'DITA deep OL: insert top-level li',
        description: 'Append li to outermost ordered list in olul.dita.',
        source: 'olul.dita',
        model: 'DITA',
      },
      oldDoc,
      newDoc
    );
  }

  // D08: nested figures — edit innermost fig title
  {
    const oldDoc = cloneDoc(figures);
    const newDoc = cloneDoc(figures);
    const titles = findAll(newDoc.documentElement, 'title');
    const inner = titles[titles.length - 1];
    setTextContent(inner, 'Innermost nested figure (edited)');
    writeScenario(
      'D08-dita-nested-figures-title',
      {
        name: 'DITA nested figures: edit innermost title',
        description: 'metadita nesting/figures.dita deepest fig title.',
        source: 'figures.dita',
        model: 'DITA',
      },
      oldDoc,
      newDoc
    );
  }

  // D09: nested topics — edit mid-nest body + delete a deep topic
  {
    const oldDoc = cloneDoc(nestedTopics);
    const newDoc = cloneDoc(nestedTopics);
    const topics = findAll(newDoc.documentElement, 'topic');
    // topics[0] is root; delete a deep one near the end if parent allows
    if (topics.length > 8) {
      const doomed = topics[7];
      doomed.parentNode.removeChild(doomed);
    }
    const p = first(newDoc.documentElement, 'p');
    setTextContent(p, 'Root body paragraph revised for nesting stress test.');
    writeScenario(
      'D09-dita-nested-topics-delete-and-edit',
      {
        name: 'DITA nested topics: delete deep topic + edit root p',
        description: 'metadita nesting/topics.dita structural delete + text.',
        source: 'topics.dita',
        model: 'DITA',
      },
      oldDoc,
      newDoc
    );
  }

  // D10: move step content (cmd) between steps — cross-parent move
  {
    const oldDoc = cloneDoc(taskTables);
    const newDoc = cloneDoc(taskTables);
    const stepsEl = first(newDoc.documentElement, 'steps');
    const steps = elementChildren(stepsEl).filter((e) => localName(e) === 'step');
    const cmd0 = first(steps[0], 'cmd');
    const table0 = first(steps[0], 'choicetable');
    // move choicetable from step0 to step1
    steps[1].appendChild(table0);
    setTextContent(cmd0, 'Choice table moved to the following step.');
    writeScenario(
      'D10-dita-move-choicetable-across-steps',
      {
        name: 'DITA task: move choicetable across steps',
        description: 'Cross-parent move of choicetable + cmd text edit.',
        source: 'tasktables.dita',
        model: 'DITA',
      },
      oldDoc,
      newDoc
    );
  }

  // ========== Invented complex / mixed-content scenarios (X*) ==========

  // X01: deep mixed content — ph/b/xref inside nested sections
  {
    const oldXml = `<?xml version="1.0"?>
<topic id="x01-root">
  <title id="x01-title">Mixed content stress</title>
  <body id="x01-body">
    <section id="x01-s1">
      <title id="x01-s1-t">Overview</title>
      <p id="x01-p1">Start with <b id="x01-b1">bold</b> and a <ph id="x01-ph1">phrase</ph>.</p>
      <p id="x01-p2">See also <xref id="x01-x1" href="#x01-s2">details</xref> below.</p>
    </section>
    <section id="x01-s2">
      <title id="x01-s2-t">Details</title>
      <p id="x01-p3">Nested <i id="x01-i1">italic <ph id="x01-ph2">inner phrase</ph></i> text.</p>
      <ul id="x01-ul">
        <li id="x01-li1"><p id="x01-lip1">Item one with <codeph id="x01-c1">code()</codeph></p></li>
        <li id="x01-li2"><p id="x01-lip2">Item two</p></li>
      </ul>
    </section>
  </body>
</topic>`;
    const oldDoc = parseXml(oldXml);
    const newDoc = cloneDoc(oldDoc);
    // edit surrounding text of mixed p1
    const p1 = byId(newDoc, 'x01-p1');
    p1.firstChild.nodeValue = 'Begin with ';
    setTextContent(byId(newDoc, 'x01-b1'), 'strong emphasis');
    // delete li2, insert li3
    byId(newDoc, 'x01-li2').parentNode.removeChild(byId(newDoc, 'x01-li2'));
    const ul = byId(newDoc, 'x01-ul');
    const li = newDoc.createElement('li');
    li.setAttribute('id', 'x01-li3');
    const lp = newDoc.createElement('p');
    lp.setAttribute('id', 'x01-lip3');
    lp.appendChild(newDoc.createTextNode('Item three inserted'));
    li.appendChild(lp);
    ul.appendChild(li);
    // move xref paragraph into details section
    byId(newDoc, 'x01-s2').appendChild(byId(newDoc, 'x01-p2'));
    writeScenario(
      'X01-invented-deep-mixed-content',
      {
        name: 'Invented: deep mixed content + list churn + para move',
        description:
          'Synthetic DITA-like topic: edit mixed para, rename bold, delete/insert li, move xref para across sections.',
        model: 'invented-DITA-like',
      },
      oldDoc,
      newDoc
    );
  }

  // X02: 6-level section nest + table + note + reorder
  {
    const oldXml = `<?xml version="1.0"?>
<topic id="x02-root">
  <title id="x02-title">Deep hierarchy</title>
  <body id="x02-body">
    <section id="x02-l1">
      <title id="x02-l1-t">L1</title>
      <section id="x02-l2">
        <title id="x02-l2-t">L2</title>
        <section id="x02-l3">
          <title id="x02-l3-t">L3</title>
          <section id="x02-l4">
            <title id="x02-l4-t">L4</title>
            <section id="x02-l5">
              <title id="x02-l5-t">L5</title>
              <p id="x02-p-deep">Deep paragraph</p>
              <note id="x02-note" type="caution">
                <p id="x02-note-p">Watch this</p>
              </note>
              <simpletable id="x02-tbl">
                <sthead id="x02-sth">
                  <stentry id="x02-h1">A</stentry>
                  <stentry id="x02-h2">B</stentry>
                </sthead>
                <strow id="x02-r1">
                  <stentry id="x02-r1c1">1</stentry>
                  <stentry id="x02-r1c2">2</stentry>
                </strow>
                <strow id="x02-r2">
                  <stentry id="x02-r2c1">3</stentry>
                  <stentry id="x02-r2c2">4</stentry>
                </strow>
              </simpletable>
            </section>
          </section>
        </section>
      </section>
      <p id="x02-tail">Trailing L1 para</p>
    </section>
  </body>
</topic>`;
    const oldDoc = parseXml(oldXml);
    const newDoc = cloneDoc(oldDoc);
    setTextContent(byId(newDoc, 'x02-p-deep'), 'Deep paragraph — revised');
    // reorder table rows
    const tbl = byId(newDoc, 'x02-tbl');
    tbl.appendChild(byId(newDoc, 'x02-r1'));
    // move note before deep p
    const l5 = byId(newDoc, 'x02-l5');
    l5.insertBefore(byId(newDoc, 'x02-note'), byId(newDoc, 'x02-p-deep'));
    // delete trailing
    byId(newDoc, 'x02-tail').parentNode.removeChild(byId(newDoc, 'x02-tail'));
    // insert new section under L3
    const l3 = byId(newDoc, 'x02-l3');
    const sec = newDoc.createElement('section');
    sec.setAttribute('id', 'x02-new-sec');
    const st = newDoc.createElement('title');
    st.setAttribute('id', 'x02-new-sec-t');
    st.appendChild(newDoc.createTextNode('Inserted L3 sibling section'));
    const sp = newDoc.createElement('p');
    sp.setAttribute('id', 'x02-new-sec-p');
    sp.appendChild(newDoc.createTextNode('New content'));
    sec.appendChild(st);
    sec.appendChild(sp);
    l3.appendChild(sec);
    writeScenario(
      'X02-invented-six-level-table-note-combo',
      {
        name: 'Invented: 6-level nest + table reorder + note move + insert/delete',
        description:
          'Deep section tree with simpletable row reorder, note move, tail delete, new section insert.',
        model: 'invented-DITA-like',
      },
      oldDoc,
      newDoc
    );
  }

  // X03: task-like with nested substeps, info, mixed cmd
  {
    const oldXml = `<?xml version="1.0"?>
<task id="x03-task">
  <title id="x03-title">Complex procedure</title>
  <taskbody id="x03-body">
    <prereq id="x03-prereq"><p id="x03-prereq-p">Tools ready</p></prereq>
    <steps id="x03-steps">
      <step id="x03-s1">
        <cmd id="x03-c1">Open the <uicontrol id="x03-ui1">Settings</uicontrol> panel.</cmd>
        <info id="x03-i1"><p id="x03-i1p">Use the admin account.</p></info>
        <substeps id="x03-sub">
          <substep id="x03-ss1"><cmd id="x03-ss1c">Click <uicontrol id="x03-ui2">Advanced</uicontrol>.</cmd></substep>
          <substep id="x03-ss2"><cmd id="x03-ss2c">Enable logging.</cmd></substep>
          <substep id="x03-ss3"><cmd id="x03-ss3c">Apply changes.</cmd></substep>
        </substeps>
      </step>
      <step id="x03-s2">
        <cmd id="x03-c2">Restart the service.</cmd>
      </step>
      <step id="x03-s3">
        <cmd id="x03-c3">Verify status is <b id="x03-b1">RUNNING</b>.</cmd>
      </step>
    </steps>
  </taskbody>
</task>`;
    const oldDoc = parseXml(oldXml);
    const newDoc = cloneDoc(oldDoc);
    // reorder substeps
    const sub = byId(newDoc, 'x03-sub');
    sub.insertBefore(byId(newDoc, 'x03-ss3'), byId(newDoc, 'x03-ss1'));
    // edit mixed cmd
    const c1 = byId(newDoc, 'x03-c1');
    c1.firstChild.nodeValue = 'Launch the ';
    setTextContent(byId(newDoc, 'x03-ui1'), 'Preferences');
    // move info to step 2
    byId(newDoc, 'x03-s2').appendChild(byId(newDoc, 'x03-i1'));
    // delete step3, insert new step
    byId(newDoc, 'x03-s3').parentNode.removeChild(byId(newDoc, 'x03-s3'));
    const steps = byId(newDoc, 'x03-steps');
    const ns = newDoc.createElement('step');
    ns.setAttribute('id', 'x03-s4');
    const nc = newDoc.createElement('cmd');
    nc.setAttribute('id', 'x03-c4');
    nc.appendChild(newDoc.createTextNode('Archive the logs.'));
    ns.appendChild(nc);
    steps.appendChild(ns);
    writeScenario(
      'X03-invented-task-substeps-mixed-combo',
      {
        name: 'Invented: task substeps reorder + mixed cmd + info move + step replace',
        description:
          'Synthetic task: substep reorder, uicontrol rename in mixed cmd, move info, delete/insert steps.',
        model: 'invented-DITA-like',
      },
      oldDoc,
      newDoc
    );
  }

  // X04: unwrap section + wrap paragraphs + attribute change
  {
    const oldXml = `<?xml version="1.0"?>
<topic id="x04-root" xml:lang="en">
  <title id="x04-title">Wrap unwrap</title>
  <body id="x04-body">
    <section id="x04-sec" outputclass="old">
      <title id="x04-sec-t">Grouped</title>
      <p id="x04-p1">Alpha</p>
      <p id="x04-p2">Beta <ph id="x04-ph">middle</ph> gamma</p>
      <p id="x04-p3">Delta</p>
    </section>
  </body>
</topic>`;
    const oldDoc = parseXml(oldXml);
    const newDoc = cloneDoc(oldDoc);
    const body = byId(newDoc, 'x04-body');
    const sec = byId(newDoc, 'x04-sec');
    // unwrap: promote children then remove section
    for (const k of elementChildren(sec).slice()) body.insertBefore(k, sec);
    body.removeChild(sec);
    // wrap p2+p3 in new section
    const wrap = newDoc.createElement('section');
    wrap.setAttribute('id', 'x04-wrap');
    wrap.setAttribute('outputclass', 'new');
    const wt = newDoc.createElement('title');
    wt.setAttribute('id', 'x04-wrap-t');
    wt.appendChild(newDoc.createTextNode('Regrouped'));
    wrap.appendChild(wt);
    wrap.appendChild(byId(newDoc, 'x04-p2'));
    wrap.appendChild(byId(newDoc, 'x04-p3'));
    body.appendChild(wrap);
    byId(newDoc, 'x04-root').setAttribute('xml:lang', 'en-GB');
    writeScenario(
      'X04-invented-unwrap-wrap-attr',
      {
        name: 'Invented: unwrap section, wrap paras, lang attr change',
        description: 'Promote section children, wrap p2/p3, change xml:lang.',
        model: 'invented-DITA-like',
      },
      oldDoc,
      newDoc
    );
  }
}

build();
