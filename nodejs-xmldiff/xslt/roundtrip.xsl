<?xml version="1.0" encoding="UTF-8"?>
<!--
  Reconstruct old or new document from a merged diff result.
  Parameter $view: 'old' | 'new'
-->
<xsl:stylesheet version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                exclude-result-prefixes="#all">

    <xsl:param name="view" select="'new'"/>
    <xsl:output method="xml" indent="yes"/>

    <xsl:template match="/">
        <xsl:apply-templates select="node()"/>
    </xsl:template>

    <xsl:template match="@*">
        <xsl:if test="local-name() != 'diffing'
                      and local-name() != 'diffing-version'
                      and local-name() != 'text-changed'">
            <xsl:copy/>
        </xsl:if>
    </xsl:template>

    <!-- drop opposite-side nodes -->
    <xsl:template match="*[@diffing = 'new']" priority="5">
        <xsl:if test="$view = 'new'">
            <xsl:copy>
                <xsl:apply-templates select="@*|node()"/>
            </xsl:copy>
        </xsl:if>
    </xsl:template>

    <xsl:template match="*[@diffing = 'deleted']" priority="5">
        <xsl:if test="$view = 'old'">
            <xsl:copy>
                <xsl:apply-templates select="@*|node()"/>
            </xsl:copy>
        </xsl:if>
    </xsl:template>

    <!-- changed leaf pair: keep only the requested version -->
    <xsl:template match="*[@diffing = 'changed'][@diffing-version = 'old']" priority="10">
        <xsl:if test="$view = 'old'">
            <xsl:copy>
                <xsl:apply-templates select="@*|node()"/>
            </xsl:copy>
        </xsl:if>
    </xsl:template>

    <xsl:template match="*[@diffing = 'changed'][@diffing-version = 'new']" priority="10">
        <xsl:if test="$view = 'new'">
            <xsl:copy>
                <xsl:apply-templates select="@*|node()"/>
            </xsl:copy>
        </xsl:if>
    </xsl:template>

    <!-- structural changed / unchanged -->
    <xsl:template match="*[@diffing = 'changed' or @diffing = 'unchanged']" priority="1">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()"/>
        </xsl:copy>
    </xsl:template>

    <xsl:template match="*[not(@diffing)]" priority="0">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()"/>
        </xsl:copy>
    </xsl:template>

    <xsl:template match="text()|comment()|processing-instruction()">
        <xsl:copy/>
    </xsl:template>

</xsl:stylesheet>
