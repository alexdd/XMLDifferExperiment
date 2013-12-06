XMLDifferExperiment
===================

Experimental XML Diffing with XSLT

One of UWE’s key features will be managing and comparing document versions. Whereas commercial solutions employ a rather scientific approach, see e.g. here and/or a rather complex one, see here … so called “diffing feature” in UWE will be implemented in a very simple way. UWE’s WYSIWYG editor is the only place where you can modify UWE documents. Thus if we assign an unique ID on each element that we insert (paragraphs, lists, tables, images, …) we will be able to use the following algorithm in order to mark changes when comparing two different versions of one document:

FIRST STEP: analyze versions

    if there is an ID in the new version which does not exist in the old version, then mark the element with this ID as NEW
    if there is an ID in the old version which does not exist in the new version, then mark the element with this ID as DELETED
    if there is an ID which exists in both versions, then compare text content of both versions, and if content changed then mark element with this ID as CHANGED otherwise mark as UNCHANGED

At this point we have marked elements in both versions. But what we want to have is one single document in which all marked elements will be merged in correct order. Thus the next step will be merging old and new version. Actually this step reassembles to copying elements which have been marked as DELETED from the old version into the new version. The tricky part is putting these elements into the right place, but with some magic XPATH selectors we have successfully been coping with this problem.

SECOND STEP: merging

    traverse new version and if preceding-sibling of identical element (same ID) in old version is marked as DELETED then copy all direct preceding siblings which are marked as DELETED from old version into new version just before the current element.

    when traversing new version: if all following-sibling elements of the current element are marked as DELETED in the old version, then copy this block of DELETED elements just after the current element

Now we have one document with all elements marked. Everything could have been done using XSLT stylesheets .

THIRD STEP: copy old text of CHANGED elements into merged document in order to use Python’s difflib

    After this step each CHANGED element will occur twice in the merged document. like this:

    <elem diffing-status=”changed” diffing-version=”old”>[...] some deleted text [...]</elem>
    <elem diffing-status=”changed” diffing-version=”new”>[...] [...]</elem>

FOURTH STEP: use Python’s difflib in XSLT stylesheet extension call on merged document

    After this step each CHANGED element will occur only once and will contain tags inserted by Python extension call, like so:

    bla bla <del>some deleted text</del> bla bla

FIFTH STEP: a simple XML to HTML transformation will visualize all changes: red colored and crossed through text for deleted elements and green colored text for added elements.so far. But when detecting atomic text changes we will need to use Python’s difflib
