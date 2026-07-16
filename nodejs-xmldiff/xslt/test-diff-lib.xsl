<?xml version="1.0" encoding="UTF-8"?>
<!--
  Unit tests for diff-lib.xsl functions.
  Output: <tests ok="true|false"> with <test name="..." pass="true|false"/> children.
-->
<xsl:stylesheet version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:local="urn:xmldiff:local"
                exclude-result-prefixes="#all">

    <xsl:import href="diff-lib.xsl"/>
    <xsl:output method="xml" indent="yes"/>

    <xsl:template match="/">
        <xsl:variable name="results" as="element(test)*">
            <!-- is-moved-id (moved-ids supplied as stylesheet param from the harness) -->
            <xsl:sequence select="local:t('is-moved-id-true', local:is-moved-id('m1') = true())"/>
            <xsl:sequence select="local:t('is-moved-id-false', local:is-moved-id('x') = false())"/>

            <!-- is-absent / is-survivor -->
            <xsl:variable name="del"><e id="a" diffing="deleted"/></xsl:variable>
            <xsl:variable name="mov"><e id="b" diffing="moved"/></xsl:variable>
            <xsl:variable name="chg"><e id="c" diffing="changed"/></xsl:variable>
            <xsl:variable name="unc"><e id="d" diffing="unchanged"/></xsl:variable>
            <xsl:variable name="neu"><e id="e" diffing="new"/></xsl:variable>
            <xsl:sequence select="local:t('is-absent-deleted', local:is-absent($del/e) = true())"/>
            <xsl:sequence select="local:t('is-absent-moved', local:is-absent($mov/e) = true())"/>
            <xsl:sequence select="local:t('is-absent-changed', local:is-absent($chg/e) = false())"/>
            <xsl:sequence select="local:t('is-survivor-changed', local:is-survivor($chg/e) = true())"/>
            <xsl:sequence select="local:t('is-survivor-unchanged', local:is-survivor($unc/e) = true())"/>
            <xsl:sequence select="local:t('is-survivor-new', local:is-survivor($neu/e) = false())"/>

            <!-- attrs-differ -->
            <xsl:variable name="a1"><e id="1" class="x" lang="en"/></xsl:variable>
            <xsl:variable name="a2"><e id="1" class="x" lang="en"/></xsl:variable>
            <xsl:variable name="a3"><e id="1" class="y" lang="en"/></xsl:variable>
            <xsl:variable name="a4"><e id="1" class="x"/></xsl:variable>
            <xsl:sequence select="local:t('attrs-same', local:attrs-differ($a1/e, $a2/e) = false())"/>
            <xsl:sequence select="local:t('attrs-value-diff', local:attrs-differ($a1/e, $a3/e) = true())"/>
            <xsl:sequence select="local:t('attrs-count-diff', local:attrs-differ($a1/e, $a4/e) = true())"/>
            <!-- id-only difference must NOT count -->
            <xsl:variable name="a5"><e id="9" class="x" lang="en"/></xsl:variable>
            <xsl:sequence select="local:t('attrs-ignore-id', local:attrs-differ($a1/e, $a5/e) = false())"/>

            <!-- has-significant-text / has-anonymous-child -->
            <xsl:variable name="mixed"><p id="p">Hello <b id="b">x</b></p></xsl:variable>
            <xsl:variable name="pure"><p id="p"><b id="b">x</b></p></xsl:variable>
            <xsl:variable name="anon"><p id="p"><b>no-id</b></p></xsl:variable>
            <xsl:sequence select="local:t('has-text-mixed', local:has-significant-text($mixed/p) = true())"/>
            <xsl:sequence select="local:t('has-text-pure-false', local:has-significant-text($pure/p) = false())"/>
            <xsl:sequence select="local:t('has-anon-child', local:has-anonymous-child($anon/p) = true())"/>
            <xsl:sequence select="local:t('has-anon-child-false', local:has-anonymous-child($pure/p) = false())"/>
        </xsl:variable>

        <tests ok="{every $t in $results satisfies $t/@pass = 'true'}"
               total="{count($results)}"
               passed="{count($results[@pass='true'])}"
               failed="{count($results[@pass='false'])}">
            <xsl:copy-of select="$results"/>
        </tests>
    </xsl:template>

    <xsl:function name="local:t" as="element(test)">
        <xsl:param name="name" as="xs:string"/>
        <xsl:param name="pass" as="xs:boolean"/>
        <test name="{$name}" pass="{$pass}"/>
    </xsl:function>

</xsl:stylesheet>
