<?xml version="1.0" encoding="UTF-8"?>
<!--
  Port of the original ID-based XML diffing algorithm (diff.xsl).
  Input source document shape:
    <diffing>
      <old-version>...</old-version>
      <new-version>...</new-version>
    </diffing>
  Output: merged new-version tree with @diffing markers and optional
  dual changed nodes (@diffing-version old|new) for leaf text changes.
-->
<xsl:stylesheet version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                exclude-result-prefixes="#all">

    <xsl:output method="xml" indent="yes"/>

    <!-- identity for attributes in all modes -->
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
                        <xsl:choose>
                            <!-- id does not exist in old document → new -->
                            <xsl:when test="not(/descendant::old-version//*[@id = $y-id])">
                                <xsl:attribute name="diffing">new</xsl:attribute>
                            </xsl:when>
                            <!-- text content changed → changed -->
                            <xsl:when test="normalize-space(string(.)) !=
                                            normalize-space(string(/descendant::old-version//*[@id = $y-id][1]))">
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
                        <xsl:choose>
                            <!-- id does not exist in new document → deleted -->
                            <xsl:when test="not(/descendant::new-version//*[@id = $y-id])">
                                <xsl:attribute name="diffing">deleted</xsl:attribute>
                            </xsl:when>
                            <xsl:when test="normalize-space(string(.)) !=
                                            normalize-space(string(/descendant::new-version//*[@id = $y-id][1]))">
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

    <!-- ========== STEP 2: merge deleted siblings into new version ========== -->

    <!--
      Extension (L06): when a surviving parent has ZERO surviving children from old
      (all old children deleted / replaced by brand-new nodes), the original
      sibling-anchor rules never fire. Copy all deleted old children into the
      parent before merging the new child axis.
    -->
    <xsl:template name="merge-copy-element">
        <xsl:variable name="y-id" select="if (@id) then string(@id) else ''"/>
        <xsl:variable name="old-elem" select="/descendant::old-version//*[@id = $y-id][1]"/>
        <xsl:variable name="surviving-old-children"
                      select="$old-elem/*[@diffing = 'changed' or @diffing = 'unchanged']"/>
        <xsl:variable name="deleted-old-children"
                      select="$old-elem/*[@diffing = 'deleted']"/>
        <xsl:copy>
            <xsl:apply-templates select="@*" mode="merge"/>
            <xsl:choose>
                <xsl:when test="exists($old-elem)
                                and exists($deleted-old-children)
                                and empty($surviving-old-children)">
                    <xsl:copy-of select="$deleted-old-children"/>
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
            <!-- Only merge around surviving elements that are not under unchanged/new ancestors -->
            <xsl:when test="$y-id != ''
                            and exists($old-elem)
                            and not(ancestor::*[@diffing = 'unchanged'] or ancestor::*[@diffing = 'new'])">
                <xsl:choose>
                    <!-- preceding deleted siblings in old → copy them before current -->
                    <xsl:when test="$old-elem/preceding-sibling::*[1][@diffing = 'deleted']">
                        <xsl:copy-of select="$old-elem/preceding-sibling::*[@diffing = 'deleted']
                                              [following-sibling::*[not(@diffing = 'deleted')][1][@id = $y-id]]"/>
                        <xsl:call-template name="merge-copy-element"/>
                    </xsl:when>
                    <!-- only deleted (or nothing surviving) after this element in old → copy trailing deletes -->
                    <xsl:when test="count($old-elem/following-sibling::*[@diffing = 'changed' or @diffing = 'unchanged']) = 0">
                        <xsl:call-template name="merge-copy-element"/>
                        <xsl:copy-of select="$old-elem/following-sibling::*"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:call-template name="merge-copy-element"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <xsl:copy>
                    <xsl:apply-templates select="@*|node()" mode="merge"/>
                </xsl:copy>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- ========== STEP 3: expose old/new text for changed leaves ========== -->
    <xsl:template match="node()" mode="textdiff">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()" mode="textdiff"/>
        </xsl:copy>
    </xsl:template>

    <!-- PCDATA-only changed elements (no element children): emit old then new -->
    <xsl:template match="*[@diffing = 'changed']
                          [not(child::*)]
                          [not(ancestor::*[@diffing = 'new'])]
                          [not(ancestor::*[@diffing = 'deleted'])]
                          [not(ancestor::*[@diffing = 'unchanged'])]"
                  mode="textdiff">
        <xsl:variable name="y-id" select="string(@id)"/>
        <xsl:variable name="old-text"
                      select="string($analyzed-root/descendant::old-version//*[@id = $y-id][1])"/>
        <xsl:copy>
            <xsl:apply-templates select="@*" mode="textdiff"/>
            <xsl:attribute name="diffing-version">old</xsl:attribute>
            <xsl:value-of select="$old-text"/>
        </xsl:copy>
        <xsl:copy>
            <xsl:apply-templates select="@*" mode="textdiff"/>
            <xsl:attribute name="diffing-version">new</xsl:attribute>
            <xsl:apply-templates select="node()" mode="textdiff"/>
        </xsl:copy>
    </xsl:template>

    <!-- stash analyzed tree for textdiff lookups -->
    <xsl:variable name="analyzed-root" as="document-node()">
        <xsl:document>
            <xsl:apply-templates select="/" mode="analyze"/>
        </xsl:document>
    </xsl:variable>

    <!-- ========== entry ========== -->
    <xsl:template match="/">
        <xsl:variable name="merged" as="document-node()">
            <xsl:document>
                <xsl:apply-templates select="$analyzed-root" mode="merge"/>
            </xsl:document>
        </xsl:variable>
        <xsl:apply-templates select="$merged/diffing/new-version/node()" mode="textdiff"/>
    </xsl:template>

</xsl:stylesheet>
