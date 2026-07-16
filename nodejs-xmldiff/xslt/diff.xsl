<?xml version="1.0" encoding="UTF-8"?>
<!--
  Port of the original ID-based XML diffing algorithm (diff.xsl), with extensions:
    L06 – zero surviving children under a surviving parent
    L09 – cross-parent moves (same @id, different parent @id)

  Input source document shape:
    <diffing>
      <old-version>...</old-version>
      <new-version>...</new-version>
    </diffing>
-->
<xsl:stylesheet version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:local="urn:xmldiff:local"
                exclude-result-prefixes="#all">

    <xsl:import href="diff-lib.xsl"/>
    <xsl:output method="xml" indent="yes"/>

    <xsl:template match="@*" mode="#all">
        <xsl:copy/>
    </xsl:template>

    <!-- ========== STEP 1: analyze ========== -->
    <xsl:template match="node()" mode="analyze">
        <xsl:copy>
            <xsl:choose>
                <xsl:when test="ancestor::new-version">
                    <xsl:variable name="y-id" select="if (@id) then string(@id) else ''"/>
                    <xsl:if test="$y-id != ''">
                        <xsl:variable name="old-match"
                                      select="/descendant::old-version//*[@id = $y-id][1]"/>
                        <xsl:choose>
                            <xsl:when test="empty($old-match)">
                                <xsl:attribute name="diffing">new</xsl:attribute>
                            </xsl:when>
                            <xsl:when test="local:is-moved-id($y-id)">
                                <xsl:attribute name="diffing">moved</xsl:attribute>
                            </xsl:when>
                            <xsl:when test="normalize-space(string(.)) !=
                                            normalize-space(string($old-match))
                                            or local:attrs-differ(., $old-match)">
                                <xsl:attribute name="diffing">changed</xsl:attribute>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:attribute name="diffing">unchanged</xsl:attribute>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:if>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:variable name="y-id" select="if (@id) then string(@id) else ''"/>
                    <xsl:if test="$y-id != ''">
                        <xsl:variable name="new-match"
                                      select="/descendant::new-version//*[@id = $y-id][1]"/>
                        <xsl:choose>
                            <xsl:when test="empty($new-match)">
                                <xsl:attribute name="diffing">deleted</xsl:attribute>
                            </xsl:when>
                            <xsl:when test="local:is-moved-id($y-id)">
                                <xsl:attribute name="diffing">moved</xsl:attribute>
                            </xsl:when>
                            <xsl:when test="normalize-space(string(.)) !=
                                            normalize-space(string($new-match))
                                            or local:attrs-differ(., $new-match)">
                                <xsl:attribute name="diffing">changed</xsl:attribute>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:attribute name="diffing">unchanged</xsl:attribute>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:if>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:apply-templates select="@*|node()" mode="analyze"/>
        </xsl:copy>
    </xsl:template>

    <!-- ========== STEP 2: merge ========== -->

    <!-- Copy absent nodes (deleted / moved-away ghosts) into the merge. -->
    <xsl:template name="emit-absent">
        <xsl:param name="nodes" as="element()*"/>
        <xsl:for-each select="$nodes">
            <xsl:copy>
                <xsl:copy-of select="@* except @diffing-version"/>
                <xsl:if test="@diffing = 'moved'">
                    <xsl:attribute name="diffing-version">old</xsl:attribute>
                </xsl:if>
                <xsl:copy-of select="node()"/>
            </xsl:copy>
        </xsl:for-each>
    </xsl:template>

    <!--
      L06: surviving parent with zero surviving children from old →
      emit all absent old children, then merge new children.
    -->
    <xsl:template name="merge-copy-element">
        <xsl:variable name="y-id" select="if (@id) then string(@id) else ''"/>
        <xsl:variable name="old-elem" select="/descendant::old-version//*[@id = $y-id][1]"/>
        <xsl:variable name="surviving-old-children"
                      select="$old-elem/*[local:is-survivor(.)]"/>
        <xsl:variable name="absent-old-children"
                      select="$old-elem/*[local:is-absent(.)]"/>
        <xsl:copy>
            <xsl:apply-templates select="@*" mode="merge"/>
            <!-- live moved node at its new parent -->
            <xsl:if test="@diffing = 'moved' and not(@diffing-version)">
                <xsl:attribute name="diffing-version">new</xsl:attribute>
            </xsl:if>
            <xsl:choose>
                <!--
                  L06: no surviving children from old under this parent.
                  Note: an "unchanged" node can still have changed descendants
                  (cross-parent moves preserve concatenated text on ancestors),
                  so we always recurse; we do not copy-of and skip children.
                -->
                <xsl:when test="exists($old-elem)
                                and exists($absent-old-children)
                                and empty($surviving-old-children)">
                    <xsl:call-template name="emit-absent">
                        <xsl:with-param name="nodes" select="$absent-old-children"/>
                    </xsl:call-template>
                    <xsl:apply-templates select="node()" mode="merge"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates select="node()" mode="merge"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:copy>
    </xsl:template>

    <xsl:template match="node()" mode="merge">
        <xsl:variable name="y-id" select="if (@id) then string(@id) else ''"/>
        <xsl:variable name="old-elem" select="/descendant::old-version//*[@id = $y-id][1]"/>
        <xsl:choose>
            <!--
              Moved nodes at their NEW location must not use old-location sibling
              anchors (those belong to the old parent).
            -->
            <xsl:when test="$y-id != '' and @diffing = 'moved'">
                <xsl:call-template name="merge-copy-element"/>
            </xsl:when>

            <!--
              Original ancestor::unchanged guard removed: parent string-equality can
              stay "unchanged" across cross-parent moves (L09), which incorrectly
              disabled sibling-anchor insertion for all descendants.
              Still skip nodes under a NEW ancestor (deletes never belong there).
            -->
            <xsl:when test="$y-id != ''
                            and exists($old-elem)
                            and not(ancestor::*[@diffing = 'new'])">
                <!--
                  Preceding and trailing absents are NOT mutually exclusive
                  (L10: survivor can have moved nodes on both sides).
                -->
                <xsl:if test="$old-elem/preceding-sibling::*[1][local:is-absent(.)]">
                    <xsl:call-template name="emit-absent">
                        <xsl:with-param name="nodes"
                            select="$old-elem/preceding-sibling::*[local:is-absent(.)]
                                      [following-sibling::*[not(local:is-absent(.))][1][@id = $y-id]]"/>
                    </xsl:call-template>
                </xsl:if>
                <xsl:call-template name="merge-copy-element"/>
                <xsl:if test="empty($old-elem/following-sibling::*[local:is-survivor(.)])">
                    <xsl:call-template name="emit-absent">
                        <xsl:with-param name="nodes"
                            select="$old-elem/following-sibling::*[local:is-absent(.)]"/>
                    </xsl:call-template>
                </xsl:if>
            </xsl:when>
            <xsl:otherwise>
                <xsl:copy>
                    <xsl:apply-templates select="@*|node()" mode="merge"/>
                </xsl:copy>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- ========== STEP 3: expose old/new text (and attrs) for changed nodes ========== -->
    <xsl:template match="node()" mode="textdiff">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()" mode="textdiff"/>
        </xsl:copy>
    </xsl:template>

    <!-- deep copy old subtree as a version=old snapshot (strip analyze markers) -->
    <xsl:template match="*" mode="snapshot-old">
        <xsl:copy>
            <xsl:copy-of select="@*[local-name() != 'diffing' and local-name() != 'diffing-version']"/>
            <xsl:if test="not(ancestor::*)">
                <!-- root of snapshot: mark for roundtrip -->
            </xsl:if>
            <xsl:apply-templates select="node()" mode="snapshot-old"/>
        </xsl:copy>
    </xsl:template>
    <xsl:template match="text()|comment()|processing-instruction()" mode="snapshot-old">
        <xsl:copy/>
    </xsl:template>

    <!-- PCDATA leaf changed: dual nodes with correct per-version attributes -->
    <xsl:template match="*[@diffing = 'changed']
                          [not(child::*)]
                          [not(ancestor::*[@diffing = 'new'])]
                          [not(ancestor::*[@diffing = 'deleted'])]
                          [not(ancestor::*[@diffing = 'moved'][@diffing-version = 'old'])]"
                  mode="textdiff"
                  priority="5">
        <xsl:variable name="y-id" select="string(@id)"/>
        <xsl:variable name="old-elem"
                      select="$analyzed-root/descendant::old-version//*[@id = $y-id][1]"/>
        <xsl:copy>
            <xsl:copy-of select="$old-elem/@*[local-name() != 'diffing']"/>
            <xsl:attribute name="diffing">changed</xsl:attribute>
            <xsl:attribute name="diffing-version">old</xsl:attribute>
            <xsl:value-of select="string($old-elem)"/>
        </xsl:copy>
        <xsl:copy>
            <xsl:apply-templates select="@*" mode="textdiff"/>
            <xsl:attribute name="diffing-version">new</xsl:attribute>
            <xsl:apply-templates select="node()" mode="textdiff"/>
        </xsl:copy>
    </xsl:template>

    <!--
      Dual-snapshot ONLY when anonymous (no @id) element children are involved.
      Mixed content with identified element children is refined in Node
      (mixedContentDiff.js) into fine-grained _diff_text markers.
    -->
    <xsl:template match="*[@diffing = 'changed']
                          [child::*]
                          [not(ancestor::*[@diffing = 'new'])]
                          [not(ancestor::*[@diffing = 'deleted'])]
                          [not(ancestor::*[@diffing = 'moved'][@diffing-version = 'old'])]"
                  mode="textdiff"
                  priority="6">
        <xsl:variable name="y-id" select="string(@id)"/>
        <xsl:variable name="old-elem"
                      select="$analyzed-root/descendant::old-version//*[@id = $y-id][1]"/>
        <xsl:choose>
            <xsl:when test="*[not(@id)] or exists($old-elem/*[not(@id)])">
                <xsl:for-each select="$old-elem">
                    <xsl:copy>
                        <xsl:copy-of select="@*[local-name() != 'diffing']"/>
                        <xsl:attribute name="diffing">changed</xsl:attribute>
                        <xsl:attribute name="diffing-version">old</xsl:attribute>
                        <xsl:apply-templates select="node()" mode="snapshot-old"/>
                    </xsl:copy>
                </xsl:for-each>
                <xsl:copy>
                    <xsl:apply-templates select="@*" mode="textdiff"/>
                    <xsl:attribute name="diffing-version">new</xsl:attribute>
                    <xsl:apply-templates select="node()" mode="textdiff"/>
                </xsl:copy>
            </xsl:when>
            <xsl:otherwise>
                <!-- identified children only (+ optional text): single node, JS refines text -->
                <xsl:next-match/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!--
      L17: non-leaf changed node with attribute differences (no mixed text) —
      embed old attributes in a marker element for roundtrip.
    -->
    <xsl:template match="*[@diffing = 'changed'][child::*]
                          [not(text()[normalize-space()])]
                          [not(ancestor::*[@diffing = 'new'])]
                          [not(ancestor::*[@diffing = 'deleted'])]"
                  mode="textdiff"
                  priority="4">
        <xsl:variable name="y-id" select="string(@id)"/>
        <xsl:variable name="old-elem"
                      select="$analyzed-root/descendant::old-version//*[@id = $y-id][1]"/>
        <xsl:copy>
            <xsl:apply-templates select="@*" mode="textdiff"/>
            <xsl:if test="exists($old-elem) and local:attrs-differ(., $old-elem)">
                <_diff_old_attrs>
                    <xsl:copy-of select="$old-elem/@*[local-name() != 'id' and local-name() != 'diffing']"/>
                </_diff_old_attrs>
            </xsl:if>
            <xsl:apply-templates select="node()" mode="textdiff"/>
        </xsl:copy>
    </xsl:template>

    <xsl:variable name="analyzed-root" as="document-node()">
        <xsl:document>
            <xsl:apply-templates select="/" mode="analyze"/>
        </xsl:document>
    </xsl:variable>

    <xsl:template match="/">
        <xsl:variable name="merged" as="document-node()">
            <xsl:document>
                <xsl:apply-templates select="$analyzed-root" mode="merge"/>
            </xsl:document>
        </xsl:variable>
        <!--
          Wrapper allows dual top-level snapshots (L19) without producing
          multi-root XML that Saxon cannot re-parse.
        -->
        <merge-result>
            <xsl:apply-templates select="$merged/diffing/new-version/node()" mode="textdiff"/>
        </merge-result>
    </xsl:template>

</xsl:stylesheet>
