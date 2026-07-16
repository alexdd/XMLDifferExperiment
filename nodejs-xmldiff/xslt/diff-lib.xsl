<?xml version="1.0" encoding="UTF-8"?>
<!-- Shared XSLT functions for ID-based XML diffing (unit-tested). -->
<xsl:stylesheet version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:local="urn:xmldiff:local"
                exclude-result-prefixes="#all">

    <xsl:param name="moved-ids" as="xs:string*" select="()"/>

    <xsl:function name="local:is-moved-id" as="xs:boolean">
        <xsl:param name="id" as="xs:string"/>
        <xsl:sequence select="$id = $moved-ids"/>
    </xsl:function>

    <!-- Compare attributes except @id and diffing-* bookkeeping. -->
    <xsl:function name="local:attrs-differ" as="xs:boolean">
        <xsl:param name="a" as="element()"/>
        <xsl:param name="b" as="element()"/>
        <xsl:variable name="a-atts"
                      select="$a/@*[local-name() != 'id' and not(starts-with(local-name(), 'diffing'))]"/>
        <xsl:variable name="b-atts"
                      select="$b/@*[local-name() != 'id' and not(starts-with(local-name(), 'diffing'))]"/>
        <xsl:sequence select="
            count($a-atts) != count($b-atts)
            or exists(
              for $att in $a-atts
              return if ($b/@*[node-name(.) = node-name($att)] = string($att))
                     then ()
                     else true()
            )
            or exists(
              for $att in $b-atts
              return if ($a/@*[node-name(.) = node-name($att)])
                     then ()
                     else true()
            )"/>
    </xsl:function>

    <xsl:function name="local:is-absent" as="xs:boolean">
        <xsl:param name="n" as="element()"/>
        <xsl:sequence select="$n/@diffing = 'deleted' or $n/@diffing = 'moved'"/>
    </xsl:function>

    <xsl:function name="local:is-survivor" as="xs:boolean">
        <xsl:param name="n" as="element()"/>
        <xsl:sequence select="$n/@diffing = 'changed' or $n/@diffing = 'unchanged'"/>
    </xsl:function>

    <!-- True if element has non-whitespace text child (mixed / PCDATA). -->
    <xsl:function name="local:has-significant-text" as="xs:boolean">
        <xsl:param name="n" as="element()"/>
        <xsl:sequence select="exists($n/text()[normalize-space()])"/>
    </xsl:function>

    <!-- True if element has a child element without @id. -->
    <xsl:function name="local:has-anonymous-child" as="xs:boolean">
        <xsl:param name="n" as="element()"/>
        <xsl:sequence select="exists($n/*[not(@id)])"/>
    </xsl:function>

</xsl:stylesheet>
